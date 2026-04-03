import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartCardSkeletonComponent } from './chart-card-skeleton.component';

describe('ChartCardSkeletonComponent', () => {
  let component: ChartCardSkeletonComponent;
  let fixture: ComponentFixture<ChartCardSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartCardSkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChartCardSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
