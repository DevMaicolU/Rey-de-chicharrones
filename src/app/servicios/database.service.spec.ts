import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { Product } from '../entidades/modelos';

const producto: Product = {
  id: 'p1', idApi: 'p1', name: 'Plato de prueba', description: '', type: 'Comida', price: 10000,
  imageUrl: null, recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }], ingredients: ['a', 'b'], status: 'Activo'
};

/** Simula recargar la página: se descarta el servicio y se crea uno nuevo que lee de localStorage. */
function recargar(): DatabaseService {
  TestBed.resetTestingModule();
  return TestBed.inject(DatabaseService);
}

function prepararDatosOperativos(db: DatabaseService): void {
  db.addProvider({
    name: 'Proveedor de pruebas',
    nit: '900000001',
    contactName: 'Contacto',
    phone: '3000000000',
    email: 'proveedor-pruebas@example.com'
  });
  db.addInsumo({ code: 'PAN-001', name: 'Pan de prueba', unitOfMeasure: 'unidades' });
}

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    db = TestBed.inject(DatabaseService);
    prepararDatosOperativos(db);
  });

  it('inicia sin productos ni insumos comerciales en un almacenamiento vacío', () => {
    localStorage.clear();
    const empty = recargar();
    expect(empty.activeProducts).toHaveLength(0);
    expect(empty.supplies).toHaveLength(0);
    expect(empty.providers).toHaveLength(0);
  });

  it('limpia semillas históricas conocidas sin borrar relaciones reales', () => {
    localStorage.setItem('manila-db-v3', JSON.stringify({
      users: [{ id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' }],
      supplies: [{ code: 'PAN-001', name: 'Pan de hamburguesa', unitOfMeasure: 'unidades', quantity: 0, minimumQuantity: 20 }],
      activeProducts: [{
        id: 'comida-hamburguesa-clasica', name: 'Hamburguesa Clásica', description: 'demo',
        type: 'Comida', price: 10, recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }]
      }],
      providers: [{ id: 1, name: 'Multileches S.A.S.', nit: 'demo', contactName: '', phone: '', email: 'demo@example.com', active: true }],
      purchases: [], stockMovements: [], orders: []
    }));
    const migrated = recargar();
    expect(migrated.supplies).toHaveLength(0);
    expect(migrated.activeProducts).toHaveLength(0);
    expect(migrated.providers).toHaveLength(0);
  });

  it('arranca con el admin y el empleado por defecto', () => {
    expect(db.users.map(u => u.username)).toEqual(['admin', 'empleado']);
  });

  it('busca usuarios ignorando mayúsculas en el nombre de usuario pero no en la contraseña', () => {
    expect(db.findUser(' ADMIN ', 'admin123')?.role).toBe('admin');
    expect(db.findUser('admin', 'ADMIN123')).toBeUndefined();
  });

  it('rechaza usuarios duplicados (sin importar mayúsculas)', () => {
    const resultado = db.addUser({ username: 'Empleado', password: 'x', name: 'Otro', role: 'empleado' });
    expect(resultado.ok).toBe(false);
    expect(db.users).toHaveLength(2);
  });

  it('rechaza usuarios con campos vacíos', () => {
    expect(db.addUser({ username: ' ', password: 'x', name: 'Ana', role: 'empleado' }).ok).toBe(false);
    expect(db.addUser({ username: 'ana', password: '', name: 'Ana', role: 'empleado' }).ok).toBe(false);
  });

  it('no permite eliminar al único administrador, pero sí cuando hay otro', () => {
    const admin = db.users.find(u => u.role === 'admin')!;
    expect(db.deleteUser(admin.id).ok).toBe(false);

    db.addUser({ username: 'jefe', password: 'x', name: 'Jefe', role: 'admin' });
    expect(db.deleteUser(admin.id).ok).toBe(true);
    expect(db.userExists(admin.id)).toBe(false);
  });

  it('valida proveedores vacíos y duplicados', () => {
    expect(db.addProvider({ name: '', nit: '', contactName: '', phone: '', email: '' }).ok).toBe(false);
    expect(db.addProvider({ name: 'Carnes', nit: '900', contactName: '', phone: '', email: 'carnes2@example.com' }).ok).toBe(true);
    expect(db.addProvider({ name: 'Otro', nit: '900', contactName: '', phone: '', email: 'otro@example.com' }).ok).toBe(false);
  });

  it('no duplica productos activos', () => {
    db.addActiveProduct(producto);
    db.addActiveProduct(producto);
    expect(db.activeProducts.filter(item => item.id === 'p1')).toHaveLength(1);
    db.removeActiveProduct('p1');
    expect(db.activeProducts.some(item => item.id === 'p1')).toBe(false);
  });

  it('edita productos sin cambiar su identificador ni existencias', () => {
    const created = db.addManualProduct({
      name: 'Producto editable', description: 'Inicial', price: 100,
      type: 'Comida', recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }]
    });
    expect(created.ok).toBe(true);
    const beforeQuantity = db.supplies.find(item => item.code === 'PAN-001')?.quantity;
    const updated = db.updateManualProduct(created.product!.id, {
      name: 'Producto actualizado', description: 'Actualizado', price: 120,
      type: 'Comida', recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 2 }]
    });
    expect(updated.ok).toBe(true);
    expect(updated.product?.id).toBe(created.product?.id);
    expect(db.activeProducts.find(item => item.id === created.product?.id)?.name).toBe('Producto actualizado');
    expect(db.supplies.find(item => item.code === 'PAN-001')?.quantity).toBe(beforeQuantity);
  });

  it('asigna ids consecutivos a los pedidos', () => {
    const base = { tableNumber: 1, customerName: 'Ana', employeeId: 2, employeeName: 'E', items: [], total: 0 };
    db.addOrder(base);
    db.addOrder(base);
    let ids: number[] = [];
    db.orders$.subscribe(orders => ids = orders.map(o => o.id)).unsubscribe();
    expect(ids).toEqual([1, 2]);
  });

  it('conserva los datos después de recargar la página', () => {
    db.addUser({ username: 'ana', password: 'x', name: 'Ana', role: 'empleado' });
    db.addActiveProduct(producto);
    db.addProvider({ name: 'Nuevo', nit: '901', contactName: '', phone: '', email: 'nuevo@ejemplo.com' });
    db.addOrder({ tableNumber: 3, customerName: 'Luis', employeeId: 2, employeeName: 'E', items: [], total: 5 });

    const recargado = recargar();
    expect(recargado.users.map(u => u.username)).toContain('ana');
    expect(recargado.activeProducts.map(p => p.idApi)).toContain('p1');
    let proveedores: string[] = [];
    let pedidos = 0;
    recargado.providers$.subscribe(p => proveedores = p.map(item => `${item.name} - ${item.email}`)).unsubscribe();
    recargado.orders$.subscribe(o => pedidos = o.length).unsubscribe();
    expect(proveedores).toContain('Nuevo - nuevo@ejemplo.com');
    expect(pedidos).toBe(1);
  });

  it('usa los datos por defecto si lo guardado está corrupto', () => {
    localStorage.setItem('manila-db-v1', '{esto no es json');
    expect(recargar().users).toHaveLength(2);
  });

  it('restaura el admin por defecto si lo guardado no tiene ningún administrador', () => {
    localStorage.setItem('manila-db-v1', JSON.stringify({
      users: [{ id: 5, username: 'solo', password: 'x', role: 'empleado', name: 'Solo' }]
    }));
    const roles = recargar().users.map(u => u.role);
    expect(roles).toContain('admin');
  });

  it('valida recetas, compras y recepción idempotente', () => {
    expect(db.addManualProduct({
      name: 'Receta válida', description: 'Prueba', price: 100,
      type: 'Comida', recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }]
    }).ok).toBe(true);
    expect(db.addManualProduct({
      name: 'Receta huérfana', description: 'Prueba', price: 100,
      type: 'Comida', recipe: [{ insumoCode: 'NO-EXISTE', quantityNeeded: 1 }]
    }).ok).toBe(false);
    expect(db.addManualProduct({
      name: 'Receta repetida', description: 'Prueba', price: 100,
      type: 'Comida', recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }, { insumoCode: 'PAN-001', quantityNeeded: 2 }]
    }).ok).toBe(false);

    const purchase = db.createPurchase({
      providerId: 1, date: new Date().toISOString(), items: [{
        supplyCode: 'PAN-001', supplyName: '', unitOfMeasure: 'unidades',
        packages: 2, unitsPerPackage: 10, packageCost: 50,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, false);
    expect(purchase.ok).toBe(true);
    expect(db.supplies.find(item => item.code === 'PAN-001')?.quantity).toBe(0);
    expect(db.receivePurchase(purchase.purchase!.purchaseId).ok).toBe(true);
    expect(db.supplies.find(item => item.code === 'PAN-001')?.quantity).toBe(20);
    const movementCount = db.stockMovements.length;
    expect(db.receivePurchase(purchase.purchase!.purchaseId).ok).toBe(false);
    expect(db.stockMovements).toHaveLength(movementCount);
  });

  it('preserva el proveedor preferido y calcula costo promedio ponderado', () => {
    expect(db.updateInsumo('PAN-001', { preferredProviderId: 1 }).ok).toBe(true);
    expect(db.updateInsumo('PAN-001', { name: 'Pan actualizado' }).ok).toBe(true);
    expect(db.supplies.find(item => item.code === 'PAN-001')?.preferredProviderId).toBe(1);
    const result = db.createPurchase({
      providerId: 1, date: new Date().toISOString(), items: [{
        supplyCode: 'PAN-001', supplyName: '', unitOfMeasure: 'unidades',
        packages: 1, unitsPerPackage: 10, packageCost: 100,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, true);
    expect(result.ok).toBe(true);
    expect(db.supplies.find(item => item.code === 'PAN-001')?.averageCost).toBe(10);
    expect(db.supplies.find(item => item.code === 'PAN-001')?.lastCost).toBe(10);
  });

  it('normaliza ids de proveedor provenientes de selectores y comparte la validación', () => {
    const provider = db.providers[0];
    const preferred = db.addSupply({
      code: 'PROV-STRING',
      name: 'Insumo con proveedor',
      unitOfMeasure: 'unidades',
      preferredProviderId: String(provider.id) as unknown as number
    });
    expect(preferred.ok).toBe(true);
    expect(db.supplies.find(item => item.code === 'PROV-STRING')?.preferredProviderId).toBe(provider.id);

    const purchase = db.createPurchase({
      providerId: String(provider.id) as unknown as number,
      date: new Date().toISOString(),
      items: [{
        supplyCode: 'PROV-STRING', supplyName: '', unitOfMeasure: 'unidades',
        packages: 1, unitsPerPackage: 2, packageCost: 20,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, false);
    expect(purchase.ok).toBe(true);
    expect(purchase.purchase?.providerId).toBe(provider.id);
  });

  it('conserva el estado activo canónico y relaciones al recargar', () => {
    const provider = db.providers[0];
    db.addSupply({
      code: 'LEGACY-PROV',
      name: 'Insumo legado',
      unitOfMeasure: 'gramos',
      preferredProviderId: provider.id
    });
    db.createPurchase({
      providerId: provider.id,
      date: new Date().toISOString(),
      items: [{
        supplyCode: 'LEGACY-PROV', supplyName: '', unitOfMeasure: 'gramos',
        packages: 1, unitsPerPackage: 10, packageCost: 50,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, false);
    const persisted = JSON.parse(localStorage.getItem('manila-db-v3')!);
    persisted.providers = persisted.providers.map((item: { id: number; active: boolean }) =>
      item.id === provider.id ? { ...item, id: String(item.id), isActive: item.active, active: undefined } : item
    );
    persisted.supplies = persisted.supplies.map((item: { code: string; preferredProviderId?: number }) =>
      item.code === 'LEGACY-PROV' ? { ...item, preferredProviderId: String(provider.id) } : item
    );
    localStorage.setItem('manila-db-v3', JSON.stringify(persisted));

    const reloaded = recargar();
    const reloadedProvider = reloaded.getProviderById(provider.id);
    expect(reloadedProvider?.id).toBe(provider.id);
    expect(reloadedProvider?.active).toBe(true);
    expect(reloaded.supplies.find(item => item.code === 'LEGACY-PROV')?.preferredProviderId).toBe(provider.id);
    expect(reloaded.purchases).toHaveLength(1);
    expect(reloaded.purchases[0].providerId).toBe(provider.id);
  });

  it('rechaza proveedores inactivos o inexistentes en insumos y compras', () => {
    expect(db.setProviderActive(1, false).ok).toBe(true);
    expect(db.addSupply({
      code: 'INACTIVE-PROV',
      name: 'Insumo inválido',
      unitOfMeasure: 'unidades',
      preferredProviderId: 1
    }).error).toBe('El proveedor preferido debe existir y estar activo.');
    const inactivePurchase = db.createPurchase({
      providerId: 1,
      date: new Date().toISOString(),
      items: [{
        supplyCode: 'PAN-001', supplyName: '', unitOfMeasure: 'unidades',
        packages: 1, unitsPerPackage: 1, packageCost: 10,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, false);
    expect(inactivePurchase.error).toBe('Selecciona un proveedor activo.');
    const unknownPurchase = db.createPurchase({
      providerId: 999,
      date: new Date().toISOString(),
      items: []
    }, false);
    expect(unknownPurchase.error).toBe('Selecciona un proveedor activo.');
  });

  it('impide dependencias históricas y ventas sin stock', () => {
    db.addInsumo({ code: 'CAR-001', name: 'Carne de prueba', unitOfMeasure: 'gramos' });
    const product = db.addManualProduct({
      name: 'Producto con receta', description: 'Prueba', price: 100,
      type: 'Comida', recipe: [{ insumoCode: 'CAR-001', quantityNeeded: 100 }]
    });
    expect(product.ok).toBe(true);
    expect(db.deleteInsumo('CAR-001').ok).toBe(false);
    db.createPurchase({
      providerId: 1, date: new Date().toISOString(), items: [{
        supplyCode: 'PAN-001', supplyName: '', unitOfMeasure: 'unidades',
        packages: 1, unitsPerPackage: 1, packageCost: 10,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, false);
    expect(db.deleteProvider(1).ok).toBe(false);
    const sale = db.registrarVenta({
      tableNumber: 1, customerName: 'Ana', employeeId: 2, employeeName: 'Empleado',
      items: [{ productId: product.product!.id, productName: product.product!.name, quantity: 1, unitPrice: 100 }],
      paymentMethod: 'efectivo', applyDiscount: false
    });
    expect(sale.ok).toBe(false);
    expect(db.orders).toHaveLength(0);
  });
});
