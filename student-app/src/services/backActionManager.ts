import { useEffect, useId } from "react";

export type BackHandlerFn = () => boolean | void;

interface HandlerItem {
  id: string;
  fn: BackHandlerFn;
  priority: number;
  createdAt: number;
}

class BackActionManager {
  private handlers: HandlerItem[] = [];

  /**
   * Yangi orqaga qaytish (back) handlerini ro'yxatga olish.
   * Modallar yopilishi uchun LIFO (oxirgi ochilgan birinchi yopiladi) tartibda ishlaydi.
   * Priority qancha yuqori bo'lsa, shuncha oldin chaqiriladi.
   *
   * @returns Ro'yxatdan o'chirish funksiyasi
   */
  register(fn: BackHandlerFn, priority: number = 0, customId?: string): () => void {
    const id = customId || Math.random().toString(36).substring(2, 9);
    const item: HandlerItem = {
      id,
      fn,
      priority,
      createdAt: Date.now(),
    };

    // Ro'yxatga qo'shish
    this.handlers.push(item);

    return () => {
      this.unregister(id);
    };
  }

  unregister(id: string) {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  /**
   * Smartfondagi back tugmasi bosilganda chaqiriladi.
   * Agar biron modal/panellar ro'yxatdan o'tgan bo'lsa, eng ustidagisini yopadi va true qaytaradi.
   * Hech narsa ro'yxatda bo'lmasa, DOM dagi ochilgan modallarni qidirib ko'radi (fallback).
   */
  execute(): boolean {
    if (this.handlers.length > 0) {
      // Priority bo'yicha kamayish, so'ng createdAt bo'yicha kamayish (eng yangisi birinchi)
      const sorted = [...this.handlers].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.createdAt - a.createdAt;
      });

      const top = sorted[0];
      try {
        const res = top.fn();
        // Agar handler false qaytarmasa, u muvaffaqiyatli iste'mol qilindi
        if (res !== false) {
          return true;
        }
      } catch (err) {
        console.error("Back handler error:", err);
      }
    }

    // Fallback: Agar hook orqali ulanmagan modal DOM da ochiq bo'lsa
    return this.fallbackDomModalClose();
  }

  /**
   * DOM da ochiq modal yoki menyuni topib yopishga urinish
   */
  private fallbackDomModalClose(): boolean {
    try {
      // 1. Hamburger menyu ochiq bo'lsa
      const hamburgerClose = document.querySelector<HTMLElement>("[data-hamburger-close]");
      if (hamburgerClose) {
        hamburgerClose.click();
        return true;
      }

      // 2. data-modal-close yoki aria-label="Yopish" / "Close" tugmasi bor ochiq modal
      const modalCloseButtons = document.querySelectorAll<HTMLElement>(
        '[data-modal-close], button[aria-label="Yopish"], button[aria-label="Close"], button[aria-label="Orqaga"]'
      );
      if (modalCloseButtons.length > 0) {
        // Eng oxirgi (eng ustki) tugmani bosish
        const lastBtn = modalCloseButtons[modalCloseButtons.length - 1];
        lastBtn.click();
        return true;
      }
    } catch {
      // jim
    }

    return false;
  }

  hasHandlers(): boolean {
    return this.handlers.length > 0;
  }
}

export const backActionManager = new BackActionManager();

/**
 * React komponentida Back tugmasini ushlab qolish uchun hook.
 * Masalan:
 * useBackHandler(() => { onClose(); }, isOpen);
 */
export function useBackHandler(fn: BackHandlerFn, enabled: boolean = true, priority: number = 0) {
  const hookId = useId();

  useEffect(() => {
    if (!enabled) return;

    const unregister = backActionManager.register(fn, priority, hookId);
    return () => {
      unregister();
    };
  }, [enabled, fn, priority, hookId]);
}
