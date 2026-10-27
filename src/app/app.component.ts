import { Component, inject, computed, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService, Theme } from './core/services/theme.service';
import { ToastContainerComponent } from './shared/toast/toast-container.component';

interface PortalMessage {
  type?: string;
  embedded?: boolean;
  token?: string;
  theme?: Theme;
}

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

  protected readonly isEmbedded = signal(false);

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

  private setEmbedded(embedded: boolean): void {
    this.isEmbedded.set(embedded);
    document.body.classList.toggle('embedded', embedded);
  }

  protected notifyParentReady = () => {
    const token = localStorage.getItem('auth_token');
    if (this.isEmbedded() && token) {
      window.parent.postMessage({ type: 'IFRAME_READY', token }, '*');
    } else {
      window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
    }
  };

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  ngAfterViewInit(): void {
    window.addEventListener('message', this.messageHandler);
    this.notifyParentReady();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }
}
