export default function Tests() {
  return (
    <div className="page-content">
      <header className="px-5 pt-4"><h1 className="text-2xl font-bold">Testlar</h1></header>
      {/* Stats */}
      <div className="mx-5 mt-3 bg-primary-500 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-[3px] border-white/30 flex items-center justify-center">
          <div className="text-center"><p className="text-white font-bold text-lg">84%</p><p className="text-white/60 text-[8px]">O'RTACHA</p></div>
        </div>
        <div><p className="text-white/80 text-xs font-semibold">ISHLANGAN TESTLAR</p><p className="text-white text-3xl font-bold">27 ta</p><p className="text-white/60 text-[11px] mt-0.5">OXIRGI NATIJA: 18/20</p></div>
      </div>
      {/* Search */}
      <div className="mx-5 mt-4 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <span className="text-gray-400 mr-2">🔍</span><input placeholder="Testlarni qidirish" className="flex-1 bg-transparent text-sm outline-none" />
      </div>
      {/* Categories */}
      <div className="flex gap-2 px-5 mt-3 overflow-x-auto">
        {["Barchasi","Attestatsiya","Milliy sertifikat","Prezident maktabi"].map((c,i)=>(
          <button key={c} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${i===0?"bg-primary-500 text-white":"bg-gray-100 text-gray-600"}`}>{c}</button>
        ))}
      </div>
      {/* Mavzu testlari */}
      <section className="px-5 mt-6"><div className="flex justify-between mb-3"><h3 className="font-bold text-gray-900">Mavzu testlari</h3><button className="text-sm text-primary-500 font-medium">Barchasi</button></div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[{title:"Kasrlar va foizlar",q:20,t:"20 daq",isNew:true},{title:"Geometriya",q:15,t:"15 daq",isNew:false}].map((t,i)=>(
            <div key={i} className="shrink-0 w-44 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2"><span className="text-primary-500">📝</span>{t.isNew&&<span className="bg-red-500 text-white text-[8px] font-bold px-1.5 rounded">Yangi</span>}</div>
              <p className="font-semibold text-sm text-gray-900 truncate">{t.title}</p>
              <p className="text-[10px] text-gray-500 mt-1">📋 {t.q} savol · ⏱ {t.t}</p>
              <div className="flex gap-1.5 mt-3"><button className="flex-1 bg-primary-500 text-white text-[11px] font-semibold py-1.5 rounded-lg">Boshlash</button><button className="flex-1 border border-gray-200 text-[11px] font-semibold text-gray-600 py-1.5 rounded-lg">Davom</button></div>
            </div>
          ))}
        </div>
      </section>
      {/* So'nggi natijalar */}
      <section className="px-5 mt-6"><div className="flex justify-between mb-3"><h3 className="font-bold text-gray-900">So'nggi natijalar</h3><button className="text-sm text-primary-500 font-medium">Barchasi</button></div>
        {[{title:"Logarifmik tenglamalar",score:"90%",time:"Bugun, 14:20"},{title:"Trigonometriya asoslari",score:"75%",time:"Kecha, 18:45"}].map((r,i)=>(
          <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl p-4 mb-2">
            <div><p className="font-medium text-gray-900">{r.title}</p><p className="text-[11px] text-gray-500 mt-0.5">{r.time}</p></div>
            <p className="text-lg font-bold text-primary-500">{r.score}</p>
          </div>
        ))}
      </section>
      {/* Motivation */}
      <div className="mx-5 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-lg">💡</span><p className="text-sm text-yellow-800">Har bir test sizni maqsadingizga yaqinlashtiradi. To'xtamang!</p>
      </div>
      {/* Leaderboard */}
      <section className="px-5 mt-6"><div className="flex justify-between mb-3"><h3 className="font-bold text-gray-900">Eng yaxshi natijalar</h3><button className="text-sm text-primary-500 font-medium">Barchasi</button></div>
        {[{name:"Ali Olimov",score:"95%",rank:1,c:"#FFD700"},{name:"Vali Toshmatov",score:"92%",rank:2,c:"#C0C0C0"},{name:"Aziza Karimova",score:"90%",rank:3,c:"#CD7F32"}].map(u=>(
          <div key={u.rank} className="flex items-center py-3 border-b border-gray-50">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor:u.c}}>{u.rank}</div>
            <div className="w-8 h-8 bg-gray-200 rounded-full ml-2.5"></div>
            <p className="flex-1 ml-2.5 font-medium text-gray-900">{u.name}</p>
            <p className="font-bold text-primary-500">{u.score}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
