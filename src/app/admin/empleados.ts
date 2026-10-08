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
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.error = 'Completa todos los campos con valores válidos.';
      return;
    }

    const value = this.createForm.getRawValue();
    const result = this.database.addUser(value);
    if (!result.ok) {
      this.error = result.error ?? 'No fue posible registrar el usuario.';
      return;
    }

    this.message = 'Usuario registrado correctamente.';
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
  }

  updateUser(): void {
    if (!this.selectedUser) return;
    this.editError = '';
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.editError = 'Completa el nombre y usa una contraseña válida si deseas cambiarla.';
      return;
    }

    const value = this.editForm.getRawValue();
    const result = this.database.updateUser(this.selectedUser.id, {
      name: value.name,
      role: value.role,
      ...(value.password ? { password: value.password } : {})
    });
    if (!result.ok) {
      this.editError = result.error ?? 'No fue posible actualizar el usuario.';
      return;
    }

    this.message = 'Usuario actualizado correctamente.';
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
