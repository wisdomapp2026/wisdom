import { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Redo, Undo, Type, Heading1, Heading2 } from "lucide-react";

/**
 * Rich Text Editor — matn formatlash, ro'yxatlar va Word dan paste qilish imkoniyati.
 * HTML formatda saqlaydi.
 * Word dan paste qilganda stillar saqlanadi (bold, italic, ro'yxatlar).
 */

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, label, hint, minHeight = "200px" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  function handleInput() {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(el.innerHTML);
  }

  function execCmd(command: string, val?: string) {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
  }

  function handlePaste(e: React.ClipboardEvent) {
    // Word dan paste qilganda HTML ni qabul qilish
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      // Word/HTML formatdagi contentni tozalash (keraksiz meta-taglar, xml)
      const cleaned = cleanWordHtml(html);
      document.execCommand("insertHTML", false, cleaned);
      handleInput();
      return;
    }
    // Oddiy text paste
    // Browser o'zi handle qiladi
  }

  /** Word HTML dan keraksiz taglar va atributlarni tozalash, lekin stillarni saqlash */
  function cleanWordHtml(html: string): string {
    // <html>, <head>, <body>, <meta> taglarni olib tashlash
    let clean = html.replace(/<html[^>]*>|<\/html>|<head[^>]*>[\s\S]*?<\/head>|<body[^>]*>|<\/body>|<meta[^>]*>/gi, "");
    // Word maxsus taglar: <o:p>, <w:...>, xml namespace
    clean = clean.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, "");
    clean = clean.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, "");
    clean = clean.replace(/<\/?[a-z]+:[^>]*>/gi, "");
    // style ichidagi mso- prefixli stillarni olib tashlash, lekin font-weight, font-style, text-decoration saqlash
    clean = clean.replace(/\s*mso-[^:]+:[^;"]+;?/gi, "");
    // class atributlarni olib tashlash (Word classlari keraksiz)
    clean = clean.replace(/\s*class="[^"]*"/gi, "");
    // Keraksiz span'larni (stilsiz) olib tashlash
    clean = clean.replace(/<span\s*>([\s\S]*?)<\/span>/gi, "$1");
    // Bo'sh paragraflarni <br> ga aylantirish
    clean = clean.replace(/<p[^>]*>\s*(&nbsp;)?\s*<\/p>/gi, "<br>");
    // data- atributlarni olib tashlash
    clean = clean.replace(/\s*data-[a-z-]+="[^"]*"/gi, "");
    return clean.trim();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ctrl+B, Ctrl+I, Ctrl+U
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); execCmd("bold"); }
      if (e.key === "i") { e.preventDefault(); execCmd("italic"); }
      if (e.key === "u") { e.preventDefault(); execCmd("underline"); }
    }
  }

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>";

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1.5 bg-gray-50 border border-gray-200 rounded-t-lg border-b-0 flex-wrap">
        <ToolBtn icon={<Undo className="w-4 h-4" />} title="Orqaga (Ctrl+Z)" onClick={() => execCmd("undo")} />
        <ToolBtn icon={<Redo className="w-4 h-4" />} title="Oldinga (Ctrl+Y)" onClick={() => execCmd("redo")} />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn icon={<Heading1 className="w-4 h-4" />} title="Sarlavha 1" onClick={() => execCmd("formatBlock", "h2")} />
        <ToolBtn icon={<Heading2 className="w-4 h-4" />} title="Sarlavha 2" onClick={() => execCmd("formatBlock", "h3")} />
        <ToolBtn icon={<Type className="w-4 h-4" />} title="Oddiy matn" onClick={() => execCmd("formatBlock", "p")} />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn icon={<Bold className="w-4 h-4" />} title="Qalin (Ctrl+B)" onClick={() => execCmd("bold")} />
        <ToolBtn icon={<Italic className="w-4 h-4" />} title="Qiyshiq (Ctrl+I)" onClick={() => execCmd("italic")} />
        <ToolBtn icon={<Underline className="w-4 h-4" />} title="Tagiga chizilgan (Ctrl+U)" onClick={() => execCmd("underline")} />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn icon={<List className="w-4 h-4" />} title="Nuqtali ro'yxat" onClick={() => execCmd("insertUnorderedList")} />
        <ToolBtn icon={<ListOrdered className="w-4 h-4" />} title="Raqamli ro'yxat" onClick={() => execCmd("insertOrderedList")} />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn icon={<AlignLeft className="w-4 h-4" />} title="Chapga" onClick={() => execCmd("justifyLeft")} />
        <ToolBtn icon={<AlignCenter className="w-4 h-4" />} title="Markazga" onClick={() => execCmd("justifyCenter")} />
        <ToolBtn icon={<AlignRight className="w-4 h-4" />} title="O'ngga" onClick={() => execCmd("justifyRight")} />
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full px-4 py-3 bg-white border rounded-b-lg text-sm overflow-auto rich-text-content ${
            isFocused ? "border-primary-400 ring-2 ring-primary-200" : "border-gray-200"
          }`}
          style={{ minHeight, maxHeight: "500px" }}
          data-placeholder={placeholder}
        />
        {isEmpty && !isFocused && (
          <div className="absolute left-4 top-3 text-sm text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}

      {/* Editor stillari */}
      <style>{`
        [contenteditable] h2 { font-size: 1.25rem; font-weight: 700; margin: 0.5em 0; }
        [contenteditable] h3 { font-size: 1.1rem; font-weight: 600; margin: 0.4em 0; }
        [contenteditable] p { margin: 0.3em 0; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        [contenteditable] li { margin: 0.2em 0; }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

function ToolBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-900 transition-all"
    >
      {icon}
    </button>
  );
}
