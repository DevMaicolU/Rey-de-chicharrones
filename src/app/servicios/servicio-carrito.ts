import { Injectable, signal } from '@angular/core';
import { Plato } from '../entidades/plato';
import { Bebida } from '../entidades/bebida';
import { Product } from '../entidades/modelos';

export interface ItemPedido {
  nombre: string;
  precio: number;
  foto: string;
  cantidad: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServicioCarrito {
  items = signal<ItemPedido[]>([]);

    agregarPlato(plato: Plato, cantidad: number) {
    this.agregar(plato.nombre as string, plato.precio, plato.foto as string, cantidad);
  }

  agregarBebida(bebida: Bebida, cantidad: number) {
    this.agregar(bebida.nombre as string, bebida.precio, bebida.foto as string, cantidad);
  }

  agregarProducto(producto: Product, cantidad: number): void {
    this.agregar(producto.name, producto.price, producto.imageUrl ?? '', cantidad);
  }

  private agregar(nombre: string, precio: number, foto: string, cantidad: number) {
    const lista = this.items();
    const existente = lista.find(i => i.nombre === nombre);
    if (existente) {
      existente.cantidad += cantidad;
      this.items.set([...lista]);
    } else {
      this.items.set([...lista, { nombre, precio, foto, cantidad }]);
    }
  }

  aumentar(item: ItemPedido) {
    item.cantidad++;
    this.items.set([...this.items()]);
  }

  disminuir(item: ItemPedido) {
    if (item.cantidad > 1) {
      item.cantidad--;
      this.items.set([...this.items()]);
    }
  }

  eliminar(item: ItemPedido) {
    this.items.set(this.items().filter(i => i !== item));
  }

  total(): number {
    return this.items().reduce((suma, i) => suma + i.precio * i.cantidad, 0);
  }

  vaciar() {
    this.items.set([]);
  }
}