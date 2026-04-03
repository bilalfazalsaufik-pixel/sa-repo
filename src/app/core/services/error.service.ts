import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorInfo {
  message: string;
  code?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private _error = signal<ErrorInfo | null>(null);
  error = this._error.asReadonly();

  private _success = signal<string | null>(null);
  success = this._success.asReadonly();

  setError(message: string, code?: string): void {
    const current = this._error();
    // Suppress duplicate errors within 2 seconds to prevent multiple toasts
    // from concurrent failing API calls (e.g. dashboard loading 8 endpoints at once)
    if (current && current.message === message &&
        (new Date().getTime() - current.timestamp.getTime()) < 2000) {
      return;
    }
    this._error.set({ message, code, timestamp: new Date() });
  }

  setSuccess(message: string): void {
    this._success.set(message);
  }

  clearError(): void {
    this._error.set(null);
  }

  clearSuccess(): void {
    this._success.set(null);
  }

  setErrorFromHttp(error: any): void {
    if (error instanceof HttpErrorResponse) {
      // 401 is handled by the error interceptor (redirects to login) — skip to avoid duplicate toasts
      if (error.status === 401) return;
      if (error.status === 403) {
        this.setError('You do not have permission to perform this action.', 'ACCESS_DENIED');
        return;
      }
      const message = error?.error?.message || error?.message || this.getDefaultErrorMessage(error.status);
      const code = error?.error?.code;
      this.setError(message, code);
      return;
    }
    const message = error?.error?.message || error?.message || 'An unexpected error occurred';
    const code = error?.error?.code;
    this.setError(message, code);
  }

  private getDefaultErrorMessage(status: number): string {
    switch (status) {
      case 400: return 'Invalid request. Please check your input.';
      case 401: return 'Your session has expired. Please log in again.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested resource was not found.';
      case 500: return 'A server error occurred. Please try again later.';
      default:  return 'An unexpected error occurred.';
    }
  }

}
