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

export interface SelectOption<T> {
  value: T;
  label: string;
  searchText?: string;
}

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
  readonly options = input<SelectOption<T>[]>([]);
  readonly placeholder = input('Seleccionar...');
  readonly searchKey = input<keyof SelectOption<T>>();
  readonly noResultsText = input('No se encontraron resultados');
  readonly errorText = input<string | null>(null);
  readonly allowCreate = input(false);
  readonly disabled = input(false);
  readonly createNew = output<string>();

  private readonly selectedValue = signal<T | undefined>(undefined);
  protected readonly formDisabled = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly isOpen = signal(false);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly dropdownContainer = viewChild<ElementRef<HTMLDivElement>>('dropdownContainer');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

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

  protected readonly showCreateOption = computed(
    () => this.allowCreate() && this.searchTerm().trim().length > 0,
  );

  protected readonly selectedLabel = computed(() => {
    const value = this.selectedValue();
    if (value === undefined) return '';
    return this.options().find((option) => option.value === value)?.label ?? '';
  });

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T | null | undefined): void {
    this.selectedValue.set(value ?? undefined);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected isSelected(option: SelectOption<T>): boolean {
    return option.value === this.selectedValue();
  }

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

  protected closeDropdown(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
  }

  protected selectOption(option: SelectOption<T>): void {
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
    setTimeout(() => this.trigger()?.nativeElement.focus());
  }

  protected focusFirstOption(): void {
    setTimeout(() => {
      const firstOption = this.dropdownContainer()?.nativeElement.querySelector<HTMLElement>('[role="option"]');
      firstOption?.focus();
    });
  }

  protected onCreate(): void {
    this.createNew.emit(this.searchTerm());
    this.closeDropdown();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownContainer()?.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.closeDropdown();
      this.trigger()?.nativeElement.focus();
    }
  }
}
