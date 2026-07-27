import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import { getAllPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from "@shared/repositories";
import type { PromoCode } from "@shared/types";
import LoadingButton from "../components/LoadingButton";

export default function Promos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(10);
  const [newMaxUses, setNewMaxUses] = useState(0);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDiscount, setEditDiscount] = useState(10);
  const [editMaxUses, setEditMaxUses] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getAllPromoCodes();
    setPromos(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newCode.trim()) return;
    setSaving(true);
    const now = Date.now();
    await createPromoCode({
      id: `promo-${now}`,
      code: newCode.trim().toUpperCase(),
      discountPercent: newDiscount,
      maxUses: newMaxUses,
      usedCount: 0,
      isActive: true,
      createdAt: now,
      createdBy: "admin",
    });
    setShowAdd(false);
    setNewCode("");
    setNewDiscount(10);
    setNewMaxUses(0);
    setSaving(false);
    await loadData();
  }

  function startEdit(promo: PromoCode) {
    setEditingId(promo.id);
    setEditCode(promo.code);
    setEditDiscount(promo.discountPercent);
    setEditMaxUses(promo.maxUses);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCode("");
    setEditDiscount(10);
    setEditMaxUses(0);
  }

  async function handleEditSave() {
    if (!editingId || !editCode.trim()) return;
    setEditSaving(true);
    await updatePromoCode(editingId, {
      code: editCode.trim().toUpperCase(),
      discountPercent: editDiscount,
      maxUses: editMaxUses,
    });
    setEditSaving(false);
    cancelEdit();
    await loadData();
  }

  async function handleToggle(id: string, current: boolean) {
    await updatePromoCode(id, { isActive: !current });
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu promo kodni o'chirishga ishonchingiz komilmi?")) return;
    await deletePromoCode(id);
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo kodlar</h1>
          <p className="text-gray-500 mt-1">Chegirma va promo kodlarni boshqaring</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Yangi promo kod
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold">Yangi promo kod yaratish</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod *</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="EDUKIDS50" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chegirma (%)</label>
              <input type="number" min={1} max={100} value={newDiscount} onChange={(e) => setNewDiscount(Number(e.target.value))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max ishlatish (0=cheksiz)</label>
              <input type="number" min={0} value={newMaxUses} onChange={(e) => setNewMaxUses(Number(e.target.value))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <LoadingButton onClick={handleAdd} disabled={!newCode.trim()} className="btn-primary text-sm">Yaratish</LoadingButton>
            <button onClick={() => setShowAdd(false)} className="btn-outline text-sm">Bekor</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Promo kodlar ({promos.length})</h3>
        </div>
        {promos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏷️</p>
            <p>Hali promo kod yaratilmagan</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3">Kod</th>
              <th className="text-left px-4 py-3">Chegirma</th>
              <th className="text-left px-4 py-3">Ishlatilgan</th>
              <th className="text-left px-4 py-3">Holat</th>
              <th className="text-right px-4 py-3">Amallar</th>
            </tr></thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  {editingId === p.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-mono uppercase" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={1} max={100} value={editDiscount} onChange={(e) => setEditDiscount(Number(e.target.value))} className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} value={editMaxUses} onChange={(e) => setEditMaxUses(Number(e.target.value))} className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <LoadingButton onClick={() => handleToggle(p.id, p.isActive)} className={`text-xs px-2 py-1 rounded-full font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.isActive ? "Faol" : "O'chiq"}
                        </LoadingButton>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <LoadingButton loading={editSaving} onClick={handleEditSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded" iconOnly><Check className="w-4 h-4" /></LoadingButton>
                          <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{p.code}</td>
                      <td className="px-4 py-3 text-primary-500 font-semibold">{p.discountPercent}%</td>
                      <td className="px-4 py-3 text-gray-600">{p.usedCount} / {p.maxUses || "∞"}</td>
                      <td className="px-4 py-3">
                        <LoadingButton onClick={() => handleToggle(p.id, p.isActive)} className={`text-xs px-2 py-1 rounded-full font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.isActive ? "Faol" : "O'chiq"}
                        </LoadingButton>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Edit className="w-4 h-4" /></button>
                          <LoadingButton onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" iconOnly><Trash2 className="w-4 h-4" /></LoadingButton>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
