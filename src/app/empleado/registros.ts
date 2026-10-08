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

  async descargarFacturaPdf(order: OrderRecord): Promise<void> {
    const ticket = document.getElementById(`ticket-pdf-${order.id}`);
    if (!ticket) {
      console.error(`No se encontró el contenido del ticket para el pedido ${order.id}.`);
      return;
    }

    try {
      const canvas = await html2canvas(ticket, {
        backgroundColor: '#fffdf8',
        scale: 2,
        useCORS: true
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, width, height);
      pdf.save(`Factura_Manila_Pedido_${order.id}.pdf`);
    } catch (error) {
      console.error(`No fue posible generar la factura del pedido ${order.id}.`, error);
    }
  }
}
