import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService } from '../servicios/database.service';
import { User, UserRole } from '../entidades/modelos';

@Component({
  selector: 'app-empleados',
  imports: [ReactiveFormsModule],
  templateUrl: './empleados.html'
})
export class Empleados {
  private readonly database = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly users = toSignal(this.database.users$, { initialValue: this.database.users });

  readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['empleado' as UserRole, Validators.required]
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.minLength(6)]],
    role: ['empleado' as UserRole, Validators.required]
  });

  createModalVisible = false;
  editModalVisible = false;
  deleteModalVisible = false;
  selectedUser: User | null = null;
  error = '';
  message = '';
  editError = '';
  deleteError = '';

  esUsuarioActual(user: User): boolean {
    return user.id === this.auth.activeUser?.id;
  }

  openCreateModal(): void {
    this.error = '';
    this.createForm.reset({ name: '', username: '', password: '', role: 'empleado' });
    this.createModalVisible = true;
  }

  closeCreateModal(): void {
    this.createModalVisible = false;
  }

  createUser(): void {
    this.error = '';
    const value = this.createForm.getRawValue();
    const cleanName = value.name.trim();
    const cleanUsername = value.username.trim();

    if (!cleanName) {
      this.createForm.controls.name.markAsTouched();
      this.error = 'El nombre completo del usuario es obligatorio.';
      return;
    }
    if (!cleanUsername) {
      this.createForm.controls.username.markAsTouched();
      this.error = 'El nombre de usuario es obligatorio.';
      return;
    }
    if (!value.password || value.password.length < 6) {
      this.createForm.controls.password.markAsTouched();
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.users().some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      this.error = `Ya existe un usuario con el nombre de usuario "${cleanUsername}".`;
      return;
    }

    const result = this.database.addUser({
      name: cleanName,
      username: cleanUsername,
      password: value.password,
      role: value.role
    });

    if (!result.ok) {
      this.error = result.error ?? 'No fue posible registrar el usuario.';
      return;
    }

    this.message = `Usuario "${cleanName}" registrado correctamente.`;
    this.closeCreateModal();
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editError = '';
    this.editForm.reset({ name: user.name, password: '', role: user.role });
    this.editModalVisible = true;
  }

  closeEditModal(): void {
    this.editModalVisible = false;
    this.selectedUser = null;
    this.editError = '';
  }

  updateUser(): void {
    if (!this.selectedUser) return;
    this.editError = '';

    const value = this.editForm.getRawValue();
    const cleanName = value.name.trim();

    if (!cleanName) {
      this.editForm.controls.name.markAsTouched();
      this.editError = 'El nombre completo del usuario es obligatorio.';
      return;
    }
    if (value.password && value.password.length < 6) {
      this.editForm.controls.password.markAsTouched();
      this.editError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    const result = this.database.updateUser(this.selectedUser.id, {
      name: cleanName,
      role: value.role,
      ...(value.password ? { password: value.password } : {})
    });
    if (!result.ok) {
      this.editError = result.error ?? 'No fue posible actualizar el usuario.';
      return;
    }

    this.message = `Usuario "${cleanName}" actualizado correctamente.`;
    this.closeEditModal();
  }

  openDeleteModal(user: User): void {
    if (this.esUsuarioActual(user)) {
      this.deleteError = 'No puedes eliminar la cuenta que está en uso.';
      return;
    }
    this.selectedUser = user;
    this.deleteError = '';
    this.deleteModalVisible = true;
  }

  closeDeleteModal(): void {
    this.deleteModalVisible = false;
    this.selectedUser = null;
  }

  confirmDelete(): void {
    if (!this.selectedUser) return;
    const result = this.database.deleteUser(this.selectedUser.id);
    if (!result.ok) {
      this.deleteError = result.error ?? 'No fue posible eliminar el usuario.';
      return;
    }

    this.message = 'Usuario eliminado correctamente.';
    this.closeDeleteModal();
  }
}
