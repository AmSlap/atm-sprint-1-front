import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtmConfigurationDto } from '../../models/atm.models';

@Component({
  selector: 'app-atm-configuration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atm-configuration.component.html',
  styleUrl: './atm-configuration.component.scss'
})
export class AtmConfigurationComponent {
  @Input() configuration!: AtmConfigurationDto;

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
}
