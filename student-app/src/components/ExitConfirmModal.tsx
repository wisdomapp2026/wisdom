import React from "react";
import { LogOut, X } from "lucide-react";
import { useBackHandler } from "../services/backActionManager";

interface ExitConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitConfirmModal({ open, onConfirm, onCancel }: ExitConfirmModalProps) {
  // Agar chiqish modali ochiq bo'lsa va yana smartfonning back tugmasi bosilsa — modalni yopish
  useBackHandler(onCancel, open, 100);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl text-center relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Yopish"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-red-50 border-4 border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogOut size={28} className="text-red-500" />
        </div>

        {/* Sarlavha */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">Dasturdan chiqasizmi?</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          Ilovadan chiqishni xohlaysizmi? O'rganishni istalgan vaqt davom ettirishingiz mumkin.
        </p>

        {/* Tugmalar */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform shadow-md shadow-red-500/20"
          >
            Ha, chiqish
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
          >
            Yo'q, qolish
          </button>
        </div>
      </div>
    </div>
  );
}
