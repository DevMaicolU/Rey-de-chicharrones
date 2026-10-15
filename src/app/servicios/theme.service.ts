import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'royalsoft-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly _theme = signal<AppTheme>(this.getInitialTheme());
  readonly currentTheme = this._theme.asReadonly();
  readonly isDark = signal<boolean>(this._theme() === 'dark');

  constructor() {
    this.applyTheme(this._theme());
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this._theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: AppTheme): void {
    this._theme.set(theme);
    this.isDark.set(theme === 'dark');
    this.applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Evitar errores en contextos de navegación restringida o privada
    }
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.body?.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      document.body?.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.body?.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      document.body?.classList.remove('dark-theme');
    }
  }

  private getInitialTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // En caso de excepción, usar valor por defecto
    }
    return 'light';
  }
}
