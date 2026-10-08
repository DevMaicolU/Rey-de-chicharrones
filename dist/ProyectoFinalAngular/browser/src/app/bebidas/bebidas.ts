import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatabaseService } from '../servicios/database.service';
import { TarjetaProducto } from '../tarjeta-producto/tarjeta-producto';

@Component({ selector: 'app-bebidas', imports: [TarjetaProducto], templateUrl: './bebidas.html' })
export class Bebidas {
  private readonly productosActivos = toSignal(inject(DatabaseService).activeProducts$, { initialValue: [] });
  readonly bebidas = computed(() => this.productosActivos().filter(producto => producto.type === 'Bebida'));
}
