import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtmInfoComponent } from './atm-info.component';

describe('AtmInfoComponent', () => {
  let component: AtmInfoComponent;
  let fixture: ComponentFixture<AtmInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtmInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
