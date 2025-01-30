import { Manager } from "../core/base-manager";
import { ErrorManager, ErrorSeverity } from "./error-manager";
import { ManagerStatus } from "../core/base-manager";
import { generateKey, getKey } from '@/services/supabase/client';
import { getUser } from '@/services/supabase/client';

export interface APIKeyConfig {
  service: string;
  key: string;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * APIKeyManager handles Goldilocks API key management.
 * These keys are used to authenticate with the Goldilocks API, which acts as an
 * aggregator for various third-party integrations (Google Sheets, etc.).
 * The API key is required for all Goldilocks API operations including:
 * - Connector authentication
 * - Tool execution
 * - Connector information retrieval
 */
export class APIKeyManager extends Manager {
  private static instance: APIKeyManager | null = null;
  private errorManager: ErrorManager;
  private userId: string = '';
  private keys: Map<string, APIKeyConfig> = new Map();

  private constructor() {
    super({ name: 'APIKeyManager' });
    this.errorManager = ErrorManager.getInstance();
  }

  static async getInstance(): Promise<APIKeyManager> {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
      await APIKeyManager.instance.initialize();
    }
    return APIKeyManager.instance;
  }

  /**
   * Initializes the API key manager by:
   * 1. Getting the current user's ID
   * 2. Loading their existing Goldilocks API key if it exists
   * 3. Generating a new key if none exists
   */
  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      
      // Get user and initialize API keys
      const user = await getUser();
      this.userId = user?.id || '';
      
      if (!this.userId) {
        throw new Error('No user ID found during initialization');
      }

      // Load existing keys from storage
      await this.loadKeys();
      
      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH
      });
      this.handleError(error as Error, { context: 'initialization' });
    }
  }

  /**
   * Loads the user's Goldilocks API key from storage.
   * If no key exists, generates a new one through the Goldilocks API.
   */
  private async loadKeys(): Promise<void> {
    try {
      const { data: keyData, error: keyError } = await getKey(this.userId);

      if (!keyData || keyError) {
        const { data: newKey, error: genError } = await generateKey(this.userId);
          
        if (genError) throw genError;
        
        if (newKey?.[0]?.api_key) {
          this.keys.set('default', {
            service: 'default',
            key: newKey[0].api_key
          });
        }
      } else {
        this.keys.set('default', {
          service: 'default',
          key: keyData.api_key
        });
      }
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { context: 'loadKeys' }
      });
      throw error;
    }
  }

  getUserId(): string {
    return this.userId;
    }

  /**
   * Gets the Goldilocks API key for the current user.
   * This key is used to authenticate all requests to the Goldilocks API.
   */
  async getKey(service: string = 'default'): Promise<string> {
    const keyConfig = this.keys.get(service);
    
    if (!keyConfig) {
      throw new Error(`No API key found for service: ${service}`);
    }

    // Check if key is expired and rotate if needed
    if (keyConfig.expiresAt && keyConfig.expiresAt < Date.now()) {
      await this.rotateKey(service);
      return this.getKey(service);
    }

    return keyConfig.key;
  }

  async setKey(service: string, key: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      // Validate key before setting
      await this.validateKey(service, key);
      
      this.keys.set(service, {
        service,
        key,
        metadata
      });
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { service }
      });
      throw error;
    }
  }

  async validateKey(service: string, key: string): Promise<boolean> {
    // Basic validation
    if (!key || typeof key !== 'string') {
      throw new Error(`Invalid API key format for service: ${service}`);
    }
    
    // TODO: Implement service-specific validation
      switch (service) {
      case 'default':
        return key.length > 0;
        default:
        this.logger.warn(`No specific validation implemented for service: ${service}`);
        return key.length > 0;
    }
  }

  /**
   * Rotates the Goldilocks API key by generating a new one through the API.
   * This is used when the current key expires or needs to be refreshed.
   */
  async rotateKey(service: string): Promise<void> {
    try {
      const { data: newKey, error: genError } = await generateKey(this.userId);

      if (genError) throw genError;

      if (newKey?.[0]?.api_key) {
        await this.setKey(service, newKey[0].api_key);
      } else {
        throw new Error('Failed to generate new API key');
      }
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { service }
      });
      throw error;
    }
  }

  async deleteKey(service: string): Promise<void> {
    this.keys.delete(service);
    }

  getKeyMetadata(service: string): Record<string, unknown> | undefined {
    return this.keys.get(service)?.metadata;
  }
} 
