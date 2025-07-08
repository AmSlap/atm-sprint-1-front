import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

import { IncidentService } from '../../services/incident.service';
import { UserService } from '../../services/user.service';
import { IncidentTask, TaskStatus, IncidentType } from '../../models/incident.model';
import {
  ProcessIncidentRequest,
  AnalyzeIncidentRequest,
  AssessIncidentRequest,
  ApproveInsuranceRequest,
  ProcureItemsRequest,
  ResolveIncidentRequest,
  CloseIncidentRequest
} from '../../models/api.model';

interface TaskInputData {
  atmId?: string;
  errorType?: string;
  incidentDescription?: string;
  initialDiagnosis?: string;
  incidentType?: string;
  assessmentDetails?: string;
  supplierTicketNumber?: string;
  reimbursementDetails?: string;
  procurementDetails?: string;
  resolutionDetails?: string;
  [key: string]: any;
}

interface TaskInputItem {
  key: string;
  value: any;
}

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDividerModule,
    MatBadgeModule
  ],
  templateUrl: './my-tasks.component.html',
  styleUrl: './my-tasks.component.scss',
})
export class MyTasksComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private userService = inject(UserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  currentUser = this.userService.currentUser;
  currentDateTime = Date.now().toString();

  // Signals
  isLoading = signal(false);
  isProcessing = signal(false);
  allTasks = signal<IncidentTask[]>([]);
  completedTasksData = signal<IncidentTask[]>([]);
  selectedTask = signal<IncidentTask | null>(null);
  showCompletionDialog = signal(false);
  taskInputDataMap = signal<Map<number, TaskInputData>>(new Map());

  // Form
  completionForm: FormGroup | null = null;

  // Computed values
  totalTasks = computed(() => this.allTasks().length + this.completedTasksData().length);

  activeTasks = computed(() =>
    this.allTasks().filter(task =>
      ![TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXITED, TaskStatus.OBSOLETE].includes(task.status)
    ).length
  );

  completedTasks = computed(() => this.completedTasksData().length);

  activeTasksList = computed(() =>
    this.allTasks()
      .filter(task => ![TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXITED, TaskStatus.OBSOLETE].includes(task.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  completedTasksList = computed(() =>
    this.completedTasksData()
      .sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt).getTime() -
                      new Date(a.completedAt || a.updatedAt || a.createdAt).getTime())
  );

  ngOnInit() {
    this.loadMyTasks();
    this.loadCompletedTasks();
    this.updateCurrentTime();
  }

  private loadMyTasks() {
    this.isLoading.set(true);
    const username = this.currentUser().username;

    this.incidentService.getUserTasks(username).subscribe({
      next: (response) => {
        if (response.success) {
          // Filter out completed tasks as they will be loaded separately
          const activeTasks = response.data.filter(task => 
            ![TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXITED, TaskStatus.OBSOLETE].includes(task.status)
          );
          this.allTasks.set(activeTasks);
          this.loadTaskInputData(activeTasks);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading my tasks:', error);
        this.snackBar.open('Error loading tasks', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  private loadCompletedTasks() {
    const username = this.currentUser().username;
    
    this.incidentService.getUserTasksByStatus(username, 'COMPLETED').subscribe({
      next: (response) => {
        if (response.success) {
          console.log(`${response.data.length} completed tasks loaded from database`);
          this.completedTasksData.set(response.data);
          this.loadTaskInputData(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading completed tasks:', error);
        this.snackBar.open('Error loading completed tasks', 'Close', { duration: 3000 });
      }
    });
  }

  private loadTaskInputData(tasks: IncidentTask[]) {
    // Load input data for each task
    tasks.forEach(task => {
      this.incidentService.getTaskInputData(task.taskInstanceId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const inputDataMap = this.taskInputDataMap();
            inputDataMap.set(task.taskInstanceId, response.data);
            this.taskInputDataMap.set(new Map(inputDataMap));
            console.log(`Input data loaded for task: ${task.taskInstanceId}`, response.data);
          }
        },
        error: (error) => {
          console.log('Could not load input data for task:', task.taskInstanceId);
        }
      });
    });
  }

  private updateCurrentTime() {
    setInterval(() => {
      const now = new Date();
      this.currentDateTime = this.formatDateTime(now);
    }, 60000);
  }

  refreshTasks() {
    this.loadMyTasks();
    this.loadCompletedTasks();
  }

  claimTask(task: IncidentTask) {
    this.isProcessing.set(true);
    const username = this.currentUser().username;

    this.incidentService.claimTask(task.taskInstanceId, { user: username }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Task claimed successfully', 'Close', { duration: 3000 });
          this.incidentService.startTask(task.taskInstanceId, username).subscribe({
            next: (startResponse) => {
              if (startResponse.success) {
                this.snackBar.open('Task started successfully', 'Close', { duration: 3000 });
              } else {
                this.snackBar.open('Failed to start task: ' + startResponse.error, 'Close', { duration: 5000 });
              }
            },
            error: (error) => {
              console.error('Error starting task:', error);
              this.snackBar.open('Error starting task', 'Close', { duration: 3000 });
            }
          });
          this.refreshTasks();
        } else {
          this.snackBar.open('Failed to claim task: ' + response.error, 'Close', { duration: 5000 });
        }
        this.isProcessing.set(false);
      },
      error: (error) => {
        console.error('Error claiming task:', error);
        this.snackBar.open('Error claiming task', 'Close', { duration: 3000 });
        this.isProcessing.set(false);
      }
    });
  }

  releaseTask(task: IncidentTask) {
    this.isProcessing.set(true);
    const username = this.currentUser().username;

    this.incidentService.releaseTask(task.taskInstanceId, username).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Task released successfully', 'Close', { duration: 3000 });
          this.refreshTasks();
        } else {
          this.snackBar.open('Failed to release task: ' + response.error, 'Close', { duration: 5000 });
        }
        this.isProcessing.set(false);
      },
      error: (error) => {
        console.error('Error releasing task:', error);
        this.snackBar.open('Error releasing task', 'Close', { duration: 3000 });
        this.isProcessing.set(false);
      }
    });
  }

  startTask(task: IncidentTask) {
    // For now, just open completion dialog
    this.incidentService.startTask(task.taskInstanceId, this.currentUser().username).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Task started successfully', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Failed to start task: ' + response.error, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        console.error('Error starting task:', error);
        this.snackBar.open('Error starting task', 'Close', { duration: 3000 });
      }
    });

  }

  openTaskCompletionDialog(task: IncidentTask) {
    this.selectedTask.set(task);
    this.createCompletionForm(task);
    this.showCompletionDialog.set(true);
  }

  closeCompletionDialog() {
    this.showCompletionDialog.set(false);
    this.selectedTask.set(null);
    this.completionForm = null;
  }

  private createCompletionForm(task: IncidentTask) {
    const username = this.currentUser().username;

    switch (task.taskName) {
      case 'Process Incident':
        this.completionForm = this.fb.group({
          user: [username],
          initialDiagnosis: ['', Validators.required]
        });
        break;

      case 'Analyze Incident':
        this.completionForm = this.fb.group({
          user: [username],
          incidentType: ['', Validators.required]
        });
        break;

      case 'Assess Incident':
        this.completionForm = this.fb.group({
          user: [username],
          assessmentDetails: ['', Validators.required],
          supplierTicketNumber: ['', Validators.required]
        });
        break;

      case 'Approve Insurance':
        this.completionForm = this.fb.group({
          user: [username],
          reimbursementDetails: ['', Validators.required]
        });
        break;

      case 'Procure Parts/Services':
        this.completionForm = this.fb.group({
          user: [username],
          procurementDetails: ['', Validators.required]
        });
        break;

      case 'Resolve Incident':
      case 'Resolve Incident Under Maintenance':
        this.completionForm = this.fb.group({
          user: [username],
          resolutionDetails: ['', Validators.required],
          supplierTicketNumber: ['', Validators.required]
        });
        break;

      case 'Close Incident':
        this.completionForm = this.fb.group({
          user: [username],
          closureDetails: ['', Validators.required]
        });
        break;

      default:
        this.completionForm = this.fb.group({
          user: [username]
        });
    }
  }

  completeTask() {
    if (!this.completionForm?.valid || !this.selectedTask()) {
      return;
    }

    this.isProcessing.set(true);
    const task = this.selectedTask()!;
    const formValue = this.completionForm.value;
    const taskId = task.taskInstanceId;

    let completionObservable;

    switch (task.taskName) {
      case 'Process Incident':
        completionObservable = this.incidentService.completeProcessIncident(taskId, formValue as ProcessIncidentRequest);
        break;
      case 'Analyze Incident':
        completionObservable = this.incidentService.completeAnalyzeIncident(taskId, formValue as AnalyzeIncidentRequest);
        break;
      case 'Assess Incident':
        completionObservable = this.incidentService.completeAssessIncident(taskId, formValue as AssessIncidentRequest);
        break;
      case 'Approve Insurance':
        completionObservable = this.incidentService.completeApproveInsurance(taskId, formValue as ApproveInsuranceRequest);
        break;
      case 'Procure Parts/Services':
        completionObservable = this.incidentService.completeProcureItems(taskId, formValue as ProcureItemsRequest);
        break;
      case 'Resolve Incident':
        completionObservable = this.incidentService.completeResolveIncident(taskId, formValue as ResolveIncidentRequest);
        break;
      case 'Resolve Incident Under Maintenance':
        completionObservable = this.incidentService.completeResolveMaintenanceIncident(taskId, formValue as ResolveIncidentRequest);
        break;
      case 'Close Incident':
        completionObservable = this.incidentService.completeCloseIncident(taskId, formValue as CloseIncidentRequest);
        break;
      default:
        this.snackBar.open('Unknown task type', 'Close', { duration: 3000 });
        this.isProcessing.set(false);
        return;
    }

    completionObservable.subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Task completed successfully!', 'Close', { duration: 5000 });
          this.closeCompletionDialog();
          this.refreshTasks();
        } else {
          this.snackBar.open('Failed to complete task: ' + response.error, 'Close', { duration: 5000 });
        }
        this.isProcessing.set(false);
      },
      error: (error) => {
        console.error('Error completing task:', error);
        this.snackBar.open('Error completing task', 'Close', { duration: 5000 });
        this.isProcessing.set(false);
      }
    });
  }

  viewIncident(task: IncidentTask) {
    // Navigate to incident details - we'll need to get the incident ID from the task
    // For now, navigate to incidents list
    this.router.navigate(['/incidents']);
  }

  viewAvailableTasks() {
    this.router.navigate(['/available-tasks']);
  }

  // Helper methods
  trackByTaskId(index: number, task: IncidentTask): number {
    return task.taskInstanceId;
  }

  getTaskInputDataItems(task: IncidentTask): TaskInputItem[] {
  const inputData = this.taskInputDataMap().get(task.taskInstanceId);
  if (!inputData) return [];

  // Filter out system fields and convert to array of key-value pairs
  const filtered: TaskInputItem[] = [];
  const excludedFields = ['TaskName', 'NodeName', 'Skippable', 'GroupId'];
  
  Object.entries(inputData).forEach(([key, value]) => {
    // Skip excluded system fields
    if (excludedFields.includes(key)) {
      return;
    }
    
    // Include all other fields that have valid values
    if (value !== null && value !== undefined && value !== '') {
      filtered.push({ key, value: String(value) });
    }
  });

  return filtered;
}


  formatInputLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
             .replace(/^task/, '')
             .replace(/^./, str => str.toUpperCase())
             .trim();
  }

  getTaskOutputSummary(task: IncidentTask): string {
    if (!task.outputData) return 'No output data';

    try {
      const output = JSON.parse(task.outputData);
      return Object.values(output).join(', ').slice(0, 100) + '...';
    } catch {
      return task.outputData.slice(0, 100) + '...';
    }
  }

  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').slice(0, 19);
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

  calculateTaskDuration(task: IncidentTask): string {
    // Parse the date without adjusting for timezone
    let created = new Date(task.createdAt.toString() + 'Z'); // Ensure it's treated as UTC
    
    const now = new Date();
    
    console.log('Task created at:', task.createdAt);
    console.log('Current time:', now.toISOString());
    
    const diffMs = now.getTime() - created.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h old`;
    } else if (diffHours > 0) {
      return `${diffHours}h old`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m old`;
    } else {
      return 'Just now';
    }
  }

  calculateCompletionDuration(task: IncidentTask): string {
    if (!task.completedAt) return 'N/A';

    const start = new Date(task.createdAt);
    const end = new Date(task.completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}, ${diffHours % 24} hour${(diffHours % 24) > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
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

  getTaskPriorityClass(task: IncidentTask): string {
    if (task.priority && task.priority > 5) return 'priority-high';
    if (task.priority && task.priority > 3) return 'priority-medium';
    return '';
  }

  getTaskDurationClass(task: IncidentTask): string {
    const start = new Date(task.createdAt);
    const end = new Date();
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (task.status === TaskStatus.COMPLETED) return 'normal';
    if (diffHours > 48) return 'critical'; // More than 2 days
    if (diffHours > 24) return 'warning';  // More than 1 day
    return 'normal';
  }

  getTaskDueDateClass(task: IncidentTask): string {
    if (!task.dueDate) return '';

    const due = new Date(task.dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'due-date-overdue';
    if (diffHours < 24) return 'due-date-warning';
    return '';
  }
}