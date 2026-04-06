import { TestBed } from '@angular/core/testing';
import { AmpsChartComponent } from './amps-chart.component';

describe('AmpsChartComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmpsChartComponent]
    }).compileComponents();
  });

  it('should create without initializing chart', () => {
    const fixture = TestBed.createComponent(AmpsChartComponent);
    const component = fixture.componentInstance as any;
    spyOn(component, 'createChart');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});

