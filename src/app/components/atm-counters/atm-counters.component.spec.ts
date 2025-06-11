import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtmCountersComponent } from './atm-counters.component';

describe('AtmCountersComponent', () => {
  let component: AtmCountersComponent;
  let fixture: ComponentFixture<AtmCountersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmCountersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtmCountersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
