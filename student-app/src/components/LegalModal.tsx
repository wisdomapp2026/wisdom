import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@shared/supabase";

interface LegalModalProps {
  open: boolean;
  type: "terms" | "privacy";
  onClose: () => void;
}

const DEFAULT_TERMS = `Foydalanish shartlari

Oxirgi yangilanish: 2024-yil, 1-dekabr

1. UMUMIY QOIDALAR

1.1. Ushbu foydalanish shartlari (keyingi o'rinlarda – "Shartlar") EduKids mobil ilovasi (keyingi o'rinlarda – "Ilova") va uning xizmatlaridan foydalanish qoidalarini belgilaydi.

1.2. Ilovadan foydalanish orqali siz ushbu Shartlarga rozilik bildirasiz. Agar siz Shartlarga rozi bo'lmasangiz, iltimos, Ilovadan foydalanmang.

1.3. Ilova 6 yoshdan 18 yoshgacha bo'lgan o'quvchilar uchun mo'ljallangan ta'lim platformasidir.

2. RO'YXATDAN O'TISH VA HISOB

2.1. Ilovadan to'liq foydalanish uchun ro'yxatdan o'tish talab etiladi.

2.2. Ro'yxatdan o'tishda siz haqiqiy ma'lumotlaringizni kiritishingiz shart.

2.3. 16 yoshga to'lmagan foydalanuvchilar ota-onasi yoki qonuniy vasiysi roziligida ro'yxatdan o'tishlari kerak.

2.4. Hisobingiz xavfsizligi uchun siz javobgarsiz. Parolingizni uchinchi shaxslarga bermang.

3. XIZMATLAR

3.1. Ilova quyidagi xizmatlarni taqdim etadi:
- Matematika, fizika, kimyo va boshqa fanlar bo'yicha video darslar
- Interaktiv testlar va mashqlar
- O'quv materiallari va konspektlar
- Bilim darajasini baholash va sertifikatlash

3.2. Ba'zi xizmatlar pullik (Premium) bo'lib, alohida obuna talab qiladi.

3.3. Biz xizmatlar tarkibini oldindan ogohlantirmasdan o'zgartirish huquqini saqlab qolamiz.

4. TO'LOV VA OBUNA

4.1. Premium obuna narxlari Ilovada ko'rsatilgan.

4.2. To'lov amalga oshirilgandan so'ng, obuna belgilangan muddat davomida amal qiladi.

4.3. Obunani bekor qilish keyingi to'lov muddatidan boshlab amalga oshiriladi.

4.4. Qaytarish siyosati: to'lovdan keyin 3 kun ichida pulni qaytarish so'rovi yuborish mumkin.

5. FOYDALANUVCHI MAJBURIYATLARI

5.1. Foydalanuvchi quyidagilarga rozi bo'ladi:
- Ilovadan faqat qonuniy maqsadlarda foydalanish
- Boshqa foydalanuvchilarning huquqlarini hurmat qilish
- O'quv materiallarini ruxsatsiz tarqatmaslik
- Ilova xavfsizligiga tahdid soluvchi harakatlar qilmaslik

5.2. Qoidalarni buzish hisobning bloklanishiga olib kelishi mumkin.

6. INTELLEKTUAL MULK

6.1. Ilovadagi barcha materiallar (darslar, testlar, rasmlar, videolar) EduKids mulki hisoblanadi.

6.2. Materiallarni ruxsatsiz nusxalash, tarqatish yoki qayta nashr etish taqiqlanadi.

7. JAVOBGARLIKNI CHEKLASH

7.1. Ilova "boricha" tamoyili asosida taqdim etiladi.

7.2. Biz texnik nosozliklar, ma'lumotlar yo'qotilishi yoki xizmat uzilishi uchun javobgar emasmiz.

7.3. Biz uchinchi tomon xizmatlari (to'lov tizimlari, ijtimoiy tarmoqlar) ishlashi uchun kafolat bermaymiz.

8. SHARTLARNI O'ZGARTIRISH

8.1. Biz ushbu Shartlarni istalgan vaqtda o'zgartirish huquqini saqlab qolamiz.

8.2. O'zgarishlar Ilovada e'lon qilingan paytdan boshlab kuchga kiradi.

8.3. Ilovadan foydalanishni davom ettirish yangi Shartlarga rozilik hisoblanadi.

9. ALOQA

Savollar yoki shikoyatlar uchun: support@edukids.uz

© 2024 EduKids. Barcha huquqlar himoyalangan.`;

