import { Component, OnInit, inject, signal, computed, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { IncidentService } from '../../../services/incident.service';
import { UserService } from '../../../services/user.service';
import { Incident, IncidentStatus } from '../../../models/incident.model';
import { PageResponse } from '../../../models/api.model';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule
  ],
  templateUrl: './incident-list.component.html',
  styleUrl : './incident-list.component.scss',
})
export class IncidentListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private incidentService = inject(IncidentService);
  private userService = inject(UserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  currentUser = this.userService.currentUser;
  //get current date and time
  currentDateTime = this.formatDateTime(new Date()); // Initial current time

  // Signals
  isLoading = signal(false);
  allIncidents = signal<Incident[]>([]);
  selectedIncident = signal<Incident | null>(null);

  // Form Controls
  searchControl = new FormControl('');
  statusFilterControl = new FormControl<IncidentStatus[]>([]);
  atmFilterControl = new FormControl<string[]>([]);
  createdByFilterControl = new FormControl<string[]>([]);

  // Table
  displayedColumns = [
    'incidentNumber',
    'status',
    'atmId',
    'errorType',
    'createdBy',
    'createdAt',
    'duration',
    'actions'
  ];
  dataSource = new MatTableDataSource<Incident>([]);

  // Computed values
  totalIncidents = computed(() => this.allIncidents().length);
  activeIncidents = computed(() =>
    this.allIncidents().filter(i =>
      ![IncidentStatus.CLOSED, IncidentStatus.ABORTED, IncidentStatus.RESOLVED].includes(i.status)
    ).length
  );

  uniqueAtmIds = computed(() =>
    [...new Set(this.allIncidents().map(i => i.atmId))].sort()
  );

  uniqueCreatedBy = computed(() =>
    [...new Set(this.allIncidents().map(i => i.createdBy))].sort()
  );

  statusOptions = [
    { value: IncidentStatus.CREATED, label: 'Created' },
    { value: IncidentStatus.IN_PROGRESS, label: 'In Progress' },
    { value: IncidentStatus.WAITING_FOR_ASSESSMENT, label: 'Waiting for Assessment' },
    { value: IncidentStatus.WAITING_FOR_INSURANCE, label: 'Waiting for Insurance' },
    { value: IncidentStatus.WAITING_FOR_PROCUREMENT, label: 'Waiting for Procurement' },
    { value: IncidentStatus.WAITING_FOR_RESOLUTION, label: 'Waiting for Resolution' },
    { value: IncidentStatus.RESOLVED, label: 'Resolved' },
    { value: IncidentStatus.CLOSED, label: 'Closed' },
    { value: IncidentStatus.ABORTED, label: 'Aborted' }
  ];

  ngOnInit() {
    this.loadIncidents();
    this.setupFilters();
    this.updateCurrentTime();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadIncidents() {
    this.isLoading.set(true);

    this.incidentService.getAllIncidents(0, 1000).subscribe({
      next: (response) => {
        if (response.success) {
          this.allIncidents.set(response.data.content);
          this.dataSource.data = response.data.content;
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading incidents:', error);
        this.snackBar.open('Error loading incidents', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  private setupFilters() {
    // Search filter
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.applyFilters());

    // Status filter
    this.statusFilterControl.valueChanges.subscribe(() => this.applyFilters());

    // ATM filter
    this.atmFilterControl.valueChanges.subscribe(() => this.applyFilters());

    // Created by filter
    this.createdByFilterControl.valueChanges.subscribe(() => this.applyFilters());
  }

  private applyFilters() {
    let filteredData = [...this.allIncidents()];

    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase().trim();
    if (searchTerm) {
      filteredData = filteredData.filter(incident =>
        incident.incidentNumber.toLowerCase().includes(searchTerm) ||
        incident.atmId.toLowerCase().includes(searchTerm) ||
        incident.errorType.toLowerCase().includes(searchTerm) ||
        incident.incidentDescription.toLowerCase().includes(searchTerm) ||
        incident.createdBy.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    const statusFilters = this.statusFilterControl.value;
    if (statusFilters && statusFilters.length > 0) {
      filteredData = filteredData.filter(incident =>
        statusFilters.includes(incident.status)
      );
    }

    // ATM filter
    const atmFilters = this.atmFilterControl.value;
    if (atmFilters && atmFilters.length > 0) {
      filteredData = filteredData.filter(incident =>
        atmFilters.includes(incident.atmId)
      );
    }

    // Created by filter
    const createdByFilters = this.createdByFilterControl.value;
    if (createdByFilters && createdByFilters.length > 0) {
      filteredData = filteredData.filter(incident =>
        createdByFilters.includes(incident.createdBy)
      );
    }

    this.dataSource.data = filteredData;
  }

  private updateCurrentTime() {
    setInterval(() => {
      const now = new Date();
      this.currentDateTime = this.formatDateTime(now);
    }, 60000);
  }

  // Public methods
  refreshData() {
    this.loadIncidents();
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.statusFilterControl.setValue([]);
    this.atmFilterControl.setValue([]);
    this.createdByFilterControl.setValue([]);
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchControl.value ||
      (this.statusFilterControl.value && this.statusFilterControl.value.length > 0) ||
      (this.atmFilterControl.value && this.atmFilterControl.value.length > 0) ||
      (this.createdByFilterControl.value && this.createdByFilterControl.value.length > 0)
    );
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  removeStatusFilter(status: IncidentStatus) {
    const current = this.statusFilterControl.value || [];
    this.statusFilterControl.setValue(current.filter(s => s !== status));
  }

  removeAtmFilter(atm: string) {
    const current = this.atmFilterControl.value || [];
    this.atmFilterControl.setValue(current.filter(a => a !== atm));
  }

  removeCreatedByFilter(user: string) {
    const current = this.createdByFilterControl.value || [];
    this.createdByFilterControl.setValue(current.filter(u => u !== user));
  }

  setSelectedIncident(incident: Incident) {
    this.selectedIncident.set(incident);
  }

  viewIncident(incident: Incident) {
    this.router.navigate(['/incidents', incident.id]);
  }

  // Menu action methods with null checks
  viewIncidentFromMenu() {
    const incident = this.selectedIncident();
    if (incident) {
      this.viewIncident(incident);
    }
  }

  viewProcessInstanceFromMenu() {
    const incident = this.selectedIncident();
    if (incident?.processInstanceId) {
      console.log('View process instance:', incident.processInstanceId);
    }
  }

  copyIncidentNumberFromMenu() {
    const incident = this.selectedIncident();
    if (incident) {
      navigator.clipboard.writeText(incident.incidentNumber).then(() => {
        this.snackBar.open('Incident number copied to clipboard', 'Close', { duration: 2000 });
      });
    }
  }

  abortIncidentFromMenu() {
    const incident = this.selectedIncident();
    if (incident && this.canAbortIncident(incident)) {
      console.log('Abort incident:', incident);
    }
  }

  canAbortIncident(incident: Incident): boolean {
    return ![IncidentStatus.CLOSED, IncidentStatus.ABORTED, IncidentStatus.RESOLVED].includes(incident.status);
  }

  createIncident() {
    this.router.navigate(['/create-incident']);
  }

  exportData() {
    // Implement export functionality
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 3000 });
  }

  isUrgent(incident: Incident): boolean {
    return incident.incidentDescription.includes('URGENT') ||
           incident.incidentDescription.includes('⚠️');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  getStatusLabel(status: IncidentStatus): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  }

  getStatusClass(status: IncidentStatus): string {
    return `status-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  calculateDuration(incident: Incident): string {
    const start = new Date(incident.createdAt);
    const end = incident.closedAt ? new Date(incident.closedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
  }

  getDurationClass(incident: Incident): string {
    const start = new Date(incident.createdAt);
    const end = new Date();
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (incident.status === IncidentStatus.CLOSED || incident.status === IncidentStatus.RESOLVED) {
      return 'duration-normal';
    } else if (diffHours > 72) { // More than 3 days
      return 'duration-critical';
    } else if (diffHours > 24) { // More than 1 day
      return 'duration-warning';
    } else {
      return 'duration-normal';
    }
  }
}
