import { Injectable, signal } from '@angular/core';

/** Temas soportados por la aplicación. */
export type Theme = 'dark' | 'light';

/**
 * Gestiona el tema claro/oscuro: signal `theme`, clases `dark`/`light` en
 * `<html>` y persistencia en localStorage (con fallback en memoria).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>('light');
  /** Tema activo, expuesto como signal de solo lectura. */
  readonly theme = this._theme.asReadonly();

  /** Aplica el tema guardado (o claro por defecto) al arrancar. */
  constructor() {
    this.applyTheme(this.getStoredTheme());
  }

  /** Alterna entre tema oscuro y claro. */
  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  /** Establece el tema indicado y lo aplica al documento. */
  setTheme(theme: Theme): void {
    this._theme.set(theme);
    this.applyTheme(theme);
  }

  /** Actualiza el signal, las clases del `<html>` y la preferencia persistida. */
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

  /** Lee el tema persistido y cae a claro si no es válido o el almacenamiento falla. */
  private getStoredTheme(): Theme {
    try {
      const stored = localStorage.getItem('theme');
      return stored === 'light' || stored === 'dark' ? stored : 'light';
    } catch {
      return 'light';
    }
  }
}
