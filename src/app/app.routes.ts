import { Routes } from '@angular/router';
import { FlowDashboardComponent } from './features/flow-dashboard/flow-dashboard.component';

export const routes: Routes = [
  { path: '', component: FlowDashboardComponent },
  { path: '**', redirectTo: '' },
];
