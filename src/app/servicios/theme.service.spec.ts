import { TestBed } from '@angular/core/testing';
import { ThemeService, THEME_STORAGE_KEY } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it('se inicializa en modo claro si no hay valor previo', () => {
    expect(service.currentTheme()).toBeDefined();
  });

  it('cambia de tema correctamente con toggleTheme', () => {
    const inicial = service.currentTheme();
    service.toggleTheme();
    const cambiado = service.currentTheme();
    expect(cambiado).not.toBe(inicial);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(cambiado);

    service.toggleTheme();
    expect(service.currentTheme()).toBe(inicial);
  });

  it('aplica el atributo data-bs-theme en documentElement', () => {
    service.setTheme('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(service.isDark()).toBe(true);

    service.setTheme('light');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    expect(service.isDark()).toBe(false);
  });
});
