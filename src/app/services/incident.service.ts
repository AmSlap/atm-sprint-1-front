import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Incident,
  IncidentTask,
  IncidentReport,
  IncidentStatus
} from '../models/incident.model';
import {
  ApiResponse,
  PageResponse,
  CreateIncidentRequest,
  ProcessIncidentRequest,
  AnalyzeIncidentRequest,
  AssessIncidentRequest,
  ApproveInsuranceRequest,
  ProcureItemsRequest,
  ResolveIncidentRequest,
  CloseIncidentRequest,
  ClaimTaskRequest
} from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8082/api/incidents';

  // ==================== INCIDENT OPERATIONS ====================

  createIncident(request: CreateIncidentRequest): Observable<ApiResponse<Incident>> {
    return this.http.post<ApiResponse<Incident>>(`${this.baseUrl}`, request);
  }

  getAllIncidents(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDir: string = 'desc'
  ): Observable<ApiResponse<PageResponse<Incident>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<ApiResponse<PageResponse<Incident>>>(`${this.baseUrl}`, { params });
  }

  getIncidentById(id: number): Observable<ApiResponse<Incident>> {
    return this.http.get<ApiResponse<Incident>>(`${this.baseUrl}/${id}`);
  }

  getIncidentByProcessId(processInstanceId: number): Observable<ApiResponse<IncidentReport>> {
    return this.http.get<ApiResponse<IncidentReport>>(`${this.baseUrl}/process/${processInstanceId}`);
  }

  getProcessDiagram(processInstanceId: number): Observable<string> {
    return this.http.get(`${this.baseUrl}/process/${processInstanceId}/diagram`, { 
      responseType: 'text' 
    });
  }

  getIncidentsByStatus(status: IncidentStatus): Observable<ApiResponse<Incident[]>> {
    return this.http.get<ApiResponse<Incident[]>>(`${this.baseUrl}/status/${status}`);
  }

  abortIncident(processInstanceId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${processInstanceId}`);
  }

  // ==================== TASK OPERATIONS ====================

  getAvailableTasks(group?: string): Observable<ApiResponse<any[]>> {
    const params = group ? new HttpParams().set('group', group) : new HttpParams();
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tasks/available`, { params });
  }

  getUserTasks(user: string): Observable<ApiResponse<IncidentTask[]>> {
    const params = new HttpParams().set('user', user);
    return this.http.get<ApiResponse<IncidentTask[]>>(`${this.baseUrl}/tasks/my-tasks`, { params });
  }

  getUserTasksByStatus(user: string, status: string): Observable<ApiResponse<IncidentTask[]>> {
    const params = new HttpParams()
      .set('user', user)
      .set('status', status);
    return this.http.get<ApiResponse<IncidentTask[]>>(`${this.baseUrl}/tasks/user-tasks-by-status`, { params });
  }

  getGroupTasks(group: string): Observable<ApiResponse<IncidentTask[]>> {
    const params = new HttpParams().set('group', group);
    return this.http.get<ApiResponse<IncidentTask[]>>(`${this.baseUrl}/tasks/group-tasks`, { params });
  }

  getTaskDetails(taskInstanceId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/tasks/${taskInstanceId}`);
  }

  getTaskInputData(taskInstanceId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/tasks/${taskInstanceId}/input`);
  }

  claimTask(taskInstanceId: number, request: ClaimTaskRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/claim`, request);
  }

  releaseTask(taskInstanceId: number, user: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/release`, { user });
  }
  startTask(taskInstanceId: number, user: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/start`, { user });
  }

  // ==================== TASK COMPLETION OPERATIONS ====================

  completeProcessIncident(taskInstanceId: number, request: ProcessIncidentRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/process-incident`, request);
  }

  completeAnalyzeIncident(taskInstanceId: number, request: AnalyzeIncidentRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/analyze-incident`, request);
  }

  completeAssessIncident(taskInstanceId: number, request: AssessIncidentRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/assess-incident`, request);
  }

  completeApproveInsurance(taskInstanceId: number, request: ApproveInsuranceRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/approve-insurance`, request);
  }

  completeProcureItems(taskInstanceId: number, request: ProcureItemsRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/procure-items`, request);
  }

  completeResolveIncident(taskInstanceId: number, request: ResolveIncidentRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/resolve-incident`, request);
  }

  completeResolveMaintenanceIncident(taskInstanceId: number, request: ResolveIncidentRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/resolve-maintenance`, request);
  }

  completeCloseIncident(taskInstanceId: number, request: CloseIncidentRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/tasks/${taskInstanceId}/complete/close-incident`, request);
  }

  // Add new methods for endpoints with incident context
getAvailableTasksWithContext(group?: string): Observable<ApiResponse<IncidentTask[]>> {
  const params = group ? new HttpParams().set('group', group) : new HttpParams();
  return this.http.get<ApiResponse<IncidentTask[]>>(`${this.baseUrl}/tasks/group-tasks`, { params });
}

getGroupTasksWithContext(group: string): Observable<ApiResponse<IncidentTask[]>> {
  return this.http.get<ApiResponse<IncidentTask[]>>(`${this.baseUrl}/tasks/group/${group}/with-context`);
}

getUserTasksWithContext(user: string): Observable<ApiResponse<IncidentTask[]>> {
  return this.http.get<ApiResponse<IncidentTask[]>>(`${this.baseUrl}/tasks/user/${user}/with-context`);
}
}
