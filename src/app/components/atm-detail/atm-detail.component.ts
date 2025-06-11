import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AtmService } from '../../services/atm.service';
import { AtmFullStateDto } from '../../models/atm.models';
import { AtmConfigurationComponent } from '../atm-configuration/atm-configuration.component';
import { AtmCountersComponent } from '../atm-counters/atm-counters.component';
import { AtmInfoComponent } from '../atm-info/atm-info.component';

@Component({
  selector: 'app-atm-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AtmConfigurationComponent, AtmCountersComponent, AtmInfoComponent],
  templateUrl: './atm-detail.component.html',
  styleUrl: './atm-detail.component.scss'
})
export class AtmDetailComponent implements OnInit {
  atmId: string = '';
  atmDetails: AtmFullStateDto | null = null;
  loading = true;
  error = false;
  activeView: 'overview' | 'configuration' | 'counters' | 'info' = 'overview';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private atmService = inject(AtmService);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.atmId = id;
        this.loadAtmDetails();
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  loadAtmDetails(): void {
    this.loading = true;
    this.atmService.getAtmDetails(this.atmId).subscribe({
      next: (data) => {
        this.atmDetails = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ATM details', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  setActiveView(view: 'overview' | 'configuration' | 'counters' | 'info'): void {
    this.activeView = view;
  }

  getStatusColor(): string {
    if (!this.atmDetails) return 'gray';

    switch (this.atmDetails.configuration.overallHealth.toLowerCase()) {
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
}
