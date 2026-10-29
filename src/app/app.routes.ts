/**
 * Rutas de la aplicación: el dashboard de ejecuciones es la única vista y
 * cualquier ruta desconocida redirige a la raíz.
 */
import { Routes } from '@angular/router';
import { FlowDashboardComponent } from './features/flow-dashboard/flow-dashboard.component';

/** Configuración de rutas de la app standalone. */
export const routes: Routes = [
  { path: '', component: FlowDashboardComponent },
  { path: '**', redirectTo: '' },
];
