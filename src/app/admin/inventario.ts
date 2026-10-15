import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, Insumo, UnitOfMeasure } from '../servicios/database.service';
import { Product } from '../entidades/modelos';
import { IMAGEN_RESPALDO, usarImagenRespaldo } from '../util/imagen';

@Component({
  selector: 'app-inventario',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, ReactiveFormsModule],
  templateUrl: './inventario.html'
})
export class Inventario {
  private readonly database = inject(DatabaseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly products = toSignal(this.database.activeProducts$, { initialValue: this.database.activeProducts });
  readonly supplies = toSignal(this.database.supplies$, { initialValue: this.database.supplies });
  readonly providers = toSignal(this.database.providers$, { initialValue: this.database.providers });
  readonly movements = toSignal(this.database.stockMovements$, { initialValue: this.database.stockMovements });
  readonly imagenRespaldo = IMAGEN_RESPALDO;

  onImageError(event: Event): void {
    usarImagenRespaldo(event);
  }

  // Imagen OBLIGATORIA, Descripción OPCIONAL
  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    price: [0, [Validators.required, Validators.min(1)]],
    imageUrl: ['', [Validators.required]],
    type: ['Comida' as Product['type'], Validators.required],
    recipe: this.formBuilder.array<FormGroup<{
      insumoCode: FormControl<string>;
      quantityNeeded: FormControl<number>;
    }>>([])
  });

  readonly supplyForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]+$/), Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    unitOfMeasure: ['gramos' as UnitOfMeasure, Validators.required],
    preferredProviderId: [0]
  });

  readonly editSupplyForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]+$/), Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    unitOfMeasure: ['gramos' as UnitOfMeasure, Validators.required],
    preferredProviderId: [0],
    minimumQuantity: [20, [Validators.required, Validators.min(0)]]
  });

  productError = '';
  productMessage = '';
  editingProductId: string | null = null;

  // Modal para eliminar producto (sin window.confirm)
  deletingProduct: Product | null = null;
  deleteProductModalVisible = false;

  supplyError = '';
  supplyMessage = '';
  editSupplyError = '';
  deleteSupplyError = '';
  editingSupplyCode: string | null = null;
  deletingSupply: Insumo | null = null;
  editSupplyModalVisible = false;
  deleteSupplyModalVisible = false;

  get recipeItems(): FormArray<FormGroup<{
    insumoCode: FormControl<string>;
    quantityNeeded: FormControl<number>;
  }>> {
    return this.productForm.controls.recipe;
  }

  addRecipeItem(): void {
    this.recipeItems.push(this.formBuilder.nonNullable.group({
      insumoCode: ['', Validators.required],
      quantityNeeded: [1, [Validators.required, Validators.min(0.001)]]
    }));
  }

  removeRecipeItem(index: number): void {
    this.recipeItems.removeAt(index);
  }

  createProduct(): void {
    this.productError = '';
    this.productMessage = '';

    const value = this.productForm.getRawValue();
    if (!value.name.trim()) {
      this.productForm.markAllAsTouched();
      this.productError = 'El nombre del producto es obligatorio.';
      return;
    }
    if (!value.imageUrl.trim()) {
      this.productForm.markAllAsTouched();
      this.productError = 'La imagen del producto es obligatoria. Por favor ingresa una URL de imagen válida.';
      return;
    }
    if (this.productForm.invalid || !this.recipeItems.length) {
      this.productForm.markAllAsTouched();
      this.productError = 'Completa los campos obligatorios del producto (nombre, precio, imagen) y agrega al menos un insumo a la receta.';
      return;
    }

    const input = {
      name: value.name.trim(),
      description: value.description.trim(),
      price: value.price,
      imageUrl: value.imageUrl.trim(),
      type: value.type,
      recipe: value.recipe.map(item => ({
        insumoCode: item.insumoCode,
        quantityNeeded: item.quantityNeeded
      }))
    };

    const result = this.editingProductId
      ? this.database.updateManualProduct(this.editingProductId, input)
      : this.database.addManualProduct(input);

    if (!result.ok) {
      this.productError = result.error ?? 'No fue posible crear el producto.';
      return;
    }

    this.productMessage = this.editingProductId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.';
    this.editingProductId = null;
    this.productForm.reset({ name: '', description: '', price: 0, imageUrl: '', type: 'Comida' });
    this.recipeItems.clear();
  }

  editProduct(product: Product): void {
    this.editingProductId = product.id;
    this.productError = '';
    this.productMessage = '';
    this.recipeItems.clear();
    this.productForm.setValue({
      name: product.name,
      description: product.description || '',
      price: product.price,
      imageUrl: product.imageUrl ?? '',
      type: product.type,
      recipe: []
    });
    for (const item of product.recipe) {
      this.recipeItems.push(this.formBuilder.nonNullable.group({
        insumoCode: [item.insumoCode, Validators.required],
        quantityNeeded: [item.quantityNeeded, [Validators.required, Validators.min(0.001)]]
      }));
    }
  }

  cancelProductEdit(): void {
    this.editingProductId = null;
    this.productForm.reset({ name: '', description: '', price: 0, imageUrl: '', type: 'Comida' });
    this.recipeItems.clear();
    this.productError = '';
  }

  openDeleteProduct(product: Product): void {
    this.deletingProduct = product;
    this.deleteProductModalVisible = true;
  }

  closeDeleteProduct(): void {
    this.deletingProduct = null;
    this.deleteProductModalVisible = false;
  }

  confirmDeleteProduct(): void {
    if (!this.deletingProduct) return;
    this.database.removeActiveProduct(this.deletingProduct.id);
    this.productMessage = `Producto "${this.deletingProduct.name}" eliminado del menú activo.`;
    this.closeDeleteProduct();
  }

  removeProduct(product: Product): void {
    this.openDeleteProduct(product);
  }

  createSupply(): void {
    this.supplyError = '';
    this.supplyMessage = '';
    if (this.supplyForm.invalid) {
      this.supplyForm.markAllAsTouched();
      this.supplyError = 'Completa el código, nombre y unidad de medida.';
      return;
    }

    const value = this.supplyForm.getRawValue();
    const result = this.database.addSupply({
      code: value.code,
      name: value.name,
      unitOfMeasure: value.unitOfMeasure,
      preferredProviderId: value.preferredProviderId ? Number(value.preferredProviderId) : undefined
    });

    if (!result.ok) {
      this.supplyError = result.error ?? 'No fue posible registrar el insumo.';
      return;
    }

    this.supplyMessage = 'Insumo registrado correctamente.';
    this.supplyForm.reset({ code: '', name: '', unitOfMeasure: 'gramos', preferredProviderId: 0 });
  }

  openEditSupply(supply: Insumo): void {
    this.editingSupplyCode = supply.code;
    this.editSupplyError = '';
    this.editSupplyForm.setValue({
      code: supply.code,
      name: supply.name,
      unitOfMeasure: supply.unitOfMeasure,
      preferredProviderId: supply.preferredProviderId ?? 0,
      minimumQuantity: supply.minimumQuantity
    });
    this.editSupplyModalVisible = true;
  }

  closeEditSupply(): void {
    this.editingSupplyCode = null;
    this.editSupplyModalVisible = false;
  }

  updateSupply(): void {
    if (!this.editingSupplyCode) return;
    this.editSupplyError = '';
    if (this.editSupplyForm.invalid) {
      this.editSupplyForm.markAllAsTouched();
      this.editSupplyError = 'Completa los datos obligatorios del insumo.';
      return;
    }

    const value = this.editSupplyForm.getRawValue();
    const result = this.database.updateSupply(this.editingSupplyCode, {
      name: value.name,
      unitOfMeasure: value.unitOfMeasure,
      preferredProviderId: value.preferredProviderId ? Number(value.preferredProviderId) : undefined,
      minimumQuantity: value.minimumQuantity
    });

    if (!result.ok) {
      this.editSupplyError = result.error ?? 'No fue posible actualizar el insumo.';
      return;
    }

    this.supplyMessage = 'Insumo actualizado correctamente.';
    this.closeEditSupply();
  }

  saveEditedSupply(): void {
    this.updateSupply();
  }

  openDeleteSupply(supply: Insumo): void {
    this.deletingSupply = supply;
    this.deleteSupplyError = '';
    this.deleteSupplyModalVisible = true;
  }

  closeDeleteSupply(): void {
    this.deletingSupply = null;
    this.deleteSupplyModalVisible = false;
  }

  confirmDeleteSupply(): void {
    if (!this.deletingSupply) return;
    this.deleteSupplyError = '';
    const result = this.database.deleteSupply(this.deletingSupply.code);
    if (!result.ok) {
      this.deleteSupplyError = result.error ?? 'No fue posible eliminar el insumo.';
      return;
    }

    this.supplyMessage = 'Insumo eliminado correctamente.';
    this.closeDeleteSupply();
  }

  recipeUnit(code: string): string {
    return this.supplies().find(supply => supply.code === code)?.unitOfMeasure ?? '';
  }

  supplyName(code: string): string {
    return this.supplies().find((supply: Insumo) => supply.code === code)?.name ?? code;
  }

  supplyCount(status: Insumo['status']): number {
    return this.supplies().filter(supply => supply.status === status).length;
  }
}
