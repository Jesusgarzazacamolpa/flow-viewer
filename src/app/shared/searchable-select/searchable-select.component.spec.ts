import { Component, EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { SearchableSelectComponent, SelectOption } from './searchable-select.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SearchableSelectComponent],
  template: `
    <app-searchable-select
      [options]="options"
      [formControl]="control"
      [errorText]="errorText"
      [allowCreate]="allowCreate"
      [placeholder]="'Selecciona una opción'"
      (createNew)="created.emit($event)"
    />
  `,
})
class HostComponent {
  readonly options: SelectOption<string>[] = [
    { value: 'alpha', label: 'Alpha', searchText: 'primer valor' },
    { value: 'beta', label: 'Beta', searchText: 'segundo valor' },
    { value: 'gamma', label: 'Gamma', searchText: 'tercer valor' },
  ];
  control = new FormControl('', { nonNullable: true });
  errorText: string | null = null;
  allowCreate = false;
  readonly created = new EventEmitter<string>();
}

describe('SearchableSelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let select: SearchableSelectComponent<string>;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    select = fixture.debugElement.query(By.directive(SearchableSelectComponent))
      .componentInstance as SearchableSelectComponent<string>;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;
  }

  function open(): void {
    trigger().click();
    jest.advanceTimersByTime(0);
    fixture.detectChanges();
  }

  it('actúa como ControlValueAccessor con Reactive Forms', () => {
    expect(fixture.nativeElement.textContent).toContain('Selecciona una opción');

    host.control.setValue('beta');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Beta');

    expect(select.writeValue).toBeDefined();
    host.control.setValue('');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Selecciona una opción');
  });

  it('abre la lista y filtra por etiqueta y texto de búsqueda', () => {
    open();
    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(3);

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'gamma';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('Gamma');
  });

  it('busca también en searchText', () => {
    open();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'segundo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="option"]').textContent).toContain('Beta');
  });

  it('selecciona una opción y actualiza el formulario', () => {
    open();
    const option = fixture.nativeElement.querySelector('[role="option"]') as HTMLLIElement;
    option.click();
    jest.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(host.control.value).toBe('alpha');
    expect(fixture.nativeElement.textContent).toContain('Alpha');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('anuncia la lista vacía con el texto configurado', () => {
    open();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se encontraron resultados');
  });

  it('muestra el error de carga bajo el campo', () => {
    host.errorText = 'No pudimos cargar los clientes.';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los clientes.');
  });

  it('se deshabilita cuando el FormControl está deshabilitado', () => {
    host.control.disable();
    fixture.detectChanges();

    expect(trigger().disabled).toBe(true);
    open();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('cierra con la tecla Escape', () => {
    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    jest.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('cierra al hacer clic fuera y al hacer clic en el disparador', () => {
    open();
    document.body.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();

    open();
    trigger().click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('permite crear una opción cuando allowCreate está activo', () => {
    const created = jest.fn();
    host.created.subscribe(created);
    host.allowCreate = true;
    fixture.detectChanges();
    open();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Nuevo cliente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    );
    const createButton = buttons.find((button) => button.textContent?.includes('Crear'))!;
    createButton.click();

    expect(created).toHaveBeenCalledWith('Nuevo cliente');
  });

  it('enfoca la primera opción con ArrowDown y la selecciona con Enter', () => {
    open();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    jest.advanceTimersByTime(0);

    const firstOption = document.activeElement as HTMLElement;
    expect(firstOption.getAttribute('role')).toBe('option');
    expect(firstOption.textContent).toContain('Alpha');

    firstOption.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(host.control.value).toBe('alpha');
  });

  it('cierra sin errores cuando ya estaba cerrado', () => {
    trigger().click();
    trigger().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    expect(host.control.touched).toBe(true);
  });
});
