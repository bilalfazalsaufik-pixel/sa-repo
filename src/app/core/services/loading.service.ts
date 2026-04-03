import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _loading = signal<boolean>(false);
  loading = this._loading.asReadonly();

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  isLoading(): boolean {
    return this._loading();
  }
}
