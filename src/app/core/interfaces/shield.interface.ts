/**
 * Alertas del módulo Shield: eventos de seguridad con severidad, origen y
 * estado de resolución.
 */

/** Alerta individual mostrada en la tabla de Shield. */
export interface ShieldAlert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
  relatedProcessId?: string;
  details?: Record<string, unknown>;
}

/** Totales de alertas por severidad y actividad reciente. */
export interface ShieldStats {
  totalAlerts: number;
  alertsBySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  alertsLast24h: number;
  resolvedCount: number;
}
