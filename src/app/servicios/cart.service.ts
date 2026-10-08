import { Injectable } from '@angular/core';
import { BehaviorSubject, map, distinctUntilChanged } from 'rxjs';
import { Product } from '../entidades/modelos';

export interface CartItem {
  producto: Product;
  cantidad: number;
  subtotal: number;
}

/** Parte entera de un valor numérico; null si no es un número válido (p. ej. un input vacío). */
function aEntero(valor: unknown): number | null {
  if (valor === null || valor === '') return null;
  const numero = Math.floor(Number(valor));
  return Number.isFinite(numero) ? numero : null;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly carritoSubject = new BehaviorSubject<CartItem[]>([]);
  readonly carritoActual$ = this.carritoSubject.asObservable();
  readonly totalItems$ = this.carritoActual$.pipe(
    map(items => items.reduce((total, item) => total + item.cantidad, 0)),
    distinctUntilChanged()
  );

  get items(): CartItem[] { return this.carritoSubject.value; }

  agregarAlCarrito(producto: Product, cantidad: number): void {
    const cantidadSegura = aEntero(cantidad);
    if (cantidadSegura === null || cantidadSegura < 1) return; // agregar 0 (o menos) no tiene sentido

    const existe = this.items.some(item => item.producto.id === producto.id);
    if (existe) {
      this.carritoSubject.next(this.items.map(item => item.producto.id === producto.id
        ? this.crearItem(item.producto, item.cantidad + cantidadSegura)
        : item));
      return;
    }
    this.carritoSubject.next([...this.items, this.crearItem(producto, cantidadSegura)]);
  }

  /** Fija la cantidad de un producto. Valores inválidos se ignoran y los menores a 1 se dejan en 1 (para quitarlo usa eliminarDelCarrito). */
  cambiarCantidad(productId: string, cantidad: number): void {
    const entera = aEntero(cantidad);
    if (entera === null) return;
    const cantidadSegura = Math.max(1, entera);
    this.carritoSubject.next(this.items.map(item => item.producto.id === productId
      ? this.crearItem(item.producto, cantidadSegura)
      : item));
  }

  eliminarDelCarrito(productId: string): void {
    this.carritoSubject.next(this.items.filter(item => item.producto.id !== productId));
  }

  limpiarCarrito(): void { this.carritoSubject.next([]); }

  total(): number { return this.items.reduce((total, item) => total + item.subtotal, 0); }

  private crearItem(producto: Product, cantidad: number): CartItem {
    return { producto, cantidad, subtotal: producto.price * cantidad };
  }
}
