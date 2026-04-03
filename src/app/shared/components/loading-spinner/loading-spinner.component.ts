import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loadingService.loading()) {
      <div class="loading-spinner" [class.fullscreen]="fullscreen" role="status" aria-live="polite" aria-label="Loading">
        <p-progressSpinner [style]="{width: '50px', height: '50px'}"></p-progressSpinner>
        @if (message) {
          <p class="message">{{ message }}</p>
        }
      </div>
    }
  `,
  styleUrls: ['./loading-spinner.component.css']
})
export class LoadingSpinnerComponent {
  @Input() message = '';
  @Input() fullscreen = false;
  loadingService = inject(LoadingService);
}
