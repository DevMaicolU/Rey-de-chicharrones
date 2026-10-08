import { Injectable } from '@angular/core';
import { OrderItem } from '../entidades/modelos';
import type { PaymentMethod } from './database.service';

export const DESCUENTO_CLIENTE_FRECUENTE = 0.10;

export interface InvoiceCalculation {
  subtotal: number;
  discount: number;
  total: number;
  discountApplied: boolean;
}

@Injectable({ providedIn: 'root' })
export class FacturacionService {
  calculate(items: readonly OrderItem[], applyDiscount: boolean): InvoiceCalculation {
    const subtotal = this.roundCurrency(items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    ));
    const discount = applyDiscount
      ? this.roundCurrency(subtotal * DESCUENTO_CLIENTE_FRECUENTE)
      : 0;

    return {
      subtotal,
      discount,
      total: this.roundCurrency(subtotal - discount),
      discountApplied: applyDiscount
    };
  }

  isPaymentMethod(value: unknown): value is PaymentMethod {
    return value === 'efectivo' || value === 'crédito' || value === 'nequi' || value === 'pse';
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
