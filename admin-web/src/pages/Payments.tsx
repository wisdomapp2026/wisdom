import { useState, useEffect } from "react";
import { Check, X, Clock } from "lucide-react";
import { getRecentPayments, createSubscription } from "@shared/repositories";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@shared/firebase";
import type { Payment, Subscription } from "@shared/types";

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "success">("all");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getRecentPayments(100);
    setPayments(data);
    setLoading(false);
  }

  async function handleApprove(payment: Payment) {
    if (!confirm(`${payment.userName} ning ${payment.amount.toLocaleString()} so'm to'lovini tasdiqlaysizmi?`)) return;

    // 1. To'lov holatini "success" ga o'zgartirish
    await updateDoc(doc(db, "payments", payment.id), { status: "success" });

    // 2. Obuna yaratish
    const now = Date.now();
    // Plan ni aniqlash
    let days = 30;
    if (payment.courseTitle.includes("3 oylik")) days = 90;
    else if (payment.courseTitle.includes("Yillik")) days = 365;

    const subscription: Subscription = {
      id: `sub-${payment.userId}-${now}`,
      userId: payment.userId,
      status: "active",
      plan: payment.courseTitle,
      pricePerMonth: Math.round(payment.amount / (days / 30)),
      startDate: now,
      endDate: now + days * 86400000,
      paymentMethod: payment.method,
      promoCode: payment.promoCode,
    };
    await createSubscription(subscription);

    await loadData();
  }

  async function handleReject(paymentId: string) {
    if (!confirm("Bu to'lovni rad etasizmi?")) return;
    await updateDoc(doc(db, "payments", paymentId), { status: "failed" });
    await loadData();
  }

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">To'lovlar</h1>
          <p className="text-gray-500 mt-1">
            {pendingCount > 0 && <span className="text-yellow-600 font-medium">{pendingCount} ta tasdiqlash kutmoqda</span>}
            {pendingCount === 0 && "Barcha to'lovlar tarixi"}
          </p>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="flex gap-2">
        {(["all", "pending", "success"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {f === "all" ? `Barchasi (${payments.length})` : f === "pending" ? `Kutmoqda (${pendingCount})` : `Tasdiqlangan (${payments.filter(p => p.status === "success").length})`}
          </button>
        ))}
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">💳</p>
            <p>Hali to'lov yo'q</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium">Foydalanuvchi</th>
                  <th className="text-left px-4 py-3 font-medium">Tarif</th>
                  <th className="text-left px-4 py-3 font-medium">Summa</th>
                  <th className="text-left px-4 py-3 font-medium">Promo</th>
                  <th className="text-left px-4 py-3 font-medium">Screenshot</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-right px-4 py-3 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={`border-b border-gray-50 ${p.status === "pending" ? "bg-yellow-50/30" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.userName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.courseTitle}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.amount.toLocaleString()} so'm</td>
                    <td className="px-4 py-3">
                      {p.promoCode ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono">{p.promoCode} (-{p.discount}%)</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(p as any).screenshotUrl ? (
                        <a href={(p as any).screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 underline font-medium">📷 Ko'rish</a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        p.status === "success" ? "bg-green-100 text-green-700" :
                        p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {p.status === "pending" && <Clock size={10} />}
                        {p.status === "success" && <Check size={10} />}
                        {p.status === "success" ? "Tasdiqlangan" : p.status === "pending" ? "Kutmoqda" : "Rad etilgan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString("uz")}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "pending" && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleApprove(p)}
                            className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            title="Tasdiqlash"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            title="Rad etish"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
