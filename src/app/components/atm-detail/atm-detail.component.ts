import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AtmService } from '../../services/atm.service';
import { AtmFullStateDto } from '../../models/atm.models';
import { AtmConfigurationComponent } from '../atm-configuration/atm-configuration.component';
import { AtmCountersComponent } from '../atm-counters/atm-counters.component';
import { AtmInfoComponent } from '../atm-info/atm-info.component';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-atm-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AtmConfigurationComponent, AtmCountersComponent, AtmInfoComponent],
  templateUrl: './atm-detail.component.html',
  styleUrl: './atm-detail.component.scss'
})
export class AtmDetailComponent implements OnInit, OnDestroy {
  atmId: string = '';
  atmDetails: AtmFullStateDto | null = null;
  loading = true;
  error = false;
  activeView: 'overview' | 'status' | 'configuration' | 'counters' | 'info' | 'history' = 'overview';
  lastRefreshTime = new Date();
  autoRefreshEnabled = true;
  private autoRefreshSubscription?: Subscription;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private atmService = inject(AtmService);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.atmId = id;
        this.loadAtmDetails();
        this.startAutoRefresh();
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }

  startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.autoRefreshSubscription = interval(30000).subscribe(() => {
        this.loadAtmDetails(true); // Silent refresh
      });
    }
  }

  loadAtmDetails(silent: boolean = false): void {
    if (!silent) {
      this.loading = true;
    }
    this.error = false;

    // Use the enhanced endpoint if available
    this.atmService.getAtmEnhancedDetails(this.atmId).subscribe({
      next: (data) => {
        this.atmDetails = data;
        this.loading = false;
        this.lastRefreshTime = new Date();
      },
      error: (err) => {
        console.error('Error loading ATM details', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  setActiveView(view: 'overview' | 'status' | 'configuration' | 'counters' | 'info' | 'history'): void {
    this.activeView = view;
  }

  // Status and health methods
  getStatusColor(): string {
    if (!this.atmDetails) return 'gray';

    switch (this.atmDetails.configuration.overallHealth.toLowerCase()) {
      case 'ok':
      case 'good':
      case 'healthy':
      case 'green':
        return 'green';
      case 'warning':
      case 'attention':
      case 'orange':
        return 'orange';
      case 'error':
      case 'critical':
      case 'down':
      case 'red':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusClass(): string {
    if (!this.atmDetails) return 'unknown';

    const health = this.atmDetails.configuration.overallHealth.toLowerCase();
    if (['ok', 'good', 'healthy', 'green'].includes(health)) return 'healthy';
    if (['warning', 'attention', 'orange'].includes(health)) return 'warning';
    if (['error', 'critical', 'down', 'red'].includes(health)) return 'error';
    return 'unknown';
  }

  getHealthClass(): string {
    return `health-${this.getStatusClass()}`;
  }

  getStatusBannerClass(): string {
    return `status-banner-${this.getStatusClass()}`;
  }

  getConnectionClass(): string {
    if (!this.atmDetails) return 'unknown';

    const lastConnection = new Date(this.atmDetails.status.lastSuccessfulConnection);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastConnection.getTime()) / (1000 * 60);

    if (diffMinutes < 5) return 'connected';
    if (diffMinutes < 30) return 'warning';
    return 'disconnected';
  }

  // Cash and cassette methods
  getCashLevelPercentage(): number {
    if (!this.atmDetails) return 0;

    // This is a simplified calculation - you might want to make it more sophisticated
    return this.atmDetails.counters.lowCashFlag ? 25 : 75;
  }

  getCassetteClass(cassette: any): string {
    const status = cassette.cassetteStatus?.toLowerCase() || '';
    if (status.includes('empty') || cassette.notesRemaining === 0) return 'cassette-empty';
    if (status.includes('low') || cassette.notesRemaining < 100) return 'cassette-low';
    if (status.includes('error') || status.includes('jam')) return 'cassette-error';
    return 'cassette-ok';
  }

  getRejectBinClass(): string {
    if (!this.atmDetails) return '';

    const percentage = this.atmDetails.counters.rejectBinPercentageFull;
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  }

  // Utility methods
  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }

  getLastRefreshTime(): string {
    return this.lastRefreshTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  isConnectionStale(): boolean {
    if (!this.atmDetails) return false;

    const lastConnection = new Date(this.atmDetails.status.lastSuccessfulConnection);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastConnection.getTime()) / (1000 * 60);

    return diffMinutes > 30; // Consider stale if > 30 minutes
  }

  hasConfigurationAlerts(): boolean {
    // Add logic to check for configuration alerts
    return false; // Placeholder
  }

  hasLocationCoordinates(): boolean {
    return !!(this.atmDetails?.registryInfo?.locationLatitude &&
      this.atmDetails?.registryInfo?.locationLongitude);
  }

  // Action methods
  showOnMap(): void {
    if (this.hasLocationCoordinates()) {
      const lat = this.atmDetails!.registryInfo!.locationLatitude;
      const lng = this.atmDetails!.registryInfo!.locationLongitude;
      window.open(`https://maps.google.com?q=${lat},${lng}`, '_blank');
    }
  }
}