const DEFAULT_PRIVACY = `Maxfiylik siyosati

Oxirgi yangilanish: 2024-yil, 1-dekabr

1. KIRISH

1.1. Ushbu maxfiylik siyosati EduKids mobil ilovasi foydalanuvchilarining shaxsiy ma'lumotlarini qanday yig'ish, saqlash va ishlatishimiz haqida ma'lumot beradi.

1.2. Ilovadan foydalanish orqali siz ushbu siyosatga rozilik bildirasiz.

2. YIG'ILADIGAN MA'LUMOTLAR

2.1. Ro'yxatdan o'tish ma'lumotlari:
- Ism va familiya
- Telefon raqam
- Email manzil (ixtiyoriy)
- Tug'ilgan sana (ixtiyoriy)

2.2. Foydalanish ma'lumotlari:
- Ilova ichidagi harakatlar (darslarni ko'rish, testlar natijasi)
- O'quv progressi va statistika
- Qurilma turi va operatsion tizim versiyasi

2.3. Texnik ma'lumotlar:
- IP manzil
- Qurilma identifikatori
- Ilova versiyasi

3. MA'LUMOTLARDAN FOYDALANISH

3.1. Yig'ilgan ma'lumotlar quyidagi maqsadlarda ishlatiladi:
- Xizmatlarni taqdim etish va yaxshilash
- Shaxsiylashtirilgan o'quv tavsiyalari berish
- Texnik muammolarni hal qilish
- Xavfsizlikni ta'minlash
- Statistik tahlil (anonim holda)

3.2. Biz ma'lumotlaringizni uchinchi shaxslarga SOTMAYMIZ yoki BERMАYMIZ.

4. MA'LUMOTLARNI SAQLASH

4.1. Ma'lumotlar xavfsiz serverlarda shifrlanganholda saqlanadi.

4.2. Biz ma'lumotlarni faqat kerakli muddat davomida saqlaymiz.

4.3. Hisob o'chirilganda, shaxsiy ma'lumotlar 30 kun ichida o'chiriladi.

5. FOYDALANUVCHI HUQUQLARI

5.1. Siz quyidagi huquqlarga egasiz:
- O'z ma'lumotlaringizni ko'rish va yuklab olish
- Ma'lumotlarni tuzatish yoki yangilash
- Hisobni o'chirish va ma'lumotlarni olib tashlash so'rovi
- Marketing xabarlaridan voz kechish

5.2. Huquqlaringizdan foydalanish uchun support@edukids.uz ga murojaat qiling.

6. BOLALAR MAXFIYLIGI

6.1. Biz 16 yoshdan kichik foydalanuvchilarning maxfiyligiga alohida e'tibor beramiz.

6.2. 16 yoshdan kichik foydalanuvchilardan minimal ma'lumot olamiz.

6.3. Ota-onalar istalgan vaqtda farzandlarining ma'lumotlarini ko'rish yoki o'chirish so'rovini yuborishi mumkin.

7. COOKIE VA KUZATISH

7.1. Ilova foydalanuvchi sessiyasini saqlash uchun local storage ishlatadi.

7.2. Biz uchinchi tomon kuzatish xizmatlari (analytics) ishlatamiz (faqat anonim statistika uchun).

8. XAVFSIZLIK

8.1. Ma'lumotlar SSL/TLS shifrlash orqali uzatiladi.

8.2. Serverlar xavfsiz ma'lumotlar markazlarida joylashgan.

8.3. Doimiy xavfsizlik tekshiruvlari o'tkaziladi.

9. O'ZGARISHLAR

9.1. Biz ushbu siyosatni vaqti-vaqti bilan yangilashimiz mumkin.

9.2. Muhim o'zgarishlar haqida Ilova orqali xabar beramiz.

10. ALOQA

Maxfiylik masalalari bo'yicha: support@edukids.uz

© 2024 EduKids. Barcha huquqlar himoyalangan.`;

export default function LegalModal({ open, type, onClose }: LegalModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadContent();
    }
  }, [open, type]);

  async function loadContent() {
    setLoading(true);
    try {
      const key = type === "terms" ? "legal_terms" : "legal_privacy";
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (data?.value) {
        setContent(typeof data.value === "string" ? data.value : (data.value as any).content || "");
      } else {
        // Default matnni ishlatish
        setContent(type === "terms" ? DEFAULT_TERMS : DEFAULT_PRIVACY);
      }
    } catch {
      setContent(type === "terms" ? DEFAULT_TERMS : DEFAULT_PRIVACY);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {type === "terms" ? "Foydalanish shartlari" : "Maxfiylik siyosati"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>

        {/* Footer — confirm button */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-primary-500 text-white font-semibold py-3 rounded-xl active:scale-[0.98] transition-transform"
          >
            Tanishdim, OK
          </button>
        </div>
      </div>
    </div>
  );
}
