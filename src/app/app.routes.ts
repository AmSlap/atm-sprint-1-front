import { Routes } from '@angular/router';
import {AtmDashboardComponent} from './components/atm-dashboard/atm-dashboard.component';
import {AtmDetailComponent} from './components/atm-detail/atm-detail.component';
import {AtmRegistryComponent} from './components/admin/atm-registry/atm-registry.component';
import {AgencyManagementComponent} from './components/agency-management/agency-management.component';

export const routes: Routes = [
  // ATM Monitoring routes
  {
    path: '',
    component: AtmDashboardComponent,
    title: 'ATM Dashboard'
  },
  {
    path: 'atm/:id',
    component: AtmDetailComponent,
    title: 'ATM Details'
  },
  {
    path: 'atm-registry',
    component: AtmRegistryComponent,
    title: 'ATM Registry Management'
  },
  {
    path: 'admin/registry',
    component: AtmRegistryComponent,
    title: 'ATM Registry Management'
  },
  {
    path: 'admin/registry/atms/edit/:id',
    component: AtmRegistryComponent,
    title: 'Edit ATM Registry'
  },
  {
    path: 'agency-management',
    component: AgencyManagementComponent,
    title: 'Agency Management'
  },
  
  // Incident Management routes
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Incident Dashboard'
  },
  {
    path: 'incidents',
    loadComponent: () => import('./components/incident/incident-list/incident-list.component').then(m => m.IncidentListComponent),
    title: 'All Incidents'
  },
  {
    path: 'incidents/:id',
    loadComponent: () => import('./components/incident/incident-detail/incident-detail.component').then(m => m.IncidentDetailComponent),
    title: 'Incident Details'
  },
  {
    path: 'create-incident',
    loadComponent: () => import('./components/incident/create-incident/create-incident.component').then(m => m.CreateIncidentComponent),
    title: 'Create Incident'
  },
  {
    path: 'my-tasks',
    loadComponent: () => import('./components/my-tasks/my-tasks.component').then(m => m.MyTasksComponent),
    title: 'My Tasks'
  },
  {
    path: 'available-tasks',
    loadComponent: () => import('./components/available-tasks/available-tasks.component').then(m => m.AvailableTasksComponent),
    title: 'Available Tasks'
  },
  
  // Fallback
  {
    path: '**',
    redirectTo: ''
  }
];