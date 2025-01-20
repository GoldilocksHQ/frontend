"user client"

import { generateKey, getKey, getUser } from "@/services/supabase/server";

export class APIKeyManager {
  private static instance: APIKeyManager | null = null;
  private userId: string = '';
  private apiKey: string = '';

  private constructor() {}

  static async getInstance(): Promise<APIKeyManager> {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
      await APIKeyManager.instance.initialize();
    }
    return APIKeyManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const user = await getUser();
      this.userId = user?.id || '';
      
      const { data: keyData, error: keyError } = await getKey(this.userId);

      if (!keyData || keyError) {
        const { data: newKey, error: genError } = await generateKey(this.userId);
          
        if (genError) throw genError;
        this.apiKey = newKey?.[0]?.api_key || '';
      } else {
        this.apiKey = keyData.api_key;
      }

    } catch (error) {
      console.error('Error initializing API key:', error);
      throw error;
    }
  }

  getUserId(): string {
    return this.userId;
  }

  getKey(): string {
    return this.apiKey;
  }
} 