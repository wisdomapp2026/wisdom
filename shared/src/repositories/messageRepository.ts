import { supabase, toCamel, toSnake, stringToUUID } from "../supabase";
import type { Message } from "../types";

export async function sendMessage(message: Message): Promise<void> {
  const snakeMsg = toSnake(message);
  snakeMsg.from_user_id = stringToUUID(message.fromUserId);
  if (message.toUserId) {
    snakeMsg.to_user_id = stringToUUID(message.toUserId);
  }

  const { error } = await supabase
    .from("messages")
    .upsert(snakeMsg);

  if (error) throw new Error(error.message);
}

export async function getAllMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Message[]>(data);
}

export async function getMessagesByUser(userId: string): Promise<Message[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("from_user_id", userUuid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Message[]>(data);
}

export async function getMessagesForUser(userId: string): Promise<Message[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("to_user_id", userUuid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Message[]>(data);
}

export async function getUnreadMessagesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("from_role", "student")
    .eq("is_read", false);

  if (error) return 0;
  return count || 0;
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
}
