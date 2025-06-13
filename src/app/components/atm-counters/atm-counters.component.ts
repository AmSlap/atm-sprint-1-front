import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AtmCounterDto } from '../../models/atm.models';

@Component({
  selector: 'app-atm-counters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './atm-counters.component.html',
  styleUrl: './atm-counters.component.scss'
})
export class AtmCountersComponent implements OnInit {
  @Input() counters!: AtmCounterDto;

  // View state
  cassetteView: 'grid' | 'list' = 'grid';
  cassetteFilter: 'all' | 'active' | 'warning' | 'critical' = 'all';
  isRefreshing = false;

  // Message system
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  ngOnInit() {
    console.log('ATM Counters loaded:', this.counters);
  }

  // View management
  setCassetteView(view: 'grid' | 'list') {
    this.cassetteView = view;
  }

  filterCassettes() {
    // Filter logic is handled in getFilteredCassettes()
  }

  getFilteredCassettes() {
    if (!this.counters.cassettes) return [];

    return this.counters.cassettes.filter(cassette => {
      switch (this.cassetteFilter) {
        case 'active':
          return this.isCassetteActive(cassette);
        case 'warning':
          return this.isCassetteWarning(cassette);
        case 'critical':
          return this.isCassetteCritical(cassette);
        default:
          return true;
      }
    });
  }

  // Cash level calculations
  getCashLevelPercentage(): number {
    // This would need actual capacity data from backend
    // For now, using a simplified calculation
    const totalCash = this.counters.totalCashAvailable;
    const maxCapacity = 500000; // Assumed maximum capacity
    return Math.min(100, Math.round((totalCash / maxCapacity) * 100));
  }

  getCashStatusClass(): string {
    if (this.counters.lowCashFlag) return 'critical';
    const percentage = this.getCashLevelPercentage();
    if (percentage < 30) return 'warning';
    return 'normal';
  }

  getCashStatusIcon(): string {
    if (this.counters.lowCashFlag) return '🚨';
    const percentage = this.getCashLevelPercentage();
    if (percentage < 30) return '⚠️';
    return '✅';
  }

  getCashStatusText(): string {
    if (this.counters.lowCashFlag) return 'Low Cash Alert';
    const percentage = this.getCashLevelPercentage();
    if (percentage < 30) return 'Cash Warning';
    return 'Normal Level';
  }

  getCashMeterClass(): string {
    const percentage = this.getCashLevelPercentage();
    if (percentage < 20) return 'critical';
    if (percentage < 40) return 'warning';
    return 'normal';
  }

  // Reject bin methods
  getRejectBinClass(): string {
    const percentage = this.counters.rejectBinPercentageFull;
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'warning';
    return 'normal';
  }

  getRejectBinStatus(): string {
    const percentage = this.counters.rejectBinPercentageFull;
    if (percentage >= 90) return 'Needs Emptying';
    if (percentage >= 70) return 'Nearly Full';
    if (percentage >= 50) return 'Half Full';
    return 'Normal';
  }

  // Cassette calculations
  getActiveCassetteCount(): number {
    if (!this.counters.cassettes) return 0;
    return this.counters.cassettes.filter(c => this.isCassetteActive(c)).length;
  }

  getTotalCassetteCount(): number {
    return this.counters.cassettes?.length || 0;
  }

  getWarningCassetteCount(): number {
    if (!this.counters.cassettes) return 0;
    return this.counters.cassettes.filter(c => this.isCassetteWarning(c) || this.isCassetteCritical(c)).length;
  }

  getAvailableDenominations(): string[] {
    if (!this.counters.cassettes) return [];
    const denominations = this.counters.cassettes
      .filter(c => this.isCassetteActive(c))
      .map(c => `${c.currency} ${c.denomination}`)
      .filter((value, index, self) => self.indexOf(value) === index);
    return denominations;
  }

  getTotalCassetteValue(): number {
    if (!this.counters.cassettes) return 0;
    return this.counters.cassettes.reduce((total, cassette) => {
      return total + this.calculateCassetteValue(cassette);
    }, 0);
  }

  getTotalNotesCount(): number {
    if (!this.counters.cassettes) return 0;
    return this.counters.cassettes.reduce((total, cassette) => {
      return total + cassette.notesRemaining;
    }, 0);
  }

  // Individual cassette methods
  calculateCassetteValue(cassette: any): number {
    return cassette.notesRemaining * cassette.denomination;
  }

