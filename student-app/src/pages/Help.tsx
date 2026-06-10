import { Link } from "react-router-dom";
import { ChevronLeft, BookOpen, Play, FileText, MessageCircle, Star, Shield } from "lucide-react";

export default function Help() {
  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex items-center gap-3">
        <Link to="/profile" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <h1 className="text-xl font-bold">Yordam</h1>
      </header>

      <div className="px-5 mt-5">
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          EduKids ilovasidan foydalanish bo'yicha yo'riqnoma. Quyidagi bo'limlarni o'qib, dastur bilan ishlashni o'rganing.
        </p>

        <div className="space-y-4">
          <HelpSection
            icon={<BookOpen size={20} className="text-blue-500" />}
            title="Kurslar bilan ishlash"
            items={[
              "Bosh sahifadagi 'Kurslar' bo'limidan kurslarni tanlang",
              "Kurs ichiga kirib mavzularni ketma-ket o'rganing",
              "Har bir mavzuda misollar va video yechimlar mavjud",
              "Premium mavzular uchun obuna talab etiladi",
            ]}
          />

          <HelpSection
            icon={<Play size={20} className="text-green-500" />}
            title="Davom etish"
            items={[
              "Pastki menyudagi 'Davom etish' tugmasini bosing",
              "Oxirgi o'qigan mavzuingizdan davom etasiz",
              "Progressingiz avtomatik saqlanadi",
            ]}
          />

          <HelpSection
            icon={<FileText size={20} className="text-orange-500" />}
            title="Test ishlash"
            items={[
              "'Testlar' sahifasidan mavzu testlarini tanlang",
              "Savollarga javob berib 'Keyingi savol' bosing",
              "Testni istalgan vaqtda 'Yakunlash' tugmasi bilan tugatishingiz mumkin",
              "Natijalar savollar jadvali bilan ko'rsatiladi",
            ]}
          />

          <HelpSection
            icon={<Star size={20} className="text-yellow-500" />}
            title="Progress va reyting"
            items={[
              "Har bir mavzuni ochganingizda progress saqlanadi",
              "XP ballar yig'ib reytingda yuqoriga ko'tailing",
              "Kurs ichidagi o'rningizni progress kartada ko'ring",
            ]}
          />

          <HelpSection
            icon={<Shield size={20} className="text-purple-500" />}
            title="Obuna va to'lov"
            items={[
              "Premium kurslar uchun obuna sotib oling",
              "Promokod bilan chegirma oling (Profil > Promokodlarim)",
              "To'lov Click, Payme yoki Uzum Bank orqali amalga oshiriladi",
            ]}
          />

          <HelpSection
            icon={<MessageCircle size={20} className="text-primary-500" />}
            title="Admin bilan bog'lanish"
            items={[
              "Profil > Bog'lanish orqali adminga habar yuboring",
              "Savollaringiz va muammolaringizni yozing",
              "Admin tez orada javob beradi",
            ]}
          />
        </div>

        <div className="mt-6 bg-primary-50 border border-primary-100 rounded-xl p-4">
          <p className="text-sm text-primary-700 font-medium">Qo'shimcha yordam kerakmi?</p>
          <p className="text-xs text-primary-600 mt-1">Admin bilan to'g'ridan-to'g'ri bog'laning:</p>
          <Link to="/messages" className="inline-block mt-2 bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Habar yuborish
          </Link>
        </div>
      </div>
    </div>
  );
}

function HelpSection({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">{icon}</div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-primary-500 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
