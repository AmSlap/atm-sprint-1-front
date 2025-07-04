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

interface AtmLocation {
  id: string;
  name: string;
  address: string;
  region: string;
  status: 'active' | 'maintenance' | 'offline';
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
    MatNativeDateModule
  ],
  templateUrl: './create-incident.component.html',
  styleUrl : './create-incident.component.scss'
})
export class CreateIncidentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private incidentService = inject(IncidentService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  currentUser = this.userService.currentUser;
  incidentDateTime = this.formatDateTime(new Date());

  // Signals
  isSubmitting = signal(false);
  selectedAtm = signal<AtmLocation | null>(null);
  selectedErrorType = signal<ErrorType | null>(null);
  filteredErrorTypes = signal<ErrorType[]>([]);

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

  // Mock ATM data - in real app, this would come from an API
  private atmLocations: AtmLocation[] = [
    { id: 'ATM101', name: 'Downtown Branch ATM', address: '123 Main St, Downtown', region: 'Central', status: 'active' },
    { id: 'ATM102', name: 'Shopping Mall ATM', address: '456 Mall Blvd, Shopping District', region: 'North', status: 'active' },
    { id: 'ATM103', name: 'Airport Terminal ATM', address: '789 Airport Rd, Terminal 1', region: 'East', status: 'maintenance' },
    { id: 'ATM104', name: 'University Campus ATM', address: '321 University Ave, Campus', region: 'West', status: 'active' },
    { id: 'ATM105', name: 'Hospital ATM', address: '654 Medical Center Dr', region: 'South', status: 'offline' }
  ];

  constructor() {
    this.atmInfoForm = this.fb.group({
      atmId: ['', [Validators.required, Validators.pattern(/^ATM\d+$/)]],
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
    // Update current time every minute
    setInterval(() => {
      const now = new Date();
      this.incidentDateTime = this.formatDateTime(now);
    }, 60000);
  }

  onAtmIdChange(event: any) {
    const atmId = event.target.value;
    const atm = this.atmLocations.find(a => a.id === atmId);
    this.selectedAtm.set(atm || null);
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
    description += `ATM Location: ${this.selectedAtm()?.name || 'Unknown'}\n`;
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
}