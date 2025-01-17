"use client";

import { getCredentials, storeCredentials, updateCredentials, tokenExists as tokenExists, Credentials, TokenError } from '@/services/supabase/server';

export class TokenManager {
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
  }

  private setCredentials(credentials: Credentials) {
    this.credentials = credentials;
  }

  async getToken(): Promise<Credentials | null> {
    const { success, credentials: updatedCredentials } = await getCredentials(this.credentials);
    if (success && updatedCredentials) this.setCredentials(updatedCredentials);
    return this.credentials || null;
  }

  async storeToken(credentials: Credentials): Promise<{ success: boolean; error?: TokenError }> {
    this.setCredentials(credentials);
    return storeCredentials(this.credentials);
  }

  async updateToken(credentials: Credentials): Promise<{ success: boolean; error?: TokenError }> {
    this.setCredentials(credentials);
    return updateCredentials(this.credentials);
  }

  async tokenExists(): Promise<boolean> {
    return tokenExists(this.credentials);
  }
}