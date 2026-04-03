import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-container">
      <!-- Animated background orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>

      <!-- Dot grid overlay -->
      <div class="dot-grid"></div>

      <!-- Glass card -->
      <div class="login-card">
        <div class="login-logo-wrap">
          <img
            src="assets/images/logo.png"
            alt="East Texas Saltwater"
            class="login-logo-img"
          />
        </div>

        <h1 class="login-title">East Texas Saltwater</h1>
        <p class="login-subtitle">Sign in to your account</p>

        @if (error()) {
          <div class="login-error">
            <i class="pi pi-exclamation-circle"></i>
            {{ error() }}
          </div>
        }

        <button class="login-btn" (click)="login()" [disabled]="loading()">
          @if (loading()) {
            <span class="login-btn-spinner"></span>
            Signing in...
          } @else {
            <i class="pi pi-arrow-right"></i>
            Sign In
          }
        </button>

        <div class="login-trust">
          <i class="pi pi-lock"></i>
          Secured by <strong>Auth0</strong>
        </div>

        <p class="login-footer">© {{ currentYear }} East Texas Saltwater. All rights reserved.</p>
      </div>
    </div>
  `,
  styles: [`
    /* ── Base container ─────────────────────────────── */
    .login-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      background: radial-gradient(ellipse at 20% 50%, #0d2137 0%, #091a2b 50%, #050f1a 100%);
    }

    /* ── Animated orbs ──────────────────────────────── */
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.45;
      pointer-events: none;
    }

    .orb-1 {
      width: 520px;
      height: 520px;
      background: radial-gradient(circle, #00d9a3 0%, transparent 70%);
      top: -80px;
      left: -60px;
      animation: drift1 14s ease-in-out infinite alternate;
    }

    .orb-2 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #0077b6 0%, transparent 70%);
      bottom: -40px;
      right: -20px;
      animation: drift2 18s ease-in-out infinite alternate;
    }

    .orb-3 {
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, #00b4d8 0%, transparent 70%);
      top: 45%;
      left: 48%;
      animation: drift3 22s ease-in-out infinite alternate;
    }

    @keyframes drift1 {
      from { transform: translate(0, 0) scale(1); }
      to   { transform: translate(60px, 80px) scale(1.12); }
    }

    @keyframes drift2 {
      from { transform: translate(0, 0) scale(1); }
      to   { transform: translate(-50px, -60px) scale(1.08); }
    }

    @keyframes drift3 {
      from { transform: translate(0, 0) scale(1); }
      to   { transform: translate(-40px, 50px) scale(1.15); }
    }

    /* ── Dot grid ───────────────────────────────────── */
    .dot-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px);
      background-size: 28px 28px;
    }

    /* ── Glass card entrance ────────────────────────── */
    .login-card {
      position: relative;
      z-index: 10;
      width: min(380px, 90vw);
      padding: 52px 44px 36px;
      border-radius: 24px;
      text-align: center;

      /* Glassmorphism */
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow:
        0 32px 80px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(0, 217, 163, 0.08) inset;

      /* Entrance animation */
      animation: slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(32px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }

    /* ── Logo ───────────────────────────────────────── */
    .login-logo-wrap {
      display: flex;
      justify-content: center;
      margin: 0 auto 20px;
      padding: 14px 18px;
      background: #ffffff;
      border-radius: 20px;
      width: fit-content;
      box-shadow:
        0 0 36px rgba(0, 217, 163, 0.35),
        0 10px 28px rgba(0, 0, 0, 0.35);
      animation: logoPulse 3s ease-in-out infinite;
    }

    @keyframes logoPulse {
      0%, 100% { box-shadow: 0 0 36px rgba(0, 217, 163, 0.35), 0 10px 28px rgba(0,0,0,0.35); }
      50%       { box-shadow: 0 0 56px rgba(0, 217, 163, 0.65), 0 10px 28px rgba(0,0,0,0.35); }
    }

    .login-logo-img {
      height: 92px;
      width: auto;
      display: block;
    }

    /* ── Typography ─────────────────────────────────── */
    .login-title {
      font-size: 20px;
      font-weight: 700;
      color: #00d9a3;
      margin: 0 0 6px;
      letter-spacing: 0.5px;
      text-shadow: 0 0 30px rgba(0, 217, 163, 0.4);
    }

    .login-subtitle {
      color: rgba(255, 255, 255, 0.4);
      font-size: 13px;
      margin: 0 0 28px;
    }

    /* ── Button ─────────────────────────────────────── */
    .login-btn {
      width: 100%;
      padding: 15px;
      font-size: 15px;
      font-weight: 600;
      color: #050f1a;
      background: linear-gradient(135deg, #00d9a3 0%, #00b4d8 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      letter-spacing: 0.3px;
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
      box-shadow: 0 4px 20px rgba(0, 217, 163, 0.35);
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 217, 163, 0.55);
    }

    .login-btn:active:not(:disabled) {
      transform: scale(0.98) translateY(0);
      box-shadow: 0 2px 12px rgba(0, 217, 163, 0.3);
    }

    .login-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .login-btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(5, 15, 26, 0.3);
      border-top-color: #050f1a;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Error message ──────────────────────────────── */
    .login-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 13px;
      text-align: left;
      animation: fadeIn 0.25s ease both;
    }

    .login-error .pi-exclamation-circle {
      font-size: 14px;
      color: #f87171;
      flex-shrink: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .login-trust {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 20px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
    }

    .login-trust .pi-lock {
      font-size: 11px;
      color: #00d9a3;
    }

    .login-trust strong {
      color: rgba(255, 255, 255, 0.55);
      font-weight: 600;
    }

    .login-footer {
      margin-top: 16px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.2);
      letter-spacing: 0.3px;
    }
  `]
})
export class LoginComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  currentYear = new Date().getFullYear();

  private auth0 = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.auth0.isAuthenticated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isAuthenticated => {
        if (isAuthenticated) {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigate([returnUrl]);
        }
      });
  }

  login(): void {
    this.loading.set(true);
    this.error.set(null);
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.auth0.loginWithRedirect({
      appState: { target: returnUrl }
    }).subscribe({
      error: () => {
        this.loading.set(false);
        this.error.set('Something went wrong. Please try again.');
      }
    });
  }
}
