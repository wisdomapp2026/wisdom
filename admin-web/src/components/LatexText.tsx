import katex from "katex";

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
    // 1. [IMG:url] larni img tagga aylantirish
    let result = input.replace(/\[IMG:([^\]]+)\]/g, '<img src="$1" alt="" style="display:inline-block;max-height:120px;max-width:100%;border-radius:8px;margin:4px 2px;vertical-align:middle;" />');

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

    // 5. $...$ — Inline mode LaTeX
    result = result.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_, formula) => {
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
