/**
 * LaTeX matnini qisqa, o'qiladigan preview ga aylantirish.
 *
 * Qirqilgan (truncate) matnda formulani KaTeX bilan render qilib bo'lmaydi —
 * chunki formula o'rtasidan kesilib, sintaksis buziladi. Shuning uchun
 * bunday joylarda LaTeX belgilari tozalanadi va sof matn qoldiriladi.
 *
 * To'liq ko'rsatiladigan joylarda esa <LatexText /> komponentidan foydalaning.
 */
export function latexToPlainText(input: string): string {
  return (input || "")
    // Inline rasmlar
    .replace(/\[IMG:[^\]]+\]/g, "🖼")
    // Formula delimiterlarini olib tashlash, ichidagi matnni qoldirish
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
    .replace(/\$([^$\n]+?)\$/g, "$1")
    // Ko'p uchraydigan buyruqlarni o'qiladigan belgiga almashtirish
    .replace(/\\(?:cdot|times)\b/g, "·")
    .replace(/\\(?:ldots|dots|cdots)\b/g, "…")
    .replace(/\\(?:le|leq)\b/g, "≤")
    .replace(/\\(?:ge|geq)\b/g, "≥")
    .replace(/\\ne(?:q)?\b/g, "≠")
    .replace(/\\pm\b/g, "±")
    .replace(/\\div\b/g, "÷")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\pi\b/g, "π")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√$1")
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    // Qolgan barcha \buyruq larni olib tashlash
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** LaTeX matnini tozalab, belgilangan uzunlikda qirqadi. */
export function latexPreview(input: string, maxLen = 60): string {
  const s = latexToPlainText(input);
  return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
}
