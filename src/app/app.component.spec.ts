import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Signal, WritableSignal, signal } from '@angular/core';
import { AppComponent } from './app.component';
import { ThemeService } from './core/services/theme.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let theme: WritableSignal<'light' | 'dark'>;
  let themeService: {
    theme: Signal<'light' | 'dark'>;
    toggle: jest.Mock;
    setTheme: jest.Mock;
  };
  let postMessage: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('embedded');
    theme = signal<'light' | 'dark'>('light');
    themeService = {
      theme: theme.asReadonly(),
      toggle: jest.fn(() => theme.update((current) => (current === 'dark' ? 'light' : 'dark'))),
      setTheme: jest.fn((next: 'light' | 'dark') => theme.set(next)),
    };
    postMessage = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: ThemeService, useValue: themeService }],
    });
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (!fixture.componentRef.hostView.destroyed) {
      fixture.destroy();
    }
    document.body.classList.remove('embedded');
  });

  it('avisa al portal que está listo al inicializar', () => {
    expect(postMessage).toHaveBeenCalledWith({ type: 'IFRAME_READY' }, '*');
  });

  it('activa el modo embebido cuando el portal lo solicita', () => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'EMBEDDED', embedded: true } }));

    expect(document.body.classList.contains('embedded')).toBe(true);

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'EMBEDDED', embedded: false } }));

    expect(document.body.classList.contains('embedded')).toBe(false);
  });

  it('guarda el token del portal y lo devuelve al confirmar disponibilidad', () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'AUTH_TOKEN', embedded: true, token: 'token-123' },
      }),
    );

    expect(localStorage.getItem('auth_token')).toBe('token-123');
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'IFRAME_READY', token: 'token-123' }, '*');
  });

  it('aplica el tema enviado por el portal e ignora valores inválidos', () => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'THEME_CHANGE', theme: 'dark' } }));
    expect(themeService.setTheme).toHaveBeenCalledWith('dark');

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'THEME_CHANGE', theme: 'azul' } }));
    expect(themeService.setTheme).toHaveBeenCalledTimes(1);
  });

  it('ignora mensajes que no son objetos', () => {
    window.dispatchEvent(new MessageEvent('message', { data: 'hola' }));
    window.dispatchEvent(new MessageEvent('message', { data: null }));

    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it('alterna el tema y refleja el icono correspondiente', () => {
    expect(fixture.nativeElement.textContent).toContain('🌙');

    (fixture.nativeElement.querySelector('button[aria-label="Cambiar a tema oscuro"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(themeService.toggle).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('☀️');
  });

  it('no muestra enlaces de navegación porque la app es una sola vista', () => {
    expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(0);
  });

  it('deja de escuchar mensajes al destruirse', () => {
    const removeListener = jest.spyOn(window, 'removeEventListener');
    fixture.destroy();

    expect(removeListener).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
