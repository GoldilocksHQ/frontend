import { ManagerStatus, ManagerConfig } from "../types";

export abstract class Manager {
  protected name: string;
  protected status: ManagerStatus;
  protected logger: Console;

  constructor(config: ManagerConfig) {
    this.name = config.name;
    this.status = ManagerStatus.UNINITIALIZED;
    this.logger = config.logger || console;
  }

  protected setStatus(status: ManagerStatus): void {
    this.status = status;
    this.logger.info(`[${this.name}] Status changed to: ${status}`);
  }

  getStatus(): ManagerStatus {
    return this.status;
  }

  abstract initialize(): Promise<void>;

  protected async handleError(error: Error, context?: Record<string, unknown>): Promise<void> {
    this.setStatus(ManagerStatus.ERROR);
    this.logger.error(`[${this.name}] Error:`, error, context);
  }
} 
