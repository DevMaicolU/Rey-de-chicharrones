import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatabaseService } from '../servicios/database.service';
import { TarjetaProducto } from '../tarjeta-producto/tarjeta-producto';

@Component({ selector: 'app-comidas', imports: [TarjetaProducto], templateUrl: './comidas.html' })
export class Comidas {
  private readonly productosActivos = toSignal(inject(DatabaseService).activeProducts$, { initialValue: [] });
  readonly comidas = computed(() => this.productosActivos().filter(producto => producto.type === 'Comida'));
}
