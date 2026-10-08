import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatabaseService } from '../servicios/database.service';
import { MockCatalogoService } from '../servicios/mock-catalogo.service';
import { Product } from '../entidades/modelos';
import { IMAGEN_RESPALDO, usarImagenRespaldo } from '../util/imagen';

@Component({ selector: 'app-inventario', imports: [CurrencyPipe], templateUrl: './inventario.html' })
export class Inventario {
  private readonly database = inject(DatabaseService);

  readonly catalog = toSignal(inject(MockCatalogoService).getCatalog(), { initialValue: [] as Product[] });
  readonly activeProducts = toSignal(this.database.activeProducts$, { initialValue: this.database.activeProducts });
  private readonly idsActivos = computed(() => new Set(this.activeProducts().map(producto => producto.idApi)));

  readonly imagenRespaldo = IMAGEN_RESPALDO;
  readonly manejarErrorImagen = usarImagenRespaldo;

  add(product: Product): void { this.database.addActiveProduct(product); }
  remove(product: Product): void { this.database.removeActiveProduct(product.idApi); }
  isActive(product: Product): boolean { return this.idsActivos().has(product.idApi); }
}
