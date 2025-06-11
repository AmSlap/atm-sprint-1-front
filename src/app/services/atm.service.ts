import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import {
  AtmStateSummaryDto,
  AtmFullStateDto,
  AtmConfigurationDto,
  AtmCounterDto,
  AtmRegistryInfo,
  Agency
} from '../models/atm.models';

@Injectable({
  providedIn: 'root'
})
export class AtmService {
  private readonly stateBaseUrl = `http://localhost:8082/api/state/atms`;
  private readonly registryBaseUrl = `http://localhost:8082/api/registry/atms`;
  private readonly agencyBaseUrl = `http://localhost:8082/api/registry/agencies`;
  private http = inject(HttpClient);

  getAllAtms(): Observable<AtmStateSummaryDto[]> {
    return this.http.get<AtmStateSummaryDto[]>(this.stateBaseUrl);
  }

  getAllAtmsWithRegistryInfo(): Observable<(AtmStateSummaryDto & Partial<AtmRegistryInfo>)[]> {
    return forkJoin({
      statusData: this.getAllAtms(),
      registryData: this.getAllAtmRegistry()
    }).pipe(
      map(({ statusData, registryData }) => {
        return statusData.map(atm => {
          const registryInfo = registryData.find(reg => reg.atmId === atm.atmId);
          return { ...atm, ...registryInfo };
        });
      })
    );
  }

  getAtmDetails(atmId: string): Observable<AtmFullStateDto> {
    return forkJoin({
      stateData: this.http.get<AtmFullStateDto>(`${this.stateBaseUrl}/${atmId}`),
      registryData: this.getAtmRegistry(atmId).pipe(catchError(() => of(null)))
    }).pipe(
      map(({ stateData, registryData }) => {
        return {
          ...stateData,
          registryInfo: registryData
        };
      })
    );
  }

  getAtmConfiguration(atmId: string): Observable<AtmConfigurationDto> {
    return this.http.get<AtmConfigurationDto>(`${this.stateBaseUrl}/${atmId}/configuration`);
  }

  getAtmCounters(atmId: string): Observable<AtmCounterDto> {
    return this.http.get<AtmCounterDto>(`${this.stateBaseUrl}/${atmId}/counters`);
  }

  // Registry methods
  getAllAtmRegistry(): Observable<AtmRegistryInfo[]> {
    return this.http.get<AtmRegistryInfo[]>(this.registryBaseUrl);
  }

  getAtmRegistry(atmId: string): Observable<AtmRegistryInfo> {
    return this.http.get<AtmRegistryInfo>(`${this.registryBaseUrl}/${atmId}`);
  }

  createAtm(atm: AtmRegistryInfo): Observable<AtmRegistryInfo> {
    return this.http.post<AtmRegistryInfo>(this.registryBaseUrl, atm);
  }

  updateAtm(atmId: string, atm: AtmRegistryInfo): Observable<AtmRegistryInfo> {
    return this.http.put<AtmRegistryInfo>(`${this.registryBaseUrl}/${atmId}`, atm);
  }

  deleteAtm(atmId: string): Observable<void> {
    return this.http.delete<void>(`${this.registryBaseUrl}/${atmId}`);
  }

  // Agency methods
  getAllAgencies(): Observable<Agency[]> {
    return this.http.get<Agency[]>(this.agencyBaseUrl);
  }

  getAgency(agencyCode: string): Observable<Agency> {
    return this.http.get<Agency>(`${this.agencyBaseUrl}/${agencyCode}`);
  }
}
