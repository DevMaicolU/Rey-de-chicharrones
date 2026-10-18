import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatabaseService, Insumo, StockMovement, UnitOfMeasure } from '../servicios/database.service';
import { Product } from '../entidades/modelos';
import { IMAGEN_RESPALDO, usarImagenRespaldo } from '../util/imagen';

@Component({
  selector: 'app-inventario',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, ReactiveFormsModule, FormsModule, RouterLink],
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

  // ===== FORMULARIO: CREACIÓN DE PRODUCTO (Sección Principal) =====
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

  productError = '';
  productMessage = '';
  editingProductId: string | null = null;

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
    const cleanName = value.name.trim();
    const cleanImage = value.imageUrl.trim();
    const cleanDescription = value.description.trim();

    if (!cleanName) {
      this.productForm.controls.name.markAsTouched();
      this.productError = 'El nombre del producto es obligatorio.';
      return;
    }
    if (!cleanImage) {
      this.productForm.controls.imageUrl.markAsTouched();
      this.productError = 'La imagen del producto es obligatoria. Por favor ingresa una URL de imagen válida.';
      return;
    }
    if (!value.price || value.price <= 0) {
      this.productForm.controls.price.markAsTouched();
      this.productError = 'El precio debe ser un número mayor a cero.';
      return;
    }
    if (!this.recipeItems.length) {
      this.productError = 'La receta del producto debe incluir al menos un insumo.';
      return;
    }

    for (let i = 0; i < this.recipeItems.length; i++) {
      const item = this.recipeItems.at(i).getRawValue();
      if (!item.insumoCode || !item.quantityNeeded || item.quantityNeeded <= 0) {
        this.productError = 'Selecciona un insumo y una cantidad válida mayor a cero para cada elemento de la receta.';
        return;
      }
    }

    if (this.products().some(p => p.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      this.productError = `Ya existe un producto con el nombre "${cleanName}".`;
      return;
    }

    const input = {
      name: cleanName,
      description: cleanDescription,
      price: value.price,
      imageUrl: cleanImage,
      type: value.type,
      recipe: value.recipe.map(item => ({
        insumoCode: item.insumoCode,
        quantityNeeded: item.quantityNeeded
      }))
    };

    const result = this.database.addManualProduct(input);
    if (!result.ok) {
      this.productError = result.error ?? 'No fue posible crear el producto.';
      return;
    }

    this.productMessage = `Producto "${cleanName}" creado correctamente.`;
    this.productForm.reset({ name: '', description: '', price: 0, imageUrl: '', type: 'Comida' });
    this.recipeItems.clear();
  }

  // ===== MODAL: EDICIÓN DE PRODUCTO =====
  readonly editProductForm = this.formBuilder.nonNullable.group({
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

  editingProduct: Product | null = null;
  editProductModalVisible = false;
  editProductError = '';

  get editRecipeItems(): FormArray<FormGroup<{
    insumoCode: FormControl<string>;
    quantityNeeded: FormControl<number>;
  }>> {
    return this.editProductForm.controls.recipe;
  }

  addEditRecipeItem(): void {
    this.editRecipeItems.push(this.formBuilder.nonNullable.group({
      insumoCode: ['', Validators.required],
      quantityNeeded: [1, [Validators.required, Validators.min(0.001)]]
    }));
  }

  removeEditRecipeItem(index: number): void {
    this.editRecipeItems.removeAt(index);
  }

  openEditProduct(product: Product): void {
    this.editingProduct = product;
    this.editingProductId = product.id;
    this.editProductError = '';
    this.editRecipeItems.clear();

    this.editProductForm.setValue({
      name: product.name,
      description: product.description || '',
      price: product.price,
      imageUrl: product.imageUrl ?? '',
      type: product.type,
      recipe: []
    });

    for (const item of product.recipe) {
      this.editRecipeItems.push(this.formBuilder.nonNullable.group({
        insumoCode: [item.insumoCode, Validators.required],
        quantityNeeded: [item.quantityNeeded, [Validators.required, Validators.min(0.001)]]
      }));
    }

    this.editProductModalVisible = true;
  }

  closeEditProduct(): void {
    this.editProductModalVisible = false;
    this.editingProduct = null;
    this.editingProductId = null;
    this.editProductError = '';
  }

  saveEditedProduct(): void {
    if (!this.editingProduct) return;
    this.editProductError = '';

    const value = this.editProductForm.getRawValue();
    const cleanName = value.name.trim();
    const cleanImage = value.imageUrl.trim();
    const cleanDescription = value.description.trim();

    if (!cleanName) {
      this.editProductForm.controls.name.markAsTouched();
      this.editProductError = 'El nombre del producto es obligatorio.';
      return;
    }
    if (!cleanImage) {
      this.editProductForm.controls.imageUrl.markAsTouched();
      this.editProductError = 'La imagen del producto es obligatoria. Por favor ingresa una URL de imagen válida.';
      return;
    }
    if (!value.price || value.price <= 0) {
      this.editProductForm.controls.price.markAsTouched();
      this.editProductError = 'El precio debe ser un número mayor a cero.';
      return;
    }
    if (!this.editRecipeItems.length) {
      this.editProductError = 'La receta del producto debe incluir al menos un insumo.';
      return;
    }

    for (let i = 0; i < this.editRecipeItems.length; i++) {
      const item = this.editRecipeItems.at(i).getRawValue();
      if (!item.insumoCode || !item.quantityNeeded || item.quantityNeeded <= 0) {
        this.editProductError = 'Selecciona un insumo y una cantidad válida mayor a cero para cada elemento de la receta.';
        return;
      }
    }

    if (this.products().some(p => p.id !== this.editingProduct!.id && p.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      this.editProductError = `Ya existe otro producto con el nombre "${cleanName}".`;
      return;
    }

    const input = {
      name: cleanName,
      description: cleanDescription,
      price: value.price,
      imageUrl: cleanImage,
      type: value.type,
      recipe: value.recipe.map(item => ({
        insumoCode: item.insumoCode,
        quantityNeeded: item.quantityNeeded
      }))
    };

    const result = this.database.updateManualProduct(this.editingProduct.id, input);
    if (!result.ok) {
      this.editProductError = result.error ?? 'No fue posible actualizar el producto.';
      return;
    }

    this.productMessage = `Producto "${cleanName}" actualizado correctamente.`;
    this.closeEditProduct();
  }

  // Compatibilidad hacia atrás para llamadas desde plantillas o tests
  editProduct(product: Product): void {
    this.openEditProduct(product);
  }

  cancelProductEdit(): void {
    this.closeEditProduct();
  }

  // ===== MODAL: ELIMINACIÓN DE PRODUCTO =====
  deletingProduct: Product | null = null;
  deleteProductModalVisible = false;

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

  // ===== GESTIÓN DE INSUMOS =====
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

  supplyError = '';
  supplyMessage = '';
  editSupplyError = '';
  deleteSupplyError = '';
  editingSupplyCode: string | null = null;
  deletingSupply: Insumo | null = null;
  editSupplyModalVisible = false;
  deleteSupplyModalVisible = false;

  createSupply(): void {
    this.supplyError = '';
    this.supplyMessage = '';

    const value = this.supplyForm.getRawValue();
    const cleanCode = value.code.trim().toUpperCase();
    const cleanName = value.name.trim();

    if (!cleanCode) {
      this.supplyForm.controls.code.markAsTouched();
      this.supplyError = 'El código del insumo es obligatorio.';
      return;
    }
    if (!/^[A-Za-z0-9-]+$/.test(cleanCode)) {
      this.supplyForm.controls.code.markAsTouched();
      this.supplyError = 'El código solo puede contener letras, números y guiones (ej: CAR-002).';
      return;
    }
    if (!cleanName) {
      this.supplyForm.controls.name.markAsTouched();
      this.supplyError = 'El nombre del insumo es obligatorio.';
      return;
    }
    if (this.supplies().some(s => s.code === cleanCode)) {
      this.supplyError = `Ya existe un insumo con el código "${cleanCode}".`;
      return;
    }

    const result = this.database.addSupply({
      code: cleanCode,
      name: cleanName,
      unitOfMeasure: value.unitOfMeasure,
      preferredProviderId: value.preferredProviderId ? Number(value.preferredProviderId) : undefined
    });

    if (!result.ok) {
      this.supplyError = result.error ?? 'No fue posible registrar el insumo.';
      return;
    }

    this.supplyMessage = `Insumo "${cleanName}" registrado correctamente.`;
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
    this.editSupplyError = '';
  }

  updateSupply(): void {
    if (!this.editingSupplyCode) return;
    this.editSupplyError = '';

    const value = this.editSupplyForm.getRawValue();
    const cleanName = value.name.trim();

    if (!cleanName) {
      this.editSupplyForm.controls.name.markAsTouched();
      this.editSupplyError = 'El nombre del insumo es obligatorio.';
      return;
    }
    if (value.minimumQuantity === null || value.minimumQuantity < 0) {
      this.editSupplyForm.controls.minimumQuantity.markAsTouched();
      this.editSupplyError = 'El stock mínimo no puede ser negativo.';
      return;
    }

    const result = this.database.updateSupply(this.editingSupplyCode, {
      name: cleanName,
      unitOfMeasure: value.unitOfMeasure,
      preferredProviderId: value.preferredProviderId ? Number(value.preferredProviderId) : undefined,
      minimumQuantity: value.minimumQuantity
    });

    if (!result.ok) {
      this.editSupplyError = result.error ?? 'No fue posible actualizar el insumo.';
      return;
    }

    this.supplyMessage = `Insumo "${cleanName}" actualizado correctamente.`;
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
    this.deleteSupplyError = '';
  }

  confirmDeleteSupply(): void {
    if (!this.deletingSupply) return;
    this.deleteSupplyError = '';
    const result = this.database.deleteSupply(this.deletingSupply.code);
    if (!result.ok) {
      this.deleteSupplyError = result.error ?? 'No fue posible eliminar el insumo.';
      return;
    }

    this.supplyMessage = `Insumo "${this.deletingSupply.name}" eliminado correctamente.`;
    this.closeDeleteSupply();
  }

  // ===== CONSULTA Y FILTRADO DE INSUMOS (CU-08, RF-12, RF-15, RF-16, RF-24, RF-43) =====
  insumoBusqueda = '';
  insumoFiltroEstado: 'todos' | Insumo['status'] = 'todos';

  get filteredSupplies(): Insumo[] {
    let list = this.supplies();

    if (this.insumoFiltroEstado !== 'todos') {
      list = list.filter(supply => supply.status === this.insumoFiltroEstado);
    }

    if (this.insumoBusqueda.trim()) {
      const term = this.insumoBusqueda.trim().toLowerCase();
      list = list.filter(supply =>
        supply.code.toLowerCase().includes(term) ||
        supply.name.toLowerCase().includes(term)
      );
    }

    return list;
  }

  get hayFiltrosInsumosActivos(): boolean {
    return !!(this.insumoBusqueda.trim() || this.insumoFiltroEstado !== 'todos');
  }

  filtrarInsumosPorEstado(estado: 'todos' | Insumo['status']): void {
    this.insumoFiltroEstado = this.insumoFiltroEstado === estado && estado !== 'todos' ? 'todos' : estado;
  }

  limpiarFiltrosInsumos(): void {
    this.insumoBusqueda = '';
    this.insumoFiltroEstado = 'todos';
  }

  get hayInsumosBajoStock(): boolean {
    return this.supplyCount('Escaso') > 0 || this.supplyCount('Agotado') > 0;
  }

  // ===== FILTROS Y FUNCIONALIDAD DE KARDEX =====
  kardexFechaInicio = '';
  kardexFechaFin = '';
  kardexInsumoFiltro = '';
  kardexProductoFiltro = '';
  kardexTipoFiltro = '';
  kardexBusqueda = '';

  limpiarFiltrosKardex(): void {
    this.kardexFechaInicio = '';
    this.kardexFechaFin = '';
    this.kardexInsumoFiltro = '';
    this.kardexProductoFiltro = '';
    this.kardexTipoFiltro = '';
    this.kardexBusqueda = '';
  }

  get hayFiltrosKardexActivos(): boolean {
    return !!(
      this.kardexFechaInicio ||
      this.kardexFechaFin ||
      this.kardexInsumoFiltro ||
      this.kardexProductoFiltro ||
      this.kardexTipoFiltro ||
      this.kardexBusqueda.trim()
    );
  }

  get filteredMovements(): StockMovement[] {
    let list = this.movements();

    if (this.kardexFechaInicio) {
      const inicioTs = new Date(`${this.kardexFechaInicio}T00:00:00`).getTime();
      list = list.filter(m => new Date(m.date).getTime() >= inicioTs);
    }

    if (this.kardexFechaFin) {
      const finTs = new Date(`${this.kardexFechaFin}T23:59:59.999`).getTime();
      list = list.filter(m => new Date(m.date).getTime() <= finTs);
    }

    if (this.kardexInsumoFiltro) {
      list = list.filter(m => m.supplyCode === this.kardexInsumoFiltro);
    }

    if (this.kardexProductoFiltro) {
      const prod = this.products().find(p => p.id === this.kardexProductoFiltro);
      if (prod) {
        const insumoCodes = prod.recipe.map(r => r.insumoCode);
        list = list.filter(m => insumoCodes.includes(m.supplyCode));
      }
    }

    if (this.kardexTipoFiltro) {
      list = list.filter(m => m.type.toLowerCase() === this.kardexTipoFiltro.toLowerCase());
    }

    if (this.kardexBusqueda.trim()) {
      const term = this.kardexBusqueda.trim().toLowerCase();
      list = list.filter(m =>
        m.reference.toLowerCase().includes(term) ||
        m.supplyCode.toLowerCase().includes(term) ||
        this.supplyName(m.supplyCode).toLowerCase().includes(term)
      );
    }

    return list;
  }

  recipeUnit(code: string): string {
    return this.supplies().find(supply => supply.code === code)?.unitOfMeasure ?? '';
  }

  supplyName(code: string): string {
    return this.supplies().find((supply: Insumo) => supply.code === code)?.name ?? code;
  }

  supplyUnit(code: string): string {
    const supply = this.supplies().find(item => item.code === code);
    return supply?.unitOfMeasure ? supply.unitOfMeasure : '';
  }

  supplyCount(status: Insumo['status']): number {
    return this.supplies().filter(supply => supply.status === status).length;
  }
}
