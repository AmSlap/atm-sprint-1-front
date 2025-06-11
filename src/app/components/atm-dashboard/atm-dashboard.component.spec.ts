import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtmDashboardComponent } from './atm-dashboard.component';

describe('AtmDashboardComponent', () => {
  let component: AtmDashboardComponent;
  let fixture: ComponentFixture<AtmDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtmDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
