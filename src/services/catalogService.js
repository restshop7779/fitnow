import { supabaseRequest } from "../lib/supabaseClient.js";
import { mapProductFromRow, mapShowroomFromRow } from "../utils/catalogMappers.js";

export async function fetchProducts() {
  const rows = (await supabaseRequest("products?select=*,showrooms(name,area,average_delivery_minutes)&order=created_at.desc")) ?? [];
  return rows.map(mapProductFromRow);
}

export async function fetchShowrooms() {
  const rows = (await supabaseRequest("showrooms?select=*&order=created_at.desc")) ?? [];
  return rows.map(mapShowroomFromRow);
}
