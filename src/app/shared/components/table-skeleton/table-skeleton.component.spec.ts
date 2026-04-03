import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableSkeletonComponent } from './table-skeleton.component';

describe('TableSkeletonComponent', () => {
  let component: TableSkeletonComponent;
  let fixture: ComponentFixture<TableSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TableSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render default row and column count', () => {
    expect(component.rows().length).toBe(10);
    expect(component.headerColumns().length).toBe(5);
  });

  it('should respect rowCount and columnCount inputs', () => {
    component.rowCount = 5;
    component.columnCount = 3;
    fixture.detectChanges();
    expect(component.rows().length).toBe(5);
    expect(component.headerColumns().length).toBe(3);
  });
});
