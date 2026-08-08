import { supabase, toCamel, toSnake, stringToUUID } from "../supabase";

export const MAX_DEVICES = 3;

export interface DeviceSession {
  id: string; // deviceId
  userId: string;
  deviceName: string;
  lastSeen: number;
  createdAt: number;
  isActive: boolean;
}

// Helper to convert DB user_devices to DeviceSession
function mapSession(dbDev: any): DeviceSession {
  const camel = toCamel(dbDev);
  return {
    id: camel.deviceId, // Map device_id back to id expected by frontend
    userId: camel.userId,
    deviceName: camel.deviceName,
    lastSeen: Number(camel.lastSeen),
    createdAt: Number(camel.createdAt),
    isActive: camel.isActive
  };
}

export async function registerDevice(userId: string, deviceId: string, deviceName: string): Promise<void> {
  const userUuid = stringToUUID(userId);
  const docId = `${userUuid}_${deviceId}`;
  
  const { error } = await supabase
    .from("user_devices")
    .upsert({
      id: docId,
      device_id: deviceId,
      user_id: userUuid,
      device_name: deviceName,
      last_seen: Date.now(),
      created_at: Date.now(),
      is_active: true
    });

  if (error) {
    // Foreign key constraint xatosini ignore qilish (user profil yaratilmagan)
    if (error.message.includes("violates foreign key constraint")) {
      console.warn("User profile not found, skipping device registration");
      return;
    }
    throw new Error(error.message);
  }
}

export async function updateDeviceHeartbeat(userId: string, deviceId: string): Promise<boolean> {
  const userUuid = stringToUUID(userId);
  const docId = `${userUuid}_${deviceId}`;

  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("id", docId)
    .maybeSingle();

  if (error || !data) return false;

  const { error: updErr } = await supabase
    .from("user_devices")
    .update({ last_seen: Date.now(), is_active: true })
    .eq("id", docId);

  return !updErr;
}

export async function removeDevice(userId: string, deviceId: string): Promise<void> {
  const userUuid = stringToUUID(userId);
  const docId = `${userUuid}_${deviceId}`;
  
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("id", docId);

  if (error) throw new Error(error.message);
}

export async function getUserDevices(userId: string): Promise<DeviceSession[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userUuid);

  if (error || !data) return [];
  return data.map(mapSession).sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function getActiveDeviceCount(userId: string): Promise<number> {
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  return devices.filter((d) => d.lastSeen >= cutoff && d.isActive).length;
}

export async function registerDeviceAndEvictOldestIfNeeded(
  userId: string,
  deviceId: string,
  deviceName: string
): Promise<{ allowed: boolean; evictedOldest: boolean }> {
  try {
    const userUuid = stringToUUID(userId);
    const docId = `${userUuid}_${deviceId}`;
    const devices = await getUserDevices(userId);
    const cutoff = Date.now() - 120000; // 2 daqiqa
    const activeDevices = devices.filter((d) => d.lastSeen >= cutoff && d.isActive);

    const existingDevice = activeDevices.find((d) => d.id === deviceId);
    if (existingDevice) {
      const { error } = await supabase
        .from("user_devices")
        .upsert({
          id: docId,
          device_id: deviceId,
          user_id: userUuid,
          device_name: deviceName,
          last_seen: Date.now(),
          created_at: existingDevice.createdAt || Date.now(),
          is_active: true
        });
        
      if (error && !error.message.includes("violates foreign key constraint")) {
        throw new Error(error.message);
      }
      return { allowed: true, evictedOldest: false };
    }

    let evicted = false;
    if (activeDevices.length >= MAX_DEVICES) {
      const sortedByCreated = [...activeDevices].sort((a, b) => a.createdAt - b.createdAt);
      const oldestDevice = sortedByCreated[0];
      if (oldestDevice) {
        const oldestDocId = `${userUuid}_${oldestDevice.id}`;
        await supabase.from("user_devices").delete().eq("id", oldestDocId);
        evicted = true;
      }
    }

    const { error } = await supabase
      .from("user_devices")
      .upsert({
        id: docId,
        device_id: deviceId,
        user_id: userUuid,
        device_name: deviceName,
        last_seen: Date.now(),
        created_at: Date.now(),
        is_active: true
      });

    if (error && !error.message.includes("violates foreign key constraint")) {
      throw new Error(error.message);
    }
    return { allowed: true, evictedOldest: evicted };
  } catch (err: any) {
    // Foreign key xatolari uchun allowed=true qaytaramiz
    if (err.message?.includes("violates foreign key constraint")) {
      console.warn("User profile not found, allowing login without device tracking");
      return { allowed: true, evictedOldest: false };
    }
    throw err;
  }
}

export async function getMultiDeviceUsers(): Promise<Array<{ userId: string; deviceCount: number; devices: DeviceSession[] }>> {
  const { data, error } = await supabase
    .from("user_devices")
    .select("*");

  if (error || !data) return [];
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const userMap: Record<string, DeviceSession[]> = {};

  data.forEach((d) => {
    const dev = mapSession(d);
    if (dev.lastSeen >= cutoff && dev.isActive) {
      if (!userMap[dev.userId]) userMap[dev.userId] = [];
      userMap[dev.userId].push(dev);
    }
  });

  const result: Array<{ userId: string; deviceCount: number; devices: DeviceSession[] }> = [];
  for (const [userId, devs] of Object.entries(userMap)) {
    if (devs.length >= MAX_DEVICES) {
      result.push({ userId, deviceCount: devs.length, devices: devs });
    }
  }

  return result;
}

export async function canDeviceLogin(userId: string, deviceId: string): Promise<{ allowed: boolean; activeDevices: DeviceSession[] }> {
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const activeDevices = devices.filter((d) => d.lastSeen >= cutoff && d.isActive);

  if (activeDevices.some((d) => d.id === deviceId)) {
    return { allowed: true, activeDevices };
  }

  if (activeDevices.length < MAX_DEVICES) {
    return { allowed: true, activeDevices };
  }

  return { allowed: false, activeDevices };
}

export async function forceRemoveDevice(userId: string, deviceId: string): Promise<void> {
  await removeDevice(userId, deviceId);
}

export async function removeAllUserDevices(userId: string): Promise<void> {
  const userUuid = stringToUUID(userId);
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("user_id", userUuid);

  if (error) throw new Error(error.message);
}

export async function cleanupStaleDevices(userId: string): Promise<void> {
  const userUuid = stringToUUID(userId);
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const stale = devices.filter((d) => d.lastSeen < cutoff);

  if (stale.length === 0) return;

  const staleIds = stale.map((d) => `${userUuid}_${d.id}`);
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .in("id", staleIds);

  if (error) throw new Error(error.message);
}
