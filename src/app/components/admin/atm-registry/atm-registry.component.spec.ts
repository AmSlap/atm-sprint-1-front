import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtmRegistryComponent } from './atm-registry.component';

describe('AtmRegistryComponent', () => {
  let component: AtmRegistryComponent;
  let fixture: ComponentFixture<AtmRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmRegistryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtmRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
