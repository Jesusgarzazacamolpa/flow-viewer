import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

interface IconData {
  path: string;
  defaultClass: string;
}

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [NgClass],
  template: `<svg
    class="inline-block h-4 w-4"
    [ngClass]="[sizeClass, colorClass]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    [attr.stroke-width]="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    [attr.aria-hidden]="screenReader ? undefined : true"
  >
    <path [attr.d]="icon().path"></path>
  </svg>`,
})
export class IconComponent {
  private static readonly ICONS: Record<string, IconData> = {
    folder: {
      path: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    'folder-open': {
      path: 'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776',
      defaultClass: 'text-sky-600 dark:text-sky-400',
    },
    check: {
      path: 'm4.5 12.75 6 6 9-13.5',
      defaultClass: 'text-white',
    },
    clock: {
      path: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      defaultClass: 'text-white',
    },
    'exclamation-triangle': {
      path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
      defaultClass: 'text-white',
    },
    tag: {
      path: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z',
      defaultClass: 'text-slate-500 dark:text-slate-500',
    },
    'arrow-path': {
      path: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
      defaultClass: 'text-slate-500 dark:text-slate-500',
    },
    'arrow-left': {
      path: 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    eye: {
      path: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    user: {
      path: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    'document-text': {
      path: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    'chart-bar': {
      path: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    'book-open': {
      path: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    plus: {
      path: 'M12 4.5v15m7.5-7.5h-15',
      defaultClass: 'text-slate-600 dark:text-slate-400',
    },
    'chevron-down': {
      path: 'm19.5 8.25-7.5 7.5-7.5-7.5',
      defaultClass: 'text-slate-500 dark:text-slate-400',
    },
    'magnifying-glass': {
      path: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
      defaultClass: 'text-slate-500 dark:text-slate-400',
    },
  };

  @Input() name!: string;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
  @Input() colorClass: string = '';
  @Input() strokeWidth: number = 1.5;
  @Input() screenReader: boolean = false;

  private sizeClassMap = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  icon() {
    const entry = IconComponent.ICONS[this.name];
    return entry ?? { path: '', defaultClass: '' };
  }

  get sizeClass(): string {
    return this.sizeClassMap[this.size] ?? this.sizeClassMap.sm;
  }
}
