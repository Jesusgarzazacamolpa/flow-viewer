import { TestBed } from '@angular/core/testing';
import { FlowSseService } from './flow-sse.service';
import { FlowExecutionEvent } from '../interfaces/process.models';

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }

  open(): void {
    this.onopen?.();
  }

  emit(event: unknown): void {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
  }

  emitRaw(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  fail(): void {
    this.onerror?.();
  }
}

function makeEvent(overrides: Partial<FlowExecutionEvent> = {}): FlowExecutionEvent {
  return {
    executionId: 'p1',
    flowId: 'compra-vehiculo',
    eventType: 'STEP_COMPLETED',
    stepOrder: 1,
    stepName: 'Validar datos',
    timestamp: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

describe('FlowSseService', () => {
  let service: FlowSseService;
  const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource;

  beforeEach(() => {
    jest.useFakeTimers();
    MockEventSource.instances = [];
    (globalThis as { EventSource?: unknown }).EventSource = MockEventSource;
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlowSseService);
  });

  afterEach(() => {
    service.disconnect();
    (globalThis as { EventSource?: unknown }).EventSource = originalEventSource;
    jest.useRealTimers();
  });

  it('se conecta al endpoint de eventos del proceso', () => {
    service.connect('p1');

    const source = MockEventSource.instances[0];
    expect(source.url).toBe('/api/processes/p1/events');
    expect(service.isConnected()).toBe(false);

    source.open();
    expect(service.isConnected()).toBe(true);
    expect(service.error()).toBeNull();
  });

  it('agrega eventos válidos y evita duplicados', () => {
    service.connect('p1');
    const source = MockEventSource.instances[0];
    const event = makeEvent();

    source.emit(event);
    source.emit(event);
    source.emit(makeEvent({ eventType: 'FLOW_COMPLETED', timestamp: '2026-01-01T10:01:00Z' }));

    expect(service.flowEvents()).toHaveLength(2);
  });

  it('ignora eventos con JSON inválido sin romper la conexión', () => {
    service.connect('p1');
    const source = MockEventSource.instances[0];

    source.emitRaw('{esto no es json');
    expect(service.flowEvents()).toHaveLength(0);
    expect(service.isConnected()).toBe(false);
  });

  it('reconecta con backoff exponencial tras un error', () => {
    service.connect('p1');
    const first = MockEventSource.instances[0];
    first.fail();

    expect(first.closed).toBe(true);
    expect(service.isReconnecting()).toBe(true);
    expect(service.error()).toContain('1/5');

    jest.advanceTimersByTime(2000);
    expect(MockEventSource.instances).toHaveLength(2);

    MockEventSource.instances[1].fail();
    expect(service.error()).toContain('2/5');
    jest.advanceTimersByTime(4000);
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it('deja de reintentar después de cinco fallos y ofrece reconectar', () => {
    service.connect('p1');
    const delays = [2000, 4000, 8000, 16000, 30000];

    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      MockEventSource.instances[attempt].fail();
      jest.advanceTimersByTime(delays[attempt]);
    }
    MockEventSource.instances[5].fail();

    expect(service.isReconnecting()).toBe(false);
    expect(service.error()).toContain('Reconectar');
    expect(MockEventSource.instances).toHaveLength(6);
  });

  it('reconecta manualmente después de agotar los intentos', () => {
    service.connect('p1');
    const delays = [2000, 4000, 8000, 16000, 30000];
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      MockEventSource.instances[attempt].fail();
      jest.advanceTimersByTime(delays[attempt]);
    }
    MockEventSource.instances[5].fail();

    service.reconnect();

    expect(MockEventSource.instances).toHaveLength(7);
    expect(service.error()).toBeNull();
  });

  it('desconecta y cancela reconexiones pendientes', () => {
    service.connect('p1');
    const source = MockEventSource.instances[0];
    source.fail();

    service.disconnect();
    jest.advanceTimersByTime(60000);

    expect(MockEventSource.instances).toHaveLength(1);
    expect(service.isReconnecting()).toBe(false);
    expect(service.isConnected()).toBe(false);
  });

  it('limpia eventos y estado de conexión', () => {
    service.connect('p1');
    MockEventSource.instances[0].emit(makeEvent());

    service.clear();

    expect(service.flowEvents()).toHaveLength(0);
    expect(service.isConnected()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('informa cuando el navegador no soporta EventSource', () => {
    (globalThis as { EventSource?: unknown }).EventSource = undefined;
    service.connect('p1');

    expect(service.error()).toBe('Este navegador no permite el monitoreo en tiempo real.');
  });

  it('ignora eventos y aperturas de una conexión anterior', () => {
    service.connect('p1');
    const stale = MockEventSource.instances[0];
    stale.fail();
    jest.advanceTimersByTime(2000);

    const current = MockEventSource.instances[1];
    stale.open();
    stale.emit(makeEvent());
    stale.fail();

    expect(service.isConnected()).toBe(false);
    expect(service.flowEvents()).toHaveLength(0);

    current.open();
    expect(service.isConnected()).toBe(true);
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('no falla al reconectar o limpiar sin una sesión activa', () => {
    service.reconnect();
    expect(MockEventSource.instances).toHaveLength(0);
    expect(service.error()).toBeNull();

    service.clear();
    service.disconnect();
    expect(service.isConnected()).toBe(false);
    expect(service.flowEvents()).toHaveLength(0);
  });
});
