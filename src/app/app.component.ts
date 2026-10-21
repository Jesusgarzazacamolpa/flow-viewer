import { Component, inject, computed, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private readonly themeService = inject(ThemeService);

  readonly currentTheme = this.themeService.theme;

  readonly isDark = computed(() => this.currentTheme() === 'dark');

  readonly themeIcon = computed(() => (this.isDark() ? '☀️' : '🌙'));

  private isEmbedded = false;

  private messageHandler = (event: MessageEvent) => {
    const data = event.data;
    if (!data) return;
    if (data.type === 'EMBEDDED' || (data.type === 'AUTH_TOKEN' && data.embedded !== undefined)) {
      this.isEmbedded = data.embedded === true || (data.type === 'EMBEDDED' && data.embedded === true);
      if (this.isEmbedded) {
        document.body.classList.add('embedded');
      } else {
        document.body.classList.remove('embedded');
      }
    }
    if (data.type === 'THEME_CHANGE' && data.theme) {
      this.themeService.setTheme(data.theme);
    }
    if (data.type === 'AUTH_TOKEN' && data.token) {
      localStorage.setItem('auth_token', data.token);
      this.notifyParentReady();
    }
  };

  notifyParentReady = () => {
    const token = localStorage.getItem('auth_token');
    if (this.isEmbedded && token) {
      window.parent.postMessage({ type: 'IFRAME_READY', token }, '*');
    } else {
      window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
    }
  };

  toggleTheme(): void {
    this.themeService.toggle();
  }

  ngAfterViewInit() {
    window.addEventListener('message', this.messageHandler);
    this.notifyParentReady();
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.messageHandler);
  }
}
