import {
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

/** Opción genérica del selector: valor, etiqueta visible y texto adicional para la búsqueda. */
export interface SelectOption<T> {
  value: T;
  label: string;
  searchText?: string;
}

/**
 * Selector `app-searchable-select`. Combobox con búsqueda y soporte opcional de creación de
 * opciones; implementa `ControlValueAccessor` para integrarse con formularios reactivos.
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './searchable-select.component.html',
  host: {
    class: 'block w-full',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent<T> implements ControlValueAccessor {
  /** Opciones disponibles en el desplegable. */
  readonly options = input<SelectOption<T>[]>([]);
  /** Texto mostrado cuando no hay valor seleccionado. */
  readonly placeholder = input('Seleccionar...');
  /** Campo de la opción por el que se filtra; si se omite se busca en etiqueta y `searchText`. */
  readonly searchKey = input<keyof SelectOption<T>>();
  /** Mensaje mostrado cuando el filtro no arroja resultados. */
  readonly noResultsText = input('No se encontraron resultados');
  /** Mensaje de validación mostrado bajo el control. */
  readonly errorText = input<string | null>(null);
  /** Permite crear una opción con el texto buscado cuando no existe. */
  readonly allowCreate = input(false);
  /** Deshabilita el control de forma externa, además del estado del formulario. */
  readonly disabled = input(false);
  /** Emite el texto con el que se solicita crear una nueva opción. */
  readonly createNew = output<string>();

  /** Valor seleccionado actual, sincronizado con el formulario. */
  private readonly selectedValue = signal<T | undefined>(undefined);
  /** Deshabilitado notificado por el formulario mediante `setDisabledState`. */
  protected readonly formDisabled = signal(false);
  /** Término de búsqueda escrito por el usuario. */
  protected readonly searchTerm = signal('');
  /** Indica si el desplegable está abierto. */
  protected readonly isOpen = signal(false);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly dropdownContainer = viewChild<ElementRef<HTMLDivElement>>('dropdownContainer');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /** El control está deshabilitado si lo pide el formulario o el input `disabled`. */
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** Opciones filtradas por el término de búsqueda según `searchKey` o etiqueta y `searchText`. */
  protected readonly filteredOptions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const options = this.options();
    if (!term) {
      return options;
    }
    const key = this.searchKey();
    return options.filter((option) =>
      key
        ? String(option[key]).toLowerCase().includes(term)
        : `${option.label} ${option.searchText ?? ''}`.toLowerCase().includes(term),
    );
  });

  /** Muestra la opción de crear cuando está habilitada y hay un término escrito. */
  protected readonly showCreateOption = computed(
    () => this.allowCreate() && this.searchTerm().trim().length > 0,
  );

  /** Etiqueta de la opción seleccionada; vacía si el valor no existe entre las opciones. */
  protected readonly selectedLabel = computed(() => {
    const value = this.selectedValue();
    if (value === undefined) return '';
    return this.options().find((option) => option.value === value)?.label ?? '';
  });

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  /** Escribe el valor recibido del formulario y limpia el estado si es nulo. */
  writeValue(value: T | null | undefined): void {
    this.selectedValue.set(value ?? undefined);
  }

  /** Registra el callback con el que se notifican los cambios al formulario. */
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  /** Registra el callback con el que se marca el control como tocado. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Aplica el estado deshabilitado que notifica el formulario. */
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /** Comprueba si la opción corresponde al valor seleccionado. */
  protected isSelected(option: SelectOption<T>): boolean {
    return option.value === this.selectedValue();
  }

  /** Abre o cierra el desplegable; al abrir limpia la búsqueda y enfoca el campo. */
  protected toggleDropdown(): void {
    if (this.isDisabled()) return;
    this.isOpen.update((open) => !open);
    if (this.isOpen()) {
      this.searchTerm.set('');
      setTimeout(() => this.searchInput()?.nativeElement.focus());
    } else {
      this.onTouched();
    }
  }

  /** Cierra el desplegable, limpia la búsqueda y notifica que el control fue tocado. */
  protected closeDropdown(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
  }

  /** Selecciona una opción, notifica el cambio y devuelve el foco al disparador. */
  protected selectOption(option: SelectOption<T>): void {
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
    setTimeout(() => this.trigger()?.nativeElement.focus());
  }

  /** Enfoca la primera opción del desplegable para la navegación con teclado. */
  protected focusFirstOption(): void {
    setTimeout(() => {
      const firstOption = this.dropdownContainer()?.nativeElement.querySelector<HTMLElement>('[role="option"]');
      firstOption?.focus();
    });
  }

  /** Emite el término escrito para crear una opción nueva y cierra el desplegable. */
  protected onCreate(): void {
    this.createNew.emit(this.searchTerm());
    this.closeDropdown();
  }

  /** Cierra el desplegable cuando el clic ocurre fuera de él. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownContainer()?.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  /** Cierra el desplegable con Escape y devuelve el foco al disparador. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.closeDropdown();
      this.trigger()?.nativeElement.focus();
    }
  }
}
