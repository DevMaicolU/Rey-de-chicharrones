import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService, OrderRecord } from '../servicios/database.service';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Component({ selector: 'app-registros', imports: [CurrencyPipe, DatePipe], templateUrl: './registros.html' })
export class Registros {
  private readonly auth = inject(AuthService);
  private readonly pedidos = toSignal(inject(DatabaseService).orderRecords$, { initialValue: [] as OrderRecord[] });

  /** Solo los pedidos del empleado con sesión activa, del más reciente al más antiguo. */
  readonly misPedidos = computed(() => {
    const idEmpleado = this.auth.activeUser?.id;
    return this.pedidos()
      .filter(pedido => pedido.employeeId === idEmpleado)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  });

  readonly totalVendido = computed(() => this.misPedidos().reduce((suma, pedido) => suma + pedido.total, 0));

  resumen(pedido: OrderRecord): string {
    return pedido.products.map(item => `${item.quantity}× ${item.productName}`).join(', ');
  }

  calcularSubtotal(order: OrderRecord): number {
    if (order.subtotal != null && order.subtotal > 0) return order.subtotal;
    const items = order.products || order.items || [];
    return items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }

  calcularDescuento(order: OrderRecord): number {
    if (order.discount != null && order.discount > 0) return order.discount;
    const subtotal = this.calcularSubtotal(order);
    return Math.max(0, subtotal - order.total);
  }

  calcularCambio(order: OrderRecord): number {
    if (order.change != null) return order.change;
    if (order.amountPaid != null && order.amountPaid >= order.total) {
      return order.amountPaid - order.total;
    }
    return 0;
  }

  async descargarFacturaPdf(order: OrderRecord): Promise<void> {
    const ticket = document.getElementById(`ticket-pdf-${order.id}`);
    if (!ticket) {
      console.error(`No se encontró el contenido del ticket para el pedido ${order.id}.`);
      return;
    }

    try {
      const canvas = await html2canvas(ticket, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, width, height);
      pdf.save(`Factura_El_Rey_De_Los_Chicharrones_Pedido_${order.id}.pdf`);
    } catch (error) {
      console.error(`No fue posible generar la factura del pedido ${order.id}.`, error);
    }
  }
}
