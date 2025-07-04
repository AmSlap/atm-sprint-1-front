import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


import { IncidentService } from '../../../services/incident.service';
import { UserService } from '../../../services/user.service';
import { Incident, IncidentStatus, IncidentTask, TaskStatus, IncidentReport, IncidentStatistics } from '../../../models/incident.model';

interface ProcessStep {
  name: string;
  status: 'completed' | 'current' | 'pending';
  completedAt?: string;
  duration?: string;
  user?: string;
  details?: string;
}

interface TaskHistory {
  task: IncidentTask;
  completedAt?: string;
  duration?: string;
  outcome?: string;
}

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDividerModule,
    MatBadgeModule,
    MatMenuModule,
    MatDialogModule,
    MatStepperModule
  ],
  templateUrl: './incident-detail.component.html',
  styleUrl: './incident-detail.component.scss',
})
export class IncidentDetailComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  currentUser = this.userService.currentUser;
  currentDateTime =  this.formatDateTime(new Date());

  // Signals
  isLoading = signal(false);
  incident = signal<Incident | null>(null);
  incidentReport = signal<IncidentReport | null>(null);
  allTasks = signal<IncidentTask[]>([]);
  errorMessage = signal<string>('');
  processDiagram = signal<string>('');
  isDiagramLoading = signal(false);

  sanitizedDiagram = computed(() => {
    const diagram = this.processDiagram();
    if (diagram) {
      return this.sanitizer.bypassSecurityTrustHtml(diagram);
    }
    return null;
  });

  // Computed values
  activeTasks = computed(() =>
    this.allTasks().filter(task =>
      ![TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXITED, TaskStatus.OBSOLETE].includes(task.status)
    )
  );

  completedTasks = computed(() =>
    this.allTasks().filter(task =>
      [TaskStatus.COMPLETED].includes(task.status)
    )
  );

  processSteps = computed(() => {
    const incident = this.incident();
    if (!incident) return [];

    const steps: ProcessStep[] = [
      {
        name: 'Incident Created',
        status: 'completed',
        completedAt: incident.createdAt,
        user: incident.createdBy,
        details: `ATM: ${incident.atmId}, Error: ${incident.errorType}`
      },
      {
        name: 'Initial Processing',
        status: incident.initialDiagnosis ? 'completed' :
               incident.status === IncidentStatus.CREATED ? 'current' : 'pending',
        completedAt: incident.initialDiagnosis ? incident.updatedAt : undefined,
        details: incident.initialDiagnosis
      },
      {
        name: 'Incident Analysis',
        status: incident.incidentType ? 'completed' :
               [IncidentStatus.IN_PROGRESS].includes(incident.status) ? 'current' : 'pending',
        details: incident.incidentType ? `Classified as: ${this.formatIncidentType(incident.incidentType)}` : undefined
      },
      {
        name: 'Assessment',
        status: incident.assessmentDetails ? 'completed' :
               [IncidentStatus.WAITING_FOR_ASSESSMENT].includes(incident.status) ? 'current' : 'pending',
        details: incident.assessmentDetails
      },
      {
        name: 'Resolution',
        status: incident.resolutionDetails ? 'completed' :
               [IncidentStatus.WAITING_FOR_RESOLUTION, IncidentStatus.WAITING_FOR_INSURANCE, IncidentStatus.WAITING_FOR_PROCUREMENT].includes(incident.status) ? 'current' : 'pending',
        completedAt: incident.resolvedAt,
        details: incident.resolutionDetails
      },
      {
        name: 'Closure',
        status: incident.closedAt ? 'completed' :
               incident.status === IncidentStatus.RESOLVED ? 'current' : 'pending',
        completedAt: incident.closedAt,
        details: incident.closureDetails
      }
    ];

    return steps;
  });

  ngOnInit() {
    this.updateCurrentTime();
    this.loadIncidentDetails();
  }

  private loadIncidentDetails() {
    const incidentId = this.route.snapshot.paramMap.get('id');
    if (!incidentId) {
      this.errorMessage.set('Invalid incident ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.incidentService.getIncidentById(Number(incidentId)).subscribe({
      next: (response) => {
        if (response.success) {
          this.incident.set(response.data);
          this.loadIncidentReport(response.data);
        } else {
          this.errorMessage.set(response.error || 'Failed to load incident');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading incident:', error);
        this.errorMessage.set('Error loading incident details');
        this.isLoading.set(false);
      }
    });
  }

  private loadIncidentReport(incident: Incident) {
    if (incident.processInstanceId) {
      this.incidentService.getIncidentByProcessId(incident.processInstanceId).subscribe({
        next: (response) => {
          if (response.success) {
            this.incidentReport.set(response.data);
            this.allTasks.set(response.data.tasks);
            // Auto-load the process diagram when incident report loads
            this.loadProcessDiagram(incident.processInstanceId!);
          }
        },
        error: (error) => {
          console.log('Could not load full incident report:', error);
          // Not critical, just means we won't have the extended data
        }
      });
    }
  }
  public loadProcessDiagram(processInstanceId: number) {
    this.isDiagramLoading.set(true);
    console.log('Loading process diagram for:', processInstanceId);
    this.incidentService.getProcessDiagram(processInstanceId).subscribe({
      next: (svgContent) => {
        console.log('SVG Content received:', svgContent.substring(0, 200) + '...');
        this.processDiagram.set(svgContent);
        this.isDiagramLoading.set(false);
      },
      error: (error) => {
        console.log('Could not load process diagram:', error);
        this.isDiagramLoading.set(false);
        // Not critical, diagram is optional
      }
    });
  }

  private updateCurrentTime() {
    setInterval(() => {
      const now = new Date();
      this.currentDateTime = this.formatDateTime(now);
    }, 60000);
  }

  refreshIncident() {
    this.loadIncidentDetails();
  }

  goBack() {
    this.router.navigate(['/incidents']);
  }

  navigateToIncidents() {
    this.router.navigate(['/incidents']);
  }

  navigateToMyTasks() {
    this.router.navigate(['/my-tasks']);
  }

  copyIncidentNumber() {
    const incident = this.incident();
    if (incident) {
      navigator.clipboard.writeText(incident.incidentNumber).then(() => {
        this.snackBar.open('Incident number copied to clipboard', 'Close', { duration: 2000 });
      });
    }
  }

  copyTaskId(task: IncidentTask) {
    navigator.clipboard.writeText(task.taskInstanceId.toString()).then(() => {
      this.snackBar.open('Task ID copied to clipboard', 'Close', { duration: 2000 });
    });
  }

  viewProcessInstance() {
    const incident = this.incident();
    if (incident?.processInstanceId) {
      console.log('View process instance:', incident.processInstanceId);
      this.snackBar.open('Process view functionality coming soon', 'Close', { duration: 3000 });
    }
  }

  abortIncident() {
    const incident = this.incident();
    if (incident && this.canAbortIncident()) {
      // Implement abort confirmation dialog
      console.log('Abort incident:', incident);
      this.snackBar.open('Abort functionality coming soon', 'Close', { duration: 3000 });
    }
  }

  claimTask(task: IncidentTask) {
    if (!this.canClaimTask(task)) {
      this.snackBar.open('You cannot claim this task', 'Close', { duration: 3000 });
      return;
    }

    const username = this.currentUser().username;
    this.incidentService.claimTask(task.taskInstanceId, { user: username }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Task claimed successfully!', 'Close', { duration: 3000 });
          this.refreshIncident();
        } else {
          this.snackBar.open('Failed to claim task: ' + response.error, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        console.error('Error claiming task:', error);
        this.snackBar.open('Error claiming task', 'Close', { duration: 3000 });
      }
    });
  }

  // Helper methods
  canAbortIncident(): boolean {
    const incident = this.incident();
    return incident ? ![IncidentStatus.CLOSED, IncidentStatus.ABORTED, IncidentStatus.RESOLVED].includes(incident.status) : false;
  }

  canClaimTask(task: IncidentTask): boolean {
    const userGroups = this.currentUser().groups;
    return task.assignedGroup ? userGroups.includes(task.assignedGroup) : false;
  }

  isUrgent(): boolean {
    const incident = this.incident();
    return incident ? (incident.incidentDescription.includes('URGENT') || incident.incidentDescription.includes('⚠️')) : false;
  }

  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  formatIncidentType(type: string): string {
    switch (type) {
      case 'under_maintenance': return 'Under Maintenance';
      case 'outside_maintenance_under_insurance': return 'Outside Maintenance - Under Insurance';
      case 'outside_maintenance_outside_insurance': return 'Outside Maintenance - Outside Insurance';
      case 'not_classified': return 'Not Classified';
      default: return type;
    }
  }

  getStatusLabel(status: IncidentStatus): string {
    switch (status) {
      case IncidentStatus.CREATED: return 'Created';
      case IncidentStatus.IN_PROGRESS: return 'In Progress';
      case IncidentStatus.WAITING_FOR_ASSESSMENT: return 'Waiting for Assessment';
      case IncidentStatus.WAITING_FOR_INSURANCE: return 'Waiting for Insurance';
      case IncidentStatus.WAITING_FOR_PROCUREMENT: return 'Waiting for Procurement';
      case IncidentStatus.WAITING_FOR_RESOLUTION: return 'Waiting for Resolution';
      case IncidentStatus.RESOLVED: return 'Resolved';
      case IncidentStatus.CLOSED: return 'Closed';
      case IncidentStatus.ABORTED: return 'Aborted';
      default: return status;
    }
  }

  getStatusClass(status: IncidentStatus): string {
    return `status-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  getTaskStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.CREATED: return 'Created';
      case TaskStatus.READY: return 'Ready';
      case TaskStatus.RESERVED: return 'Claimed';
      case TaskStatus.IN_PROGRESS: return 'In Progress';
      case TaskStatus.SUSPENDED: return 'Suspended';
      case TaskStatus.COMPLETED: return 'Completed';
      case TaskStatus.FAILED: return 'Failed';
      case TaskStatus.ERROR: return 'Error';
      case TaskStatus.EXITED: return 'Exited';
      case TaskStatus.OBSOLETE: return 'Obsolete';
      default: return status;
    }
  }

  getTaskStatusClass(status: TaskStatus): string {
    return `status-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  calculateDuration(): string {
    const incident = this.incident();
    if (!incident) return '';

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

  calculateTaskAge(task: IncidentTask): string {
    const created = new Date(task.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
  }

  calculateTaskDuration(task: IncidentTask): string {
    if (!task.completedAt) return 'N/A';

    const start = new Date(task.createdAt);
    const end = new Date(task.completedAt);
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

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  }

  getTaskOutputSummary(task: IncidentTask): string {
    if (!task.outputData) return 'No output data';

    try {
      const output = JSON.parse(task.outputData);
      return Object.values(output).join(', ').slice(0, 200) + '...';
    } catch {
      return task.outputData.slice(0, 200) + '...';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  }
}
