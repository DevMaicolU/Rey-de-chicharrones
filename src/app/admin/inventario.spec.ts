import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Inventario } from './inventario';
import { DatabaseService } from '../servicios/database.service';
import { ToastService } from '../servicios/toast.service';

describe('Inventario', () => {
  let fixture: ComponentFixture<Inventario>;
  let component: Inventario;
  let db: DatabaseService;
  let toastService: ToastService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [provideRouter([])]
    });

    db = TestBed.inject(DatabaseService);
    toastService = TestBed.inject(ToastService);
    db.addSupply({
      code: 'PAN-01',
      name: 'Pan',
      unitOfMeasure: 'unidades'
    });
    db.addSupply({
      code: 'CAR-01',
      name: 'Carne',
      unitOfMeasure: 'gramos'
    });
    db.addManualProduct({
      name: 'Producto Existente',
      description: 'Desc',
      price: 15000,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
      type: 'Comida',
      recipe: [{ insumoCode: 'PAN-01', quantityNeeded: 1 }]
    });

    fixture = TestBed.createComponent(Inventario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exige la imagen como campo obligatorio e impide registrar productos sin imagen', () => {
    component.addRecipeItem();
    component.recipeItems.at(0).setValue({
      insumoCode: 'PAN-01',
      quantityNeeded: 1
    });

    // Sin imagen
    component.productForm.patchValue({
      name: 'Hamburguesa Sin Foto',
      description: '',
      price: 18000,
      imageUrl: '',
      type: 'Comida'
    });

    component.createProduct();

    expect(component.productError).toContain('imagen');
    expect(db.activeProducts.some(p => p.name === 'Hamburguesa Sin Foto')).toBe(false);
  });

  it('permite registrar productos con imagen obligatoria y descripción vacía u opcional', () => {
    component.addRecipeItem();
    component.recipeItems.at(0).setValue({
      insumoCode: 'PAN-01',
      quantityNeeded: 1
    });

    // Con imagen y descripción vacía
    component.productForm.patchValue({
      name: 'Hamburguesa Con Foto',
      description: '',
      price: 22000,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
      type: 'Comida'
    });

    component.createProduct();

    expect(component.productError).toBe('');
    expect(component.productMessage).toContain('creado correctamente');

    const creado = db.activeProducts.find(p => p.name === 'Hamburguesa Con Foto');
    expect(creado).toBeDefined();
    expect(creado?.imageUrl).toBe('https://images.unsplash.com/photo-1568901346375-23c9450c58cd');
    expect(creado?.description).toBe('');
  });

  it('gestiona la eliminación de productos mediante modal de confirmación integrado sin window.confirm', () => {
    const product = db.activeProducts[0];
    expect(product).toBeDefined();

    // Abrir modal de confirmación
    component.openDeleteProduct(product);
    expect(component.deleteProductModalVisible).toBe(true);
    expect(component.deletingProduct).toEqual(product);

    let toastMensaje = '';
    const sub = toastService.toasts$.subscribe(toasts => {
      if (toasts.length) toastMensaje = toasts[toasts.length - 1].mensaje;
    });

    // Confirmar eliminación
    component.confirmDeleteProduct();
    expect(component.deleteProductModalVisible).toBe(false);
    expect(component.deletingProduct).toBeNull();
    expect(toastMensaje).toContain('eliminado');
    expect(component.productMessage).toBe('');
    sub.unsubscribe();

    const existe = db.activeProducts.some(p => p.id === product.id);
    expect(existe).toBe(false);
  });

  it('abre el modal de edición de producto con los datos precargados y permite guardar cambios', () => {
    const product = db.activeProducts[0];
    expect(product).toBeDefined();

    // Abrir modal de edición
    component.openEditProduct(product);
    expect(component.editProductModalVisible).toBe(true);
    expect(component.editingProduct).toEqual(product);
    expect(component.editProductForm.value.name).toBe('Producto Existente');
    expect(component.editProductForm.value.price).toBe(15000);
    expect(component.editRecipeItems.length).toBe(1);

    // Modificar datos válidos
    component.editProductForm.patchValue({
      name: 'Producto Modificado',
      price: 19500
    });

    let toastMensaje = '';
    const sub = toastService.toasts$.subscribe(toasts => {
      if (toasts.length) toastMensaje = toasts[toasts.length - 1].mensaje;
    });

    // Guardar cambios
    component.saveEditedProduct();
    expect(component.editProductModalVisible).toBe(false);
    expect(toastMensaje).toContain('actualizado correctamente');
    expect(component.productMessage).toBe('');
    sub.unsubscribe();

    const actualizado = db.activeProducts.find(p => p.id === product.id);
    expect(actualizado?.name).toBe('Producto Modificado');
    expect(actualizado?.price).toBe(19500);
  });

  it('valida campos obligatorios en el modal de edición e impide guardar datos incompletos', () => {
    const product = db.activeProducts[0];
    component.openEditProduct(product);

    // Nombre vacío
    component.editProductForm.patchValue({ name: '' });
    component.saveEditedProduct();
    expect(component.editProductModalVisible).toBe(true);
    expect(component.editProductError).toContain('nombre');

    // Precio inválido
    component.editProductForm.patchValue({ name: 'Válido', price: -500 });
    component.saveEditedProduct();
    expect(component.editProductModalVisible).toBe(true);
    expect(component.editProductError).toContain('precio');
  });

  it('permite filtrar el Kardex por tipo de movimiento, insumo, producto y limpiar filtros', () => {
    // Agregar proveedor y registrar compra recibida
    db.addProvider({
      name: 'Distribuidor Pan',
      nit: '900123456',
      contactName: 'Carlos',
      phone: '3001234567',
      email: 'pan@distribuidor.com'
    });

    const providerId = db.providers[0].id;
    db.createPurchase({
      providerId,
      date: new Date().toISOString(),
      items: [{
        supplyCode: 'PAN-01',
        supplyName: 'Pan',
        unitOfMeasure: 'unidades',
        packages: 5,
        unitsPerPackage: 1,
        packageCost: 1000,
        baseQuantity: 5,
        costPerBaseUnit: 1000,
        subtotal: 5000
      }]
    }, true);

    expect(component.movements().length).toBeGreaterThan(0);

    // Filtrar por tipo 'compra'
    component.kardexTipoFiltro = 'compra';
    expect(component.filteredMovements.every(m => m.type === 'compra')).toBe(true);

    // Filtrar por insumo 'PAN-01'
    component.kardexInsumoFiltro = 'PAN-01';
    expect(component.filteredMovements.every(m => m.supplyCode === 'PAN-01')).toBe(true);

    // Limpiar filtros
    component.limpiarFiltrosKardex();
    expect(component.kardexTipoFiltro).toBe('');
    expect(component.kardexInsumoFiltro).toBe('');
    expect(component.filteredMovements.length).toBe(component.movements().length);
  });

  it('obtiene la unidad de medida real de cada insumo en el Kardex', () => {
    expect(component.supplyUnit('PAN-01')).toBe('unidades');
    expect(component.supplyUnit('CAR-01')).toBe('gramos');
    expect(component.supplyUnit('INEXISTENTE')).toBe('');
  });

  it('permite buscar insumos por código o nombre y filtrar por estado (CU-08)', () => {
    expect(component.filteredSupplies.length).toBe(2);

    // Buscar por código
    component.insumoBusqueda = 'PAN-01';
    expect(component.filteredSupplies.length).toBe(1);
    expect(component.filteredSupplies[0].code).toBe('PAN-01');

    // Buscar por nombre
    component.insumoBusqueda = 'Carne';
    expect(component.filteredSupplies.length).toBe(1);
    expect(component.filteredSupplies[0].code).toBe('CAR-01');

    // Buscar término inexistente (RF-43)
    component.insumoBusqueda = 'INEXISTENTE';
    expect(component.filteredSupplies.length).toBe(0);

    // Limpiar búsqueda
    component.limpiarFiltrosInsumos();
    expect(component.filteredSupplies.length).toBe(2);
    expect(component.hayFiltrosInsumosActivos).toBe(false);

    // Filtrar por estado
    component.filtrarInsumosPorEstado('Agotado');
    expect(component.insumoFiltroEstado).toBe('Agotado');
    expect(component.filteredSupplies.every(s => s.status === 'Agotado')).toBe(true);
  });
});

