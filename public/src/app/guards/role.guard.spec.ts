import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let router: Router;
  let auth: AuthService;

  const ejecutar = (rol: 'admin' | 'empleado') =>
    TestBed.runInInjectionContext(() =>
      roleGuard(rol)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  const destino = (resultado: unknown) => router.serializeUrl(resultado as UrlTree);

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });

  it('sin sesión redirige al login', () => {
    expect(destino(ejecutar('admin'))).toBe('/login');
  });

  it('permite el acceso con el rol correcto', () => {
    auth.login('admin', 'admin123');
    expect(ejecutar('admin')).toBe(true);
  });

  it('con otro rol redirige al área propia (no al login)', () => {
    auth.login('empleado', 'empleado123');
    expect(destino(ejecutar('admin'))).toBe('/empleado');
    auth.login('admin', 'admin123');
    expect(destino(ejecutar('empleado'))).toBe('/admin');
  });
});