  getCassetteType(cassette: any): string {
    // This could be determined from cassette ID or other properties
    if (cassette.cassetteId.includes('DISP')) return 'Dispenser';
    if (cassette.cassetteId.includes('REC')) return 'Recycler';
    return 'Standard';
  }

  getCassetteStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok':
      case 'good':
      case 'active':
      case 'normal':
        return 'active';
      case 'warning':
      case 'low':
      case 'nearly empty':
        return 'warning';
      case 'error':
      case 'empty':
      case 'jammed':
      case 'critical':
        return 'critical';
      default:
        return 'unknown';
    }
  }

  getCassetteItemClass(cassette: any): string {
    const statusClass = this.getCassetteStatusClass(cassette.cassetteStatus);
    const fillLevel = this.getNotesRemainingPercentage(cassette);

    if (statusClass === 'critical' || fillLevel < 10) return 'cassette-critical';
    if (statusClass === 'warning' || fillLevel < 30) return 'cassette-warning';
    return 'cassette-normal';
  }

  getNotesRemainingPercentage(cassette: any): number {
    // This should come from backend with actual cassette capacity
    const maxNotes = 2000; // Assuming standard capacity
    return Math.min(100, Math.round((cassette.notesRemaining / maxNotes) * 100));
  }

  getFillLevelClass(cassette: any): string {
    const percentage = this.getNotesRemainingPercentage(cassette);
    if (percentage < 10) return 'critical';
    if (percentage < 30) return 'warning';
    return 'normal';
  }

  getFillLevelStatus(cassette: any): string {
    const percentage = this.getNotesRemainingPercentage(cassette);
    if (percentage < 10) return 'Critical - Needs Refill';
    if (percentage < 30) return 'Low - Schedule Refill';
    if (percentage < 70) return 'Medium Level';
    return 'Well Stocked';
  }

  // Cassette state checks
  isCassetteActive(cassette: any): boolean {
    const status = cassette.cassetteStatus.toLowerCase();
    return ['ok', 'good', 'active', 'normal'].includes(status) && cassette.notesRemaining > 0;
  }

  isCassetteWarning(cassette: any): boolean {
    const status = cassette.cassetteStatus.toLowerCase();
    const fillLevel = this.getNotesRemainingPercentage(cassette);
    return ['warning', 'low'].includes(status) || (fillLevel < 30 && fillLevel >= 10);
  }

  isCassetteCritical(cassette: any): boolean {
    const status = cassette.cassetteStatus.toLowerCase();
    const fillLevel = this.getNotesRemainingPercentage(cassette);
    return ['error', 'empty', 'jammed', 'critical'].includes(status) || fillLevel < 10;
  }

  canRefillCassette(cassette: any): boolean {
    return this.getNotesRemainingPercentage(cassette) < 50;
  }

  // Action methods
  async refreshCounters() {
    this.isRefreshing = true;
    this.showInfoMessage('Refreshing counter data...');

    // Simulate API call
    setTimeout(() => {
      this.isRefreshing = false;
      this.showSuccessMessage('Counter data refreshed successfully!');
    }, 2000);
  }

  refreshCassette(cassette: any) {
    this.showInfoMessage(`Refreshing cassette ${cassette.cassetteId}...`);
    // Implement cassette-specific refresh
  }

  viewCassetteDetails(cassette: any) {
    this.showInfoMessage(`Viewing details for cassette ${cassette.cassetteId}`);
    // Implement detailed view
  }

  refillCassette(cassette: any) {
    this.showInfoMessage(`Scheduling refill for cassette ${cassette.cassetteId}`);
    // Implement refill scheduling
  }

  // Utility methods
  trackByCassetteId(index: number, cassette: any): string {
    return cassette.cassetteId;
  }

  getLastUpdateTime(): string {
    return new Date(this.counters.lastUpdateTimestamp).toLocaleTimeString('en-US', {
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

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Message system
  showSuccessMessage(text: string) {
    this.messageText = text;
    this.messageType = 'success';
    this.showMessage = true;
    setTimeout(() => this.closeMessage(), 3000);
  }

  showErrorMessage(text: string) {
    this.messageText = text;
    this.messageType = 'error';
    this.showMessage = true;
    setTimeout(() => this.closeMessage(), 5000);
  }

  showInfoMessage(text: string) {
    this.messageText = text;
    this.messageType = 'info';
    this.showMessage = true;
    setTimeout(() => this.closeMessage(), 3000);
  }

  closeMessage() {
    this.showMessage = false;
  }

  getMessageIcon(): string {
    switch (this.messageType) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }
}
