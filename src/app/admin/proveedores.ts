import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, Provider } from '../servicios/database.service';

@Component({
  selector: 'app-proveedores',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './proveedores.html'
})
export class Proveedores {
  private readonly database = inject(DatabaseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly providers = toSignal(this.database.providers$, { initialValue: this.database.providers });
  readonly purchases = toSignal(this.database.purchases$, { initialValue: this.database.purchases });

  readonly providerForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    nit: ['', Validators.required],
    contactName: [''],
    phone: [''],
    email: ['', [Validators.required, Validators.email]],
    address: [''],
    notes: ['']
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    nit: ['', Validators.required],
    contactName: [''],
    phone: [''],
    email: ['', [Validators.required, Validators.email]],
    address: [''],
    notes: ['']
  });

  error = '';
  message = '';
  selectedProvider: Provider | null = null;
  editingProvider: Provider | null = null;

  // Modal de confirmación para eliminar proveedor
  providerToDelete: Provider | null = null;
  deleteModalVisible = false;

  add(): void {
    this.error = '';
    this.message = '';
    const val = this.providerForm.getRawValue();
    const cleanName = val.name.trim();
    const cleanNit = val.nit.trim();
    const cleanEmail = val.email.trim();

    if (!cleanName) {
      this.providerForm.controls.name.markAsTouched();
      this.error = 'La razón social del proveedor es obligatoria.';
      return;
    }
    if (!cleanNit) {
      this.providerForm.controls.nit.markAsTouched();
      this.error = 'El NIT del proveedor es obligatorio.';
      return;
    }
    if (!cleanEmail) {
      this.providerForm.controls.email.markAsTouched();
      this.error = 'El correo electrónico es obligatorio.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.providerForm.controls.email.markAsTouched();
      this.error = 'Ingresa un formato de correo electrónico válido (ej: contacto@empresa.com).';
      return;
    }

    const resultado = this.database.addProvider({
      ...val,
      name: cleanName,
      nit: cleanNit,
      email: cleanEmail,
      contactName: val.contactName.trim(),
      phone: val.phone.trim(),
      address: val.address.trim(),
      notes: val.notes.trim()
    });
    this.error = resultado.error ?? '';
    this.message = resultado.ok ? 'Proveedor creado correctamente.' : '';
    if (resultado.ok) this.providerForm.reset();
  }

  select(provider: Provider): void {
    this.selectedProvider = provider;
  }

  closeDetail(): void {
    this.selectedProvider = null;
  }

  edit(provider: Provider): void {
    this.editingProvider = provider;
    this.editForm.setValue({
      name: provider.name,
      nit: provider.nit,
      contactName: provider.contactName,
      phone: provider.phone,
      email: provider.email,
      address: provider.address ?? '',
      notes: provider.notes ?? ''
    });
  }

  cancelEdit(): void {
    this.editingProvider = null;
  }

  saveEdit(): void {
    if (!this.editingProvider) return;
    this.error = '';

    const val = this.editForm.getRawValue();
    const cleanName = val.name.trim();
    const cleanNit = val.nit.trim();
    const cleanEmail = val.email.trim();

    if (!cleanName) {
      this.editForm.controls.name.markAsTouched();
      this.error = 'La razón social del proveedor es obligatoria.';
      return;
    }
    if (!cleanNit) {
      this.editForm.controls.nit.markAsTouched();
      this.error = 'El NIT del proveedor es obligatorio.';
      return;
    }
    if (!cleanEmail) {
      this.editForm.controls.email.markAsTouched();
      this.error = 'El correo electrónico es obligatorio.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.editForm.controls.email.markAsTouched();
      this.error = 'Ingresa un formato de correo electrónico válido (ej: contacto@empresa.com).';
      return;
    }

    const providerId = this.editingProvider.id;
    const result = this.database.updateProvider(providerId, {
      ...val,
      name: cleanName,
      nit: cleanNit,
      email: cleanEmail,
      contactName: val.contactName.trim(),
      phone: val.phone.trim(),
      address: val.address.trim(),
      notes: val.notes.trim()
    });
    this.error = result.error ?? '';
    if (result.ok) {
      this.message = 'Proveedor actualizado correctamente.';
      this.editingProvider = null;
      this.selectedProvider = this.database.providers.find(item => item.id === providerId) ?? this.selectedProvider;
    }
  }

  purchasesFor(providerId: number) {
    return this.database.purchasesByProvider(providerId);
  }

  suppliedBy(providerId: number) {
    return this.database.suppliesOfProvider(providerId);
  }

  toggle(provider: Provider): void {
    this.database.setProviderActive(provider.id, !provider.active);
  }

  openDeleteModal(provider: Provider): void {
    this.providerToDelete = provider;
    this.deleteModalVisible = true;
  }

  closeDeleteModal(): void {
    this.providerToDelete = null;
    this.deleteModalVisible = false;
  }

  confirmDelete(): void {
    if (!this.providerToDelete) return;
    const result = this.database.deleteProvider(this.providerToDelete.id);
    this.error = result.error ?? '';
    this.message = result.ok ? 'Proveedor eliminado correctamente.' : '';
    this.closeDeleteModal();
    if (this.selectedProvider?.id === this.providerToDelete?.id) {
      this.selectedProvider = null;
    }
  }

  remove(provider: Provider): void {
    this.openDeleteModal(provider);
  }
}
