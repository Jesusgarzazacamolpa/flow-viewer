/**
 * Componente raíz de flow-viewer: aloja el layout, el router y los toasts, y
 * actúa como puente con el portal que embebe la app en un iframe.
 */
import { Component, inject, computed, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService, Theme } from './core/services/theme.service';
import { ToastContainerComponent } from './shared/toast/toast-container.component';

/** Mensaje del portal contenedor para configurar embebido, token y tema. */
interface PortalMessage {
  /** Tipo de mensaje: EMBEDDED, AUTH_TOKEN o THEME_CHANGE. */
  type?: string;
  embedded?: boolean;
  token?: string;
  theme?: Theme;
}

/**
 * Shell de la aplicación: aplica el tema, detecta el modo embebido y notifica
 * al padre cuándo el iframe está listo para recibir el token de sesión.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private readonly themeService = inject(ThemeService);

  readonly currentTheme = this.themeService.theme;

  readonly isDark = computed(() => this.currentTheme() === 'dark');

  readonly themeIcon = computed(() => (this.isDark() ? '☀️' : '🌙'));

  /** Indica si la app corre embebida en el portal. */
  protected readonly isEmbedded = signal(false);

  /** Interpreta mensajes del portal: modo embebido, token de sesión y cambios de tema. */
  private readonly messageHandler = (event: MessageEvent<PortalMessage | null>) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'EMBEDDED') {
      this.setEmbedded(data.embedded === true);
    }

    if (data.type === 'AUTH_TOKEN') {
      if (data.embedded !== undefined) {
        this.setEmbedded(data.embedded === true);
      }
      if (typeof data.token === 'string' && data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      this.notifyParentReady();
    }

    if (data.type === 'THEME_CHANGE' && (data.theme === 'dark' || data.theme === 'light')) {
      this.themeService.setTheme(data.theme);
    }
  };

  /** Activa el modo embebido y la clase `embedded` del body. */
  private setEmbedded(embedded: boolean): void {
    this.isEmbedded.set(embedded);
    document.body.classList.toggle('embedded', embedded);
  }

  /** Avisa al portal de que el iframe está listo, adjuntando el token si existe. */
  protected notifyParentReady = () => {
    const token = localStorage.getItem('auth_token');
    if (this.isEmbedded() && token) {
      window.parent.postMessage({ type: 'IFRAME_READY', token }, '*');
    } else {
      window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
    }
  };

  /** Alterna entre tema claro y oscuro. */
  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  /** Registra el listener del portal y anuncia que la app está lista. */
  ngAfterViewInit(): void {
    window.addEventListener('message', this.messageHandler);
    this.notifyParentReady();
  }

  /** Quita el listener para evitar fugas al destruir el componente. */
  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }
}
