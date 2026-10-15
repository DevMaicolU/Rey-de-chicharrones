import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Inventario } from './inventario';
import { DatabaseService } from '../servicios/database.service';

describe('Inventario', () => {
  let fixture: ComponentFixture<Inventario>;
  let component: Inventario;
  let db: DatabaseService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Inventario]
    });

    db = TestBed.inject(DatabaseService);
    db.addSupply({
      code: 'PAN-01',
      name: 'Pan',
      unitOfMeasure: 'unidades'
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

    // Confirmar eliminación
    component.confirmDeleteProduct();
    expect(component.deleteProductModalVisible).toBe(false);
    expect(component.deletingProduct).toBeNull();
    expect(component.productMessage).toContain('eliminado');

    const existe = db.activeProducts.some(p => p.id === product.id);
    expect(existe).toBe(false);
  });
});
