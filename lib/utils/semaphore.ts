export class Semaphore {
  private max: number;
  private current: number;
  private queue: Array<() => void>;

  constructor(max: number) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    
    await new Promise<void>(resolve => this.queue.push(resolve));
    this.current++;
  }

  release() {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }
}
