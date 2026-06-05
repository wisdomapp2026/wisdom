import katex from "katex";

interface Props {
  text: string;
  className?: string;
}

/**
 * LaTeX formulalarni render qiluvchi komponent
 * $$formula$$ ichidagi matni KaTeX bilan chiroyli ko'rsatadi
 * Oddiy matn o'zgarmaydi
 */
export default function LatexText({ text, className = "" }: Props) {
  function renderLatex(input: string): string {
    // $$...$$ ichidagi formulalarni KaTeX bilan render qilish
    return input.replace(/\$\$(.*?)\$\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: false });
      } catch {
        return `<code>${formula}</code>`;
      }
    });
  }

  const html = renderLatex(text);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
