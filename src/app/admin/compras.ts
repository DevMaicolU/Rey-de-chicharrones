import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, PurchaseItem, UnitOfMeasure } from '../servicios/database.service';

export interface PurchaseLineForm {
  supplyCode: FormControl<string>;
  packages: FormControl<number>;
  unitsPerPackage: FormControl<number>;
  packageCost: FormControl<number>;
}

@Component({
  selector: 'app-compras',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './compras.html'
})
export class Compras {
  private readonly database = inject(DatabaseService);
  private readonly builder = inject(FormBuilder);

  readonly providers = toSignal(this.database.providers$, { initialValue: this.database.providers });
  readonly supplies = toSignal(this.database.supplies$, { initialValue: this.database.supplies });
  readonly purchases = toSignal(this.database.purchases$, { initialValue: this.database.purchases });

  readonly form = this.builder.nonNullable.group({
    providerId: [0, Validators.min(1)],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    invoiceNumber: [''],
    notes: [''],
    items: this.builder.array<FormGroup<PurchaseLineForm>>([this.createLine()])
  });

  error = '';
  message = '';

  // Modal de confirmación para acciones del sistema (sin window.confirm ni console.log)
  purchaseModal: {
    purchaseId: number;
    action: 'receive' | 'cancel';
    title: string;
    message: string;
    confirmText: string;
    confirmClass: string;
  } | null = null;

  get lines(): FormArray<FormGroup<PurchaseLineForm>> {
    return this.form.controls.items;
  }

  private createLine(): FormGroup<PurchaseLineForm> {
    return this.builder.nonNullable.group<PurchaseLineForm>({
      supplyCode: this.builder.nonNullable.control('', [Validators.required]),
      packages: this.builder.nonNullable.control(1, [Validators.required, Validators.min(0.001)]),
      unitsPerPackage: this.builder.nonNullable.control(1, [Validators.required, Validators.min(0.001)]),
      packageCost: this.builder.nonNullable.control(0, [Validators.required, Validators.min(0)])
    });
  }

  addLine(): void {
    this.lines.push(this.createLine());
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) {
      this.lines.removeAt(index);
    }
  }

  unit(code?: string): UnitOfMeasure | '' {
    if (!code) return '';
    return this.supplies().find(item => item.code === code)?.unitOfMeasure ?? '';
  }

  lineTotal(line: any): number {
    const val = line?.getRawValue ? line.getRawValue() : line?.value;
    const packages = Number(val?.packages) || 0;
    const cost = Number(val?.packageCost) || 0;
    return Math.max(0, packages * cost);
  }

  total(): number {
    return this.lines.controls.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  openReceiveConfirm(purchaseId: number): void {
    this.purchaseModal = {
      purchaseId,
      action: 'receive',
      title: 'Confirmar recepción de compra',
      message: '¿Estás seguro de recibir esta compra? Esta acción aumentará de inmediato las existencias de insumos en el inventario.',
      confirmText: 'Sí, recibir compra',
      confirmClass: 'btn-success'
    };
  }

  openCancelConfirm(purchaseId: number): void {
    this.purchaseModal = {
      purchaseId,
      action: 'cancel',
      title: 'Confirmar anulación de compra',
      message: '¿Estás seguro de anular esta compra? El pedido quedará cancelado permanentemente y no se podrá recibir en el futuro.',
      confirmText: 'Sí, anular compra',
      confirmClass: 'btn-danger'
    };
  }

  closePurchaseModal(): void {
    this.purchaseModal = null;
  }

  confirmPurchaseAction(): void {
    if (!this.purchaseModal) return;
    const { purchaseId, action } = this.purchaseModal;
    if (action === 'receive') {
      const result = this.database.receivePurchase(purchaseId);
      this.error = result.error ?? '';
      this.message = result.ok ? 'Compra recibida y existencias actualizadas en el inventario.' : '';
    } else {
      const result = this.database.cancelPurchase(purchaseId);
      this.error = result.error ?? '';
      this.message = result.ok ? 'Pedido anulado correctamente.' : '';
    }
    this.closePurchaseModal();
  }

  // Alias para retrocompatibilidad
  receive(purchaseId: number): void {
    this.openReceiveConfirm(purchaseId);
  }

  cancel(purchaseId: number): void {
    this.openCancelConfirm(purchaseId);
  }

  save(receiveNow: boolean): void {
    this.error = '';
    this.message = '';
    if (this.form.invalid || !this.lines.length) {
      this.form.markAllAsTouched();
      this.error = 'Completa el proveedor y las líneas de compra con valores válidos.';
      return;
    }
    const value = this.form.getRawValue();
    const items: PurchaseItem[] = value.items.map(item => ({
      ...item,
      supplyName: '',
      unitOfMeasure: this.unit(item.supplyCode) || 'unidades',
      baseQuantity: 0,
      costPerBaseUnit: 0,
      subtotal: 0
    }));

    const result = this.database.createPurchase(
      {
        providerId: value.providerId,
        date: new Date(`${value.date}T00:00:00`).toISOString(),
        invoiceNumber: value.invoiceNumber || undefined,
        notes: value.notes || undefined,
        items
      },
      receiveNow
    );

    if (!result.ok) {
      this.error = result.error ?? 'No fue posible guardar la compra.';
      return;
    }

    this.message = receiveNow ? 'Compra recibida y stock actualizado.' : 'Pedido guardado correctamente.';
    this.form.reset({ providerId: 0, date: new Date().toISOString().slice(0, 10), invoiceNumber: '', notes: '' });
    this.lines.clear();
    this.addLine();
  }
}
