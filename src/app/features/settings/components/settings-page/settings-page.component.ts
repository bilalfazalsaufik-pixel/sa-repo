import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, CardModule, DividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <div>
              <h2>Settings</h2>
              <p class="subtitle">Application preferences and configuration</p>
            </div>
          </div>
        </ng-template>

        <!-- Display -->
        <section class="settings-section">
          <h3 class="section-title"><i class="pi pi-desktop section-icon"></i> Display</h3>
          <div class="settings-grid">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Default View</span>
                <span class="setting-desc">Set your preferred dashboard tab (Engineering or Operator). Change this in your Profile.</span>
              </div>
              <span class="setting-badge">Profile</span>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Theme</span>
                <span class="setting-desc">Dark theme is active. Light theme support is planned for a future release.</span>
              </div>
              <span class="setting-badge coming">Planned</span>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Language</span>
                <span class="setting-desc">English (US) — additional language packs are on the roadmap.</span>
              </div>
              <span class="setting-badge coming">Planned</span>
            </div>
          </div>
        </section>

        <p-divider></p-divider>

        <!-- Notifications -->
        <section class="settings-section">
          <h3 class="section-title"><i class="pi pi-bell section-icon"></i> Notifications</h3>
          <div class="settings-grid">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Notification Rules</span>
                <span class="setting-desc">Configure which events trigger email or SMS notifications and for which zones.</span>
              </div>
              <a class="setting-link" routerLink="/notifications">Manage Rules →</a>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Notification History</span>
                <span class="setting-desc">View a log of all notifications sent by the system.</span>
              </div>
              <a class="setting-link" routerLink="/notifications/history">View History →</a>
            </div>
          </div>
        </section>

        <p-divider></p-divider>

        <!-- Data -->
        <section class="settings-section">
          <h3 class="section-title"><i class="pi pi-database section-icon"></i> Data & Privacy</h3>
          <div class="settings-grid">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Data Retention</span>
                <span class="setting-desc">Sensor readings and event logs are retained according to your tenant's configured retention policy.</span>
              </div>
              <span class="setting-badge">Admin</span>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Export Data</span>
                <span class="setting-desc">Bulk data export to CSV is planned for a future release.</span>
              </div>
              <span class="setting-badge coming">Planned</span>
            </div>
          </div>
        </section>

        <p-divider></p-divider>

        <!-- Security -->
        <section class="settings-section">
          <h3 class="section-title"><i class="pi pi-shield section-icon"></i> Security</h3>
          <div class="settings-grid">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Authentication</span>
                <span class="setting-desc">This application uses Auth0 for secure single sign-on. Manage your password and MFA in the Auth0 portal.</span>
              </div>
              <span class="setting-badge">Auth0</span>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Roles & Permissions</span>
                <span class="setting-desc">Manage user roles and their access levels across the system.</span>
              </div>
              <a class="setting-link" routerLink="/roles">Manage Roles →</a>
            </div>
          </div>
        </section>
      </p-card>
    </div>
  `,
  styles: [`
    .settings-page { }
    .settings-section { margin-bottom: 0.5rem; }
    .section-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #00d9a3;
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-icon { font-size: 0.95rem; }
    .settings-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      flex-wrap: wrap;
    }
    .setting-info { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
    .setting-label { font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.85); }
    .setting-desc { font-size: 0.78rem; color: rgba(255,255,255,0.45); line-height: 1.4; }
    .setting-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.55);
      white-space: nowrap;
    }
    .setting-badge.coming {
      background: rgba(99,102,241,0.12);
      color: #818cf8;
    }
    .setting-link {
      font-size: 0.8rem;
      color: #00d9a3;
      text-decoration: none;
      white-space: nowrap;
      font-weight: 500;
    }
    .setting-link:hover { text-decoration: underline; }
  `]
})
export class SettingsPageComponent {}
