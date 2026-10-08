import { Component, Input, inject } from '@angular/core';
import { Plato } from '../entidades/plato';
import { ServicioCarrito } from '../servicios/servicio-carrito';

@Component({
  selector: 'app-tarjeta-plato',
  imports: [],
  templateUrl: './tarjeta-plato.html',
  styleUrl: './tarjeta-plato.css',
})
export class TarjetaPlato {
  @Input() plato!: Plato;
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
    this.carrito.agregarPlato(this.plato, this.cantidad);
    this.cantidad = 1;
  }
}