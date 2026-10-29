import {
  isProcessFailed,
  isProcessInProgress,
  isProcessPaused,
  normalizeProcessStatus,
  progressToneClass,
  resolveProgressLabel,
  resolveProgressTone,
} from './process-status.model';

describe('process-status model', () => {
  it('normaliza el estado a mayúsculas y descarta vacíos', () => {
    expect(normalizeProcessStatus(' in_progress ')).toBe('IN_PROGRESS');
    expect(normalizeProcessStatus('')).toBeNull();
    expect(normalizeProcessStatus(null)).toBeNull();
    expect(normalizeProcessStatus(undefined)).toBeNull();
  });

  it('detecta ejecución, pausa y fallo', () => {
    expect(isProcessInProgress('RUNNING')).toBe(true);
    expect(isProcessInProgress('in_progress')).toBe(true);
    expect(isProcessInProgress('COMPLETED')).toBe(false);
    expect(isProcessPaused('PAUSED_FOR_HUMAN')).toBe(true);
    expect(isProcessFailed('FAILED')).toBe(true);
    expect(isProcessFailed('error')).toBe(true);
    expect(isProcessFailed('CANCELLED')).toBe(false);
  });

  it('resuelve el tono del progreso según el estado', () => {
    expect(resolveProgressTone('COMPLETED')).toBe('success');
    expect(resolveProgressTone('FAILED')).toBe('danger');
    expect(resolveProgressTone('CANCELLED')).toBe('danger');
    expect(resolveProgressTone('PAUSED_FOR_HUMAN')).toBe('warning');
    expect(resolveProgressTone('IN_PROGRESS')).toBe('info');
    expect(resolveProgressTone('PENDING')).toBe('muted');
    expect(resolveProgressTone(null)).toBe('muted');
    expect(progressToneClass('warning')).toBe('text-amber-500');
  });

  it('resuelve la etiqueta del progreso según el estado', () => {
    expect(resolveProgressLabel('COMPLETED', 2, 2)).toBe('¡Proceso completado!');
    expect(resolveProgressLabel('FAILED', 1, 2)).toBe('Falló el proceso');
    expect(resolveProgressLabel('CANCELLED', 1, 2)).toBe('Proceso cancelado');
    expect(resolveProgressLabel('PAUSED_FOR_HUMAN', 1, 2)).toBe(
      '1 de 2 pasos · En espera de intervención',
    );
    expect(resolveProgressLabel('PENDING', 0, 2)).toBe('Pendiente de iniciar');
    expect(resolveProgressLabel('IN_PROGRESS', 1, 2)).toBe('1 de 2 pasos completados');
  });
});
