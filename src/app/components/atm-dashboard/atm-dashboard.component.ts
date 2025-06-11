import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AtmService } from '../../services/atm.service';
import { AtmStateSummaryDto, AtmRegistryInfo, Agency } from '../../models/atm.models';

@Component({
  selector: 'app-atm-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './atm-dashboard.component.html',
  styleUrl: './atm-dashboard.component.scss'
})
export class AtmDashboardComponent implements OnInit {
  atms: (AtmStateSummaryDto & Partial<AtmRegistryInfo>)[] = [];
  filteredAtms: (AtmStateSummaryDto & Partial<AtmRegistryInfo>)[] = [];
  agencies: Agency[] = [];
  regions: string[] = [];

  loading = true;
  error = false;

  // Filter options
  selectedStatus: string = 'all';
  selectedHealth: string = 'all';
  selectedRegion: string = 'all';
  selectedAgency: string = 'all';
  searchTerm: string = '';

  private atmService = inject(AtmService);

  ngOnInit(): void {
    this.loadAtms();
    this.loadAgencies();
  }

  loadAtms(): void {
    this.loading = true;
    this.atmService.getAllAtmsWithRegistryInfo().subscribe({
      next: (data) => {
        this.atms = data;
        this.filteredAtms = [...data];
        this.extractRegions();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ATMs', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadAgencies(): void {
    this.atmService.getAllAgencies().subscribe({
      next: (agencies) => this.agencies = agencies,
      error: (err) => console.error('Error loading agencies', err)
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
          atm.locationAddress?.toLowerCase().includes(term);
      }

      return true;
    });
  }

  getStatusColor(atm: AtmStateSummaryDto): string {
    switch (atm.overallHealth.toLowerCase()) {
      case 'ok':
      case 'good':
      case 'healthy':
        return 'green';
      case 'warning':
      case 'attention':
        return 'orange';
      case 'error':
      case 'critical':
      case 'down':
        return 'red';
      default:
        return 'gray';
    }
  }

  resetFilters(): void {
    this.selectedStatus = 'all';
    this.selectedHealth = 'all';
    this.selectedRegion = 'all';
    this.selectedAgency = 'all';
    this.searchTerm = '';
    this.filteredAtms = [...this.atms];
  }
}
