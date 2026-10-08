import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService } from '../servicios/database.service';
import { Order } from '../entidades/modelos';

@Component({ selector: 'app-registros', imports: [CurrencyPipe, DatePipe], templateUrl: './registros.html' })
export class Registros {
  private readonly auth = inject(AuthService);
  private readonly pedidos = toSignal(inject(DatabaseService).orders$, { initialValue: [] as Order[] });

  /** Solo los pedidos del empleado con sesión activa, del más reciente al más antiguo. */
  readonly misPedidos = computed(() => {
    const idEmpleado = this.auth.activeUser?.id;
    return this.pedidos()
      .filter(pedido => pedido.employeeId === idEmpleado)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  });

  readonly totalVendido = computed(() => this.misPedidos().reduce((suma, pedido) => suma + pedido.total, 0));

  resumen(pedido: Order): string {
    return pedido.items.map(item => `${item.quantity}× ${item.productName}`).join(', ');
  }
}
