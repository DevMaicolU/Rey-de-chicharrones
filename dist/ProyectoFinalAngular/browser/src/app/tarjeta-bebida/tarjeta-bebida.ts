import { Component, Input, inject } from '@angular/core';
import { Bebida } from '../entidades/bebida';
import { ServicioCarrito } from '../servicios/servicio-carrito';

@Component({
  selector: 'app-tarjeta-bebida',
  imports: [],
  templateUrl: './tarjeta-bebida.html',
  styleUrl: './tarjeta-bebida.css',
})
export class TarjetaBebida {
  @Input() bebida!: Bebida;
  private carrito = inject(ServicioCarrito);

  cantidad = 1;

  aumentar() {
    this.cantidad++;
  }

  disminuir() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  agregar() {
    this.carrito.agregarBebida(this.bebida, this.cantidad);
    this.cantidad = 1;
  }
}