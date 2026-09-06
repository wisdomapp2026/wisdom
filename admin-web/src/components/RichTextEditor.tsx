import React, { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Maximize2,
  Minimize2,
  CodeXml,
  Sparkles,
  Palette,
  Highlighter,
  Upload,
  Video,
  X,
} from "lucide-react";
import { uploadFile } from "@shared/supabase";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  hint?: string;
}

const FONT_FAMILIES = [
  { name: "Standart (Inter)", value: "Inter, sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
];

const FONT_SIZES = [
  { name: "12px - Juda kichik", value: "12px" },
  { name: "14px - Kichik", value: "14px" },
  { name: "16px - Asosiy (Normal)", value: "16px" },
  { name: "18px - O'rtacha katta", value: "18px" },
  { name: "20px - Katta", value: "20px" },
  { name: "24px - Sarlavha (Katta)", value: "24px" },
  { name: "32px - Katta sarlavha", value: "32px" },
];

const TEXT_COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316",
  "#F59E0B", "#10B981", "#06B6D4", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899",
];

const HIGHLIGHT_COLORS = [
  { name: "Yo'q", value: "transparent" },
  { name: "Sariq", value: "#FEF08A" },
  { name: "Yashil", value: "#BBF7D0" },
  { name: "Moviy", value: "#BAE6FD" },
  { name: "Pushti", value: "#FBCFE8" },
  { name: "To'q sariq", value: "#FED7AA" },
  { name: "Binafsha", value: "#E9D5FF" },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Mavzu nazariyasini bu yerga yozing...",
  minHeight = "400px",
  label,
  hint,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHtmlCode, setShowHtmlCode] = useState(false);
  const [htmlCode, setHtmlCode] = useState(value);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dropdown states
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // YouTube Video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const savedSelectionRef = useRef<Range | null>(null);

  // Word count
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  // Initial content sync
  useEffect(() => {
    if (editorRef.current && !showHtmlCode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
        updateStats();
      }
    }
  }, [value, showHtmlCode]);

  function updateStats() {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    setStats({ words, chars });
  }

  function handleInput() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html);
    setHtmlCode(html);
    updateStats();
  }

  // Formatting commands
  function execCmd(command: string, arg: string | undefined = undefined) {
    if (showHtmlCode) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  }

  // Apply Font Family
  function applyFontFamily(font: string) {
    execCmd("fontName", font);
  }

  // Apply Font Size
  function applyFontSize(size: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const span = document.createElement("span");
    span.style.fontSize = size;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    } catch {
      execCmd("fontSize", "4");
    }
    handleInput();
  }

  // Apply Headings
  function applyHeading(tag: string) {
    if (tag === "p") {
      execCmd("formatBlock", "<p>");
    } else {
      execCmd("formatBlock", `<${tag}>`);
    }
  }

  // Insert Table
  function insertTable() {
    let html = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0;"><tbody>`;
    for (let r = 0; r < tableRows; r++) {
      html += `<tr>`;
      for (let c = 0; c < tableCols; c++) {
        if (r === 0) {
          html += `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background-color: #f1f5f9; font-weight: 600; text-align: left;">Sarlavha ${c + 1}</th>`;
        } else {
          html += `<td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Matn...</td>`;
        }
      }
      html += `</tr>`;
    }
    html += `</tbody></table><p><br/></p>`;

    execCmd("insertHTML", html);
    setShowTableModal(false);
  }

  // Insert Link
  function insertLink() {
    const url = prompt("Havola (URL) manzilini kiriting:", "https://");
    if (!url || url === "https://") return;
    execCmd("createLink", url);
  }

  // Save / Restore Cursor Selection
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  }

  function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const clean = url.trim();
    // Handles youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID, etc.
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = clean.match(regExp);
    return match ? match[1] : null;
  }

  function handleInsertYouTube() {
    const id = extractYouTubeId(videoUrl);
    if (!id) {
      alert("Iltimos, to'g'ri YouTube video havolasini kiriting!\nMasalan:\n- https://www.youtube.com/watch?v=...\n- https://youtu.be/...\n- https://www.youtube.com/shorts/...");
      return;
    }

    restoreSelection();
    const embedHtml = `<div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;margin:20px 0;background:#000;"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="no-referrer" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:16px;"></iframe></div><p><br></p>`;

    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertHTML", false, embedHtml);
      handleInput();
    }
    setVideoUrl("");
    setShowVideoModal(false);
  }

  // Insert Local Image (uploads to Supabase storage)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const now = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `theory-images/${now}-${safeName}`;
      const url = await uploadFile("edukids", filePath, file);

      // Insert image tag at cursor
      const imgHtml = `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${url}" alt="Dars rasmi" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: inline-block;" />
          <p style="font-size: 12px; color: #64748b; margin-top: 6px; font-style: italic;">Rasm izohi...</p>
        </div><p><br/></p>
      `;
      execCmd("insertHTML", imgHtml);
    } catch (err: any) {
      alert("Rasm yuklashda xatolik: " + err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Paste handler: handles ChatGPT / Word HTML & direct image pastes
  async function handlePaste(e: React.ClipboardEvent) {
    // 1. Agar rasm clipboarddan paste qilingan bo'lsa (Screenshot, Copy image)
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            setUploadingImage(true);
            try {
              const now = Date.now();
              const filePath = `theory-images/clipboard-${now}.png`;
              const url = await uploadFile("edukids", filePath, blob);
              const imgHtml = `
                <div style="text-align: center; margin: 20px 0;">
                  <img src="${url}" alt="Clipboard rasm" style="max-width: 100%; border-radius: 12px; display: inline-block;" />
                </div><p><br/></p>
              `;
              execCmd("insertHTML", imgHtml);
            } catch (err: any) {
              console.error("Clipboard rasmini yuklashda xatolik:", err);
            } finally {
              setUploadingImage(false);
            }
            return;
          }
        }
      }
    }

    // 2. HTML paste (Word yoki ChatGPT dan copy-paste qilinganda, ayniqsa jadvallar)
    const pastedHtml = e.clipboardData?.getData("text/html");
    if (pastedHtml) {
      e.preventDefault();

      // Word va ChatGPT HTML-ini tozalash va jadvallarga aniq stillar berish
      try {
        const parser = new DOMParser();
        let preCleaned = pastedHtml
          .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
          .replace(/<\/?w:[^>]*>/gi, "")
          .replace(/<\/?m:[^>]*>/gi, "")
          .replace(/mso-[^;"]*;?/gi, "");

        const doc = parser.parseFromString(preCleaned, "text/html");

        // Word jadvallarini aniq border va padding bilan boyitish
        const tables = doc.querySelectorAll("table");
        tables.forEach((tbl) => {
          tbl.classList.add("rich-table");
          tbl.setAttribute("border", "1");
          tbl.style.width = "100%";
          tbl.style.borderCollapse = "collapse";
          tbl.style.margin = "16px 0";
          tbl.style.border = "1px solid #cbd5e1";

          const cells = tbl.querySelectorAll("th, td");
          cells.forEach((cell) => {
            (cell as HTMLElement).style.border = "1px solid #cbd5e1";
            (cell as HTMLElement).style.padding = "8px 12px";
            (cell as HTMLElement).style.verticalAlign = "top";
          });

          // Birinchi qatorga sarlavha ko'rinishi
          const firstRow = tbl.querySelector("tr");
          if (firstRow) {
            firstRow.querySelectorAll("td, th").forEach((th) => {
              (th as HTMLElement).style.backgroundColor = "#f8fafc";
              (th as HTMLElement).style.fontWeight = "600";
            });
          }
        });

        // Ortiqcha Mso klasslarni tozalash
        doc.querySelectorAll("[class*='Mso']").forEach((el) => {
          el.removeAttribute("class");
        });

        const finalHtml = doc.body.innerHTML;
        if (finalHtml && finalHtml.trim()) {
          execCmd("insertHTML", finalHtml);
          return;
        }
      } catch (err) {
        console.warn("HTML tozalashda xatolik:", err);
      }
    }

    // 3. Tab-separated matn (Word yoki Excel jadvali matn sifatida nusxalanganda)
    const plainText = e.clipboardData?.getData("text/plain");
    if (plainText && plainText.includes("\t")) {
      const rows = plainText.trim().split(/\r?\n/);
      if (rows.length > 1 && rows.some((r) => r.includes("\t"))) {
        e.preventDefault();
        const tableHtml = `
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #cbd5e1;">
            <tbody>
              ${rows
                .map((row, rIdx) => {
                  const cols = row.split("\t");
                  const tag = rIdx === 0 ? "th" : "td";
                  const bg = rIdx === 0 ? "background-color: #f8fafc; font-weight: 600;" : "";
                  return `<tr>${cols
                    .map(
                      (c) =>
                        `<${tag} style="border: 1px solid #cbd5e1; padding: 8px 12px; ${bg}">${
                          c.trim() || "&nbsp;"
                        }</${tag}>`
                    )
                    .join("")}</tr>`;
                })
                .join("")}
            </tbody>
          </table><p><br/></p>
        `;
        execCmd("insertHTML", tableHtml);
        return;
      }
    }
  }

  // Switch between WYSIWYG and HTML code
  function toggleCodeView() {
    if (showHtmlCode) {
      // HTML koddan vizualga o'tish
      onChange(htmlCode);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlCode;
      }
      setShowHtmlCode(false);
    } else {
      // Vizualdan HTML kodga o'tish
      if (editorRef.current) {
        const h = editorRef.current.innerHTML;
        setHtmlCode(h);
      }
      setShowHtmlCode(true);
    }
  }

  const editorMarkup = (
    <div
      className={`border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col transition-all overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen bg-white"
          : "relative"
      }`}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* TOP TOOLBAR */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap items-center gap-1 text-gray-700 select-none">
        {/* Undo / Redo */}
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5 mr-1">
          <button
            type="button"
            onClick={() => execCmd("undo")}
            title="Bekor qilish (Ctrl+Z)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("redo")}
            title="Qaytarish (Ctrl+Y)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Font Family Selector */}
        <select
          disabled={showHtmlCode}
          onChange={(e) => applyFontFamily(e.target.value)}
          defaultValue="Inter, sans-serif"
          className="bg-white border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.name}
            </option>
          ))}
        </select>

        {/* Font Size Selector */}
        <select
          disabled={showHtmlCode}
          onChange={(e) => applyFontSize(e.target.value)}
          defaultValue="16px"
          className="bg-white border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Heading Style */}
        <select
          disabled={showHtmlCode}
          onChange={(e) => applyHeading(e.target.value)}
          defaultValue="p"
          className="bg-white border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="p">Oddiy matn (Paragraph)</option>
          <option value="h1">Katta Sarlavha (H1)</option>
          <option value="h2">O'rta Sarlavha (H2)</option>
          <option value="h3">Kichik Sarlavha (H3)</option>
        </select>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Basic Text Formatting */}
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
          <button
            type="button"
            onClick={() => execCmd("bold")}
            title="Qalin (Bold - Ctrl+B)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-indigo-600 font-bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("italic")}
            title="Kursiv (Italic - Ctrl+I)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-indigo-600 italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("underline")}
            title="Tagiga chizilgan (Underline - Ctrl+U)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-indigo-600"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("strikeThrough")}
            title="O'chirilgan (Strikethrough)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-indigo-600"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Text Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            title="Matn rangi"
            className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 text-xs font-medium"
          >
            <Palette className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Rang</span>
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-30 w-52 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500">Matn rangi:</p>
              <div className="grid grid-cols-6 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      execCmd("foreColor", c);
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded-md border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span>Boshqa rang:</span>
                <input
                  type="color"
                  onChange={(e) => {
                    execCmd("foreColor", e.target.value);
                    setShowColorPicker(false);
                  }}
                  className="w-7 h-7 p-0 rounded cursor-pointer border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Highlight Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            title="Fon / Marker bilan belgilash"
            className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 text-xs font-medium"
          >
            <Highlighter className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Marker</span>
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-30 w-52 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500">Marker rangi:</p>
              <div className="grid grid-cols-4 gap-2">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => {
                      execCmd("hiliteColor", h.value);
                      setShowHighlightPicker(false);
                    }}
                    className="text-xs p-1 rounded-md border border-gray-200 hover:scale-105 font-medium text-gray-800 text-center"
                    style={{ backgroundColor: h.value }}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Alignment */}
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
          <button
            type="button"
            onClick={() => execCmd("justifyLeft")}
            title="Chapga tekislash"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyCenter")}
            title="O'rtaga tekislash"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyRight")}
            title="O'ngga tekislash"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyFull")}
            title="Kenglik bo'yicha tekislash (Justify)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Lists & Blocks */}
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
          <button
            type="button"
            onClick={() => execCmd("insertUnorderedList")}
            title="Nuqtali ro'yxat (Bullets)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("insertOrderedList")}
            title="Raqamlangan ro'yxat"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("formatBlock", "<blockquote>")}
            title="Iqtibos (Blockquote)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("formatBlock", "<pre>")}
            title="Kod bloki (Code block)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("insertHorizontalRule")}
            title="Chiziq qo'yish (Divider)"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-700"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Media & Advanced Inserts */}
        <div className="flex items-center gap-1">
          {/* Image Upload Button */}
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            title="Matn orasiga rasm joylash"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors"
          >
            {uploadingImage ? (
              <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>Rasm qo'shish</span>
          </button>

          {/* YouTube Video Button */}
          <button
            type="button"
            onClick={() => {
              saveSelection();
              setShowVideoModal(true);
            }}
            title="Matn orasiga YouTube video joylash"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold border border-red-200 transition-colors"
          >
            <Video className="w-4 h-4 text-red-600" />
            <span>YouTube Video</span>
          </button>

          {/* Table Insert Button */}
          <button
            type="button"
            onClick={() => setShowTableModal(!showTableModal)}
            title="Jadval kiritish"
            className="p-1.5 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-700"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {/* Link Button */}
          <button
            type="button"
            onClick={insertLink}
            title="Havola qo'shish (Link)"
            className="p-1.5 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-700"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {/* Clear Format */}
          <button
            type="button"
            onClick={() => execCmd("removeFormat")}
            title="Formatni tozalash"
            className="p-1.5 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Right tools: HTML Code View & Fullscreen */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleCodeView}
            title={showHtmlCode ? "Vizual tahrirga qaytish" : "HTML kod ko'rinishi"}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 ${
              showHtmlCode
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <CodeXml className="w-4 h-4" />
            <span className="hidden sm:inline">{showHtmlCode ? "Vizual" : "HTML"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Kichraytirish" : "To'liq ekran (Fullscreen)"}
            className="p-1.5 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-700"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TABLE INSERT MODAL */}
      {showTableModal && (
        <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Qatorlar (Rows):</span>
            <input
              type="number"
              min={1}
              max={15}
              value={tableRows}
              onChange={(e) => setTableRows(Number(e.target.value))}
              className="w-16 p-1 border border-gray-300 rounded bg-white text-center font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Ustunlar (Cols):</span>
            <input
              type="number"
              min={1}
              max={10}
              value={tableCols}
              onChange={(e) => setTableCols(Number(e.target.value))}
              className="w-16 p-1 border border-gray-300 rounded bg-white text-center font-bold"
            />
          </div>
          <button
            type="button"
            onClick={insertTable}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
          >
            Jadvalni joylash
          </button>
          <button
            type="button"
            onClick={() => setShowTableModal(false)}
            className="text-gray-500 hover:text-gray-800 font-medium"
          >
            Bekor qilish
          </button>
        </div>
      )}

      {/* YouTube Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-gray-900">YouTube Video Qo'shish</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoUrl("");
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              YouTube video havolasini kiriting. Video to'g'ridan-to'g'ri dars matnining kursor turgan joyiga joylashtiriladi.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                YouTube Video Havolasi (URL)
              </label>
              <input
                type="url"
                autoFocus
                placeholder="Masalan: https://www.youtube.com/watch?v=... yoki https://youtu.be/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsertYouTube();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoUrl("");
                }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleInsertYouTube}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Videoni Joylash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN EDITING CANVAS */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6">
        {showHtmlCode ? (
          <textarea
            value={htmlCode}
            onChange={(e) => {
              setHtmlCode(e.target.value);
              onChange(e.target.value);
            }}
            className="w-full h-full font-mono text-xs p-4 bg-gray-900 text-emerald-400 rounded-xl border border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            style={{ minHeight }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            data-placeholder={placeholder}
            className="rich-editor-canvas bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 leading-relaxed mx-auto max-w-4xl"
            style={{
              minHeight,
              fontFamily: "Inter, sans-serif",
            }}
          />
        )}
      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            So'zlar soni: <strong className="text-gray-800">{stats.words}</strong>
          </span>
          <span>
            Belgilar: <strong className="text-gray-800">{stats.chars}</strong>
          </span>
          <span className="hidden sm:inline text-indigo-600 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 inline" /> ChatGPT va Word dan copy-paste to'liq qo'llab-quvvatlanadi
          </span>
        </div>
        <div className="text-gray-400">
          Wisdom Rich Document Editor
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return editorMarkup;
  }

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-gray-800">
          {label}
        </label>
      )}
      {editorMarkup}
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
