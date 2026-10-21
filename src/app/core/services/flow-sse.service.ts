import { Injectable, signal } from '@angular/core';
import { FlowExecutionEvent } from '../interfaces/process.models';

@Injectable({ providedIn: 'root' })
export class FlowSseService {
  private readonly baseUrl = '/api';

  private eventSource: EventSource | null = null;
  private readonly events = signal<FlowExecutionEvent[]>([]);
  private readonly connected = signal(false);
  private readonly connectionError = signal<string | null>(null);

  readonly flowEvents = this.events.asReadonly();
  readonly isConnected = this.connected.asReadonly();
  readonly error = this.connectionError.asReadonly();

  connect(executionId: string): void {
    this.disconnect();

    const url = `${this.baseUrl}/processes/${executionId}/events`;
    this.connectionError.set(null);

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.connected.set(true);
      this.connectionError.set(null);
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data: FlowExecutionEvent = JSON.parse(event.data);
        this.events.update((current) => [...current, data]);
      } catch (e) {
        console.error('[SSE] Failed to parse event:', event.data, e);
      }
    };

    this.eventSource.onerror = (err) => {
      this.connected.set(false);
      this.connectionError.set('Connection error. Retrying...');
      this.eventSource?.close();
      setTimeout(() => this.connect(executionId), 3000);
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected.set(false);
  }

  clear(): void {
    this.disconnect();
    this.events.set([]);
    this.connectionError.set(null);
  }
}
