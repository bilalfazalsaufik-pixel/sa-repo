import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-chart-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-card-skeleton" role="status" aria-busy="true" aria-label="Loading chart">
      <div class="chart-card-skeleton-header">
        <p-skeleton width="8rem" height="1.5rem" styleClass="chart-skeleton-title" />
        @if (showControls) {
          <p-skeleton width="6rem" height="2rem" styleClass="chart-skeleton-control" />
        }
      </div>
      <div class="chart-card-skeleton-body">
        <p-skeleton width="100%" height="100%" styleClass="chart-skeleton-area" />
      </div>
    </div>
  `,
  styleUrls: ['./chart-card-skeleton.component.css']
})
export class ChartCardSkeletonComponent {
  /** Whether to show a control placeholder in the header (e.g. dropdown) */
  @Input() showControls = true;
}
