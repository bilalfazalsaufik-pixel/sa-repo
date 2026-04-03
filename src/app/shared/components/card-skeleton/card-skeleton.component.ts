import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (i of cardIndices; track i) {
      <div class="card-skeleton" role="status" aria-busy="true" aria-label="Loading content">
        <div class="card-skeleton-content">
          <p-skeleton shape="circle" width="3.5rem" height="3.5rem" styleClass="card-skeleton-icon" />
          <div class="card-skeleton-text">
            <p-skeleton width="4rem" height="2.25rem" styleClass="card-skeleton-value" />
            <p-skeleton width="6rem" height="1.25rem" styleClass="card-skeleton-label" />
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./card-skeleton.component.css']
})
export class CardSkeletonComponent {
  /** Number of card skeletons to show (e.g. 2 for dashboard summary cards) */
  @Input() set count(value: number) {
    this._count = Math.max(1, value);
    this.cardIndices = Array.from({ length: this._count }, (_, i) => i);
  }
  get count(): number {
    return this._count;
  }
  private _count = 1;
  cardIndices = [0];
}
