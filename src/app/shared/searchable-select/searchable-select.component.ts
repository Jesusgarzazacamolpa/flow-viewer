import { Component, Input, Output, EventEmitter, signal, computed, input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption<T> {
  value: T;
  label: string;
  searchText?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  host: {
    class: 'block w-full'
  }
})
export class SearchableSelectComponent<T> {
  readonly options = input<SelectOption<T>[]>([]);
  readonly placeholder = input('Seleccionar...');
  readonly searchKey = input<keyof SelectOption<T>>();
  readonly noResultsText = input('No se encontraron resultados');
  readonly allowCreate = input(false);
  readonly disabled = input(false);

  /** Internal signal holding the current selected value */
  private readonly _selectedValue = signal<T | undefined>(undefined);
  readonly selectedValue = this._selectedValue.asReadonly();

  /**
   * Input value — updates internal state and stays in sync with parent two-way binding.
   */
  @Input()
  set value(val: T | undefined) {
    this._selectedValue.set(val);
  }
  get value(): T | undefined {
    return this._selectedValue();
  }

  @Output() valueChange = new EventEmitter<T>();
  @Output() createNew = new EventEmitter<string>();

  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef<HTMLDivElement>;

  protected readonly searchTerm = signal('');
  protected readonly isOpen = signal(false);

  protected readonly filteredOptions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const opts = this.options();
    if (!term) {
      return opts;
    }
    const key = this.searchKey();
    return opts.filter(opt =>
      key ? String(opt[key]).toLowerCase().includes(term) : opt.label.toLowerCase().includes(term)
    );
  });

  protected readonly showCreateOption = computed(() => this.allowCreate() && this.searchTerm().trim().length > 0);

  protected readonly selectedLabel = computed(() => {
    const v = this._selectedValue();
    if (v === undefined) return '';
    const opt = this.options().find(o => o.value === v);
    return opt?.label ?? '';
  });

  protected isSelected(option: SelectOption<T>): boolean {
    return option.value === this._selectedValue();
  }

  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.searchTerm.set('');
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
  }

   selectOption(option: SelectOption<T>): void {
     this._selectedValue.set(option.value);
     this.valueChange.emit(option.value);
     this.closeDropdown();
   }

  focusFirstOption(): void {
    setTimeout(() => {
      const firstOption = document.querySelector('[role="option"]') as HTMLElement | null;
      firstOption?.focus();
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownContainer?.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  trackByValue(index: number, option: SelectOption<T>): T {
    return option.value;
  }
}
