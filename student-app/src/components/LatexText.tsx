import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  className?: string;
}

/**
 * LaTeX formulalarni va inline rasmlarni render qiluvchi komponent.
 * Qo'llab-quvvatlanadigan formatlar:
 * - $$formula$$ — display mode
 * - $formula$ — inline mode
 * - \[formula\] — display mode (standart LaTeX)
 * - \(formula\) — inline mode (standart LaTeX)
 * - [IMG:url] — inline rasm
 */
export default function LatexText({ text, className = "" }: Props) {
  function renderContent(input: string): string {
    // 0. Agar butun matn faqat rasm URL bo'lsa — img tag qaytarish
    const trimmed = input.trim();
    if (/^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|svg)(\?\S*)?$/i.test(trimmed)) {
      return `<img src="${trimmed}" alt="" style="display:block;max-width:100%;border-radius:8px;margin:6px 0;" />`;
    }

    // 0b. Agar matnda URL bor bo'lsa (rasm URL) — inline img ga aylantirish
    let result = input.replace(
      /(?<!\[IMG:)(?<!")(?<!=)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S*)?)/gi,
      '<img src="$1" alt="" style="display:block;max-width:100%;max-height:200px;border-radius:8px;margin:6px 0;" />'
    );

    // 1. [IMG:url] larni img tagga aylantirish
    result = result.replace(/\[IMG:([^\]]+)\]/g, '<img src="$1" alt="" style="display:inline-block;max-height:160px;max-width:100%;border-radius:8px;margin:6px 0;vertical-align:middle;" />');

    // 2. \[...\] — Display mode LaTeX (ko'p qatorli)
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: true });
      } catch {
        return `<code>${formula}</code>`;
      }
    });

    // 3. $$...$$ — Display mode LaTeX
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: true });
      } catch {
        return `<code>${formula}</code>`;
      }
    });

    // 4. \(...\) — Inline mode LaTeX
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: false });
      } catch {
        return `<code>${formula}</code>`;
      }
    });

    // 5. $...$ — Inline mode LaTeX (bitta dollar belgisi, lekin $10 kabi narxlarni exclude qilish)
    result = result.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_, formula) => {
      // Agar faqat raqam bo'lsa (narx formatida), render qilmaslik
      if (/^\d+([.,]\d+)?$/.test(formula.trim())) return `$${formula}$`;
      try {
        return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: false });
      } catch {
        return `<code>${formula}</code>`;
      }
    });

    return result;
  }

  const html = renderContent(text || "");

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
