export interface AtmStateSummaryDto {
  atmId: string;
  operationalState: string;
  overallHealth: string;
  lowCashFlag: boolean;
  lastUpdateTimestamp: string;
}

export interface AtmConfigurationDto {
  atmId: string;
  overallHealth: string;
  peripheralDetails: Record<string, any>;
  lastUpdateTimestamp: string;
}

export interface CassetteDto {
  cassetteId: string;
  denomination: number;
  currency: string;
  notesRemaining: number;
  cassetteStatus: string;
}

export interface AtmCounterDto {
  atmId: string;
  totalCashAvailable: number;
  lowCashFlag: boolean;
  rejectBinPercentageFull: number;
  cassettes: CassetteDto[];
  lastUpdateTimestamp: string;
}

export interface AtmStatusDto {
  atmId: string;
  operationalState: string;
  maintenanceMode: boolean;
  lastSuccessfulConnection: string;
  lastSuccessfulTransaction: string;
  lastUpdateTimestamp: string;
}

export interface AtmFullStateDto {
  atmId: string;
  status: AtmStatusDto;
  configuration: AtmConfigurationDto;
  counters: AtmCounterDto;
  registryInfo?: AtmRegistryInfo | null;
}

export interface AtmRegistryInfo {
  atmId: string;
  serialNumber: string;
  brand: string;
  model: string;
  label?: string;
  ipAddress?: string;
  region?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  agencyCode: string;
  agencyName?: string; // This is now included directly in the DTO
}

export interface Agency {
  agencyCode: string;
  agencyName: string;
  region?: string;
  address?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Combined ATM data for dashboard
export interface AtmCombinedDto extends AtmStateSummaryDto {
  registryInfo?: Partial<AtmRegistryInfo>;
  // Flattened registry fields for easier access
  label?: string;
  brand?: string;
  model?: string;
  region?: string;
  agencyName?: string;
  agencyCode?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
}

export interface AtmEnhancedDetailDto {
  atmId: string;
  status: AtmStatusDto;
  configuration: AtmConfigurationDto;
  counters: AtmCounterDto;
  registryInfo: AtmRegistryInfo | null;
}

export interface AtmStatusDto {
  atmId: string;
  operationalState: string;
  maintenanceMode: boolean;
  lastSuccessfulConnection: string;
  lastSuccessfulTransaction: string;
  lastUpdateTimestamp: string;
}
