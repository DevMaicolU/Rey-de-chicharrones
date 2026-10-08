import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../entidades/modelos';
import { DatabaseService } from './database.service';

const CLAVE_SESION = 'manila-active-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly database = inject(DatabaseService);
  private readonly activeUserSubject = new BehaviorSubject<User | null>(this.leerSesion());
  readonly activeUser$ = this.activeUserSubject.asObservable();

  get activeUser(): User | null { return this.activeUserSubject.value; }

  /** Ruta de inicio según el rol del usuario con sesión activa. */
  get rutaInicio(): string {
    return this.activeUser?.role === 'admin' ? '/admin' : '/empleado';
  }

  login(username: string, password: string): User | null {
    const user = this.database.findUser(username, password);
    if (!user) return null;
    this.activeUserSubject.next(user);
    this.guardarSesion(user.id);
    return user;
  }

  logout(): void {
    this.activeUserSubject.next(null);
    try { localStorage.removeItem(CLAVE_SESION); } catch { /* almacenamiento no disponible */ }
  }

  hasRole(role: User['role']): boolean {
    return this.activeUser?.role === role;
  }

  /** Solo se guarda el id de la sesión (nunca la contraseña); el usuario se vuelve a leer de la base de datos. */
  private guardarSesion(id: number): void {
    try { localStorage.setItem(CLAVE_SESION, JSON.stringify({ id })); } catch { /* almacenamiento no disponible */ }
  }

  private leerSesion(): User | null {
    try {
      const guardado = localStorage.getItem(CLAVE_SESION);
      if (!guardado) return null;
      const id = (JSON.parse(guardado) as { id?: unknown }).id;
      const user = typeof id === 'number' ? this.database.findUserById(id) ?? null : null;
      if (user) this.guardarSesion(user.id); // limpia sesiones antiguas que incluían la contraseña
      return user;
    } catch {
      return null;
    }
  }
}
