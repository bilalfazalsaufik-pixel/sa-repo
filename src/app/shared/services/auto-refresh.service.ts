import { Injectable, OnDestroy, signal } from '@angular/core';

/**
 * Manages a periodic auto-refresh interval for a single component instance.
 * Provide via the component's `providers` array so each component gets
 * its own instance (and automatic cleanup on component destroy).
 */
@Injectable()
export class AutoRefreshService implements OnDestroy {
  readonly enabled = signal(true);

  private interval: ReturnType<typeof setInterval> | null = null;
  private storedCallback: (() => void) | null = null;
  private storedIntervalMs = 0;

  start(callback: () => void, intervalMs: number): void {
    this.storedCallback = callback;
    this.storedIntervalMs = intervalMs;
    this.scheduleInterval();
  }

  stop(): void {
    this.clearInterval();
  }

  toggle(): void {
    if (this.enabled()) {
      this.clearInterval();
      this.enabled.set(false);
    } else {
      this.enabled.set(true);
      this.scheduleInterval();
    }
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }

  private scheduleInterval(): void {
    this.clearInterval();
    if (!this.storedCallback) return;
    this.interval = setInterval(() => {
      if (this.enabled()) this.storedCallback!();
    }, this.storedIntervalMs);
  }

  private clearInterval(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
