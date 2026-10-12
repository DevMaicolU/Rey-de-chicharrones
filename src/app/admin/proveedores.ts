import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, Provider } from '../servicios/database.service';

@Component({ selector: 'app-proveedores', imports: [ReactiveFormsModule, CurrencyPipe, DatePipe], templateUrl: './proveedores.html' })
export class Proveedores {
  private readonly database = inject(DatabaseService);
  private readonly formBuilder = inject(FormBuilder);
  readonly providers = toSignal(this.database.providers$, { initialValue: this.database.providers });
  readonly purchases = toSignal(this.database.purchases$, { initialValue: this.database.purchases });
  readonly providerForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required], nit: ['', Validators.required], contactName: [''],
    phone: [''], email: ['', [Validators.required, Validators.email]], address: [''], notes: ['']
  });
  readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required], nit: ['', Validators.required], contactName: [''],
    phone: [''], email: ['', [Validators.required, Validators.email]], address: [''], notes: ['']
  });

  error = '';
  message = '';
  selectedProvider: Provider | null = null;
  editingProvider: Provider | null = null;

  add(): void {
    const resultado = this.database.addProvider(this.providerForm.getRawValue());
    this.error = resultado.error ?? '';
    this.message = resultado.ok ? 'Proveedor creado correctamente.' : '';
    if (resultado.ok) this.providerForm.reset();
  }

  select(provider: Provider): void { this.selectedProvider = provider; }
  edit(provider: Provider): void {
    this.editingProvider = provider;
    this.editForm.setValue({
      name: provider.name, nit: provider.nit, contactName: provider.contactName,
      phone: provider.phone, email: provider.email, address: provider.address ?? '', notes: provider.notes ?? ''
    });
  }
  cancelEdit(): void { this.editingProvider = null; }
  saveEdit(): void {
    if (!this.editingProvider || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.error = 'Completa los datos obligatorios del proveedor.';
      return;
    }
    const providerId = this.editingProvider.id;
    const result = this.database.updateProvider(providerId, this.editForm.getRawValue());
    this.error = result.error ?? '';
    if (result.ok) {
      this.message = 'Proveedor actualizado correctamente.';
      this.editingProvider = null;
      this.selectedProvider = this.database.providers.find(item => item.id === providerId) ?? this.selectedProvider;
    }
  }
  purchasesFor(providerId: number) { return this.database.purchasesByProvider(providerId); }
  suppliedBy(providerId: number) { return this.database.suppliesOfProvider(providerId); }
  toggle(provider: Provider): void { this.database.setProviderActive(provider.id, !provider.active); }
  remove(provider: Provider): void {
    const result = this.database.deleteProvider(provider.id);
    this.error = result.error ?? '';
  }
}
