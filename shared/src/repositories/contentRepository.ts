import { supabase, toCamel, toSnake } from "../supabase";
import type { HomeBanner, NewsItem, AdminNotification } from "../types";

// ============ HOME BANNERS ============

export async function getAllBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase
    .from("home_banners")
    .select("*")
    .order("order", { ascending: true });
  if (error || !data) return [];
  return toCamel<HomeBanner[]>(data);
}

export async function getActiveBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase
    .from("home_banners")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });
  if (error || !data) return [];
  return toCamel<HomeBanner[]>(data);
}

export async function createBanner(banner: HomeBanner): Promise<void> {
  const { error } = await supabase.from("home_banners").upsert(toSnake(banner));
  if (error) throw new Error(error.message);
}

export async function updateBanner(id: string, data: Partial<HomeBanner>): Promise<void> {
  const { error } = await supabase
    .from("home_banners")
    .update({ ...toSnake(data), updated_at: Date.now() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from("home_banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============ NEWS ITEMS ============

export async function getAllNewsItems(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .order("order", { ascending: true });
  if (error || !data) return [];
  return toCamel<NewsItem[]>(data);
}

export async function getActiveNewsItems(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });
  if (error || !data) return [];
  return toCamel<NewsItem[]>(data);
}

export async function createNewsItem(item: NewsItem): Promise<void> {
  const { error } = await supabase.from("news_items").upsert(toSnake(item));
  if (error) throw new Error(error.message);
}

export async function updateNewsItem(id: string, data: Partial<NewsItem>): Promise<void> {
  const { error } = await supabase
    .from("news_items")
    .update({ ...toSnake(data), updated_at: Date.now() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteNewsItem(id: string): Promise<void> {
  const { error } = await supabase.from("news_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============ ADMIN NOTIFICATIONS ============

export async function createAdminNotification(notif: AdminNotification): Promise<void> {
  const { error } = await supabase.from("admin_notifications").upsert(toSnake(notif));
  if (error) throw new Error(error.message);
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return toCamel<AdminNotification[]>(data);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}
