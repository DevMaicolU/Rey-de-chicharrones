import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, PurchaseItem, UnitOfMeasure } from '../servicios/database.service';

@Component({ selector: 'app-compras', imports: [ReactiveFormsModule, CurrencyPipe, DatePipe], templateUrl: './compras.html' })
export class Compras {
  private readonly database = inject(DatabaseService);
  private readonly builder = inject(FormBuilder);
  readonly providers = toSignal(this.database.providers$, { initialValue: this.database.providers });
  readonly supplies = toSignal(this.database.supplies$, { initialValue: this.database.supplies });
  readonly purchases = toSignal(this.database.purchases$, { initialValue: this.database.purchases });
  readonly form = this.builder.nonNullable.group({
    providerId: [0, Validators.min(1)], date: [new Date().toISOString().slice(0, 10), Validators.required],
    invoiceNumber: [''], notes: [''],
    items: this.builder.array([this.createLine()])
  });
  error = '';
  message = '';

  get lines(): FormArray { return this.form.controls.items; }
  private createLine() {
    return this.builder.nonNullable.group({ supplyCode: ['', Validators.required], packages: [1, [Validators.required, Validators.min(0.001)]], unitsPerPackage: [1, [Validators.required, Validators.min(0.001)]], packageCost: [0, [Validators.required, Validators.min(0)]] });
  }
  addLine(): void { this.lines.push(this.createLine()); }
  removeLine(index: number): void { if (this.lines.length > 1) this.lines.removeAt(index); }
  unit(code: string): UnitOfMeasure | '' { return this.supplies().find(item => item.code === code)?.unitOfMeasure ?? ''; }
  lineTotal(index: number): number { const value = this.lines.at(index).getRawValue(); return value.packages * value.packageCost; }
  total(): number { return this.lines.controls.reduce((sum, _, index) => sum + this.lineTotal(index), 0); }
  receive(purchaseId: number): void {
    const result = this.database.receivePurchase(purchaseId);
    this.error = result.error ?? '';
    this.message = result.ok ? 'Compra recibida y existencias actualizadas.' : '';
  }
  cancel(purchaseId: number): void {
    const result = this.database.cancelPurchase(purchaseId);
    this.error = result.error ?? '';
    this.message = result.ok ? 'Pedido anulado correctamente.' : '';
  }
  save(receiveNow: boolean): void {
    this.error = ''; this.message = '';
    if (this.form.invalid || !this.lines.length) { this.form.markAllAsTouched(); this.error = 'Completa el proveedor y las líneas de compra.'; return; }
    const value = this.form.getRawValue();
    const items: PurchaseItem[] = value.items.map(item => ({ ...item, supplyName: '', unitOfMeasure: this.unit(item.supplyCode) || 'unidades', baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0 }));
    const result = this.database.createPurchase({ providerId: value.providerId, date: new Date(`${value.date}T00:00:00`).toISOString(), invoiceNumber: value.invoiceNumber || undefined, notes: value.notes || undefined, items }, receiveNow);
    if (!result.ok) { this.error = result.error ?? 'No fue posible guardar la compra.'; return; }
    this.message = receiveNow ? 'Compra recibida y stock actualizado.' : 'Pedido guardado correctamente.';
    this.form.reset({ providerId: 0, date: new Date().toISOString().slice(0, 10), invoiceNumber: '', notes: '' });
    this.lines.clear(); this.addLine();
  }
}
