export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      ascending: boolean;
    };
  };
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Request DTOs
export interface CreateIncidentRequest {
  atmId: string;
  errorType: string;
  incidentDescription: string;
  createdBy: string;
}

export interface ProcessIncidentRequest {
  user: string;
  initialDiagnosis: string;
}

export interface AnalyzeIncidentRequest {
  user: string;
  incidentType: string;
}

export interface AssessIncidentRequest {
  user: string;
  assessmentDetails: string;
  supplierTicketNumber: string;
}

export interface ApproveInsuranceRequest {
  user: string;
  reimbursementDetails: string;
}

export interface ProcureItemsRequest {
  user: string;
  procurementDetails: string;
}

export interface ResolveIncidentRequest {
  user: string;
  resolutionDetails: string;
  supplierTicketNumber: string;
}

export interface CloseIncidentRequest {
  user: string;
  closureDetails: string;
}

export interface ClaimTaskRequest {
  user: string;
}