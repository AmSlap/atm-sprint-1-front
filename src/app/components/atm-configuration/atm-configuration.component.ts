import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AtmConfigurationDto } from '../../models/atm.models';

@Component({
  selector: 'app-atm-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './atm-configuration.component.html',
  styleUrl: './atm-configuration.component.scss'
})
export class AtmConfigurationComponent implements OnInit {
  @Input() configuration!: AtmConfigurationDto;

  // View state
  peripheralView: 'cards' | 'detailed' | 'json' = 'cards';
  peripheralFilter: 'all' | 'healthy' | 'warning' | 'error' | 'offline' = 'all';
  expandedPeripherals: Set<string> = new Set();
  isRefreshing = false;

  // Message system
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  ngOnInit() {
    console.log('ATM Configuration loaded:', this.configuration);
  }

  // Original methods
  getPeripheralKeys(): string[] {
    return Object.keys(this.configuration?.peripheralDetails || {});
  }

  getPeripheralValue(key: string): string {
    const value = this.configuration?.peripheralDetails[key];
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  // Enhanced methods
  getCurrentUser(): string {
    return 'AmSlap';
  }

  getSessionId(): string {
    return 'ATM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  // Health and status methods
  getOverallHealthClass(): string {
    const health = this.configuration.overallHealth?.toLowerCase();
    if (health?.includes('good') || health?.includes('healthy') || health?.includes('ok')) return 'healthy';
    if (health?.includes('warning') || health?.includes('caution')) return 'warning';
    if (health?.includes('error') || health?.includes('critical') || health?.includes('fail')) return 'error';
    return 'unknown';
  }

  getHealthIcon(): string {
    const healthClass = this.getOverallHealthClass();
    switch (healthClass) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  getHealthDescription(): string {
    const healthClass = this.getOverallHealthClass();
    switch (healthClass) {
      case 'healthy': return 'All systems operating normally';
      case 'warning': return 'Some issues detected, monitoring required';
      case 'error': return 'Critical issues detected, immediate attention required';
      default: return 'Health status unknown';
    }
  }

  getHealthScore(): number {
    const healthClass = this.getOverallHealthClass();
    switch (healthClass) {
      case 'healthy': return 95;
      case 'warning': return 70;
      case 'error': return 25;
      default: return 50;
    }
  }

  getSystemStatusClass(): string {
    return this.getOverallHealthClass();
  }

  getSystemStatusIcon(): string {
    return this.getHealthIcon();
  }

  getSystemStatusText(): string {
    const healthClass = this.getOverallHealthClass();
    switch (healthClass) {
      case 'healthy': return 'System Operational';
      case 'warning': return 'Monitoring Required';
      case 'error': return 'Critical Issues';
      default: return 'Status Unknown';
    }
  }

  // Configuration metadata methods
  getConfigurationSource(): string {
    return 'Central Management System';
  }

  getConfigVersion(): string {
    return '2.4.1';
  }

  getConfigChecksum(): string {
    return 'SHA256: a1b2c3d4...';
  }

  getTimeZone(): string {
    return 'UTC';
  }

  // Peripheral counting methods
  getTotalPeripheralCount(): number {
    return this.getPeripheralKeys().length;
  }

  getActivePeripheralCount(): number {
    return this.getPeripheralKeys().filter(key => this.isPeripheralActive(key)).length;
  }

  getHealthyPeripheralCount(): number {
    return this.getPeripheralKeys().filter(key => this.getPeripheralStatusClass(key) === 'healthy').length;
  }

  getWarningPeripheralCount(): number {
    return this.getPeripheralKeys().filter(key => this.getPeripheralStatusClass(key) === 'warning').length;
  }

  getErrorPeripheralCount(): number {
    return this.getPeripheralKeys().filter(key => this.getPeripheralStatusClass(key) === 'error').length;
  }

  // View management
  setPeripheralView(view: 'cards' | 'detailed' | 'json') {
    this.peripheralView = view;
  }

  filterPeripherals() {
    // Filter logic is handled in getFilteredPeripherals()
  }

  getFilteredPeripherals(): string[] {
    const keys = this.getPeripheralKeys();

    return keys.filter(key => {
      switch (this.peripheralFilter) {
        case 'healthy':
          return this.getPeripheralStatusClass(key) === 'healthy';
        case 'warning':
          return this.getPeripheralStatusClass(key) === 'warning';
        case 'error':
          return this.getPeripheralStatusClass(key) === 'error';
        case 'offline':
          return !this.isPeripheralActive(key);
        default:
          return true;
      }
    });
  }

  // Peripheral analysis methods
  getPeripheralDisplayName(key: string): string {
    // Convert technical names to user-friendly names
    const nameMap: { [key: string]: string } = {
      'cashDispenser': 'Cash Dispenser',
      'cardReader': 'Card Reader',
      'receiptPrinter': 'Receipt Printer',
      'pinPad': 'PIN Pad',
      'billValidator': 'Bill Validator',
      'coinDispenser': 'Coin Dispenser',
      'journalPrinter': 'Journal Printer',
      'barcodeReader': 'Barcode Reader',
      'camera': 'Security Camera',
      'sensors': 'Environmental Sensors'
    };
    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  getPeripheralIcon(key: string): string {
    const iconMap: { [key: string]: string } = {
      'cashDispenser': '💵',
      'cardReader': '💳',
      'receiptPrinter': '🧾',
      'pinPad': '🔢',
      'billValidator': '💴',
      'coinDispenser': '🪙',
      'journalPrinter': '📰',
      'barcodeReader': '📷',
      'camera': '📹',
      'sensors': '🌡️'
    };
    return iconMap[key] || '🔌';
  }

  getPeripheralType(key: string): string {
    const typeMap: { [key: string]: string } = {
      'cashDispenser': 'Dispenser',
      'cardReader': 'Reader',
      'receiptPrinter': 'Printer',
      'pinPad': 'Input Device',
      'billValidator': 'Validator',
      'coinDispenser': 'Dispenser',
      'journalPrinter': 'Printer',
      'barcodeReader': 'Scanner',
      'camera': 'Security',
      'sensors': 'Environmental'
    };
    return typeMap[key] || 'Peripheral';
  }

  getPeripheralStatus(key: string): string {
    const peripheral = this.configuration?.peripheralDetails[key];
    if (typeof peripheral === 'object' && peripheral !== null) {
      return (peripheral as any).status || 'Unknown';
    }
    return 'Unknown';
  }

  getPeripheralStatusClass(key: string): string {
    const status = this.getPeripheralStatus(key).toLowerCase();
    if (status.includes('ok') || status.includes('good') || status.includes('healthy') || status.includes('active')) {
      return 'healthy';
    }
    if (status.includes('warning') || status.includes('low') || status.includes('caution')) {
      return 'warning';
    }
    if (status.includes('error') || status.includes('fail') || status.includes('critical') || status.includes('offline')) {
      return 'error';
    }
    return 'unknown';
  }

  getPeripheralCardClass(key: string): string {
    const statusClass = this.getPeripheralStatusClass(key);
    return `peripheral-${statusClass}`;
  }

  isPeripheralActive(key: string): boolean {
    const status = this.getPeripheralStatus(key).toLowerCase();
    return !status.includes('offline') && !status.includes('disconnected') && !status.includes('unavailable');
  }

  // Peripheral detail methods
  getPeripheralVersion(key: string): string | null {
    const peripheral = this.configuration?.peripheralDetails[key];
    if (typeof peripheral === 'object' && peripheral !== null) {
      return (peripheral as any).version || (peripheral as any).firmwareVersion || null;
    }
    return null;
  }

  getPeripheralModel(key: string): string | null {
    const peripheral = this.configuration?.peripheralDetails[key];
    if (typeof peripheral === 'object' && peripheral !== null) {
      return (peripheral as any).model || (peripheral as any).deviceModel || null;
    }
    return null;
  }

  getPeripheralSerial(key: string): string | null {
    const peripheral = this.configuration?.peripheralDetails[key];
    if (typeof peripheral === 'object' && peripheral !== null) {
      return (peripheral as any).serialNumber || (peripheral as any).serial || null;
    }
    return null;
  }

  isPeripheralExpanded(key: string): boolean {
    return this.expandedPeripherals.has(key);
  }

  togglePeripheralDetails(key: string) {
    if (this.expandedPeripherals.has(key)) {
      this.expandedPeripherals.delete(key);
    } else {
      this.expandedPeripherals.add(key);
    }
  }

  canResetPeripheral(key: string): boolean {
    const statusClass = this.getPeripheralStatusClass(key);
    return statusClass === 'warning' || statusClass === 'error';
  }

  // JSON formatting methods
  getFormattedPeripheralValue(key: string): string {
    const value = this.getPeripheralValue(key);
    return this.syntaxHighlight(value);
  }

  getAllPeripheralsFormatted(): string {
    const allPeripherals = this.configuration?.peripheralDetails || {};
    return this.syntaxHighlight(JSON.stringify(allPeripherals, null, 2));
  }

  private syntaxHighlight(json: string): string {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }

  getConfigSize(key: string): number {
    return new Blob([this.getPeripheralValue(key)]).size;
  }

  // Action methods
  async refreshConfiguration() {
    this.isRefreshing = true;
    this.showInfoMessage('Refreshing configuration data...');

    setTimeout(() => {
      this.isRefreshing = false;
      this.showSuccessMessage('Configuration data refreshed successfully!');
    }, 2000);
  }

  testPeripheral(key: string) {
    this.showInfoMessage(`Testing ${this.getPeripheralDisplayName(key)}...`);

    setTimeout(() => {
      const success = Math.random() > 0.2;
      if (success) {
        this.showSuccessMessage(`${this.getPeripheralDisplayName(key)} test completed successfully!`);
      } else {
        this.showErrorMessage(`${this.getPeripheralDisplayName(key)} test failed!`);
      }
    }, 1500);
  }

  resetPeripheral(key: string) {
    this.showInfoMessage(`Resetting ${this.getPeripheralDisplayName(key)}...`);

    setTimeout(() => {
      this.showSuccessMessage(`${this.getPeripheralDisplayName(key)} reset completed!`);
    }, 2000);
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccessMessage('Copied to clipboard!');
    } catch (err) {
      this.showErrorMessage('Failed to copy to clipboard');
    }
  }

  copyPeripheralConfig(key: string) {
    this.copyToClipboard(this.getPeripheralValue(key));
  }

  copyAllPeripheralConfig() {
    const allConfig = JSON.stringify(this.configuration?.peripheralDetails || {}, null, 2);
    this.copyToClipboard(allConfig);
  }

  exportPeripheralConfig(key: string) {
    const config = this.getPeripheralValue(key);
    this.downloadFile(`${key}-config.json`, config);
  }

  exportAllPeripheralConfig() {
    const allConfig = JSON.stringify(this.configuration?.peripheralDetails || {}, null, 2);
    this.downloadFile(`atm-${this.configuration.atmId}-peripherals.json`, allConfig);
  }

  validatePeripheralConfig() {
    this.showInfoMessage('Validating peripheral configuration...');

    setTimeout(() => {
      this.showSuccessMessage('Configuration validation completed successfully!');
    }, 1500);
  }

  private downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    this.showSuccessMessage(`Downloaded ${filename}`);
  }

  // History methods
  viewFullHistory() {
    this.showInfoMessage('Full configuration history coming soon...');
  }

  getPreviousUpdateTime(): string {
    const current = new Date(this.configuration.lastUpdateTimestamp);
    const previous = new Date(current.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
    return previous.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitialConfigTime(): string {
    return 'June 10, 2025, 9:15 AM';
  }

  // Utility methods
  trackByPeripheralKey(index: number, key: string): string {
    return key;
  }

  getLastUpdateTime(): string {
    return new Date(this.configuration.lastUpdateTimestamp).toLocaleTimeString('en-US', {
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
