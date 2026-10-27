import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastOptions {
  title?: string;
  reference?: string;
  duration?: number;
  action?: ToastAction;
}

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
  reference?: string;
  duration: number;
  action?: ToastAction;
}

const DEFAULT_DURATIONS: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly _toasts = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.clear());
  }

  success(message: string, options: ToastOptions = {}): number {
    return this.push('success', message, options);
  }

  error(message: string, options: ToastOptions = {}): number {
    return this.push('error', message, options);
  }

  warning(message: string, options: ToastOptions = {}): number {
    return this.push('warning', message, options);
  }

  info(message: string, options: ToastOptions = {}): number {
    return this.push('info', message, options);
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  runAction(id: number): void {
    const toast = this._toasts().find((item) => item.id === id);
    this.dismiss(id);
    toast?.action?.run();
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this._toasts.set([]);
  }

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
