import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import {
  AtmStateSummaryDto,
  AtmFullStateDto,
  AtmConfigurationDto,
  AtmCounterDto,
  AtmRegistryInfo,
  Agency,
  AtmCombinedDto,
  AtmEnhancedDetailDto  // Add this import
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

  // Get all ATM summaries - matches your backend /api/state/atms endpoint
  getAllAtmSummaries(): Observable<AtmStateSummaryDto[]> {
    return this.http.get<AtmStateSummaryDto[]>(this.stateBaseUrl).pipe(
      catchError(error => {
        console.error('Error fetching ATM summaries:', error);
        return of([]);
      })
    );
  }

  // NEW: Get combined ATM data using the enhanced backend endpoint
  getAllAtmsWithRegistryInfo(): Observable<AtmCombinedDto[]> {
    return this.http.get<AtmCombinedDto[]>(`${this.stateBaseUrl}/combined`).pipe(
      catchError(error => {
        console.error('Error fetching combined ATM data:', error);
        // Fallback to manual combination if enhanced endpoint fails
        return this.getAllAtmsWithRegistryInfoFallback();
      })
    );
  }

  // Fallback method (your original implementation)
  private getAllAtmsWithRegistryInfoFallback(): Observable<AtmCombinedDto[]> {
    return forkJoin({
      summaries: this.getAllAtmSummaries(),
      registry: this.getAllAtmRegistry()
    }).pipe(
      map(({ summaries, registry }) => {
        const registryMap = new Map<string, AtmRegistryInfo>();
        registry.forEach(reg => registryMap.set(reg.atmId, reg));

        return summaries.map(summary => {
          const registryInfo = registryMap.get(summary.atmId);
          return {
            ...summary,
            registryInfo,
            label: registryInfo?.label,
            brand: registryInfo?.brand,
            model: registryInfo?.model,
            region: registryInfo?.region,
            agencyName: registryInfo?.agencyName,
            agencyCode: registryInfo?.agencyCode,
            locationAddress: registryInfo?.locationAddress,
            locationLatitude: registryInfo?.locationLatitude,
            locationLongitude: registryInfo?.locationLongitude
          } as AtmCombinedDto;
        });
      }),
      catchError(error => {
        console.error('Error combining ATM data:', error);
        return of([]);
      })
    );
  }

  // Original ATM details method (keep for backward compatibility)
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

  // NEW: Enhanced ATM details using the new backend endpoint
  getAtmEnhancedDetails(atmId: string): Observable<AtmEnhancedDetailDto> {
    return this.http.get<AtmEnhancedDetailDto>(`${this.stateBaseUrl}/${atmId}/enhanced`).pipe(
      catchError(error => {
        console.error('Error fetching enhanced ATM details:', error);
        // Fallback to original method if enhanced endpoint fails
        return this.getAtmDetails(atmId).pipe(
          map(details => ({
            atmId: details.atmId,
            status: details.status,
            configuration: details.configuration,
            counters: details.counters,
            registryInfo: details.registryInfo
          } as AtmEnhancedDetailDto))
        );
      })
    );
  }

  // NEW: Get peripheral status for an ATM
  getAtmPeripherals(atmId: string): Observable<any> {
    return this.http.get<any>(`${this.stateBaseUrl}/${atmId}/peripherals`).pipe(
      catchError(error => {
        console.error('Error fetching ATM peripherals:', error);
        return of({});
      })
    );
  }

  // NEW: Get agencies from state service (proxy endpoint)
  getAllAgenciesFromState(): Observable<Agency[]> {
    return this.http.get<Agency[]>(`${this.stateBaseUrl}/agencies`).pipe(
      catchError(error => {
        console.error('Error fetching agencies from state service:', error);
        // Fallback to direct registry service
        return this.getAllAgencies();
      })
    );
  }

  // NEW: Check if ATM exists in registry
  checkAtmExistsInRegistry(atmId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.stateBaseUrl}/${atmId}/registry-exists`).pipe(
      catchError(error => {
        console.error('Error checking ATM registry existence:', error);
        return of(false);
      })
    );
  }

  getAtmConfiguration(atmId: string): Observable<AtmConfigurationDto> {
    return this.http.get<AtmConfigurationDto>(`${this.stateBaseUrl}/${atmId}/configuration`);
  }

  getAtmCounters(atmId: string): Observable<AtmCounterDto> {
    return this.http.get<AtmCounterDto>(`${this.stateBaseUrl}/${atmId}/counters`);
  }

  // Registry methods (unchanged)
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

  // Agency methods (unchanged)
  getAllAgencies(): Observable<Agency[]> {
    return this.http.get<Agency[]>(this.agencyBaseUrl);
  }

  getAgency(agencyCode: string): Observable<Agency> {
    return this.http.get<Agency>(`${this.agencyBaseUrl}/${agencyCode}`);
  }

  // NEW: Utility method to refresh a single ATM
  refreshAtm(atmId: string): Observable<AtmCombinedDto> {
    return this.http.post<AtmCombinedDto>(`${this.stateBaseUrl}/${atmId}/refresh`, {}).pipe(
      catchError(error => {
        console.error('Error refreshing ATM:', error);
        // Fallback to getting current data
        return this.getAtmEnhancedDetails(atmId).pipe(
          map(details => ({
            atmId: details.atmId,
            operationalState: details.status?.operationalState || 'UNKNOWN',
            overallHealth: details.configuration?.overallHealth || 'UNKNOWN',
            lowCashFlag: details.counters?.lowCashFlag || false,
            lastUpdateTimestamp: details.status?.lastUpdateTimestamp || new Date().toISOString(),
            label: details.registryInfo?.label,
            brand: details.registryInfo?.brand,
            model: details.registryInfo?.model,
            region: details.registryInfo?.region,
            agencyCode: details.registryInfo?.agencyCode,
            agencyName: details.registryInfo?.agencyName,
            locationAddress: details.registryInfo?.locationAddress,
            locationLatitude: details.registryInfo?.locationLatitude,
            locationLongitude: details.registryInfo?.locationLongitude,
            ipAddress: details.registryInfo?.ipAddress
          } as AtmCombinedDto))
        );
      })
    );
  }

  // Agency CRUD methods - Add these to your existing AtmService class

  /**
   * Create a new agency
   * @param agency Agency data to create
   * @returns Observable of created agency
   */
  createAgency(agency: Agency): Observable<Agency> {
    return this.http.post<Agency>(this.agencyBaseUrl, agency).pipe(
      catchError(error => {
        console.error('Error creating agency:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing agency
   * @param agencyCode Code of the agency to update
   * @param agency Updated agency data
   * @returns Observable of updated agency
   */
  updateAgency(agencyCode: string, agency: Agency): Observable<Agency> {
    return this.http.put<Agency>(`${this.agencyBaseUrl}/${agencyCode}`, agency).pipe(
      catchError(error => {
        console.error('Error updating agency:', error);
        throw error;
      })
    );
  }

  /**
   * Delete an agency
   * @param agencyCode Code of the agency to delete
   * @returns Observable of void
   */
  deleteAgency(agencyCode: string): Observable<void> {
    return this.http.delete<void>(`${this.agencyBaseUrl}/${agencyCode}`).pipe(
      catchError(error => {
        console.error('Error deleting agency:', error);
        throw error;
      })
    );
  }

  /**
   * Check if an agency has any ATMs assigned
   * @param agencyCode Code of the agency to check
   * @returns Observable of boolean indicating if agency has ATMs
   */
  checkAgencyHasAtms(agencyCode: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.agencyBaseUrl}/${agencyCode}/has-atms`).pipe(
      catchError(error => {
        console.error('Error checking agency ATMs:', error);
        // Fallback: manually check by getting all ATMs
        return this.getAllAtmRegistry().pipe(
          map(atms => atms.some(atm => atm.agencyCode === agencyCode)),
          catchError(() => of(false))
        );
      })
    );
  }

  /**
   * Get count of ATMs for each agency
   * @returns Observable of map with agency codes as keys and ATM counts as values
   */
  getAgencyAtmCounts(): Observable<{ [agencyCode: string]: number }> {
    return this.http.get<{ [agencyCode: string]: number }>(`${this.agencyBaseUrl}/atm-counts`).pipe(
      catchError(error => {
        console.error('Error fetching agency ATM counts:', error);
        // Fallback: calculate manually
        return this.getAllAtmRegistry().pipe(
          map(atms => {
            const counts: { [agencyCode: string]: number } = {};
            atms.forEach(atm => {
              if (atm.agencyCode) {
                counts[atm.agencyCode] = (counts[atm.agencyCode] || 0) + 1;
              }
            });
            return counts;
          }),
          catchError(() => of({}))
        );
      })
    );
  }

  /**
   * Get ATMs assigned to a specific agency
   * @param agencyCode Code of the agency
   * @returns Observable of ATM registry info array
   */
  getAtmsByAgency(agencyCode: string): Observable<AtmRegistryInfo[]> {
    return this.http.get<AtmRegistryInfo[]>(`${this.agencyBaseUrl}/${agencyCode}/atms`).pipe(
      catchError(error => {
        console.error('Error fetching ATMs by agency:', error);
        // Fallback: filter manually
        return this.getAllAtmRegistry().pipe(
          map(atms => atms.filter(atm => atm.agencyCode === agencyCode)),
          catchError(() => of([]))
        );
      })
    );
  }

  /**
   * Validate agency code format
   * @param agencyCode Code to validate
   * @returns Observable of boolean indicating if code is valid
   */
  validateAgencyCode(agencyCode: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.agencyBaseUrl}/validate/${agencyCode}`).pipe(
      catchError(error => {
        console.error('Error validating agency code:', error);
        // Fallback: basic client-side validation
        const isValid = /^[A-Z0-9_-]{2,10}$/.test(agencyCode);
        return of(isValid);
      })
    );
  }

  /**
   * Check if agency code is available (not already used)
   * @param agencyCode Code to check
   * @returns Observable of boolean indicating if code is available
   */
  checkAgencyCodeAvailable(agencyCode: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.agencyBaseUrl}/available/${agencyCode}`).pipe(
      catchError(error => {
        console.error('Error checking agency code availability:', error);
        // Fallback: check manually
        return this.getAllAgencies().pipe(
          map(agencies => !agencies.some(agency => agency.agencyCode === agencyCode)),
          catchError(() => of(true))
        );
      })
    );
  }

  /**
   * Bulk create agencies
   * @param agencies Array of agencies to create
   * @returns Observable of created agencies
   */
  bulkCreateAgencies(agencies: Agency[]): Observable<Agency[]> {
    return this.http.post<Agency[]>(`${this.agencyBaseUrl}/bulk`, agencies).pipe(
      catchError(error => {
        console.error('Error bulk creating agencies:', error);
        // Fallback: create one by one
        const createRequests = agencies.map(agency => this.createAgency(agency));
        return forkJoin(createRequests).pipe(
          catchError(() => of([]))
        );
      })
    );
  }

  /**
   * Search agencies by name or code
   * @param searchTerm Term to search for
   * @returns Observable of matching agencies
   */
  searchAgencies(searchTerm: string): Observable<Agency[]> {
    return this.http.get<Agency[]>(`${this.agencyBaseUrl}/search`, {
      params: { q: searchTerm }
    }).pipe(
      catchError(error => {
        console.error('Error searching agencies:', error);
        // Fallback: filter manually
        return this.getAllAgencies().pipe(
          map(agencies => agencies.filter(agency =>
            agency.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agency.agencyCode.toLowerCase().includes(searchTerm.toLowerCase())
          )),
          catchError(() => of([]))
        );
      })
    );
  }

  /**
   * Get agency statistics
   * @returns Observable of agency statistics
   */
  getAgencyStatistics(): Observable<{
    totalAgencies: number;
    agenciesWithAtms: number;
    agenciesWithoutAtms: number;
    averageAtmsPerAgency: number;
    topAgenciesByAtmCount: Array<{ agencyCode: string; agencyName: string; atmCount: number }>;
  }> {
    return this.http.get<any>(`${this.agencyBaseUrl}/statistics`).pipe(
      catchError(error => {
        console.error('Error fetching agency statistics:', error);
        // Fallback: calculate manually
        return forkJoin({
          agencies: this.getAllAgencies(),
          atms: this.getAllAtmRegistry()
        }).pipe(
          map(({ agencies, atms }) => {
            const atmCounts: { [agencyCode: string]: number } = {};
            atms.forEach(atm => {
              if (atm.agencyCode) {
                atmCounts[atm.agencyCode] = (atmCounts[atm.agencyCode] || 0) + 1;
              }
            });

            const agenciesWithAtms = Object.keys(atmCounts).length;
            const totalAtms = Object.values(atmCounts).reduce((sum, count) => sum + count, 0);
            const averageAtmsPerAgency = agenciesWithAtms > 0 ? totalAtms / agenciesWithAtms : 0;

            const topAgencies = agencies
              .map(agency => ({
                agencyCode: agency.agencyCode,
                agencyName: agency.agencyName,
                atmCount: atmCounts[agency.agencyCode] || 0
              }))
              .sort((a, b) => b.atmCount - a.atmCount)
              .slice(0, 5);

            return {
              totalAgencies: agencies.length,
              agenciesWithAtms,
              agenciesWithoutAtms: agencies.length - agenciesWithAtms,
              averageAtmsPerAgency: Math.round(averageAtmsPerAgency * 100) / 100,
              topAgenciesByAtmCount: topAgencies
            };
          }),
          catchError(() => of({
            totalAgencies: 0,
            agenciesWithAtms: 0,
            agenciesWithoutAtms: 0,
            averageAtmsPerAgency: 0,
            topAgenciesByAtmCount: []
          }))
        );
      })
    );
  }

  /**
   * Export agencies to CSV format
   * @returns Observable of CSV string
   */
  exportAgenciesToCsv(): Observable<string> {
    return this.http.get(`${this.agencyBaseUrl}/export/csv`, { responseType: 'text' }).pipe(
      catchError(error => {
        console.error('Error exporting agencies to CSV:', error);
        // Fallback: generate CSV manually
        return this.getAllAgencies().pipe(
          map(agencies => {
            const headers = ['Agency Code', 'Agency Name', 'Description', 'Contact Email', 'Contact Phone', 'Address'];
            const rows = agencies.map(agency => [
              agency.agencyCode,
              agency.agencyName,
              agency.contactEmail || '',
              agency.contactPhone || '',
              agency.address || ''
            ]);

            const csvContent = [headers, ...rows]
              .map(row => row.map(field => `"${field}"`).join(','))
              .join('\n');

            return csvContent;
          }),
          catchError(() => of(''))
        );
      })
    );
  }

  /**
   * Refresh agency data from external source
   * @returns Observable of updated agencies
   */
  refreshAgencyData(): Observable<Agency[]> {
    return this.http.post<Agency[]>(`${this.agencyBaseUrl}/refresh`, {}).pipe(
      catchError(error => {
        console.error('Error refreshing agency data:', error);
        // Fallback: just return current data
        return this.getAllAgencies();
      })
    );
  }
}
