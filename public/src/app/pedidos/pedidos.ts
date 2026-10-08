import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicioCarrito, ItemPedido } from '../servicios/servicio-carrito';
import {jsPDF} from 'jspdf';

@Component({
  selector: 'app-pedidos',
  imports: [FormsModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css',
})
export class Pedidos {
  carrito = inject(ServicioCarrito);

  nombreCompleto = '';
  celular = '';
  direccion = '';

  aumentar(item: ItemPedido) {
    this.carrito.aumentar(item);
  }

  disminuir(item: ItemPedido) {
    this.carrito.disminuir(item);
  }

  eliminar(item: ItemPedido) {
    this.carrito.eliminar(item);
  }

  realizarPedido() {
    if (this.carrito.items().length === 0) {
      alert('Tu pedido está vacío.');
      return;
    }
    if (!this.nombreCompleto || !this.celular || !this.direccion) {
      alert('Completa tus datos para continuar.');
      return;
    }

    const logo = new Image();
    logo.src = '/Images/manila.jpg';
    logo.onload = () => this.generarPdf(logo);
    logo.onerror = () => this.generarPdf(null);
  }

  private generarPdf(logo: HTMLImageElement | null) {
    const doc = new jsPDF();

    if (logo) {
      doc.addImage(logo, 'JPEG', 15, 10, 25, 25);
    }

    doc.setFontSize(20);
    doc.setTextColor(181, 18, 42);
    doc.text('MANILA', 50, 20);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Factura de pedido', 50, 27);
    doc.text('Fecha: ' + new Date().toLocaleDateString(), 50, 33);

    doc.text('Cliente: ' + this.nombreCompleto, 15, 50);
    doc.text('Celular: ' + this.celular, 15, 57);
    doc.text('Dirección: ' + this.direccion, 15, 64);

    let y = 78;
    doc.setFontSize(12);
    doc.text('Producto', 15, y);
    doc.text('Cant.', 125, y);
    doc.text('Precio', 145, y);
    doc.text('Subtotal', 170, y);
    y += 4;
    doc.line(15, y, 195, y);
    y += 8;

    doc.setFontSize(10);
    for (const item of this.carrito.items()) {
      const nombre = item.nombre.length > 45 ? item.nombre.substring(0, 45) + '...' : item.nombre;
      doc.text(nombre, 15, y);
      doc.text(String(item.cantidad), 125, y);
      doc.text('$' + item.precio, 145, y);
      doc.text('$' + item.precio * item.cantidad, 170, y);
      y += 8;
    }

    y += 4;
    doc.line(15, y, 195, y);
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(181, 18, 42);
    doc.text('Total a pagar: $' + this.carrito.total(), 15, y);

    doc.save('pedido-manila.pdf');

    this.carrito.vaciar();
    this.nombreCompleto = '';
    this.celular = '';
    this.direccion = '';
  }
}