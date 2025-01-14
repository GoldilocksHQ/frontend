import { supabase } from '../lib/supabaseClient'

export interface SignUpData {
  email: string
  password: string
}

export interface SignInData {
  email: string
  password: string
}

export const authServices = {
  // Register a new user
  async signUp({ email, password }: SignUpData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign in an existing user
  async signIn({ email, password }: SignInData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign out the current user
  async signOut() {
    try {
      console.log('signOut')
      const { error } = await supabase.auth.signOut()
      console.log('signOut error:', error)
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  },

  // Get the current session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session, error: null }
    } catch (error) {
      return { session: null, error }
    }
  }
}