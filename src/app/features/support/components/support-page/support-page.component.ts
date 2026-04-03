import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

interface FaqItem { q: string; a: string; open: boolean; }

@Component({
  selector: 'app-support-page',
  standalone: true,
  imports: [CommonModule, CardModule, DividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="support-page">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <div>
              <h2>Support</h2>
              <p class="subtitle">Help, documentation and contact</p>
            </div>
          </div>
        </ng-template>

        <!-- Quick links -->
        <section class="support-section">
          <h3 class="section-title"><i class="pi pi-bolt"></i> Quick Links</h3>
          <div class="quick-links">
            <div class="quick-card">
              <i class="pi pi-book quick-icon"></i>
              <span class="quick-label">User Guide</span>
              <span class="quick-sub">Step-by-step documentation for operators and administrators</span>
              <span class="coming-tag">Coming Soon</span>
            </div>
            <div class="quick-card">
              <i class="pi pi-sitemap quick-icon"></i>
              <span class="quick-label">API Reference</span>
              <span class="quick-sub">REST API documentation for integration developers</span>
              <span class="coming-tag">Coming Soon</span>
            </div>
            <div class="quick-card">
              <i class="pi pi-video quick-icon"></i>
              <span class="quick-label">Video Tutorials</span>
              <span class="quick-sub">Short walkthroughs for common tasks</span>
              <span class="coming-tag">Coming Soon</span>
            </div>
          </div>
        </section>

        <p-divider></p-divider>

        <!-- FAQ -->
        <section class="support-section">
          <h3 class="section-title"><i class="pi pi-question-circle"></i> Frequently Asked Questions</h3>
          <div class="faq-list">
            @for (item of faqItems; track item.q) {
              <div class="faq-item" [class.open]="item.open" (click)="toggle(item)" (keydown.enter)="toggle(item)" tabindex="0" [attr.aria-expanded]="item.open">
                <div class="faq-q">
                  <span>{{ item.q }}</span>
                  <i class="pi" [class]="item.open ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                </div>
                @if (item.open) {
                  <div class="faq-a">{{ item.a }}</div>
                }
              </div>
            }
          </div>
        </section>

        <p-divider></p-divider>

        <!-- Contact -->
        <section class="support-section">
          <h3 class="section-title"><i class="pi pi-envelope"></i> Contact Support</h3>
          <div class="contact-cards">
            <div class="contact-card">
              <i class="pi pi-envelope contact-icon"></i>
              <div>
                <div class="contact-label">Email Support</div>
                <div class="contact-sub">For non-urgent issues and feature requests</div>
                <span class="contact-value">support&#64;etsw.io</span>
              </div>
            </div>
            <div class="contact-card">
              <i class="pi pi-exclamation-circle contact-icon red"></i>
              <div>
                <div class="contact-label">Critical Issues</div>
                <div class="contact-sub">System outages or data integrity concerns</div>
                <span class="contact-value">escalation&#64;etsw.io</span>
              </div>
            </div>
          </div>
        </section>
      </p-card>
    </div>
  `,
  styles: [`
    .support-section { margin-bottom: 0.5rem; }
    .section-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #00d9a3;
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    /* Quick links */
    .quick-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .quick-card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
    }
    .quick-icon { font-size: 1.4rem; color: #00d9a3; }
    .quick-label { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .quick-sub { font-size: 0.77rem; color: rgba(255,255,255,0.4); line-height: 1.4; }
    .coming-tag {
      margin-top: 0.35rem;
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      background: rgba(99,102,241,0.12);
      color: #818cf8;
      width: fit-content;
    }
    /* FAQ */
    .faq-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .faq-item {
      padding: 0.85rem 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.15s;
      outline: none;
    }
    .faq-item:hover, .faq-item:focus { border-color: rgba(0,217,163,0.3); }
    .faq-item.open { border-color: rgba(0,217,163,0.4); }
    .faq-q {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255,255,255,0.85);
      gap: 1rem;
    }
    .faq-q i { font-size: 0.75rem; color: rgba(255,255,255,0.4); flex-shrink: 0; }
    .faq-a {
      margin-top: 0.65rem;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.55);
      line-height: 1.6;
      border-top: 1px solid rgba(255,255,255,0.07);
      padding-top: 0.65rem;
    }
    /* Contact */
    .contact-cards { display: flex; gap: 1rem; flex-wrap: wrap; }
    .contact-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      flex: 1;
      min-width: 200px;
    }
    .contact-icon { font-size: 1.4rem; color: #00d9a3; margin-top: 2px; }
    .contact-icon.red { color: #ef4444; }
    .contact-label { font-size: 0.875rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .contact-sub { font-size: 0.77rem; color: rgba(255,255,255,0.4); margin: 0.2rem 0 0.4rem; }
    .contact-value { font-size: 0.82rem; color: #00d9a3; font-weight: 500; }
  `]
})
export class SupportPageComponent {
  faqItems: FaqItem[] = [
    {
      q: 'Why are my charts showing no data?',
      a: 'Charts display data for the selected time range. If no sensor readings exist within that window, charts will appear empty. Try selecting a wider time range (e.g. Last 24 Hours or Last 1 Week) or confirm that sensors are actively reporting data.',
      open: false
    },
    {
      q: 'How do I resolve an event?',
      a: 'Navigate to the Events page, find the unresolved event, and click the Resolve button. You can optionally add resolution notes describing the action taken. You need the "Manage Events" permission to do this.',
      open: false
    },
    {
      q: 'How do notification rules work?',
      a: 'Notification rules define when the system sends alerts. Each rule specifies a zone, a time window (e.g. "08:00-17:00"), and a channel (Email, SMS, or Both). When an event occurs in that zone during the time window, the system notifies the configured recipients.',
      open: false
    },
    {
      q: 'I do not see certain menu items in the sidebar.',
      a: 'Menu items are shown based on your assigned permissions. If you need access to a feature, contact your administrator to update your role or grant additional permissions on the Roles page.',
      open: false
    },
    {
      q: 'How often does the dashboard auto-refresh?',
      a: 'The Site Detail page and Events page auto-refresh every 30 seconds when the Auto toggle is active. You can pause it at any time using the Pause button in the top-right of those pages.',
      open: false
    },
    {
      q: 'Can I export sensor readings or event data?',
      a: 'Bulk data export is on the roadmap. Currently, you can view readings and events in the respective pages with date-range filters applied.',
      open: false
    }
  ];

  toggle(item: FaqItem): void {
    item.open = !item.open;
  }
}
