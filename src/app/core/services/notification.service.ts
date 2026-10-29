import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Tono visual y semántico de un toast. */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';

/** Acción ejecutable desde el toast (por ejemplo, reintentar una petición). */
export interface ToastAction {
  label: string;
  run: () => void;
}

/** Opciones para personalizar un toast; `duration` en ms, 0 lo deja fijo. */
export interface ToastOptions {
  title?: string;
  reference?: string;
  duration?: number;
  action?: ToastAction;
}

/** Toast ya encolado, con id, tono y contenido resueltos. */
export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
  reference?: string;
  duration: number;
  action?: ToastAction;
}

/** Duración por defecto de cada tono: los errores permanecen más tiempo. */
const DEFAULT_DURATIONS: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

/**
 * Cola global de toasts en memoria: expone la lista reactiva, programa el
 * cierre automático de cada aviso y limpia los temporizadores al destruirse.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly _toasts = signal<Toast[]>([]);
  private nextId = 1;

  /** Toasts visibles, en orden de llegada. */
  readonly toasts = this._toasts.asReadonly();

  /** Cancela los temporizadores pendientes al destruir el servicio. */
  constructor() {
    this.destroyRef.onDestroy(() => this.clear());
  }

  /** Encola un toast de éxito y devuelve su id. */
  success(message: string, options: ToastOptions = {}): number {
    return this.push('success', message, options);
  }

  /** Encola un toast de error y devuelve su id. */
  error(message: string, options: ToastOptions = {}): number {
    return this.push('error', message, options);
  }

  /** Encola un toast de advertencia y devuelve su id. */
  warning(message: string, options: ToastOptions = {}): number {
    return this.push('warning', message, options);
  }

  /** Encola un toast informativo y devuelve su id. */
  info(message: string, options: ToastOptions = {}): number {
    return this.push('info', message, options);
  }

  /** Quita el toast indicado y cancela su temporizador. */
  dismiss(id: number): void {
    this.clearTimer(id);
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Ejecuta la acción del toast (por ejemplo, reintentar) y lo descarta. */
  runAction(id: number): void {
    const toast = this._toasts().find((item) => item.id === id);
    this.dismiss(id);
    toast?.action?.run();
  }

  /** Vacía todos los toasts y sus temporizadores. */
  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this._toasts.set([]);
  }

  /** Crea el toast con la duración del tono o la indicada y programa su cierre. */
  private push(tone: ToastTone, message: string, options: ToastOptions): number {
    const id = this.nextId++;
    const duration = options.duration ?? DEFAULT_DURATIONS[tone];
    const toast: Toast = {
      id,
      tone,
      title: options.title ?? this.defaultTitle(tone),
      message,
      reference: options.reference,
      duration,
      action: options.action,
    };

    this._toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }

    return id;
  }

  private defaultTitle(tone: ToastTone): string {
    switch (tone) {
      case 'success':
        return 'Listo';
      case 'warning':
        return 'Atención';
      case 'info':
        return 'Información';
      default:
        return 'No pudimos completar la acción';
    }
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
