import { CurrencyPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CartService } from '../servicios/cart.service';
import { DatabaseService } from '../servicios/database.service';
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

  get disponible(): boolean {
    return this.producto.recipe.every(recipeItem => {
      const supply = this.database.supplies.find(item => item.code === recipeItem.insumoCode);
      return !!supply && supply.quantity >= recipeItem.quantityNeeded;
    });
  }

  get cantidadValida(): boolean {
    return this.cantidad !== null && Number.isFinite(this.cantidad) && this.cantidad >= 1;
  }

  agregarAlCarrito(): void {
    if (!this.cantidadValida || !this.disponible) return;
    this.cart.agregarAlCarrito(this.producto, this.cantidad as number);
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
