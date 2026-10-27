import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventLogComponent } from './event-log.component';
import { FlowExecutionEvent } from '../../core/interfaces/process.models';

function makeEvent(overrides: Partial<FlowExecutionEvent> = {}): FlowExecutionEvent {
  return {
    executionId: 'p1',
    flowId: 'compra-vehiculo',
    eventType: 'STEP_STARTED',
    timestamp: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

describe('EventLogComponent', () => {
  let fixture: ComponentFixture<EventLogComponent>;
  let component: EventLogComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EventLogComponent] });
    fixture = TestBed.createComponent(EventLogComponent);
    component = fixture.componentInstance;
  });

  it('muestra el estado vacío mientras espera eventos', () => {
    component.events = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Esperando eventos');
  });

  it('renderiza eventos con nombre de paso y mensaje amigable', () => {
    component.events = [
      makeEvent({
        eventType: 'STEP_FAILED',
        stepName: 'Validar pago',
        userErrorMessage: 'No pudimos validar el pago. Intenta con otro método.',
      }),
    ];
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Paso fallido');
    expect(content).toContain('Validar pago');
    expect(content).toContain('No pudimos validar el pago.');
  });

  it('usa errorMessage cuando no hay mensaje amigable', () => {
    component.events = [makeEvent({ errorMessage: 'Timeout' })];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Timeout');
  });

  it.each([
    ['STEP_COMPLETED', 'border-green-500'],
    ['STEP_FAILED', 'border-red-500'],
    ['STEP_STARTED', 'border-sky-500'],
    ['STEP_REQUIRES_INTERVENTION', 'border-amber-500'],
    ['FLOW_RESUMED', 'border-sky-500'],
    ['OTRO', 'border-slate-300'],
  ])('colorea el borde para %s', (type, expectedClass) => {
    expect(component.eventBorderClass(type)).toContain(expectedClass);
  });

  it('traduce el tipo de evento a una etiqueta legible', () => {
    expect(component.eventTypeLabel('STEP_STARTED')).toBe('Paso iniciado');
    expect(component.eventTypeLabel('FLOW_COMPLETED')).toBe('Flujo completado');
    expect(component.eventTypeLabel('EVENTO_DESCONOCIDO')).toBe('EVENTO_DESCONOCIDO');
  });

  it('devuelve el índice como trackBy estable', () => {
    const event = makeEvent();
    expect(component.trackById(4, event)).toBe(4);
    expect(component.trackByIdx(2, event)).toBe(2);
  });

  it('clasifica visualmente todos los tipos de evento', () => {
    const eventTypes = [
      'STEP_COMPLETED',
      'STEP_FAILED',
      'STEP_STARTED',
      'STEP_REQUIRES_INTERVENTION',
      'FLOW_COMPLETED',
      'FLOW_FAILED',
      'FLOW_STARTED',
      'FLOW_PAUSED',
      'FLOW_RESUMED',
      'EVENTO_DESCONOCIDO',
    ];

    eventTypes.forEach((eventType) => {
      expect(component.eventTypeBadgeClass(eventType)).toBeTruthy();
      expect(component.eventIconName(eventType)).toBeTruthy();
      expect(component.eventBorderClass(eventType)).toBeTruthy();
    });

    expect(component.eventIconName('FLOW_COMPLETED')).toBe('check');
    expect(component.eventIconName('FLOW_FAILED')).toBe('exclamation-triangle');
    expect(component.eventIconName('FLOW_PAUSED')).toBe('shield');
    expect(component.eventIconName('FLOW_RESUMED')).toBe('arrow-path');
    expect(component.eventIconName('OTRO')).toBe('clock');
    expect(component.eventTypeBadgeClass('FLOW_RESUMED')).toContain('bg-blue-100');
  });
});
