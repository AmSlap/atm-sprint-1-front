import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtmRegistryInfo } from '../../models/atm.models';
import { GoogleMapsModule } from '@angular/google-maps';

@Component({
  selector: 'app-atm-info',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './atm-info.component.html',
  styleUrl: './atm-info.component.scss'
})
export class AtmInfoComponent implements OnInit {
  @Input() registryInfo!: AtmRegistryInfo;
  mapOptions: google.maps.MapOptions = {
    zoom: 15,
    mapTypeId: 'roadmap',
    mapTypeControl: false,
  };
  markerPosition: google.maps.LatLngLiteral = { lat: 0, lng: 0 };

  ngOnInit() {
    if (this.registryInfo && this.registryInfo.locationLatitude && this.registryInfo.locationLongitude) {
      this.markerPosition = {
        lat: this.registryInfo.locationLatitude,
        lng: this.registryInfo.locationLongitude
      };
    }
  }
}
