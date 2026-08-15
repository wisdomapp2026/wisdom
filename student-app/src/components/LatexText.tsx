import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  text: string;
  className?: string;
}

const LIST_ENV_RE = /\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\1\}/g;
const LIST_ITEM_RE = /\\item(?:\s*\[([^\]]*)\])?\s*([\s\S]*?)(?=\\item(?:\s*\[|\s)|$)/g;

/** LaTeX formulalar, itemize/enumerate ro'yxatlari va inline rasmlarni render qiladi. */
export default function LatexText({ text, className = "" }: Props) {
  function renderMathAndImages(input: string): string {
    const trimmed = input.trim();
    if (/^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|svg)(\?\S*)?$/i.test(trimmed)) {
      return `<img src="${trimmed}" alt="" style="display:block;max-width:100%;border-radius:8px;margin:6px 0;" />`;
    }

    let result = input.replace(
      /(?<!\[IMG:)(?<!")(?<!=)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S*)?)/gi,
      '<img src="$1" alt="" style="display:block;max-width:100%;max-height:200px;border-radius:8px;margin:6px 0;" />'
    );
    result = result.replace(/\[IMG:([^\]]+)\]/g, '<img src="$1" alt="" style="display:inline-block;max-height:160px;max-width:100%;border-radius:8px;margin:6px 0;vertical-align:middle;" />');

    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
      try { return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: true }); }
      catch { return `<code>${formula}</code>`; }
    });
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
      try { return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: true }); }
      catch { return `<code>${formula}</code>`; }
    });
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => {
      try { return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: false }); }
      catch { return `<code>${formula}</code>`; }
    });
    result = result.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_, formula) => {
      if (/^\d+([.,]\d+)?$/.test(formula.trim())) return `$${formula}$`;
      try { return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: false }); }
      catch { return `<code>${formula}</code>`; }
    });
    return result;
  }

  function renderContent(input: string): string {
    const lists: string[] = [];
    const withPlaceholders = input.replace(LIST_ENV_RE, (_match, env: string, body: string) => {
      const rows: string[] = [];
      let itemMatch: RegExpExecArray | null;
      let index = 0;
      LIST_ITEM_RE.lastIndex = 0;
      while ((itemMatch = LIST_ITEM_RE.exec(body)) !== null) {
        const customLabel = itemMatch[1]?.trim();
        const label = customLabel || (env === "enumerate" ? `${index + 1}.` : "•");
        const item = renderMathAndImages(itemMatch[2].trim());
        rows.push(`<span class="latex-list-item" style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:start;margin:6px 0;"><span style="font-weight:600;white-space:nowrap;">${renderMathAndImages(label)}</span><span style="min-width:0;">${item}</span></span>`);
        index++;
      }
      const html = rows.length > 0
        ? `<span class="latex-list" style="display:block;margin:10px 0 4px 16px;">${rows.join("")}</span>`
        : renderMathAndImages(body);
      const token = `@@LATEX_LIST_${lists.length}@@`;
      lists.push(html);
      return token;
    });

    let result = renderMathAndImages(withPlaceholders);
    lists.forEach((html, index) => { result = result.replace(`@@LATEX_LIST_${index}@@`, html); });
    return result;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: renderContent(text || "") }} />;
}
