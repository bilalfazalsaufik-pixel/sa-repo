import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SitesMapComponent } from './sites-map.component';

describe('SitesMapComponent', () => {
  let component: SitesMapComponent;
  let fixture: ComponentFixture<SitesMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SitesMapComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SitesMapComponent);
    component = fixture.componentInstance;
    component.siteMapItems = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
