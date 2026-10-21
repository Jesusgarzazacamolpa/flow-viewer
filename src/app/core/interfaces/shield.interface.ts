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
