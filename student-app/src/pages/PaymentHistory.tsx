import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, CreditCard, Check, Clock, X, ChevronRight, Receipt } from "lucide-react";
import { getPaymentsByUser } from "@shared/repositories";
import type { Payment } from "@shared/types";
import { useAuth } from "../hooks/useAuth";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  success: { label: "Tasdiqlangan", color: "text-green-600 bg-green-50 border-green-200", icon: <Check size={14} /> },
  pending: { label: "Kutilmoqda", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: <Clock size={14} /> },
  failed: { label: "Rad etilgan", color: "text-red-600 bg-red-50 border-red-200", icon: <X size={14} /> },
};

const methodLabels: Record<string, string> = {
  click: "Click",
  payme: "Payme",
  uzum_bank: "Uzum Bank",
  card: "Bank kartasi",
};

export default function PaymentHistory() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (user) loadPayments();
    else setLoading(false);
  }, [user]);

  async function loadPayments() {
    try {
      const data = await getPaymentsByUser(user!.uid);
      setPayments(data);
    } catch (err) {
      console.error("To'lovlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link to="/profile" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CreditCard size={20} className="text-green-500" /> To'lovlarim
        </h1>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="text-center py-20 px-5">
          <CreditCard size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">Hali to'lov amalga oshirilmagan</p>
          <Link to="/subscription" className="inline-block mt-4 text-primary-500 font-medium text-sm">Obuna bo'lish →</Link>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="px-5 mt-4 space-y-3">
          {payments.map((payment) => {
            const status = statusConfig[payment.status] || statusConfig.pending;
            return (
              <button
                key={payment.id}
                onClick={() => setSelectedPayment(payment)}
                className="w-full flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl active:bg-gray-50 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${status.color}`}>
                  {status.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{payment.courseTitle}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(payment.createdAt).toLocaleDateString("uz-UZ")} · {methodLabels[payment.method] || payment.method}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{payment.amount.toLocaleString()} so'm</p>
                  <p className={`text-[10px] font-medium mt-0.5 ${payment.status === "success" ? "text-green-600" : payment.status === "failed" ? "text-red-500" : "text-yellow-600"}`}>
                    {status.label}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}

// ===== To'lov tafsilotlari modali =====
function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const status = statusConfig[payment.status] || statusConfig.pending;
  const date = new Date(payment.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">To'lov tafsilotlari</h2>
            <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Status badge */}
          <div className="flex items-center justify-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${status.color}`}>
              {status.icon}
              <span className="text-sm font-semibold">{status.label}</span>
            </div>
          </div>

          {/* Summa */}
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{payment.amount.toLocaleString()} so'm</p>
            {payment.discount > 0 && (
              <p className="text-xs text-green-600 mt-1">Chegirma: -{payment.discount}%</p>
            )}
          </div>

          {/* Tafsilotlar */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <DetailRow label="Kurs" value={payment.courseTitle} />
            <DetailRow label="To'lov usuli" value={methodLabels[payment.method] || payment.method} />
            <DetailRow label="Sana" value={date.toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })} />
            <DetailRow label="Vaqt" value={date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} />
            <DetailRow label="To'lov ID" value={payment.id} />
            {payment.promoCode && <DetailRow label="Promo kod" value={payment.promoCode} />}
            {payment.subscriptionId && <DetailRow label="Obuna ID" value={payment.subscriptionId} />}
          </div>

          {/* Chek ko'rish (placeholder) */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
            <Receipt size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-500">Chek rasmi</p>
            <p className="text-[10px] text-gray-400 mt-1">To'lov tasdiqlangandan so'ng chek shu yerda ko'rinadi</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
