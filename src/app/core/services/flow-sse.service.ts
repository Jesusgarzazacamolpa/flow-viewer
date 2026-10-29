import { Injectable, signal } from '@angular/core';
import { FlowExecutionEvent } from '../interfaces/process.models';

/** Esperas de reconexión en milisegundos; el último valor actúa como tope. */
const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000] as const;

/**
 * Mantiene el stream SSE de una ejecución contra `GET /api/processes/{id}/events`.
 * Acumula eventos sin duplicados, expone el estado de conexión y reintenta con
 * backoff (2, 4, 8, 16 y 30 s) hasta agotar los intentos.
 */
@Injectable({ providedIn: 'root' })
export class FlowSseService {
  private readonly baseUrl = '/api';

  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeExecutionId: string | null = null;
  private attempt = 0;
  private readonly seenEvents = new Set<string>();

  private readonly events = signal<FlowExecutionEvent[]>([]);
  private readonly connected = signal(false);
  private readonly reconnecting = signal(false);
  private readonly connectionError = signal<string | null>(null);

  /** Eventos recibidos en orden de llegada (persisten hasta llamar a `clear`). */
  readonly flowEvents = this.events.asReadonly();
  readonly isConnected = this.connected.asReadonly();
  readonly isReconnecting = this.reconnecting.asReadonly();
  /** Último error de conexión visible para la vista, o null. */
  readonly error = this.connectionError.asReadonly();

  /** Abre el stream de la ejecución; cierra el anterior y reinicia el backoff. */
  connect(executionId: string): void {
    this.disconnect();
    this.activeExecutionId = executionId;
    this.attempt = 0;
    this.open(executionId);
  }

  /** Reconexión manual de la ejecución activa, reiniciando el backoff. */
  reconnect(): void {
    const executionId = this.activeExecutionId;
    if (!executionId) return;

    this.clearTimer();
    this.attempt = 0;
    this.connectionError.set(null);
    this.open(executionId);
  }

  /** Cierra el stream y el temporizador, conservando los eventos ya recibidos. */
  disconnect(): void {
    this.activeExecutionId = null;
    this.clearTimer();
    this.closeSource();
    this.connected.set(false);
    this.reconnecting.set(false);
  }

  /** Desconecta y vacía eventos, deduplicación y error. */
  clear(): void {
    this.disconnect();
    this.events.set([]);
    this.seenEvents.clear();
    this.connectionError.set(null);
  }

  /** Crea el EventSource y cablea apertura, mensajes y error; ignora fuentes obsoletas. */
  private open(executionId: string): void {
    if (this.activeExecutionId !== executionId) return;

    if (typeof EventSource === 'undefined') {
      this.connectionError.set('Este navegador no permite el monitoreo en tiempo real.');
      return;
    }

    this.closeSource();
    const url = `${this.baseUrl}/processes/${executionId}/events`;
    const source = new EventSource(url);
    this.eventSource = source;

    source.onopen = () => {
      if (this.eventSource !== source) return;
      this.connected.set(true);
      this.reconnecting.set(false);
      this.attempt = 0;
      this.connectionError.set(null);
    };

    source.onmessage = (event: MessageEvent<string>) => {
      if (this.eventSource !== source) return;
      try {
        const data = JSON.parse(event.data) as FlowExecutionEvent;
        const key = this.eventKey(data);
        if (this.seenEvents.has(key)) return;
        this.seenEvents.add(key);
        this.events.update((current) => [...current, data]);
      } catch {
        // Un evento corrupto no debe romper el monitoreo; se ignora y se sigue escuchando.
      }
    };

    source.onerror = () => {
      if (this.eventSource !== source) return;
      this.closeSource();
      this.connected.set(false);
      this.scheduleReconnect(executionId);
    };
  }

  /** Programa el siguiente intento o expone un error definitivo al agotar los reintentos. */
  private scheduleReconnect(executionId: string): void {
    if (this.activeExecutionId !== executionId) return;

    if (this.attempt >= RETRY_DELAYS_MS.length) {
      this.reconnecting.set(false);
      this.connectionError.set(
        'No pudimos reconectar con el monitoreo en tiempo real. Usa "Reconectar" para volver a intentarlo.',
      );
      return;
    }

    const delay = RETRY_DELAYS_MS[Math.min(this.attempt, RETRY_DELAYS_MS.length - 1)];
    this.attempt += 1;
    this.reconnecting.set(true);
    this.connectionError.set(
      `Se perdió la conexión en tiempo real. Reintentando (${this.attempt}/${RETRY_DELAYS_MS.length})…`,
    );

    this.clearTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.activeExecutionId === executionId) {
        this.open(executionId);
      }
    }, delay);
  }

  private closeSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private clearTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Clave de deduplicación: ejecución, tipo, paso y timestamp. */
  private eventKey(event: FlowExecutionEvent): string {
    return [
      event.executionId,
      event.eventType,
      event.stepOrder ?? '',
      event.stepName ?? '',
      event.timestamp,
    ].join('|');
  }
}
