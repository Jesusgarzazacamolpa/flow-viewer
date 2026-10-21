import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>('light');
  readonly theme = this._theme.asReadonly();

  constructor() {
    const stored = this.getStoredTheme();
    this._theme.set(stored);
    this.applyTheme(stored);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }

  private getStoredTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
  }

  toggle(): void {
    const newTheme = this._theme() === 'dark' ? 'light' as Theme : 'dark' as Theme;
    this._theme.set(newTheme);
    this.applyTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    this.applyTheme(theme);
  }
}

