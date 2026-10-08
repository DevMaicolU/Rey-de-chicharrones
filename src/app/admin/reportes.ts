import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatabaseService, OrderRecord } from '../servicios/database.service';

@Component({
  selector: 'app-reportes',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './reportes.html'
})
export class Reportes {
  private readonly database = inject(DatabaseService);
  private readonly orders = toSignal(this.database.orderRecords$, { initialValue: [] as OrderRecord[] });

  startDate = '';
  endDate = '';
  filteredOrders(): OrderRecord[] {
    const start = this.startDate ? new Date(`${this.startDate}T00:00:00`).getTime() : -Infinity;
    const end = this.endDate ? new Date(`${this.endDate}T23:59:59.999`).getTime() : Infinity;
    return this.orders()
      .filter(order => order.status === 'completado')
      .filter(order => {
        const timestamp = new Date(order.date || order.createdAt).getTime();
        return timestamp >= start && timestamp <= end;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  totalIngresos(): number { return this.filteredOrders().reduce((total, order) => total + order.total, 0); }
  totalPedidos(): number { return this.filteredOrders().length; }
  promedioVenta(): number {
    const orders = this.filteredOrders();
    return orders.length ? this.totalIngresos() / orders.length : 0;
  }

  resumen(order: OrderRecord): string {
    return order.products.map(item => `${item.quantity}× ${item.productName}`).join(', ');
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
  }
}
