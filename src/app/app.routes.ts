import { Routes } from '@angular/router';
import {AtmDashboardComponent} from './components/atm-dashboard/atm-dashboard.component';
import {AtmDetailComponent} from './components/atm-detail/atm-detail.component';
import {AtmRegistryComponent} from './components/admin/atm-registry/atm-registry.component';

export const routes: Routes = [
  { path: '', component: AtmDashboardComponent },
  { path: 'atm/:id', component: AtmDetailComponent },
  { path: 'admin/registry', component: AtmRegistryComponent },
  { path: '**', redirectTo: '' }
];
