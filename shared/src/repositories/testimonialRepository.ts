import { supabase, toCamel, toSnake } from "../supabase";
import type { Testimonial } from "../types";

// ============ TESTIMONIALS ============

export async function getAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Testimonial[]>(data);
}

export async function getActiveTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Testimonial[]>(data);
}

export async function createTestimonial(testimonial: Testimonial): Promise<void> {
  const snakeData = toSnake(testimonial);
  const { error } = await supabase
    .from("testimonials")
    .upsert(snakeData);

  if (error) throw new Error(error.message);
}

export async function updateTestimonial(id: string, data: Partial<Testimonial>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("testimonials")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
