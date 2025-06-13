import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AtmService } from '../../services/atm.service';
import { AtmStateSummaryDto, AtmRegistryInfo, Agency } from '../../models/atm.models';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-atm-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './atm-dashboard.component.html',
  styleUrl: './atm-dashboard.component.scss'
})
export class AtmDashboardComponent implements OnInit, OnDestroy {
  atms: (AtmStateSummaryDto & Partial<AtmRegistryInfo>)[] = [];
  filteredAtms: (AtmStateSummaryDto & Partial<AtmRegistryInfo>)[] = [];
  agencies: Agency[] = [];
  regions: string[] = [];

  loading = true;
  error = false;
  lastRefreshTime = new Date();
  autoRefreshEnabled = true;
  refreshInterval = 30; // seconds

  // Filter options
  selectedStatus: string = 'all';
  selectedHealth: string = 'all';
  selectedRegion: string = 'all';
  selectedAgency: string = 'all';
  searchTerm: string = '';

  // View options
  viewMode: 'grid' | 'table' = 'grid';
  sortBy: 'atmId' | 'health' | 'lastUpdate' | 'agency' = 'atmId';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Subscriptions
  private autoRefreshSubscription?: Subscription;
  private atmService = inject(AtmService);

  ngOnInit(): void {
    this.loadAtms();
    this.loadAgencies();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // Auto-refresh functionality
  startAutoRefresh(): void {
    if (this.autoRefreshEnabled && this.refreshInterval > 0) {
      this.autoRefreshSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
        this.loadAtms(true); // Silent refresh
      });
    }
  }

  stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  updateRefreshInterval(seconds: number): void {
    this.refreshInterval = seconds;
    this.stopAutoRefresh();
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    }
  }

  loadAtms(silent: boolean = false): void {
    if (!silent) {
      this.loading = true;
    }
    this.error = false;

    this.atmService.getAllAtmsWithRegistryInfo().subscribe({
      next: (data) => {
        const previousCount = this.atms.length;
        this.atms = data;
        this.applySorting();
        this.applyFilters();
        this.extractRegions();
        this.loading = false;
        this.lastRefreshTime = new Date();

        // Show notification for new/changed ATMs
        if (silent && previousCount > 0) {
          const newCount = data.length;
          if (newCount !== previousCount) {
            this.showRefreshNotification(`ATM count changed: ${previousCount} → ${newCount}`);
          }
        }
      },
      error: (err) => {
        console.error('Error loading ATMs', err);
        this.error = true;
        this.loading = false;

        if (silent) {
          this.showRefreshNotification('Failed to refresh ATM data', 'error');
        }
      }
    });
  }

  loadAgencies(): void {
    this.atmService.getAllAgencies().subscribe({
      next: (agencies) => this.agencies = agencies,
      error: (err) => {
        console.error('Error loading agencies', err);
        this.agencies = [];
      }
    });
  }

  extractRegions(): void {
    const regionSet = new Set<string>();
    this.atms.forEach(atm => {
      if (atm.region) {
        regionSet.add(atm.region);
      }
    });
    this.regions = Array.from(regionSet).sort();
  }

  // Enhanced filtering and sorting
  applyFilters(): void {
    this.filteredAtms = this.atms.filter(atm => {
      // Filter by status
      if (this.selectedStatus !== 'all' && atm.operationalState?.toLowerCase() !== this.selectedStatus.toLowerCase()) {
        return false;
      }

      // Filter by health
      if (this.selectedHealth !== 'all' && atm.overallHealth?.toLowerCase() !== this.selectedHealth.toLowerCase()) {
        return false;
      }

      // Filter by region
      if (this.selectedRegion !== 'all' && atm.region !== this.selectedRegion) {
        return false;
      }

      // Filter by agency
      if (this.selectedAgency !== 'all' && atm.agencyCode !== this.selectedAgency) {
        return false;
      }

      // Filter by search term
      if (this.searchTerm.trim() !== '') {
        const term = this.searchTerm.toLowerCase();
        return atm.atmId.toLowerCase().includes(term) ||
          atm.label?.toLowerCase().includes(term) ||
          atm.locationAddress?.toLowerCase().includes(term) ||
          atm.agencyName?.toLowerCase().includes(term);
      }

      return true;
    });

    this.applySorting();
  }

  applySorting(): void {
    this.filteredAtms.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (this.sortBy) {
        case 'atmId':
          aValue = a.atmId;
          bValue = b.atmId;
          break;
        case 'health':
          aValue = this.getHealthPriority(a.overallHealth);
          bValue = this.getHealthPriority(b.overallHealth);
          break;
        case 'lastUpdate':
          aValue = new Date(a.lastUpdateTimestamp || 0);
          bValue = new Date(b.lastUpdateTimestamp || 0);
          break;
        case 'agency':
          aValue = a.agencyName || '';
          bValue = b.agencyName || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getHealthPriority(health: string | undefined): number {
    const h = health?.toLowerCase() || '';
    if (['error', 'critical', 'down', 'failed', 'offline', 'red'].includes(h)) return 3;
    if (['warning', 'attention', 'orange'].includes(h)) return 2;
    if (['ok', 'good', 'healthy', 'green'].includes(h)) return 1;
    return 2; // default to warning priority
  }

  setSortBy(field: 'atmId' | 'health' | 'lastUpdate' | 'agency'): void {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    this.applySorting();
  }

  resetFilters(): void {
    this.selectedStatus = 'all';
    this.selectedHealth = 'all';
    this.selectedRegion = 'all';
    this.selectedAgency = 'all';
    this.searchTerm = '';
    this.filteredAtms = [...this.atms];
    this.applySorting();
  }

  // Quick filter methods
  filterByHealthStatus(status: 'healthy' | 'warning' | 'error'): void {
    switch (status) {
      case 'healthy':
        this.selectedHealth = 'ok';
        break;
      case 'warning':
        this.selectedHealth = 'warning';
        break;
      case 'error':
        this.selectedHealth = 'error';
        break;
    }
    this.applyFilters();
  }

  filterByLowCash(): void {
    this.filteredAtms = this.atms.filter(atm => atm.lowCashFlag);
  }

  // Export functionality
  exportToCSV(): void {
    const headers = ['ATM ID', 'Label', 'Status', 'Health', 'Agency', 'Region', 'Low Cash', 'Last Update'];
    const data = this.filteredAtms.map(atm => [
      atm.atmId,
      atm.label || '',
      atm.operationalState || '',
      atm.overallHealth || '',
      atm.agencyName || '',
      atm.region || '',
      atm.lowCashFlag ? 'Yes' : 'No',
      atm.lastUpdateTimestamp || ''
    ]);

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atm-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // View toggle methods
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'table' : 'grid';
  }

  // Notification system (you can replace with a proper toast library)
  showRefreshNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Simple console notification - replace with proper toast notification
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
  }

  // Enhanced getter methods
  getStatusClass(atm: AtmStateSummaryDto): string {
    switch (atm.overallHealth?.toLowerCase()) {
      case 'ok':
      case 'good':
      case 'healthy':
      case 'green':
        return 'status-active';
      case 'warning':
      case 'attention':
      case 'orange':
        return 'status-warning';
      case 'error':
      case 'critical':
      case 'down':
      case 'red':
        return 'status-error';
      default:
        return 'status-warning';
    }
  }

  getHealthClass(atm: AtmStateSummaryDto): string {
    switch (atm.overallHealth?.toLowerCase()) {
      case 'ok':
      case 'good':
      case 'healthy':
      case 'green':
        return 'text-success';
      case 'warning':
      case 'attention':
      case 'orange':
        return 'text-warning';
      case 'error':
      case 'critical':
      case 'down':
      case 'red':
        return 'text-error';
      default:
        return 'text-secondary';
    }
  }

  // Stats methods
  getHealthyCount(): number {
    return this.atms.filter(atm => {
      const health = atm.overallHealth?.toLowerCase() || '';
      return ['ok', 'good', 'healthy', 'green'].includes(health);
    }).length;
  }

  getWarningCount(): number {
    return this.atms.filter(atm => {
      const health = atm.overallHealth?.toLowerCase() || '';
      return ['warning', 'attention', 'orange'].includes(health);
    }).length;
  }

  getErrorCount(): number {
    return this.atms.filter(atm => {
      const health = atm.overallHealth?.toLowerCase() || '';
      return ['error', 'critical', 'down', 'failed', 'offline', 'red'].includes(health);
    }).length;
  }

  getLowCashCount(): number {
    return this.atms.filter(atm => atm.lowCashFlag).length;
  }

  getOfflineCount(): number {
    return this.atms.filter(atm =>
      atm.operationalState?.toLowerCase() === 'offline'
    ).length;
  }

  // Utility methods
  getCurrentDateTime(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getLastRefreshTime(): string {
    return this.lastRefreshTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Quick action methods
  refreshSingleAtm(atmId: string): void {
    // This would call a specific endpoint to refresh just one ATM
    console.log(`Refreshing ATM: ${atmId}`);
    // Implementation depends on your backend API
  }

  navigateToAtmDetails(atmId: string): void {
    // Enhanced navigation with state
    console.log(`Navigating to ATM details: ${atmId}`);
  }


  trackByAtmId(index: number, atm: any): string {
    return atm.atmId;
  }

  hasActiveFilters(): boolean {
    return this.selectedStatus !== 'all' ||
      this.selectedHealth !== 'all' ||
      this.selectedRegion !== 'all' ||
      this.selectedAgency !== 'all' ||
      this.searchTerm.trim() !== '';
  }

  isOutdated(timestamp: string): boolean {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMinutes = (now.getTime() - updateTime.getTime()) / (1000 * 60);
    return diffMinutes > 10; // Consider outdated if > 10 minutes
  }
}
