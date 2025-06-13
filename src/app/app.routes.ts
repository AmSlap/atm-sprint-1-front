import { Routes } from '@angular/router';
import {AtmDashboardComponent} from './components/atm-dashboard/atm-dashboard.component';
import {AtmDetailComponent} from './components/atm-detail/atm-detail.component';
import {AtmRegistryComponent} from './components/admin/atm-registry/atm-registry.component';
import {AgencyManagementComponent} from './components/agency-management/agency-management.component';


export const routes: Routes = [
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
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
