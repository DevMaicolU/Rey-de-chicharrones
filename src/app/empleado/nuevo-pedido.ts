import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { CartItem, CartService } from '../servicios/cart.service';
import { DatabaseService, PaymentMethod } from '../servicios/database.service';
import { FacturacionService } from '../servicios/facturacion.service';
import { OrderItem } from '../entidades/modelos';
import { IMAGEN_RESPALDO, usarImagenRespaldo } from '../util/imagen';

@Component({ selector: 'app-nuevo-pedido', imports: [CurrencyPipe, FormsModule, RouterLink], templateUrl: './nuevo-pedido.html' })
export class NuevoPedido {
  private readonly database = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly facturacion = inject(FacturacionService);

  readonly items = toSignal(this.cart.carritoActual$, { initialValue: this.cart.items });
  readonly imagenRespaldo = IMAGEN_RESPALDO;
  readonly manejarErrorImagen = usarImagenRespaldo;

  tableNumber: number | null = null;
  customerName = '';
  paymentMethod: PaymentMethod = 'efectivo';
  applyDiscount = false;
  error = '';

  total(): number { return this.cart.total(); }
  subtotal(): number { return this.cart.total(); }
  discount(): number {
    return this.facturacion.calculate(this.toOrderItems(), this.applyDiscount).discount;
  }
  totalWithDiscount(): number {
    return this.facturacion.calculate(this.toOrderItems(), this.applyDiscount).total;
  }

  cambiarCantidad(item: CartItem, cantidad: number): void {
    this.cart.cambiarCantidad(item.producto.id, cantidad);
  }

  /** Se ejecuta al terminar de editar el campo: aplica el valor y deja en pantalla la cantidad real (≥ 1, entera). */
  editarCantidad(item: CartItem, campo: HTMLInputElement): void {
    const valor = campo.valueAsNumber; // NaN si el campo está vacío: se conserva la cantidad actual
    if (!Number.isNaN(valor)) this.cart.cambiarCantidad(item.producto.id, valor);
    const actual = this.cart.items.find(i => i.producto.id === item.producto.id);
    campo.value = String(actual?.cantidad ?? item.cantidad);
  }

  eliminar(item: CartItem): void {
    this.cart.eliminarDelCarrito(item.producto.id);
  }

  finalizarPedido(): void {
    const employee = this.auth.activeUser;
    const cartItems = this.cart.items;
    const mesa = this.tableNumber;

    if (!employee || !cartItems.length) {
      this.error = 'Agrega productos al pedido antes de finalizar.';
      return;
    }
    if (mesa === null || !Number.isInteger(mesa) || mesa < 1) {
      this.error = 'Indica un número de mesa válido (entero mayor a 0).';
      return;
    }
    if (!this.customerName.trim()) {
      this.error = 'Escribe el nombre del cliente.';
      return;
    }

    const resultado = this.database.registrarVenta({
      tableNumber: mesa,
      customerName: this.customerName.trim(),
      employeeId: employee.id,
      employeeName: employee.name,
      items: this.toOrderItems(),
      paymentMethod: this.paymentMethod,
      applyDiscount: this.applyDiscount
    });
    if (!resultado.ok) {
      this.error = resultado.error ?? 'No fue posible registrar la venta.';
      return;
    }
    this.cart.limpiarCarrito();
    this.tableNumber = null;
    this.customerName = '';
    this.paymentMethod = 'efectivo';
    this.applyDiscount = false;
    this.error = '';
    this.router.navigateByUrl('/empleado/registros');
  }

  private toOrderItems(): OrderItem[] {
    return this.cart.items.map(item => ({
      productId: item.producto.id,
      productName: item.producto.name,
      quantity: item.cantidad,
      unitPrice: item.producto.price
    }));
  }
}
