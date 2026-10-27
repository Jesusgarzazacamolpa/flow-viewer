import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>('light');
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.applyTheme(this.getStoredTheme());
  }

  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    this._theme.set(theme);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Almacenamiento no disponible (modo privado o iframe restringido); el tema sigue aplicándose en memoria.
    }
  }

  private getStoredTheme(): Theme {
    try {
      const stored = localStorage.getItem('theme');
      return stored === 'light' || stored === 'dark' ? stored : 'light';
    } catch {
      return 'light';
    }
  }
}
