import { supabase, toCamel, toSnake } from "../supabase";
import type { Category } from "../types";

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Category[]>(data);
}

export async function createCategory(category: Category): Promise<void> {
  const snakeCategory = toSnake(category);
  const { error } = await supabase
    .from("categories")
    .upsert(snakeCategory);

  if (error) throw new Error(error.message);
}

export async function updateCategory(categoryId: string, data: Partial<Category>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("categories")
    .update(snakeData)
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
}
