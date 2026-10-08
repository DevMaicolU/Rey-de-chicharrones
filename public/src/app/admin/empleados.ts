import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService } from '../servicios/database.service';
import { User, UserRole } from '../entidades/modelos';

@Component({ selector: 'app-empleados', imports: [FormsModule], templateUrl: './empleados.html' })
export class Empleados {
  private readonly database = inject(DatabaseService);
  private readonly auth = inject(AuthService);

  readonly users = toSignal(this.database.users$, { initialValue: this.database.users });

  username = '';
  password = '';
  name = '';
  role: UserRole = 'empleado';
  error = '';

  esUsuarioActual(user: User): boolean {
    return user.id === this.auth.activeUser?.id;
  }

  add(): void {
    const resultado = this.database.addUser({ username: this.username, password: this.password, name: this.name, role: this.role });
    this.error = resultado.error ?? '';
    if (!resultado.ok) return;
    this.username = '';
    this.password = '';
    this.name = '';
    this.role = 'empleado';
  }

  remove(user: User): void {
    if (this.esUsuarioActual(user)) return;
    this.error = this.database.deleteUser(user.id).error ?? '';
  }
}
