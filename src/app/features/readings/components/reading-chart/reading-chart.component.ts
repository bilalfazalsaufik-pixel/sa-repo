import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartData, registerables, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Reading } from '../../../../shared/models/reading.model';
import { getChartColor } from '../../../../shared/utils/chart-colors';

Chart.register(...registerables, TimeScale);

type ChartPoint = { x: Date; y: number };

@Component({
  selector: 'app-reading-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasNumericData()) {
      <canvas #chartCanvas></canvas>
    } @else {
      <div class="no-chart-data">
        <i class="pi pi-chart-line"></i>
        <span>No numeric values to chart for this sensor.</span>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; width: 100%; height: 280px; }
    canvas { width: 100% !important; height: 100% !important; }
    .no-chart-data {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: rgba(255,255,255,0.3);
      font-size: 0.85rem;
    }
    .no-chart-data i { font-size: 2rem; color: rgba(0,217,163,0.3); }
  `]
})
export class ReadingChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() readings: Reading[] = [];
  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart<'line', ChartPoint[]> | null = null;
  hasNumericData = () => this.getNumericPoints().length > 0;

  ngOnInit(): void {
    setTimeout(() => this.buildChart(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['readings']) {
      if (this.chart) {
        this.updateChart();
      } else {
        setTimeout(() => this.buildChart(), 0);
      }
    }
  }

  private getNumericPoints(): Array<{ valueIndex: number; points: ChartPoint[] }> {
    const indexGroups = new Map<number, ChartPoint[]>();
    for (const r of this.readings) {
      const ts = new Date(r.timestamp);
      for (const v of r.values) {
        const num = parseFloat(v.value);
        if (!isNaN(num)) {
          if (!indexGroups.has(v.valueIndex)) indexGroups.set(v.valueIndex, []);
          indexGroups.get(v.valueIndex)!.push({ x: ts, y: num });
        }
      }
    }
    return Array.from(indexGroups.entries()).map(([idx, pts]) => ({
      valueIndex: idx,
      points: pts.sort((a, b) => a.x.getTime() - b.x.getTime())
    }));
  }

  private prepareData(): ChartData<'line', ChartPoint[]> {
    const groups = this.getNumericPoints();
    return {
      datasets: groups.map((g, i) => ({
        label: groups.length > 1 ? `Value [${g.valueIndex}]` : 'Value',
        data: g.points,
        borderColor: getChartColor(i),
        backgroundColor: getChartColor(i, 0.08),
        borderWidth: 2,
        pointRadius: this.readings.length <= 50 ? 3 : 0,
        tension: 0.3,
        fill: false
      }))
    };
  }

  private buildChart(): void {
    if (!this.chartCanvas?.nativeElement || this.getNumericPoints().length === 0) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }

    const config: ChartConfiguration<'line', ChartPoint[]> = {
      type: 'line',
      data: this.prepareData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: this.getNumericPoints().length > 1 },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${(ctx.raw as ChartPoint).y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'hour', tooltipFormat: 'dd MMM yyyy, HH:mm' },
            ticks: { color: 'rgba(255,255,255,0.45)', maxTicksLimit: 8 },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.45)' },
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        }
      }
    };

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  private updateChart(): void {
    if (!this.chart) { this.buildChart(); return; }
    this.chart.data = this.prepareData();
    this.chart.update();
  }

  ngOnDestroy(): void {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }
}
