import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient"

export async function generateKey(userId: string) {
  try {
    const newApiKey = `api_${uuidv4()}`;
    const { data, error } = await supabase
      .from("api_keys")
      .insert([{ user_id: userId, api_key: newApiKey }])
      .select("api_key")
    
    if (error) throw error
    return {data , error: null}
  } catch (error) {
    return { data: null, error }
  }
}


export async function getKey(userId: string) {
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("api_key")
      .eq("user_id", userId);

    if (error) throw error
    return {data , error: null}
  } catch (error) {
    return { data: null, error }
  }
}