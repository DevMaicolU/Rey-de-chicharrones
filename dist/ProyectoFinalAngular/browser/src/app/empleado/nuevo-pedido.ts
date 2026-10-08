import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { CartItem, CartService } from '../servicios/cart.service';
import { DatabaseService } from '../servicios/database.service';
import { OrderItem } from '../entidades/modelos';
import { IMAGEN_RESPALDO, usarImagenRespaldo } from '../util/imagen';

@Component({ selector: 'app-nuevo-pedido', imports: [CurrencyPipe, FormsModule, RouterLink], templateUrl: './nuevo-pedido.html' })
export class NuevoPedido {
  private readonly database = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly items = toSignal(this.cart.carritoActual$, { initialValue: this.cart.items });
  readonly imagenRespaldo = IMAGEN_RESPALDO;
  readonly manejarErrorImagen = usarImagenRespaldo;

  tableNumber: number | null = null;
  customerName = '';
  error = '';

  total(): number { return this.cart.total(); }

  cambiarCantidad(item: CartItem, cantidad: number): void {
    this.cart.cambiarCantidad(item.producto.idApi, cantidad);
  }

  /** Se ejecuta al terminar de editar el campo: aplica el valor y deja en pantalla la cantidad real (≥ 1, entera). */
  editarCantidad(item: CartItem, campo: HTMLInputElement): void {
    const valor = campo.valueAsNumber; // NaN si el campo está vacío: se conserva la cantidad actual
    if (!Number.isNaN(valor)) this.cart.cambiarCantidad(item.producto.idApi, valor);
    const actual = this.cart.items.find(i => i.producto.idApi === item.producto.idApi);
    campo.value = String(actual?.cantidad ?? item.cantidad);
  }

  eliminar(item: CartItem): void {
    this.cart.eliminarDelCarrito(item.producto.idApi);
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

    const items: OrderItem[] = cartItems.map(item => ({
      productId: item.producto.idApi,
      productName: item.producto.name,
      quantity: item.cantidad,
      unitPrice: item.producto.price
    }));

    this.database.addOrder({
      tableNumber: mesa,
      customerName: this.customerName.trim(),
      employeeId: employee.id,
      employeeName: employee.name,
      items,
      total: this.total()
    });
    this.cart.limpiarCarrito();
    this.tableNumber = null;
    this.customerName = '';
    this.error = '';
    this.router.navigateByUrl('/empleado/registros');
  }
}
