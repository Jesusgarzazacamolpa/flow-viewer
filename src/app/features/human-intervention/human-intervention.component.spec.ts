import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { HumanInterventionComponent } from './human-intervention.component';
import { HumanInterventionService } from '../../core/services/human-intervention.service';
import { NotificationService } from '../../core/services/notification.service';
import { HumanIntervention } from '../../core/interfaces/intervention.interface';

function makeIntervention(overrides: Partial<HumanIntervention> = {}): HumanIntervention {
  return {
    id: 'i1',
    processId: 'p1',
    stepName: 'Validar identidad',
    stepOrder: 2,
    status: 'PENDING',
    errorMessage: 'No pudimos validar la identidad.',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(root.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('HumanInterventionComponent', () => {
  let fixture: ComponentFixture<HumanInterventionComponent>;
  let component: HumanInterventionComponent;
  let interventionService: Record<string, jest.Mock>;
  let notifications: NotificationService;

  beforeEach(() => {
    interventionService = {
      getInterventions: jest.fn(() =>
        of([
          makeIntervention(),
          makeIntervention({ id: 'i2', stepName: 'Firmar', status: 'COMPLETED' }),
          makeIntervention({
            id: 'i3',
            stepName: 'Entregar',
            assignedTo: 'juan',
            status: 'PENDING',
          }),
        ]),
      ),
      assignToMe: jest.fn((_id: string, assignee: string) =>
        of(makeIntervention({ assignedTo: assignee })),
      ),
      updateIntervention: jest.fn(() => of(makeIntervention())),
    };

    TestBed.configureTestingModule({
      imports: [HumanInterventionComponent],
      providers: [{ provide: HumanInterventionService, useValue: interventionService }],
    });
    fixture = TestBed.createComponent(HumanInterventionComponent);
    component = fixture.componentInstance;
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('muestra solo las intervenciones pendientes', () => {
    expect(interventionService['getInterventions']).toHaveBeenCalledWith(true);

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Validar identidad');
    expect(content).toContain('Entregar');
    expect(content).not.toContain('Firmar');
  });

  it('muestra el mensaje amigable del backend y reintenta la carga', () => {
    interventionService['getInterventions'].mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 503,
        error: { message: 'No pudimos cargar las intervenciones.', flowCode: 'HI-503' },
      })),
    );
    (component as unknown as { refresh: () => void }).refresh();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar las intervenciones');
    expect(content).toContain('No pudimos cargar las intervenciones.');
    expect(content).toContain('HI-503');

    interventionService['getInterventions'].mockReturnValue(of([]));
    findButton(fixture.nativeElement, 'Reintentar')!.click();
    fixture.detectChanges();

    expect(interventionService['getInterventions']).toHaveBeenCalledTimes(3);
    expect(fixture.nativeElement.textContent).toContain('No hay intervenciones pendientes.');
  });

  it('deshabilita la asignación mientras no se escribe un responsable', () => {
    const assignButton = findButton(fixture.nativeElement, 'Asignar')!;

    expect(assignButton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('input[placeholder="Asignar a..."]')).not.toBeNull();
  });

  it('asigna la intervención al responsable indicado', () => {
    const input = fixture.nativeElement.querySelector(
      'input[placeholder="Asignar a..."]',
    ) as HTMLInputElement;
    input.value = '  maria  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Asignar')!.click();
    fixture.detectChanges();

    expect(interventionService['assignToMe']).toHaveBeenCalledWith('i1', 'maria');
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('maria');
  });

  it('reanuda una intervención asignada y la retira de la lista', () => {
    const select = fixture.nativeElement.querySelector(
      'select[aria-label="Acciones para la intervención del paso Entregar"]',
    ) as HTMLSelectElement;

    select.value = 'RESUME';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(interventionService['updateIntervention']).toHaveBeenCalledWith('i3', {
      status: 'RESUME',
      notes: undefined,
    });
    expect(fixture.nativeElement.textContent).not.toContain('Entregar');
    expect(notifications.toasts().some((toast) => toast.message.includes('reanudó'))).toBe(true);
  });

  it('cancela una intervención asignada y avisa al usuario', () => {
    const select = fixture.nativeElement.querySelector(
      'select[aria-label="Acciones para la intervención del paso Entregar"]',
    ) as HTMLSelectElement;

    select.value = 'CANCEL';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(interventionService['updateIntervention']).toHaveBeenCalledWith('i3', {
      status: 'CANCEL',
      notes: undefined,
    });
    expect(notifications.toasts().some((toast) => toast.message.includes('canceló'))).toBe(true);
  });

  it('recarga la lista manualmente', () => {
    findButton(fixture.nativeElement, 'Recargar')!.click();

    expect(interventionService['getInterventions']).toHaveBeenCalledTimes(2);
  });

  it('colorea cada estado de intervención', () => {
    const statusBadgeClass = (component as unknown as { statusBadgeClass: (status: string) => string }).statusBadgeClass;

    expect(statusBadgeClass('PENDING')).toContain('bg-amber-100');
    expect(statusBadgeClass('IN_PROGRESS')).toContain('bg-sky-100');
    expect(statusBadgeClass('COMPLETED')).toContain('bg-green-100');
    expect(statusBadgeClass('CANCELLED')).toContain('bg-gray-100');
    expect(statusBadgeClass('OTRO')).toContain('bg-slate-100');
  });
});
