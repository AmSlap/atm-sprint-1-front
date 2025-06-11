import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtmConfigurationComponent } from './atm-configuration.component';

describe('AtmConfigurationComponent', () => {
  let component: AtmConfigurationComponent;
  let fixture: ComponentFixture<AtmConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmConfigurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtmConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
