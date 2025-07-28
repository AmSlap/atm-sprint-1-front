export interface Incident {
  id: number;
  incidentNumber: string;
  processInstanceId: number;
  atmId: string;
  errorType: string;
  incidentDescription: string;
  status: IncidentStatus;
  incidentType: IncidentType;
  initialDiagnosis?: string;
  assessmentDetails?: string;
  supplierTicketNumber?: string;
  reimbursementDetails?: string;
  procurementDetails?: string;
  resolutionDetails?: string;
  closureDetails?: string;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
}

export enum IncidentStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_ASSESSMENT = 'WAITING_FOR_ASSESSMENT',
  WAITING_FOR_INSURANCE = 'WAITING_FOR_INSURANCE',
  WAITING_FOR_PROCUREMENT = 'WAITING_FOR_PROCUREMENT',
  WAITING_FOR_RESOLUTION = 'WAITING_FOR_RESOLUTION',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ABORTED = 'ABORTED'
}

export enum IncidentType {
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  OUTSIDE_MAINTENANCE_UNDER_INSURANCE = 'OUTSIDE_MAINTENANCE_UNDER_INSURANCE',
  OUTSIDE_MAINTENANCE_OUTSIDE_INSURANCE = 'OUTSIDE_MAINTENANCE_OUTSIDE_INSURANCE',
  NOT_CLASSIFIED = 'NOT_CLASSIFIED'
}

export interface IncidentTask {
  id: number;
  taskInstanceId: number;
  taskName: string;
  taskDescription?: string;
  assignedGroup?: string;
  assignedUser?: string;
  status: TaskStatus;
  priority?: number;
  createdAt: string;
  updatedAt?: string;
  claimedAt?: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  inputData?: string;
  outputData?: string;
  comments?: string;
  
  // Add incident context fields
  processInstanceId?: number;
  incidentId?: number;
  incidentNumber?: string;
  atmId?: string;
  incidentType?: string;
  incidentDescription?: string;
  incidentStatus?: string;
  incidentCreatedAt?: string;
  incidentCreatedBy?: string;
  errorType?: string;
  errorCode?: string;
  severity?: string;
}

export enum TaskStatus {
  CREATED = 'CREATED',
  READY = 'READY',
  RESERVED = 'RESERVED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ERROR = 'ERROR',
  EXITED = 'EXITED',
  OBSOLETE = 'OBSOLETE'
}

export interface IncidentReport {
  incident: Incident;
  currentProcessVariables: any;
  tasks: IncidentTask[];
  statistics: IncidentStatistics;
}

export interface IncidentStatistics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalDurationMinutes: number;
  currentStep: string;
  completionPercentage: number;
}