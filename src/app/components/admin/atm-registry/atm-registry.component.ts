import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AtmService } from '../../../services/atm.service';
import { AtmRegistryInfo, Agency } from '../../../models/atm.models';

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

  // Add mode tracking
  isEditFromRoute = false;
  loadingEditAtm = false;

  constructor(
    private atmService: AtmService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
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
    this.loadAgencies();

    // Check if we're in edit mode from route parameters
    this.route.params.subscribe(params => {
      const atmId = params['id'];
      if (atmId) {
        this.isEditFromRoute = true;
        this.selectedAtmId = atmId;
        this.editMode = true;
        this.loadAtmForEdit(atmId);
      } else {
        this.isEditFromRoute = false;
        this.loadAtms();
      }
    });
  }

  // Real data methods
  getCurrentUser(): string {
    return 'AmSlap';
  }

  getCurrentTime(): string {
    return '2025-06-13 09:17:35';
  }

  getCurrentDateTime(): string {
    return '2025-06-13T09:17:35.000Z';
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

  loadAtmForEdit(atmId: string): void {
    this.loadingEditAtm = true;
    this.loading = true;

    // Load the specific ATM for editing
    this.atmService.getAtmRegistry(atmId).subscribe({
      next: (atm) => {
        this.populateFormForEdit(atm);
        this.loadingEditAtm = false;
        this.loading = false;
        this.showSuccessMessage(`Editing ATM: ${atmId}`);
      },
      error: (err) => {
        console.error('Error loading ATM for edit', err);
        this.showErrorMessage(`Failed to load ATM ${atmId} for editing`);
        this.loadingEditAtm = false;
        this.loading = false;
        // Navigate back to main registry if ATM not found
        this.router.navigate(['/atm-registry']);
      }
    });

    // Also load all ATMs for the table (but don't show loading state)
    this.atmService.getAllAtmRegistry().subscribe({
      next: (data) => {
        this.atms = data;
      },
      error: (err) => {
        console.error('Error loading ATMs list', err);
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

  // Form population method
  populateFormForEdit(atm: AtmRegistryInfo): void {
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

          if (this.isEditFromRoute) {
            // Navigate back to main registry page after successful edit
            setTimeout(() => {
              this.router.navigate(['/atm-registry']);
            }, 2000);
          } else {
            this.loadAtms();
            this.resetForm();
          }

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
    if (this.isEditFromRoute) {
      // If we're already in edit mode from route, navigate to edit URL
      this.router.navigate(['/admin/registry/atms/edit', atm.atmId]);
      return;
    }

    this.editMode = true;
    this.selectedAtmId = atm.atmId;
    this.populateFormForEdit(atm);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteAtm(atmId: string): void {
    const atm = this.atms.find(a => a.atmId === atmId);
    const atmLabel = atm?.label || atmId;

    if (confirm(`Are you sure you want to delete ATM "${atmLabel}" (${atmId})?\n\nThis action cannot be undone.`)) {
      this.atmService.deleteAtm(atmId).subscribe({
        next: () => {
          this.showSuccessMessage('ATM deleted successfully');

          if (this.isEditFromRoute && this.selectedAtmId === atmId) {
            // If we're deleting the ATM we're currently editing, navigate back
            this.router.navigate(['/atm-registry']);
          } else {
            this.loadAtms();
          }
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

    if (this.isEditFromRoute) {
      // Navigate back to main registry if we're canceling edit from route
      this.router.navigate(['/atm-registry']);
    }
  }

  // Navigation helpers
  goBackToRegistry(): void {
    this.router.navigate(['/atm-registry']);
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

  // Action methods
  viewAtm(atm: AtmRegistryInfo): void {
    // Navigate to ATM details page
    this.router.navigate(['/atm', atm.atmId]);
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

  refreshAtms(): void {
    if (this.isEditFromRoute) {
      this.loadAtmForEdit(this.selectedAtmId!);
    } else {
      this.loadAtms();
    }
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
