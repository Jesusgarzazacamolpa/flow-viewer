import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;
  let component: StatusBadgeComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StatusBadgeComponent] });
    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('normaliza el estado a mayúsculas', () => {
    component.status = 'completed';
    fixture.detectChanges();

    expect(component.status).toBe('COMPLETED');
    expect(fixture.nativeElement.textContent).toContain('Completado');
  });

  it('traduce el estado a una etiqueta legible', () => {
    component.status = 'PAUSED_FOR_HUMAN';
    expect(component.label()).toBe('Pausado para revisión');

    component.status = 'IN_PROGRESS';
    expect(component.label()).toBe('En progreso');

    component.status = '';
    expect(component.label()).toBe('Desconocido');
  });

  it.each([
    ['COMPLETED', 'bg-green-100'],
    ['FAILED', 'bg-red-100'],
    ['PAUSED_FOR_HUMAN', 'bg-amber-100'],
    ['PENDING', 'bg-slate-100'],
    ['CANCELLED', 'bg-gray-100'],
    ['RUNNING', 'bg-sky-100'],
  ])('aplica el estilo %s', (status, expectedClass) => {
    component.status = status;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(badge.className).toContain(expectedClass);
  });

  it('anima los estados en curso', () => {
    component.status = 'RUNNING';
    fixture.detectChanges();

    expect(component.isAnimated()).toBe(true);
    expect(fixture.nativeElement.querySelector('.animate-pulse')).not.toBeNull();

    component.status = 'COMPLETED';
    fixture.detectChanges();
    expect(component.isAnimated()).toBe(false);
  });

  it('asigna un icono según el estado', () => {
    expect(component.statusIconName()).toBe('clock');

    component.status = 'completed';
    expect(component.statusIconName()).toBe('check');

    component.status = 'failed';
    expect(component.statusIconName()).toBe('exclamation-triangle');

    component.status = 'paused_for_human';
    expect(component.statusIconName()).toBe('shield');
  });

  it('usa UNKNOWN cuando no recibe estado', () => {
    component.status = '';
    expect(component.status).toBe('UNKNOWN');
  });
});
