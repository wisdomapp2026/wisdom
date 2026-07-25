import { useState, useEffect } from "react";
import { X, Star, Send } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@shared/firebase";
import { createTestimonial, createAdminNotification } from "@shared/repositories";
import { useAuth } from "../hooks/useAuth";
import type { AuthorInfo, Testimonial, AdminNotification } from "@shared/types";

const PLATFORM_ICONS: Record<string, { svg: string; color: string }> = {
  telegram: {
    color: "#0088cc",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  },
  instagram: {
    color: "#E4405F",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z"/></svg>`,
  },
  youtube: {
    color: "#FF0000",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  },
  facebook: {
    color: "#1877F2",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  },
  tiktok: {
    color: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  },
  twitter: {
    color: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>`,
  },
  linkedin: {
    color: "#0A66C2",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  },
  website: {
    color: "#6B7280",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthorModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) loadAuthor();
  }, [open]);

  async function loadAuthor() {
    try {
      const snap = await getDoc(doc(db, "settings", "author"));
      if (snap.exists()) {
        setAuthor(snap.data() as AuthorInfo);
      }
    } catch (err) {
      console.error("Muallif yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview() {
    if (!reviewText.trim() || !user) return;
    setSubmitting(true);

    const now = Date.now();
    const testimonial: Testimonial = {
      id: `review-${user.uid}-${now}`,
      name: user.displayName || user.email?.split("@")[0] || "Foydalanuvchi",
      avatarUrl: user.photoURL || undefined,
      role: "O'quvchi",
      text: reviewText.trim(),
      rating,
      isActive: false, // Admin tasdiqlagunga qadar yashirin
      order: 999,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createTestimonial(testimonial);

      // Admin bildirishnoma
      const notif: AdminNotification = {
        id: `notif-review-${now}`,
        type: "new_message",
        title: "Yangi fikr qoldirildi",
        body: `${testimonial.name} ${rating} yulduz bilan fikr qoldirdi: "${reviewText.trim().slice(0, 50)}..."`,
        isRead: false,
        data: { testimonialId: testimonial.id, userId: user.uid },
        createdAt: now,
      };
      await createAdminNotification(notif);

      setSubmitted(true);
      setReviewText("");
    } catch (err) {
      console.error("Fikr yuborishda xatolik:", err);
      alert("Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center z-10"
          >
            <X size={16} className="text-gray-500" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !author ? (
            <div className="p-8 text-center text-gray-500">
              <p>Muallif ma'lumotlari topilmadi</p>
            </div>
          ) : (
            <div className="p-6 pt-8">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-100 shadow-lg">
                  {author.avatarUrl ? (
                    <img src={author.avatarUrl} alt={author.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-500">
                      {author.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <h2 className="text-lg font-bold text-gray-900 text-center mt-4">{author.name}</h2>

              {/* Title/Institution */}
              {author.title && (
                <p className="text-sm text-primary-500 text-center mt-1 font-medium">
                  🎓 {author.title}
                </p>
              )}

              {/* Bio */}
              {author.bio && (
                <p className="text-sm text-gray-600 text-center mt-3 leading-relaxed">
                  {author.bio}
                </p>
              )}

              {/* Social Links */}
              {author.socialLinks && author.socialLinks.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] text-gray-400 text-center uppercase font-semibold tracking-wider mb-3">
                    Ijtimoiy tarmoqlar
                  </p>
                  <div className="flex justify-center gap-3">
                    {author.socialLinks.map((link, i) => {
                      const info = PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.website;
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform hover:shadow-xl"
                          style={{ backgroundColor: info.color }}
                        >
                          <span
                            className="w-5 h-5 block [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: info.svg }}
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gray-100 my-5" />

              {/* Review Section */}
              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Fikringiz yuborildi!</p>
                  <p className="text-xs text-gray-500 mt-1">Admin tekshirgandan keyin ko'rinadi.</p>
                </div>
              ) : user ? (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    💬 Fikr qoldirish
                  </h3>

                  {/* Star rating */}
                  <div className="flex items-center gap-1 mt-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="active:scale-110 transition-transform"
                      >
                        <Star
                          size={28}
                          className={star <= rating ? "text-yellow-400" : "text-gray-200"}
                          fill={star <= rating ? "#facc15" : "transparent"}
                        />
                      </button>
                    ))}
                    <span className="text-sm text-gray-400 ml-2">{rating}/5</span>
                  </div>

                  {/* Text input */}
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Kurs haqida fikringizni yozing..."
                    rows={3}
                    maxLength={500}
                    className="w-full mt-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />

                  {/* Submit */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting || !reviewText.trim()}
                    className="w-full mt-3 bg-primary-500 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 active:bg-primary-600 flex items-center justify-center gap-2"
                  >
                    {submitting ? "Yuborilmoqda..." : (
                      <>
                        <Send size={16} />
                        Yuborish
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-gray-500">Fikr qoldirish uchun tizimga kiring</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
