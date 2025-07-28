import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { IncidentService } from '../../../services/incident.service';
import { UserService } from '../../../services/user.service';
import { CreateIncidentRequest } from '../../../models/api.model';

import { AtmService } from '../../../services/atm.service'; // Add this import
import { AtmCombinedDto } from '../../../models/atm.models'; // Add this import

import { MatAutocompleteModule } from '@angular/material/autocomplete';


interface AtmLocation {
  atmId: string;
  label?: string;
  locationAddress?: string;
  region?: string;
  operationalState: string;
  brand?: string;
  model?: string;
  agencyName?: string;
}

interface ErrorType {
  code: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

@Component({
  selector: 'app-create-incident',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatStepperModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule
  ],
  templateUrl: './create-incident.component.html',
  styleUrl : './create-incident.component.scss'
})
export class CreateIncidentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private incidentService = inject(IncidentService);
  private userService = inject(UserService);
  private atmService = inject(AtmService); // Add this injection
  private snackBar = inject(MatSnackBar);

  currentUser = this.userService.currentUser;
  incidentDateTime = this.formatDateTime(new Date());

  // Signals
  isSubmitting = signal(false);
  isLoadingAtms = signal(false); // Add loading state for ATMs
  selectedAtm = signal<AtmLocation | null>(null);
  selectedErrorType = signal<ErrorType | null>(null);
  filteredErrorTypes = signal<ErrorType[]>([]);
  atmLocations = signal<AtmLocation[]>([]); // Change to signal and make it dynamic
  filteredAtms = signal<AtmLocation[]>([]);

  // Form Groups
  atmInfoForm: FormGroup;
  errorInfoForm: FormGroup;
  descriptionForm: FormGroup;

  // Data
  errorCategories = [
    'Hardware Issues',
    'Software Issues',
    'Network Connectivity',
    'Cash Management',
    'Card Reader Issues',
    'Display Problems',
    'Security Issues',
    'Environmental Issues'
  ];

  errorTypes: ErrorType[] = [
    // Hardware Issues
    { code: 'HW001', name: 'Cash Dispenser Jam', category: 'Hardware Issues', severity: 'high', description: 'Physical jam in cash dispensing mechanism' },
    { code: 'HW002', name: 'Card Reader Malfunction', category: 'Hardware Issues', severity: 'critical', description: 'Card reader not functioning properly' },
    { code: 'HW003', name: 'Receipt Printer Issue', category: 'Hardware Issues', severity: 'medium', description: 'Receipt printer not working or out of paper' },
    { code: 'HW004', name: 'Cash Cassette Error', category: 'Hardware Issues', severity: 'high', description: 'Issues with cash cassette loading or recognition' },

    // Software Issues
    { code: 'SW001', name: 'Application Crash', category: 'Software Issues', severity: 'critical', description: 'ATM application has crashed or frozen' },
    { code: 'SW002', name: 'Transaction Processing Error', category: 'Software Issues', severity: 'high', description: 'Error in processing customer transactions' },
    { code: 'SW003', name: 'Balance Inquiry Failure', category: 'Software Issues', severity: 'medium', description: 'Cannot retrieve customer balance information' },
    { code: 'SW004', name: 'System Update Failure', category: 'Software Issues', severity: 'low', description: 'Failed to install system updates' },

    // Network Connectivity
    { code: 'NET001', name: 'Network Connection Lost', category: 'Network Connectivity', severity: 'critical', description: 'ATM lost connection to banking network' },
    { code: 'NET002', name: 'Slow Network Response', category: 'Network Connectivity', severity: 'medium', description: 'Network responses are unusually slow' },
    { code: 'NET003', name: 'DNS Resolution Issues', category: 'Network Connectivity', severity: 'high', description: 'Cannot resolve network addresses' },

    // Cash Management
    { code: 'CASH001', name: 'Low Cash Warning', category: 'Cash Management', severity: 'medium', description: 'Cash levels below threshold' },
    { code: 'CASH002', name: 'Out of Cash', category: 'Cash Management', severity: 'critical', description: 'ATM is completely out of cash' },
    { code: 'CASH003', name: 'Cash Count Discrepancy', category: 'Cash Management', severity: 'high', description: 'Mismatch in cash count records' },

    // Display Problems
    { code: 'DISP001', name: 'Screen Not Working', category: 'Display Problems', severity: 'critical', description: 'ATM screen is blank or not responding' },
    { code: 'DISP002', name: 'Display Flickering', category: 'Display Problems', severity: 'medium', description: 'Screen display is flickering or unstable' },
    { code: 'DISP003', name: 'Touch Screen Issues', category: 'Display Problems', severity: 'high', description: 'Touch screen not responding to user input' }
  ];

  // Mock ATM data 


  constructor() {
    this.atmInfoForm = this.fb.group({
      atmId: ['', [Validators.required, this.atmExistsValidator.bind(this)]],
    });

    this.errorInfoForm = this.fb.group({
      errorCategory: ['', Validators.required],
      errorType: ['', Validators.required]
    });

    this.descriptionForm = this.fb.group({
      incidentDescription: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
      additionalNotes: ['', Validators.maxLength(500)],
      urgentIncident: [false]
    });

    // Initialize filtered error types
    this.filteredErrorTypes.set(this.errorTypes);
  }

  ngOnInit() {
    this.loadAtmLocations(); // Load ATM data on init

    // Update current time every minute
    setInterval(() => {
      const now = new Date();
      this.incidentDateTime = this.formatDateTime(now);
    }, 60000);
  }

  filterAtms(value: string): void {
  if (!value) {
    this.filteredAtms.set([]);
    return;
  }
  
  const filterValue = value.toLowerCase();
  const filtered = this.atmLocations().filter(atm => 
    atm.atmId.toLowerCase().includes(filterValue) ||
    atm.label?.toLowerCase().includes(filterValue) ||
    atm.locationAddress?.toLowerCase().includes(filterValue)
  );
  this.filteredAtms.set(filtered);
}

  private loadAtmLocations() {
    this.isLoadingAtms.set(true);
    
    this.atmService.getAllAtmsWithRegistryInfo().subscribe({
      next: (atms: AtmCombinedDto[]) => {
        // Transform the backend data to match your interface
        const transformedAtms: AtmLocation[] = atms.map(atm => ({
          atmId: atm.atmId,
          label: atm.label || atm.atmId,
          locationAddress: atm.locationAddress || 'Address not available',
          region: atm.region || 'Unknown Region',
          operationalState: atm.operationalState,
          brand: atm.brand,
          model: atm.model,
          agencyName: atm.agencyName
        }));
        
        this.atmLocations.set(transformedAtms);
        this.isLoadingAtms.set(false);
      },
      error: (error) => {
        console.error('Error loading ATM locations:', error);
        this.snackBar.open('Error loading ATM locations', 'Close', { duration: 3000 });
        this.isLoadingAtms.set(false);
        // Fallback to empty array or keep mock data
        this.atmLocations.set([]);
      }
    });
  }

  private atmExistsValidator(control: any) {
    const atmId = control.value;
    if (!atmId) return null;
    
    const exists = this.atmLocations().some(atm => atm.atmId === atmId);
    return exists ? null : { atmNotExists: true };
  }

  onAtmIdChange(value: string | AtmLocation) {
  if (typeof value === 'string') {
    // User is typing
    this.filterAtms(value);
    const atm = this.atmLocations().find(a => a.atmId === value);
    this.selectedAtm.set(atm || null);
  } else if (value && typeof value === 'object' && 'atmId' in value) {
    // User selected an option from autocomplete
    this.selectedAtm.set(value);
    // This is key - we need to update the form control value
    this.atmInfoForm.get('atmId')?.setValue(value.atmId);
    // Clear the filtered results since selection is made
    this.filteredAtms.set([]);
  }
}

  onErrorCategoryChange(event: any) {
    const category = event.value;
    const filtered = this.errorTypes.filter(et => et.category === category);
    this.filteredErrorTypes.set(filtered);

    // Reset error type selection when category changes
    this.errorInfoForm.patchValue({ errorType: '' });
    this.selectedErrorType.set(null);
  }

  onErrorTypeChange(event: any) {
    const errorTypeName = event.value;
    const errorType = this.errorTypes.find(et => et.name === errorTypeName);
    this.selectedErrorType.set(errorType || null);
  }

  submitIncident() {
    if (!this.isFormValid()) {
      this.snackBar.open('Please complete all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);

    const request: CreateIncidentRequest = {
      atmId: this.atmInfoForm.value.atmId,
      errorType: this.errorInfoForm.value.errorType,
      incidentDescription: this.buildFullDescription(),
      createdBy: this.currentUser().username
    };

    this.incidentService.createIncident(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Incident created successfully!', 'Close', { duration: 5000 });
          this.router.navigate(['/incidents', response.data.id]);
        } else {
          this.snackBar.open('Failed to create incident: ' + response.error, 'Close', { duration: 5000 });
        }
        this.isSubmitting.set(false);
      },
      error: (error) => {
        console.error('Error creating incident:', error);
        this.snackBar.open('Error creating incident. Please try again.', 'Close', { duration: 5000 });
        this.isSubmitting.set(false);
      }
    });
  }

  private buildFullDescription(): string {
    let description = this.descriptionForm.value.incidentDescription;

    // Add system information
    description += '\n\n=== SYSTEM INFORMATION ===\n';
    description += `ATM Location: ${this.selectedAtm()?.label || 'Unknown'}\n`;
    description += `Error Category: ${this.errorInfoForm.value.errorCategory}\n`;
    description += `Error Code: ${this.selectedErrorType()?.code || 'N/A'}\n`;
    description += `Severity: ${this.selectedErrorType()?.severity || 'Unknown'}\n`;
    description += `Incident Time: ${this.incidentDateTime}\n`;
    description += `Reported By: ${this.currentUser().displayName} (${this.currentUser().username})\n`;

    if (this.descriptionForm.value.urgentIncident) {
      description += '\n⚠️ URGENT INCIDENT - REQUIRES IMMEDIATE ATTENTION\n';
    }

    if (this.descriptionForm.value.additionalNotes) {
      description += '\n=== ADDITIONAL NOTES ===\n';
      description += this.descriptionForm.value.additionalNotes;
    }

    return description;
  }

  private isFormValid(): boolean {
    return this.atmInfoForm.valid &&
           this.errorInfoForm.valid &&
           this.descriptionForm.valid;
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  // Add retry method
retryLoadAtms() {
  this.loadAtmLocations();
}

  displayAtm(atm: AtmLocation | null): string {
  return atm ? atm.atmId : '';
}

// Add this getter to your component class
get atmIdValue(): string {
  return this.atmInfoForm.get('atmId')?.value || '';
}

// Add refresh method
refreshAtmData() {
  this.loadAtmLocations();
  this.snackBar.open('ATM data refreshed', 'Close', { duration: 2000 });
}

  onInputFocus() {
  // Show filtered results when input gets focus
  const currentValue = this.atmInfoForm.get('atmId')?.value || '';
  if (currentValue) {
    this.filterAtms(currentValue);
  }
}

onInputBlur() {
  // Clear filtered results when input loses focus (optional)
  setTimeout(() => {
    this.filteredAtms.set([]);
  }, 200); // Small delay to allow for option selection
}

  
}