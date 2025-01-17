"use server";

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'


export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function signIn(data: { email: string; password: string }) {
  const supabase = await createClient() ;
  const { error, data: { session } } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!session) {
    return { error: "Failed to sign in" };
  }

  return { error: null}
}

export async function signUp(data: { email: string; password: string }) {
  const supabase = await createClient() ;
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function signOut() {
  const supabase = await createClient() ;
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }

  return { error: null };
} 

export async function getSession() {
  const supabase = await createClient() ;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function generateKey(userId: string) {
  const supabase = await createClient() ;
  return await supabase
    .schema('api')
    .from('api_keys')
    .insert([
      { user_id: userId }
    ])
    .select();
}


export async function getKey(userId: string) {
  const supabase = await createClient() ;
  return await supabase
    .schema('api')
    .from('api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .single();
}