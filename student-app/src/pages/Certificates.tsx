import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Award, Globe } from "lucide-react";
import { getCertificatesByUser } from "@shared/repositories";
import { useAuth } from "../hooks/useAuth";
import type { Certificate } from "@shared/types";

type Lang = "uz" | "ru" | "en";

const TRANSLATIONS: Record<Lang, { title: string; subtitle: string; issued: string; completion: string; verify: string; download: string; noCerts: string; pageTitle: string }> = {
  uz: {
    pageTitle: "Sertifikatlarim",
    title: "TAMOMLASH SERTIFIKATI",
    subtitle: "shu bilan tasdiqlanadiki",
    issued: "Berilgan sana",
    completion: "Tamomlash darajasi",
    verify: "Tekshirish kodi",
    download: "Yuklab olish",
    noCerts: "Hali sertifikat yo'q. Kursni 85% yoki undan ortiq darajada tamomlab sertifikat oling!",
  },
  ru: {
    pageTitle: "Мои сертификаты",
    title: "СЕРТИФИКАТ ОБ ОКОНЧАНИИ",
    subtitle: "настоящим подтверждается, что",
    issued: "Дата выдачи",
    completion: "Уровень завершения",
    verify: "Код верификации",
    download: "Скачать",
    noCerts: "Пока нет сертификатов. Завершите курс на 85% или выше, чтобы получить сертификат!",
  },
  en: {
    pageTitle: "My Certificates",
    title: "CERTIFICATE OF COMPLETION",
    subtitle: "This is to certify that",
    issued: "Issued on",
    completion: "Completion rate",
    verify: "Verification code",
    download: "Download",
    noCerts: "No certificates yet. Complete a course at 85% or higher to earn a certificate!",
  },
};

export default function Certificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) loadCerts();
    else setLoading(false);
  }, [user]);

  async function loadCerts() {
    try {
      const certs = await getCertificatesByUser(user!.uid);
      setCertificates(certs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts: number, language: Lang): string {
    const d = new Date(ts);
    if (language === "uz") return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" });
    if (language === "ru") return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function generateCertificateCanvas(cert: Certificate, language: Lang): HTMLCanvasElement {
    const t = TRANSLATIONS[language];
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1200, 850);

    // Border
    ctx.strokeStyle = "#2196F3";
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, 1140, 790);

    // Inner border
    ctx.strokeStyle = "#e3f2fd";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 1100, 750);

    // Decorative corners
    ctx.fillStyle = "#2196F3";
    [50, 1100].forEach(x => {
      [50, 750].forEach(y => {
        ctx.beginPath();
        ctx.arc(x + 25, y + 25, 8, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Logo
    ctx.fillStyle = "#2196F3";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚡ Wisdom", 600, 100);

    // Title
    ctx.fillStyle = "#1a237e";
    ctx.font = "bold 36px Arial, sans-serif";
    ctx.fillText(t.title, 600, 170);

    // Subtitle
    ctx.fillStyle = "#666666";
    ctx.font = "18px Arial, sans-serif";
    ctx.fillText(t.subtitle, 600, 220);

    // Name
    const displayName = cert.userName?.trim() || "O'quvchi";
    ctx.fillStyle = "#111827";
    ctx.font = "bold 42px Arial, sans-serif";
    ctx.fillText(displayName, 600, 310);

    // Underline for name
    const nameWidth = ctx.measureText(displayName).width;
    ctx.strokeStyle = "#2196F3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(600 - nameWidth / 2 - 20, 325);
    ctx.lineTo(600 + nameWidth / 2 + 20, 325);
    ctx.stroke();

    // Course title
    ctx.fillStyle = "#333333";
    ctx.font = "24px Arial, sans-serif";
    ctx.fillText(`"${cert.courseTitle}"`, 600, 400);

    // Completion
    ctx.fillStyle = "#2196F3";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText(`${t.completion}: ${cert.completionPercent}%`, 600, 460);

    // Date
    ctx.fillStyle = "#666666";
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText(`${t.issued}: ${formatDate(cert.issuedAt, language)}`, 600, 530);

    // QR Code placeholder (text-based verification)
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(490, 560, 220, 220);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.strokeRect(490, 560, 220, 220);

    // QR pattern (simplified visual)
    const qrSize = 180;
    const qrX = 510;
    const qrY = 580;
    ctx.fillStyle = "#000000";
    const code = cert.verificationCode;
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        const charCode = code.charCodeAt((i * 15 + j) % code.length);
        if ((charCode + i + j) % 3 === 0) {
          ctx.fillRect(qrX + j * (qrSize / 15), qrY + i * (qrSize / 15), qrSize / 15 - 1, qrSize / 15 - 1);
        }
      }
    }
    // QR corner markers
    ctx.fillStyle = "#000000";
    [[qrX, qrY], [qrX + qrSize - 36, qrY], [qrX, qrY + qrSize - 36]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 36, 36);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 6, y + 6, 24, 24);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 10, y + 10, 16, 16);
    });

    // Verification code text
    ctx.fillStyle = "#999999";
    ctx.font = "12px monospace";
    ctx.fillText(`${t.verify}: ${cert.verificationCode}`, 600, 800);

    return canvas;
  }

  function handleDownloadImage(cert: Certificate) {
    const canvas = generateCertificateCanvas(cert, lang);
    const link = document.createElement("a");
    link.download = `certificate-${cert.courseTitle.replace(/\s+/g, "-")}-${lang}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleDownloadPDF(cert: Certificate) {
    const canvas = generateCertificateCanvas(cert, lang);
    const imgData = canvas.toDataURL("image/png");

    // Simple PDF generation using data URL and print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Certificate - ${cert.courseTitle}</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 100%; height: auto; }
              @media print { body { margin: 0; } img { width: 100%; } }
            </style>
          </head>
          <body><img src="${imgData}" /></body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const t = TRANSLATIONS[lang];

  return (
    <div className="page-content pb-24 max-w-mobile mx-auto">
      {/* Header */}
      <header className="px-5 pt-4 pb-3 flex items-center">
        <Link to="/profile" className="text-gray-500 shrink-0"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center">{t.pageTitle}</h1>
        <div className="shrink-0">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5"
          >
            <option value="uz">🇺🇿 O'zbek</option>
            <option value="ru">🇷🇺 Русский</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </header>

      {certificates.length === 0 ? (
        <div className="px-5 mt-16 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award size={36} className="text-primary-400" />
          </div>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{t.noCerts}</p>
          <Link to="/courses" className="inline-block mt-4 text-sm text-primary-500 font-medium">
            Kurslarni ko'rish →
          </Link>
        </div>
      ) : (
        <div className="px-5 space-y-4 mt-2">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {/* Certificate preview */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-5 text-center border-b border-gray-100">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award size={24} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{cert.courseTitle}</h3>
                <p className="text-xs text-gray-500 mt-1">{cert.completionPercent}% — {formatDate(cert.issuedAt, lang)}</p>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">{cert.verificationCode}</p>
              </div>

              {/* Actions */}
              <div className="flex divide-x divide-gray-100">
                <button
                  onClick={() => handleDownloadImage(cert)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-primary-500 font-medium active:bg-gray-50"
                >
                  <Download size={14} />
                  PNG
                </button>
                <button
                  onClick={() => handleDownloadPDF(cert)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-primary-500 font-medium active:bg-gray-50"
                >
                  <Download size={14} />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
