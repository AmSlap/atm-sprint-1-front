import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtmCounterDto } from '../../models/atm.models';

@Component({
  selector: 'app-atm-counters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atm-counters.component.html',
  styleUrl: './atm-counters.component.scss'
})
export class AtmCountersComponent {
  @Input() counters!: AtmCounterDto;

  getCassetteStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok':
      case 'good':
      case 'active':
        return 'green';
      case 'warning':
      case 'low':
        return 'orange';
      case 'error':
      case 'empty':
      case 'jammed':
        return 'red';
      default:
        return 'gray';
    }
  }

  getNotesRemainingPercentage(cassette: any): number {
    // This is a simplified calculation - you might need to adjust based on actual cassette capacity
    const maxNotes = 2000; // Assuming a standard capacity
    return Math.min(100, Math.round((cassette.notesRemaining / maxNotes) * 100));
  }
}
