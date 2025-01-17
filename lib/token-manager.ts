"use client";

import { getCredentials, storeCredentials, updateCredentials, credentialsExists, Credentials, TokenError } from '@/services/supabase/server';

export class TokenManager {
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
  }

  private setCredentials(credentials: Credentials) {
    this.credentials = credentials;
  }

  async getToken(): Promise<Credentials | null> {
    const updatedCredentials = await getCredentials(this.credentials);
    if (updatedCredentials) this.setCredentials(updatedCredentials);
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
    return credentialsExists(this.credentials);
  }
}