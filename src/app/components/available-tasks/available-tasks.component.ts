import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { IncidentService } from '../../services/incident.service';
import { UserService } from '../../services/user.service';
import { IncidentTask, TaskStatus } from '../../models/incident.model';

interface GroupedTasks {
  group: string;
  tasks: IncidentTask[];
  count: number;
}

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
  selector: 'app-available-tasks',
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
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDividerModule,
    MatBadgeModule,
    MatMenuModule
  ],
  templateUrl : './available-tasks.component.html',
  styleUrl : './available-tasks.component.scss'
})
export class AvailableTasksComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private userService = inject(UserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  currentUser = this.userService.currentUser;
  currentDateTime = this.formatDateTime(new Date());

  // Signals
  isLoading = signal(false);
  isProcessing = signal(false);
  allAvailableTasks = signal<IncidentTask[]>([]);
  taskInputDataMap = signal<Map<number, TaskInputData>>(new Map());

  // Replace Form Controls with Signals
  searchTerm = signal('');
  selectedTaskTypes = signal<string[]>([]);
  selectedGroups = signal<string[]>([]);

  // Keep form controls for the template binding
  searchControl = new FormControl('');
  taskTypeFilterControl = new FormControl<string[]>([]);
  groupFilterControl = new FormControl<string[]>([]);


  // Computed values
  totalAvailableTasks = computed(() => this.allAvailableTasks().length);

  userGroupTasks = computed(() =>
    this.allAvailableTasks().filter(task =>
      this.canClaimTask(task)
    ).length
  );

  uniqueTaskTypes = computed(() =>
    [...new Set(this.allAvailableTasks().map(task => task.taskName))].sort()
  );

  uniqueGroups = computed(() =>
    [...new Set(this.allAvailableTasks().map(task => task.assignedGroup).filter(Boolean))].sort()
  );

  // Update the computed to use signals instead
filteredTasks = computed(() => {
    console.log('=== FILTERING DEBUG ===');
    let tasks = [...this.allAvailableTasks()];
    console.log('Initial tasks count:', tasks.length);

    // Search filter using signal
    const searchValue = this.searchTerm().toLowerCase().trim();
    console.log('Search term:', searchValue);
    if (searchValue) {
      const beforeSearch = tasks.length;
      tasks = tasks.filter(task =>
        task.taskName.toLowerCase().includes(searchValue) ||
        (task.taskDescription && task.taskDescription.toLowerCase().includes(searchValue)) ||
        task.taskInstanceId.toString().includes(searchValue)
      );
      console.log(`Search filter: ${beforeSearch} -> ${tasks.length} tasks`);
    }

    // Task type filter using signal
    const taskTypeFilters = this.selectedTaskTypes();
    console.log('Task type filters:', taskTypeFilters);
    if (taskTypeFilters.length > 0) {
      const beforeTypeFilter = tasks.length;
      tasks = tasks.filter(task => taskTypeFilters.includes(task.taskName));
      console.log(`Type filter: ${beforeTypeFilter} -> ${tasks.length} tasks`);
    }

    // Group filter using signal
    const groupFilters = this.selectedGroups();
    console.log('Group filters:', groupFilters);
    if (groupFilters.length > 0) {
      const beforeGroupFilter = tasks.length;
      tasks = tasks.filter(task =>
        task.assignedGroup && groupFilters.includes(task.assignedGroup)
      );
      console.log(`Group filter: ${beforeGroupFilter} -> ${tasks.length} tasks`);
    }

    // Sort by priority and creation date
    const sortedTasks = tasks.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log('Final filtered tasks count:', sortedTasks.length);
    console.log('=== END FILTERING DEBUG ===');
    return sortedTasks;
  });

  groupedTasks = computed(() => {
    const tasks = this.filteredTasks();
    const grouped = new Map<string, IncidentTask[]>();

    tasks.forEach(task => {
      const group = task.assignedGroup || 'Unassigned';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(task);
    });

    const result: GroupedTasks[] = [];
    grouped.forEach((groupTasks, group) => {
      result.push({
        group,
        tasks: groupTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        count: groupTasks.length
      });
    });

    // Sort groups - user's groups first, then by task count
    return result.sort((a, b) => {
      const aIsMyGroup = this.isMyGroup(a.group);
      const bIsMyGroup = this.isMyGroup(b.group);

      if (aIsMyGroup && !bIsMyGroup) return -1;
      if (!aIsMyGroup && bIsMyGroup) return 1;

      return b.count - a.count;
    });
  });

  ngOnInit() {
    this.loadAvailableTasks();
    this.setupFilters();
    this.updateCurrentTime();
  }

  private loadAvailableTasks() {
    this.isLoading.set(true);

    // Load tasks for all groups that the user belongs to
    const userGroups = this.currentUser().groups;
    const taskObservables = userGroups.map(group =>
      this.incidentService.getGroupTasks(group)
    );

    // Also load general available tasks
    taskObservables.push(this.incidentService.getAvailableTasks());

    forkJoin(taskObservables).subscribe({
      next: (responses) => {
        const allTasks: IncidentTask[] = [];
        const taskIds = new Set<number>();

        responses.forEach(response => {
          if (response.success && response.data) {
            response.data.forEach((task: IncidentTask) => {
              // Avoid duplicates
              if (!taskIds.has(task.taskInstanceId)) {
                taskIds.add(task.taskInstanceId);
                allTasks.push(task);
              }
            });
          }
        });

        // Filter to only show READY tasks
        const readyTasks = allTasks.filter(task => task.status === TaskStatus.READY);
        this.allAvailableTasks.set(readyTasks);
        this.loadTaskInputData(readyTasks);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading available tasks:', error);
        this.snackBar.open('Error loading available tasks', 'Close', { duration: 3000 });
        this.isLoading.set(false);
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
          }
        },
        error: (error) => {
          console.log('Could not load input data for task:', task.taskInstanceId);
        }
      });
    });
  }

  private setupFilters() {
    // Search filter
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((value) => {
      console.log('Search value changed:', value);
      this.searchTerm.set(value || '');
    });

    // Task type filter
    this.taskTypeFilterControl.valueChanges.subscribe((value) => {
      console.log('Task type filter changed:', value);
      this.selectedTaskTypes.set(value || []);
    });

    // Group filter
    this.groupFilterControl.valueChanges.subscribe((value) => {
      console.log('Group filter changed:', value);
      this.selectedGroups.set(value || []);
    });
  }

  private updateCurrentTime() {
    setInterval(() => {
      const now = new Date();
      this.currentDateTime = this.formatDateTime(now);
    }, 60000);
  }

  refreshTasks() {
    this.loadAvailableTasks();
  }

  claimTask(task: IncidentTask) {
    if (!this.canClaimTask(task)) {
      this.snackBar.open('You cannot claim this task - it\'s not assigned to your groups', 'Close', { duration: 3000 });
      return;
    }

    this.isProcessing.set(true);
    const username = this.currentUser().username;

    this.incidentService.claimTask(task.taskInstanceId, { user: username }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Task claimed successfully! Redirecting to My Tasks...', 'Close', { duration: 3000 });
          // Remove from available tasks and redirect
          setTimeout(() => {
            this.router.navigate(['/my-tasks']);
          }, 1500);
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

  viewRelatedIncident(task: IncidentTask) {
    // Navigate to incidents - we could extract incident ID from task data if available
    this.router.navigate(['/incidents']);
  }

  getTaskDetails(task: IncidentTask) {
    this.incidentService.getTaskDetails(task.taskInstanceId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Task details:', response.data);
          this.snackBar.open('Task details logged to console', 'Close', { duration: 2000 });
        }
      },
      error: (error) => {
        console.error('Error getting task details:', error);
      }
    });
  }

  copyTaskId(task: IncidentTask) {
    navigator.clipboard.writeText(task.taskInstanceId.toString()).then(() => {
      this.snackBar.open('Task ID copied to clipboard', 'Close', { duration: 2000 });
    });
  }

  viewMyTasks() {
    this.router.navigate(['/my-tasks']);
  }

  // Filter methods
  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedTaskTypes().length > 0 ||
      this.selectedGroups().length > 0
    );
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.taskTypeFilterControl.setValue([]);
    this.groupFilterControl.setValue([]);
    // Signals will be updated automatically via the valueChanges subscriptions
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  removeTaskTypeFilter(taskType: string) {
    const current = this.selectedTaskTypes();
    const updated = current.filter(t => t !== taskType);
    this.selectedTaskTypes.set(updated);
    this.taskTypeFilterControl.setValue(updated);
  }

  removeGroupFilter(group: string) {
    const current = this.selectedGroups();
    const updated = current.filter(g => g !== group);
    this.selectedGroups.set(updated);
    this.groupFilterControl.setValue(updated);
  }

  // Helper methods
  trackByTaskId(index: number, task: IncidentTask): number {
    return task.taskInstanceId;
  }

  trackByGroup(index: number, groupData: GroupedTasks): string {
    return groupData.group;
  }

  canClaimTask(task: IncidentTask): boolean {
    const userGroups = this.currentUser().groups;
    console.log('Checking if task can be claimed:', task.assignedGroup, 'User groups:', userGroups);
    return task.assignedGroup ? userGroups.includes(task.assignedGroup) : false;
  }

  isMyGroup(group: string): boolean {
    return this.currentUser().groups.includes(group);
  }

  getTaskInputDataItems(task: IncidentTask): TaskInputItem[] {
    const inputData = this.taskInputDataMap().get(task.taskInstanceId);
    if (!inputData) return [];

    // Filter out system fields and convert to array of key-value pairs
    const filtered: TaskInputItem[] = [];
    Object.entries(inputData).forEach(([key, value]) => {
      if (key.startsWith('task') || ['TaskName', 'NodeName', 'Skippable', 'GroupId'].includes(key)) {
        return;
      }
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

  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  calculateTaskAge(task: IncidentTask): string {
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


  getTaskAgeClass(task: IncidentTask): string {
    const created = new Date(task.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (diffHours > 48) return 'old';     // More than 2 days
    if (diffHours > 12) return 'aging';   // More than 12 hours
    return 'fresh';                       // Less than 12 hours
  }

  getTaskPriorityClass(task: IncidentTask): string {
    if (task.priority && task.priority > 5) return 'priority-high';
    if (task.priority && task.priority > 3) return 'priority-medium';
    return '';
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
