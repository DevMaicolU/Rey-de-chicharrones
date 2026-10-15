import { CurrencyPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CartService } from '../servicios/cart.service';
import { DatabaseService } from '../servicios/database.service';
import { ToastService } from '../servicios/toast.service';
import { Product } from '../entidades/modelos';
import { IMAGEN_RESPALDO } from '../util/imagen';

@Component({
  selector: 'app-tarjeta-producto',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './tarjeta-producto.html',
  styleUrl: './tarjeta-producto.css'
})
export class TarjetaProducto {
  @Input({ required: true }) producto!: Product;
  cantidad: number | null = 1;
  readonly imagenRespaldo = IMAGEN_RESPALDO;
  private readonly cart = inject(CartService);
  private readonly database = inject(DatabaseService);
  private readonly toast = inject(ToastService);

  readonly supplies = toSignal(this.database.supplies$, { initialValue: this.database.supplies });

  get disponible(): boolean {
    const suppliesList = this.supplies();
    return this.producto.recipe.every(recipeItem => {
      const supply = suppliesList.find(item => item.code === recipeItem.insumoCode);
      return !!supply && supply.quantity >= recipeItem.quantityNeeded;
    });
  }

  /** Verifica si hay stock suficiente para preparar la cantidad solicitada. */
  get stockSuficiente(): boolean {
    const cant = this.cantidad ?? 1;
    const reservado = this.cart.items.find(item => item.producto.id === this.producto.id)?.cantidad ?? 0;
    this.supplies();
    return this.database.stockSuficiente(this.producto, cant, reservado);
  }

  get cantidadValida(): boolean {
    return this.cantidad !== null && Number.isFinite(this.cantidad) && this.cantidad >= 1;
  }

  agregarAlCarrito(): void {
    if (!this.cantidadValida) return;
    if (!this.disponible) {
      this.toast.advertencia(`Stock insuficiente de insumos para preparar "${this.producto.name}".`);
      return;
    }
    if (!this.stockSuficiente) {
      this.toast.advertencia(`No hay suficientes insumos para preparar ${this.cantidad} unidad(es) de "${this.producto.name}".`);
      return;
    }
    this.cart.agregarAlCarrito(this.producto, this.cantidad as number);
    this.toast.exito(`¡${this.producto.name} añadido al pedido correctamente!`);
    this.cantidad = 1;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(IMAGEN_RESPALDO)) return;
    image.src = IMAGEN_RESPALDO;
    image.classList.remove('object-fit-cover');
    image.classList.add('object-fit-contain', 'p-4');
  }
}
