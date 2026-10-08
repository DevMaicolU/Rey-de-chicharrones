import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';

function recargar(): AuthService {
  TestBed.resetTestingModule();
  return TestBed.inject(AuthService);
}

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    auth = TestBed.inject(AuthService);
  });

  it('inicia sesión con credenciales correctas y devuelve la ruta según el rol', () => {
    expect(auth.login('admin', 'admin123')?.role).toBe('admin');
    expect(auth.rutaInicio).toBe('/admin');
    expect(auth.login('empleado', 'empleado123')?.role).toBe('empleado');
    expect(auth.rutaInicio).toBe('/empleado');
  });

  it('rechaza credenciales incorrectas sin cambiar la sesión', () => {
    expect(auth.login('admin', 'mala')).toBeNull();
    expect(auth.activeUser).toBeNull();
  });

  it('guarda solo el id de la sesión, nunca la contraseña', () => {
    auth.login('admin', 'admin123');
    const guardado = localStorage.getItem('manila-active-user') ?? '';
    expect(guardado).not.toContain('admin123');
    expect(JSON.parse(guardado)).toEqual({ id: 1 });
  });

  it('restaura la sesión al recargar la página', () => {
    auth.login('empleado', 'empleado123');
    expect(recargar().activeUser?.username).toBe('empleado');
  });

  it('limpia el formato antiguo de sesión que incluía la contraseña', () => {
    localStorage.setItem('manila-active-user', JSON.stringify({ id: 2, username: 'empleado', password: 'empleado123', role: 'empleado', name: 'x' }));
    expect(recargar().activeUser?.id).toBe(2);
    expect(localStorage.getItem('manila-active-user')).not.toContain('empleado123');
  });

  it('ignora la sesión guardada si el usuario ya no existe', () => {
    localStorage.setItem('manila-active-user', JSON.stringify({ id: 999 }));
    expect(recargar().activeUser).toBeNull();
  });

  it('cierra sesión y borra lo guardado', () => {
    auth.login('admin', 'admin123');
    auth.logout();
    expect(auth.activeUser).toBeNull();
    expect(localStorage.getItem('manila-active-user')).toBeNull();
  });

  it('permite entrar con un empleado recién creado incluso después de recargar', () => {
    TestBed.inject(DatabaseService).addUser({ username: 'ana', password: 'x1', name: 'Ana', role: 'empleado' });
    expect(auth.login('ana', 'x1')).not.toBeNull();
    expect(recargar().activeUser?.username).toBe('ana');
  });
});
