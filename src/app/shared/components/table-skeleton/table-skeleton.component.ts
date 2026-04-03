import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-skeleton.component.html',
  styleUrls: ['./table-skeleton.component.css'],
  host: {
    '[style.--cols]': 'columnCount'
  }
})
export class TableSkeletonComponent {
  /** Number of skeleton rows (default 10) */
  @Input() rowCount = 10;
  /** Number of columns (default 5) */
  @Input() columnCount = 5;
  /** Optional column widths for body rows (e.g. ['15%','25%','20%','20%','20%']). Length should match columnCount. */
  @Input() columnWidths: string[] = [];

  headerColumns = computed(() => Array.from({ length: this.columnCount }, (_, i) => i));
  bodyColumns = computed(() => {
    const w = this.columnWidths;
    if (w.length === this.columnCount) return w;
    return Array.from({ length: this.columnCount }, () => '100%');
  });
  rows = computed(() => Array.from({ length: this.rowCount }, (_, i) => i));
}
