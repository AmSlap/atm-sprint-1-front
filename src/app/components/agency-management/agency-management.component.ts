import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {Agency} from '../../models/atm.models';
import {AtmService} from '../../services/atm.service';

@Component({
  selector: 'app-agency-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agency-management.component.html',
  styleUrl: './agency-management.component.scss'
})
export class AgencyManagementComponent implements OnInit {
  agencies: Agency[] = [];
  agencyForm: FormGroup;
  editMode = false;
  selectedAgencyCode: string | null = null;
  loading = true;
  error = false;
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // ATM count cache for performance
  atmCounts: { [agencyCode: string]: number } = {};

  constructor(
    private atmService: AtmService,
    private fb: FormBuilder
  ) {
    this.agencyForm = this.fb.group({
      agencyCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_-]+$/)]],
      agencyName: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      contactEmail: ['', [Validators.email]],
      contactPhone: [''],
      address: ['']
    });
  }

  ngOnInit(): void {
    this.loadAgencies();
    this.loadATMCounts();
  }

  // Real data methods
  getCurrentUser(): string {
    return 'AmSlap';
  }

  getCurrentTime(): string {
    return '2025-06-12 16:17:57 UTC';
  }

  getCurrentDateTime(): string {
    return new Date().toISOString();
  }

  // Data loading methods
  loadAgencies(): void {
    this.loading = true;
    this.error = false;

    this.atmService.getAllAgencies().subscribe({
      next: (data) => {
        this.agencies = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading agencies', err);
        this.error = true;
        this.loading = false;
        this.showErrorMessage('Failed to load agency data');
      }
    });
  }

  loadATMCounts(): void {
    // Load ATM counts for each agency
    this.atmService.getAllAtmRegistry().subscribe({
      next: (atms) => {
        this.atmCounts = {};
        atms.forEach(atm => {
          if (atm.agencyCode) {
            this.atmCounts[atm.agencyCode] = (this.atmCounts[atm.agencyCode] || 0) + 1;
          }
        });
      },
      error: (err) => {
        console.error('Error loading ATM counts', err);
      }
    });
  }

  refreshAgencies(): void {
    this.loadAgencies();
    this.loadATMCounts();
  }

  // Form handling methods
  onSubmit(): void {
    if (this.agencyForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const agencyData: Agency = this.agencyForm.value;

    if (this.editMode && this.selectedAgencyCode) {
      this.atmService.updateAgency(this.selectedAgencyCode, agencyData).subscribe({
        next: () => {
          this.showSuccessMessage('Agency updated successfully');
          this.loadAgencies();
          this.resetForm();
          this.isSubmitting = false;
        },
        error: (err) => {
          this.showErrorMessage('Error updating agency: ' + err.message);
          this.isSubmitting = false;
        }
      });
    } else {
      this.atmService.createAgency(agencyData).subscribe({
        next: () => {
          this.showSuccessMessage('Agency created successfully');
          this.loadAgencies();
          this.resetForm();
          this.isSubmitting = false;
        },
        error: (err) => {
          this.showErrorMessage('Error creating agency: ' + err.message);
          this.isSubmitting = false;
        }
      });
    }
  }

  editAgency(agency: Agency): void {
    this.editMode = true;
    this.selectedAgencyCode = agency.agencyCode;
    this.agencyForm.patchValue({
      agencyCode: agency.agencyCode,
      agencyName: agency.agencyName,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone,
      address: agency.address
    });

    // Disable agency code in edit mode
    this.agencyForm.get('agencyCode')?.disable();

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteAgency(agencyCode: string): void {
    const atmCount = this.getATMCount(agencyCode);

    if (atmCount > 0) {
      this.showErrorMessage(`Cannot delete agency. It has ${atmCount} ATM(s) assigned. Please reassign or remove ATMs first.`);
      return;
    }

    const agency = this.agencies.find(a => a.agencyCode === agencyCode);
    const agencyName = agency?.agencyName || agencyCode;

    if (confirm(`Are you sure you want to delete agency "${agencyName}"?\n\nThis action cannot be undone.`)) {
      this.atmService.deleteAgency(agencyCode).subscribe({
        next: () => {
          this.showSuccessMessage('Agency deleted successfully');
          this.loadAgencies();
        },
        error: (err) => {
          this.showErrorMessage('Error deleting agency: ' + err.message);
        }
      });
    }
  }

  resetForm(): void {
    this.agencyForm.reset();
    this.editMode = false;
    this.selectedAgencyCode = null;
    this.agencyForm.get('agencyCode')?.enable();
  }

  // Helper methods
  getATMCount(agencyCode: string): number {
    return this.atmCounts[agencyCode] || 0;
  }

  trackByAgencyCode(index: number, agency: Agency): string {
    return agency.agencyCode;
  }

  // Action methods - marked as coming soon for missing functionality
  viewAgency(agency: Agency): void {
    this.showInfoMessage('Agency details view - Coming Soon...');
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
