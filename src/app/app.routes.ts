import { Routes } from '@angular/router';
import { FlowDashboardComponent } from './features/flow-dashboard/flow-dashboard.component';
import { FlowTrackerComponent } from './features/flow-tracker/flow-tracker.component';
import { ShieldComponent } from './features/shield/shield.component';
import { HumanInterventionComponent } from './features/human-intervention/human-intervention.component';

export const routes: Routes = [
  { path: '', component: FlowDashboardComponent },
  { path: 'tracker/:id', component: FlowTrackerComponent },
  { path: 'shield', component: ShieldComponent },
  { path: 'interventions', component: HumanInterventionComponent },
  { path: '**', redirectTo: '' }
];
