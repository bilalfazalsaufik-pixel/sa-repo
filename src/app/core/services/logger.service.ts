import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Logger Service
 * Provides environment-aware logging functionality.
 * Logs are only shown in non-production environments (local/dev).
 * In production, all logging is disabled for security and performance.
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isProduction = environment.production;
  private readonly enableLogging = environment.enableLogging ?? !this.isProduction;

  /**
   * Logs an informational message (only in non-production)
   */
  log(message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Logs a warning message (only in non-production)
   */
  warn(message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Logs an error message (only in non-production)
   * Note: Critical errors might still need to be logged in production
   * via a proper error tracking service (e.g., Sentry)
   */
  error(message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Logs an error with a custom prefix (only in non-production)
   */
  errorWithPrefix(prefix: string, message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.error(`[${prefix}] ${message}`, ...args);
    }
  }

}
