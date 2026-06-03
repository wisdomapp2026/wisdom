export default function Profile() {
  return (
    <div className="page-content">
      <header className="px-5 pt-4 flex justify-between"><h1 className="text-2xl font-bold">Profil</h1><button className="text-gray-400">⚙️</button></header>
      {/* Avatar */}
      <div className="flex flex-col items-center mt-6">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-3xl">👤</span></div>
        <h2 className="text-xl font-bold mt-3">Asadbek Olimov</h2>
        <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full mt-1.5">Premium Talaba</span>
        <div className="flex gap-8 mt-4">
          <div className="text-center"><p className="text-[10px] text-gray-500">KURSLAR</p><p className="text-lg font-bold">3</p></div>
          <div className="text-center"><p className="text-[10px] text-gray-500">TESTLAR</p><p className="text-lg font-bold">27</p></div>
          <div className="text-center"><p className="text-[10px] text-gray-500">NATIJA</p><p className="text-lg font-bold">84%</p></div>
        </div>
        <button className="mt-4 border-2 border-primary-500 text-primary-500 font-semibold px-6 py-2 rounded-xl text-sm">Profilni tahrirlash</button>
      </div>
      {/* Sections */}
      <section className="px-5 mt-8"><h3 className="font-bold text-gray-900 mb-3">Faol obunalar</h3>
        {[{t:"Attestatsiya",d:"11.06.2024"},{t:"Milliy Sertifikat",d:"11.09.2024"},{t:"Digital SAT",d:"11.11.2024"}].map((s,i)=>(
          <div key={i} className="flex items-center py-3 border-b border-gray-50"><span className="mr-2.5">📋</span><div className="flex-1"><p className="font-medium text-sm">{s.t}</p><p className="text-[11px] text-gray-500">📅 Muddati: {s.d}</p></div><span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">Faol</span></div>
        ))}
      </section>
      <section className="px-5 mt-6"><h3 className="font-bold text-gray-900 mb-3">So'nggi natijalar</h3>
        {[{t:"Kasrlar testi",s:"18/20"},{t:"Punktuatsiya",s:"15/20"},{t:"Reading Mock",s:"32/40"}].map((r,i)=>(
          <div key={i} className="flex items-center py-3 border-b border-gray-50"><span className="mr-2.5">✅</span><p className="flex-1 font-medium text-sm">{r.t}</p><p className="font-bold text-primary-500">{r.s}</p></div>
        ))}
      </section>
      <section className="px-5 mt-6"><h3 className="font-bold text-gray-900 mb-3">To'lovlar</h3>
        {[{t:"Matematika kursi",d:"11.06.2026",a:"250,000 so'm"},{t:"Digital SAT Prep",d:"06.2025",a:"400,000 so'm"},{t:"IELTS Mock Exam",d:"06.04.2025",a:"120,000 so'm"}].map((p,i)=>(
          <div key={i} className="flex items-center py-3 border-b border-gray-50"><span className="mr-2.5">💳</span><div className="flex-1"><p className="font-medium text-sm">{p.t}</p><p className="text-[11px] text-gray-500">{p.d}</p></div><p className="text-sm font-medium">{p.a}</p></div>
        ))}
      </section>
      <section className="px-5 mt-6"><h3 className="font-bold text-gray-900 mb-3">Sozlamalar</h3>
        {[{i:"👤",l:"Shaxsiy ma'lumotlar"},{i:"🔒",l:"Xavfsizlik"},{i:"🔔",l:"Bildirishnomalar"},{i:"❓",l:"Yordam"},{i:"🚪",l:"Chiqish"}].map((m,i)=>(
          <button key={i} className="flex items-center w-full py-3.5 border-b border-gray-50"><span className="mr-3">{m.i}</span><span className="flex-1 text-left text-gray-900">{m.l}</span><span className="text-gray-300">›</span></button>
        ))}
      </section>
    </div>
  );
}
