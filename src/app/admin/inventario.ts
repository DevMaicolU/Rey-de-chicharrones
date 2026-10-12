import { CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, Insumo, UnitOfMeasure } from '../servicios/database.service';
import { Product } from '../entidades/modelos';

@Component({
  selector: 'app-inventario',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe, ReactiveFormsModule],
  templateUrl: './inventario.html'
})
export class Inventario {
  private readonly database = inject(DatabaseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly products = toSignal(this.database.activeProducts$, { initialValue: this.database.activeProducts });
  readonly supplies = toSignal(this.database.supplies$, { initialValue: this.database.supplies });
  readonly providers = toSignal(this.database.providers$, { initialValue: this.database.providers });
  readonly movements = toSignal(this.database.stockMovements$, { initialValue: this.database.stockMovements });

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    price: [0, [Validators.required, Validators.min(1)]],
    imageUrl: [''],
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
    preferredProviderId: [0]
  });

  productError = '';
  productMessage = '';
  editingProductId: string | null = null;
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
    if (this.productForm.invalid || !this.recipeItems.length) {
      this.productForm.markAllAsTouched();
      this.productError = 'Completa los datos del producto y agrega al menos un insumo a la receta.';
      return;
    }

    const value = this.productForm.getRawValue();
    const input = {
      name: value.name,
      description: value.description,
      price: value.price,
      imageUrl: value.imageUrl || null,
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
    this.productForm.setValue({
      name: product.name,
      description: product.description,
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
      preferredProviderId: value.preferredProviderId || undefined
    });

    if (!result.ok) {
      this.supplyError = result.error ?? 'No fue posible registrar el insumo.';
      return;
    }

    this.supplyMessage = 'Insumo creado correctamente.';
    this.supplyForm.reset({ code: '', name: '', unitOfMeasure: 'gramos' });
  }

  openEditSupply(supply: Insumo): void {
    this.editingSupplyCode = supply.code;
    this.editSupplyError = '';
    this.editSupplyForm.setValue({
      code: supply.code,
      name: supply.name,
      unitOfMeasure: supply.unitOfMeasure,
      preferredProviderId: supply.preferredProviderId ?? 0
    });
    this.editSupplyModalVisible = true;
  }

  closeEditSupply(): void {
    this.editSupplyModalVisible = false;
    this.editingSupplyCode = null;
    this.editSupplyForm.reset({ code: '', name: '', unitOfMeasure: 'gramos' });
  }

  saveEditedSupply(): void {
    this.editSupplyError = '';
    if (!this.editingSupplyCode || this.editSupplyForm.invalid) {
      this.editSupplyForm.markAllAsTouched();
      this.editSupplyError = 'Completa los datos del insumo con valores válidos.';
      return;
    }

    const value = this.editSupplyForm.getRawValue();
    const result = this.database.updateInsumo(this.editingSupplyCode, {
      name: value.name,
      unitOfMeasure: value.unitOfMeasure,
      preferredProviderId: value.preferredProviderId || undefined
    });
    if (!result.ok) {
      this.editSupplyError = result.error ?? 'No fue posible actualizar el insumo.';
      return;
    }

    this.supplyMessage = 'Insumo actualizado correctamente.';
    this.closeEditSupply();
  }

  openDeleteSupply(supply: Insumo): void {
    this.deletingSupply = supply;
    this.deleteSupplyError = '';
    this.deleteSupplyModalVisible = true;
  }

  closeDeleteSupply(): void {
    this.deleteSupplyModalVisible = false;
    this.deletingSupply = null;
  }

  confirmDeleteSupply(): void {
    if (!this.deletingSupply) return;
    const result = this.database.deleteInsumo(this.deletingSupply.code);
    if (!result.ok) {
      this.deleteSupplyError = result.error ?? 'No fue posible eliminar el insumo.';
      return;
    }

    this.supplyMessage = 'Insumo eliminado correctamente.';
    this.closeDeleteSupply();
  }

  removeProduct(product: Product): void {
    this.database.removeActiveProduct(product.id);
  }

  estimatedCost(product: Product): number | null {
    const costs = product.recipe.map(item => this.supplies().find(supply => supply.code === item.insumoCode)?.averageCost ?? 0);
    return costs.some(cost => cost <= 0) ? null : product.recipe.reduce((sum, item, index) => sum + item.quantityNeeded * costs[index], 0);
  }

  estimatedMargin(product: Product): number | null {
    const cost = this.estimatedCost(product);
    return cost !== null && product.price > 0 ? product.price - cost : null;
  }

  recipeUnit(code: string): string {
    return this.supplies().find(supply => supply.code === code)?.unitOfMeasure ?? '';
  }

  supplyName(code: string): string {
    return this.supplies().find((supply: Insumo) => supply.code === code)?.name ?? code;
  }
}
