import { supabase, toCamel, toSnake, stringToUUID } from "../supabase";
import type { TestList } from "../types";

export async function getAllTestLists(): Promise<TestList[]> {
  const { data, error } = await supabase
    .from("test_lists")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<TestList[]>(data);
}

export async function getPublishedTestLists(): Promise<TestList[]> {
  const { data, error } = await supabase
    .from("test_lists")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<TestList[]>(data);
}

export async function getTestListById(id: string): Promise<TestList | null> {
  const { data, error } = await supabase
    .from("test_lists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<TestList>(data);
}

export async function createTestList(testList: TestList): Promise<void> {
  const snakeList = toSnake(testList);
  if (snakeList.created_by) {
    snakeList.created_by = stringToUUID(snakeList.created_by);
  }

  const { error } = await supabase
    .from("test_lists")
    .upsert(snakeList);

  if (error) throw new Error(error.message);
}

export async function updateTestList(id: string, data: Partial<TestList>): Promise<void> {
  const snakeData = toSnake(data);
  if (snakeData.created_by) {
    snakeData.created_by = stringToUUID(snakeData.created_by);
  }

  const { error } = await supabase
    .from("test_lists")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTestList(id: string): Promise<void> {
  const { error } = await supabase
    .from("test_lists")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
