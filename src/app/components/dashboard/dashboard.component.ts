import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { MatGridListModule } from '@angular/material/grid-list';
import { forkJoin } from 'rxjs';

import { IncidentService } from '../../services/incident.service';
import { UserService } from '../../services/user.service';
import { Incident, IncidentStatus, IncidentTask } from '../../models/incident.model';

interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  myTasks: number;
  completedToday: number;
  criticalIncidents: number;
  avgResolutionTime: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatMenuModule,
    MatGridListModule
  ],
  templateUrl : './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private incidentService = inject(IncidentService);
  private userService = inject(UserService);

  currentUser = this.userService.currentUser;
  currentDateTime = '2025-06-25 15:58:12 UTC';

  // Signals
  isLoading = signal(false);
  allIncidents = signal<Incident[]>([]);
  myActiveTasks = signal<IncidentTask[]>([]);

  // Computed values
  recentIncidents = computed(() =>
    this.allIncidents()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  dashboardStats = computed(() => {
    const incidents = this.allIncidents();
    const tasks = this.myActiveTasks();

    const today = new Date().toDateString();
    const completedToday = incidents.filter(i =>
      i.closedAt && new Date(i.closedAt).toDateString() === today
    ).length;

    return {
      totalIncidents: incidents.length,
      activeIncidents: incidents.filter(i =>
        ![IncidentStatus.CLOSED, IncidentStatus.ABORTED, IncidentStatus.RESOLVED].includes(i.status)
      ).length,
      myTasks: tasks.length,
      completedToday,
      criticalIncidents: incidents.filter(i => i.status === IncidentStatus.WAITING_FOR_RESOLUTION).length,
      avgResolutionTime: this.calculateAvgResolutionTime(incidents)
    };
  });

  statusDistribution = computed(() => {
    const incidents = this.allIncidents();
    const total = incidents.length;

    if (total === 0) return [];

    const statusCounts = Object.values(IncidentStatus).reduce((acc, status) => {
      acc[status] = incidents.filter(i => i.status === status).length;
      return acc;
    }, {} as Record<IncidentStatus, number>);

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        status: status as IncidentStatus,
        label: this.formatStatusLabel(status as IncidentStatus),
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  });

  ngOnInit() {
    this.loadDashboardData();

    // Update time every minute
    setInterval(() => {
      const now = new Date();
      this.currentDateTime = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }, 60000);
  }

  loadDashboardData() {
    this.isLoading.set(true);

    const username = this.userService.getCurrentUsername();

    forkJoin({
      incidents: this.incidentService.getAllIncidents(0, 100), // Get more for better stats
      myTasks: this.incidentService.getUserTasks(username)
    }).subscribe({
      next: (data) => {
        if (data.incidents.success) {
          this.allIncidents.set(data.incidents.data.content);
        }
        if (data.myTasks.success) {
          this.myActiveTasks.set(data.myTasks.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading.set(false);
      }
    });
  }

  refreshDashboard() {
    this.loadDashboardData();
  }

  handleTask(task: IncidentTask) {
    // Navigate to task handling - you can implement specific task handling logic
    console.log('Handle task:', task);
    // For now, just navigate to my tasks
    // this.router.navigate(['/my-tasks']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatStatusLabel(status: IncidentStatus): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: IncidentStatus): string {
    return `status-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  getTaskStatusClass(status: string): string {
    return `task-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  private calculateAvgResolutionTime(incidents: Incident[]): number {
    const resolvedIncidents = incidents.filter(i => i.resolvedAt && i.createdAt);

    if (resolvedIncidents.length === 0) return 0;

    const totalMinutes = resolvedIncidents.reduce((sum, incident) => {
      const created = new Date(incident.createdAt).getTime();
      const resolved = new Date(incident.resolvedAt!).getTime();
      return sum + (resolved - created) / (1000 * 60); // Convert to minutes
    }, 0);

    return Math.round(totalMinutes / resolvedIncidents.length);
  }
}