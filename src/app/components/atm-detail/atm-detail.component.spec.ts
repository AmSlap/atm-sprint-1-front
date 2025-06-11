import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtmDetailComponent } from './atm-detail.component';

describe('AtmDetailComponent', () => {
  let component: AtmDetailComponent;
  let fixture: ComponentFixture<AtmDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtmDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
