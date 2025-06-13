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
  isSubmitting = false;
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

  // Real data methods
  getCurrentUser(): string {
    return 'AmSlap'; // Real current user
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getCurrentDateTime(): string {
    return new Date().toISOString();
  }

  // Data loading methods
  loadAtms(): void {
    this.loading = true;
    this.error = false;

    this.atmService.getAllAtmRegistry().subscribe({
      next: (data) => {
        this.atms = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ATMs', err);
        this.error = true;
        this.loading = false;
        this.showErrorMessage('Failed to load ATM registry data');
      }
    });
  }

  loadAgencies(): void {
    this.atmService.getAllAgencies().subscribe({
      next: (agencies) => {
        this.agencies = agencies;
      },
      error: (err) => {
        console.error('Error loading agencies', err);
        this.agencies = [];
        this.showErrorMessage('Failed to load agency data');
      }
    });
  }

  // Form handling methods
  onSubmit(): void {
    if (this.atmForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const atmData: AtmRegistryInfo = this.atmForm.value;

    if (this.editMode && this.selectedAtmId) {
      this.atmService.updateAtm(this.selectedAtmId, atmData).subscribe({
        next: () => {
          this.showSuccessMessage('ATM updated successfully');
          this.loadAtms();
          this.resetForm();
          this.isSubmitting = false;
        },
        error: (err) => {
          this.showErrorMessage('Error updating ATM: ' + err.message);
          this.isSubmitting = false;
        }
      });
    } else {
      this.atmService.createAtm(atmData).subscribe({
        next: () => {
          this.showSuccessMessage('ATM created successfully');
          this.loadAtms();
          this.resetForm();
          this.isSubmitting = false;
        },
        error: (err) => {
          this.showErrorMessage('Error creating ATM: ' + err.message);
          this.isSubmitting = false;
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
    if (confirm(`Are you sure you want to delete ATM ${atmId}?\n\nThis action cannot be undone.`)) {
      this.atmService.deleteAtm(atmId).subscribe({
        next: () => {
          this.showSuccessMessage('ATM deleted successfully');
          this.loadAtms();
        },
        error: (err) => {
          this.showErrorMessage('Error deleting ATM: ' + err.message);
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

  // Helper methods
  hasCoordinates(): boolean {
    const lat = this.atmForm.get('locationLatitude')?.value;
    const lng = this.atmForm.get('locationLongitude')?.value;
    return lat !== null && lat !== '' && lng !== null && lng !== '';
  }

  getAgencyName(agencyCode: string): string {
    const agency = this.agencies.find(a => a.agencyCode === agencyCode);
    return agency?.agencyName || agencyCode;
  }

  trackByAtmId(index: number, atm: AtmRegistryInfo): string {
    return atm.atmId;
  }

  // Action methods - marked as coming soon for missing functionality
  viewAtm(atm: AtmRegistryInfo): void {
    this.showInfoMessage('ATM details view - Coming Soon...');
  }

  previewLocation(): void {
    const lat = this.atmForm.get('locationLatitude')?.value;
    const lng = this.atmForm.get('locationLongitude')?.value;

    if (lat && lng) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, '_blank');
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.atmForm.patchValue({
            locationLatitude: position.coords.latitude,
            locationLongitude: position.coords.longitude
          });
          this.showSuccessMessage('Current location added successfully');
        },
        (error) => {
          this.showErrorMessage('Unable to get current location: ' + error.message);
        }
      );
    } else {
      this.showErrorMessage('Geolocation is not supported by this browser');
    }
  }

  exportData(): void {
    this.showInfoMessage('Data export functionality - Coming Soon...');
  }

  // Message handling methods
  showSuccessMessage(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.clearSuccessMessage(), 5000);
  }

  showErrorMessage(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.clearErrorMessage(), 7000);
  }

  showInfoMessage(message: string): void {
    // For now, using success message for info
    this.showSuccessMessage(message);
  }

  clearSuccessMessage(): void {
    this.successMessage = null;
  }

  clearErrorMessage(): void {
    this.errorMessage = null;
  }
}
