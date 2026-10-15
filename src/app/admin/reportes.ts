import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatabaseService, OrderRecord, Purchase } from '../servicios/database.service';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-reportes',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './reportes.html'
})
export class Reportes {
  private readonly database = inject(DatabaseService);
  private readonly orders = toSignal(this.database.orderRecords$, { initialValue: [] as OrderRecord[] });
  private readonly purchases = toSignal(this.database.purchases$, { initialValue: [] as Purchase[] });

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
  async descargarFacturaPdf(order: OrderRecord): Promise<void> {
    const ticket = document.getElementById(`admin-ticket-pdf-${order.id}`);
    if (!ticket) return;
    const canvas = await html2canvas(ticket, { backgroundColor: '#fffdf8', scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 15;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, width, (canvas.height * width) / canvas.width);
    pdf.save(`Factura_RoyalSoft_Pedido_${order.id}.pdf`);
  }
  filteredPurchases(): Purchase[] {
    const start = this.startDate ? new Date(`${this.startDate}T00:00:00`).getTime() : -Infinity;
    const end = this.endDate ? new Date(`${this.endDate}T23:59:59.999`).getTime() : Infinity;
    return this.purchases().filter(purchase => purchase.status === 'recibida').filter(purchase => {
      const timestamp = new Date(purchase.date).getTime();
      return timestamp >= start && timestamp <= end;
    });
  }
  totalCompras(): number { return this.filteredPurchases().reduce((total, purchase) => total + purchase.total, 0); }
  comprasPorProveedor(): Array<{ name: string; total: number }> {
    const totals = new Map<string, number>();
    for (const purchase of this.filteredPurchases()) totals.set(purchase.providerName, (totals.get(purchase.providerName) ?? 0) + purchase.total);
    return [...totals.entries()].map(([name, total]) => ({ name, total }));
  }

  resumen(order: OrderRecord): string {
    return order.products.map(item => `${item.quantity}× ${item.productName}`).join(', ');
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
  }
}
