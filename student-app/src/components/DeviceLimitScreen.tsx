import { Monitor, Smartphone, LogOut } from "lucide-react";
import { supabase } from "@shared/supabase";
import type { DeviceSession } from "@shared/repositories/deviceRepository";

interface Props {
  activeDevices: DeviceSession[];
  maxDevices: number;
}

/**
 * Qurilma limiti oshganida ko'rsatiladigan ekran.
 * Foydalanuvchi tizimdan chiqishi yoki boshqa qurilmadan chiqishi kerak.
 */
export default function DeviceLimitScreen({ activeDevices, maxDevices }: Props) {
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 60000);
    if (diff < 1) return "hozir faol";
    if (diff < 60) return `${diff} daqiqa oldin`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} soat oldin`;
    return `${Math.floor(hours / 24)} kun oldin`;
  }

  function getDeviceIcon(name: string) {
    if (name.includes("Android") || name.includes("iOS") || name.includes("iPhone")) {
      return <Smartphone className="w-5 h-5 text-blue-500" />;
    }
    return <Monitor className="w-5 h-5 text-gray-500" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      {/* Icon */}
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Monitor className="w-10 h-10 text-red-500" />
      </div>

      <h1 className="text-xl font-bold text-gray-900 text-center">Qurilma limiti tugadi</h1>
      <p className="text-sm text-gray-500 text-center mt-2 max-w-xs">
        Sizning hisobingiz bir vaqtda maksimum <strong>{maxDevices} ta</strong> qurilmada ishlatilishi mumkin.
        Hozirda boshqa qurilmalar faol.
      </p>

      {/* Active devices list */}
      <div className="w-full max-w-sm mt-6 bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Faol qurilmalar ({activeDevices.length}/{maxDevices})</p>
        </div>
        <div className="divide-y divide-gray-50">
          {activeDevices.map((device) => (
            <div key={device.id} className="px-4 py-3 flex items-center gap-3">
              {getDeviceIcon(device.deviceName)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{device.deviceName}</p>
                <p className="text-xs text-gray-400">{formatTime(device.lastSeen)}</p>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-sm mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700">
          💡 Boshqa qurilmadan chiqib, qaytadan bu qurilmadan kirishga urinib ko'ring.
          Yoki admin bilan bog'laning.
        </p>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="mt-6 w-full max-w-sm flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium active:bg-gray-200 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Tizimdan chiqish
      </button>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Muammo davom etsa — admin bilan bog'laning
      </p>
    </div>
  );
}
