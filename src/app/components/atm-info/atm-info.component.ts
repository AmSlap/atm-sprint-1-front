import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtmRegistryInfo } from '../../models/atm.models';

@Component({
  selector: 'app-atm-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atm-info.component.html',
  styleUrl: './atm-info.component.scss'
})
export class AtmInfoComponent implements OnInit {
  @Input() registryInfo!: AtmRegistryInfo;

  showTechnicalDetails = false;
  networkStatus: 'online' | 'offline' | 'unknown' = 'unknown';
  qrCodeGenerated = false;

  // Message system
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  ngOnInit() {
    this.checkNetworkStatus();
  }

  // Utility methods
  hasCoordinates(): boolean {
    return !!(this.registryInfo.locationLatitude && this.registryInfo.locationLongitude);
  }

  getFormattedCoordinates(): string {
    if (!this.hasCoordinates()) return '';
    return `${this.registryInfo.locationLatitude?.toFixed(6)}, ${this.registryInfo.locationLongitude?.toFixed(6)}`;
  }

  getCurrentUser(): string {
    return 'AmSlap';
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  // External map services (no Google Maps dependency)
  getGoogleMapsUrl(): string {
    if (!this.hasCoordinates()) return '#';
    return `https://www.google.com/maps?q=${this.registryInfo.locationLatitude},${this.registryInfo.locationLongitude}`;
  }

  getAppleMapsUrl(): string {
    if (!this.hasCoordinates()) return '#';
    return `https://maps.apple.com/?q=${this.registryInfo.locationLatitude},${this.registryInfo.locationLongitude}`;
  }

  getOpenStreetMapUrl(): string {
    if (!this.hasCoordinates()) return '#';
    return `https://www.openstreetmap.org/?mlat=${this.registryInfo.locationLatitude}&mlon=${this.registryInfo.locationLongitude}&zoom=15`;
  }

  openInMaps() {
    window.open(this.getGoogleMapsUrl(), '_blank');
  }

  getDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.registryInfo.locationLatitude},${this.registryInfo.locationLongitude}`;
    window.open(url, '_blank');
  }

  searchAddress() {
    if (this.registryInfo.locationAddress) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(this.registryInfo.locationAddress)}`;
      window.open(url, '_blank');
    }
  }

  // Clipboard operations
  async copyToClipboard(text: string | undefined) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showSuccessMessage('Copied to clipboard!');
    } catch (err) {
      this.showErrorMessage('Failed to copy to clipboard');
    }
  }

  async copyAtmInfo() {
    const info = `ATM Information:
ATM ID: ${this.registryInfo.atmId}
Label: ${this.registryInfo.label || 'N/A'}
Brand: ${this.registryInfo.brand || 'N/A'}
Model: ${this.registryInfo.model || 'N/A'}
Serial: ${this.registryInfo.serialNumber || 'N/A'}
IP Address: ${this.registryInfo.ipAddress || 'N/A'}
Agency: ${this.registryInfo.agencyName || this.registryInfo.agencyCode || 'N/A'}
Region: ${this.registryInfo.region || 'N/A'}
Address: ${this.registryInfo.locationAddress || 'N/A'}
Coordinates: ${this.getFormattedCoordinates() || 'N/A'}
Generated: ${this.getCurrentDateTime()}
By: ${this.getCurrentUser()}`;

    await this.copyToClipboard(info);
  }

  // Network and technical methods
  async checkNetworkStatus() {
    if (!this.registryInfo.ipAddress) {
      this.networkStatus = 'unknown';
      return;
    }

    // Simulate network check
    setTimeout(() => {
      this.networkStatus = Math.random() > 0.3 ? 'online' : 'offline';
    }, 1000);
  }

  getNetworkStatusText(): string {
    switch (this.networkStatus) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  }

  async pingAtm() {
    if (!this.registryInfo.ipAddress) return;

    this.showInfoMessage('Testing connection...');

    // Simulate ping
    setTimeout(() => {
      const success = Math.random() > 0.2;
      if (success) {
        this.showSuccessMessage('Connection successful!');
        this.networkStatus = 'online';
      } else {
        this.showErrorMessage('Connection failed');
        this.networkStatus = 'offline';
      }
    }, 2000);
  }

  toggleTechnicalDetails() {
    this.showTechnicalDetails = !this.showTechnicalDetails;
  }

  getRegistrationDate(): string {
    return 'June 12, 2025';
  }

  getLastUpdated(): string {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // QR Code methods
  generateQRCode() {
    this.showInfoMessage('Generating QR code...');

    setTimeout(() => {
      this.qrCodeGenerated = true;
      this.showSuccessMessage('QR code generated!');
    }, 1000);
  }

  downloadQRCode() {
    if (!this.qrCodeGenerated) return;

    this.showInfoMessage('Downloading QR code...');

    // Create a simple text file with ATM info instead of actual QR code
    const atmInfo = `ATM Information - ${this.registryInfo.atmId}
Label: ${this.registryInfo.label || 'N/A'}
Agency: ${this.registryInfo.agencyName || 'N/A'}
Address: ${this.registryInfo.locationAddress || 'N/A'}
Coordinates: ${this.getFormattedCoordinates() || 'N/A'}
Generated: ${this.getCurrentDateTime()}`;

    const blob = new Blob([atmInfo], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ATM-${this.registryInfo.atmId}-info.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Action methods
  editAtmInfo() {
    console.log('Edit ATM info:', this.registryInfo.atmId);
    this.showInfoMessage('Edit functionality coming soon...');
  }

  addLocationData() {
    console.log('Add location data for:', this.registryInfo.atmId);
    this.showInfoMessage('Add location functionality coming soon...');
  }

  shareLocation() {
    if (!this.hasCoordinates()) return;

    const shareText = `ATM Location - ${this.registryInfo.label || this.registryInfo.atmId}
Address: ${this.registryInfo.locationAddress || 'N/A'}
Coordinates: ${this.getFormattedCoordinates()}
Maps: ${this.getGoogleMapsUrl()}`;

    if (navigator.share) {
      navigator.share({
        title: `ATM Location - ${this.registryInfo.label || this.registryInfo.atmId}`,
        text: shareText,
        url: this.getGoogleMapsUrl()
      });
    } else {
      this.copyToClipboard(shareText);
    }
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
