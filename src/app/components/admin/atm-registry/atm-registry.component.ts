import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AtmService } from '../../../services/atm.service';
import { AtmRegistryInfo, Agency } from '../../../models/atm.models';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-atm-registry',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './atm-registry.component.html',
  styleUrl: './atm-registry.component.scss'
})
export class AtmRegistryComponent implements OnInit {
  atms: AtmRegistryInfo[] = [];
  agencies: Agency[] = [];
  atmForm: FormGroup;
  editMode = false;
  selectedAtmId: string | null = null;
  loading = true;
  error = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private atmService: AtmService,
    private fb: FormBuilder
  ) {
    this.atmForm = this.fb.group({
      atmId: ['', [Validators.required]],
      serialNumber: ['', [Validators.required]],
      brand: ['', [Validators.required]],
      model: ['', [Validators.required]],
      label: [''],
      ipAddress: ['', [Validators.pattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')]],
      region: [''],
      locationAddress: [''],
      locationLatitude: [null, [Validators.min(-90), Validators.max(90)]],
      locationLongitude: [null, [Validators.min(-180), Validators.max(180)]],
      agencyCode: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadAtms();
    this.loadAgencies();
  }

  loadAtms(): void {
    this.loading = true;
    this.atmService.getAllAtmRegistry().subscribe({
      next: (data) => {
        this.atms = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ATMs', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadAgencies(): void {
    this.atmService.getAllAgencies().subscribe({
      next: (agencies) => this.agencies = agencies,
      error: (err) => {
        console.error('Error loading agencies', err);
        // Initialize with empty array to prevent null reference errors
        this.agencies = [];
      }
    });
  }

  onSubmit(): void {
    if (this.atmForm.invalid) {
      return;
    }

    const atmData: AtmRegistryInfo = this.atmForm.value;

    if (this.editMode && this.selectedAtmId) {
      this.atmService.updateAtm(this.selectedAtmId, atmData).subscribe({
        next: () => {
          this.successMessage = 'ATM updated successfully';
          this.loadAtms();
          this.resetForm();
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          this.errorMessage = 'Error updating ATM: ' + err.message;
          setTimeout(() => this.errorMessage = null, 5000);
        }
      });
    } else {
      this.atmService.createAtm(atmData).subscribe({
        next: () => {
          this.successMessage = 'ATM created successfully';
          this.loadAtms();
          this.resetForm();
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          this.errorMessage = 'Error creating ATM: ' + err.message;
          setTimeout(() => this.errorMessage = null, 5000);
        }
      });
    }
  }

  editAtm(atm: AtmRegistryInfo): void {
    this.editMode = true;
    this.selectedAtmId = atm.atmId;
    this.atmForm.patchValue({
      atmId: atm.atmId,
      serialNumber: atm.serialNumber,
      brand: atm.brand,
      model: atm.model,
      label: atm.label,
      ipAddress: atm.ipAddress,
      region: atm.region,
      locationAddress: atm.locationAddress,
      locationLatitude: atm.locationLatitude,
      locationLongitude: atm.locationLongitude,
      agencyCode: atm.agencyCode
    });

    // Disable ATM ID in edit mode
    this.atmForm.get('atmId')?.disable();

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteAtm(atmId: string): void {
    if (confirm(`Are you sure you want to delete ATM ${atmId}?`)) {
      this.atmService.deleteAtm(atmId).subscribe({
        next: () => {
          this.successMessage = 'ATM deleted successfully';
          this.loadAtms();
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          this.errorMessage = 'Error deleting ATM: ' + err.message;
          setTimeout(() => this.errorMessage = null, 5000);
        }
      });
    }
  }

  resetForm(): void {
    this.atmForm.reset();
    this.editMode = false;
    this.selectedAtmId = null;
    this.atmForm.get('atmId')?.enable();
  }
}
