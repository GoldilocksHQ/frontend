"use server";

import { createServerClient } from '@supabase/ssr'
import { UUID } from 'crypto';
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

export async function getUser() {
  const supabase = await createClient() ;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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


export interface Credentials {
  userId: UUID;
  tokenName: string;
  tokenType: string;
  token: string;
  createdAt?: string;  // ISO string for timestamptz
  expiresAt?: string;  // ISO string for timestamptz
}

export type TokenError = {
  message: string;
  code: string;
}

function validateCredentials(credentials: Credentials) {
  if (!credentials.userId) throw { message: "User ID is required", code: "MISSING_USER_ID" };
  if (!credentials.tokenType) throw { message: "Token type is required", code: "MISSING_TOKEN_TYPE" };
  if (!credentials.tokenName) throw { message: "Token name is required", code: "MISSING_TOKEN_NAME" };
}

export async function getCredentials(credentials: Credentials): Promise<{success: boolean, credentials: Credentials | null, error: string | null}> {
  try {
    validateCredentials(credentials);
    
    const supabase = await createClient();
    const { data, error } = await supabase.schema('api').rpc('get_user_token', {
      p_user_id: credentials.userId,
      p_token_type: credentials.tokenType,
      p_token_name: credentials.tokenName
    });

    if (error ) {
      console.error('Error fetching token:', error);
      return {success: false, credentials: null, error: error.message};
    }

    if (!data.success) {
      console.warn(data.error);
      return {success: false, credentials: null, error: data.error};
    }
    
    return {
      success: true,
      credentials: {
        userId: data.data.userId,
        tokenName: data.data.tokenName,
        tokenType: data.data.tokenType,
        token: data.data.token,
        createdAt: data.data.createdAt,
        expiresAt: data.data.expiresAt
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getCredentials:', error);
    return {success: false, credentials: null, error: error instanceof Error ? error.message : 'Unknown error occurred'};
  }
}

export async function storeCredentials(credentials: Credentials): Promise<{ success: boolean; error?: TokenError }> {
  try {
    validateCredentials(credentials);

    const supabase = await createClient();
    const { data, error } = await supabase.schema('api').rpc('store_user_token', {
      p_user_id: credentials.userId,
      p_token_type: credentials.tokenType,
      p_token_name: credentials.tokenName,
      p_token: credentials.token,
      p_expires_at: credentials.expiresAt || null,
      p_created_at: credentials.createdAt || new Date().toISOString()
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: 'Failed to store credentials',
          code: 'STORE_FAILED'
        }
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'UNEXPECTED_ERROR'
      }
    };
  }
}

export async function updateCredentials(credentials: Credentials): Promise<{ success: boolean; error?: TokenError }> {
  try {
    validateCredentials(credentials);

    const supabase = await createClient();
    const { data, error } = await supabase.schema('api').rpc('update_user_token', {
      p_user_id: credentials.userId,
      p_token_type: credentials.tokenType,
      p_token_name: credentials.tokenName,
      p_new_token: credentials.token,
      p_new_expires_at: credentials.expiresAt || null,
      p_new_created_at: credentials.createdAt || new Date().toISOString()
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: 'Failed to update credentials',
          code: 'UPDATE_FAILED'
        }
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'UNEXPECTED_ERROR'
      }
    };
  }
}

export async function tokenExists(credentials: Credentials): Promise<boolean> {
  const { success, credentials: updatedCredentials} = await getCredentials(credentials);
  return success && updatedCredentials !== null && updatedCredentials?.token !== null;
}
