import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Compras } from './compras';
import { DatabaseService } from '../servicios/database.service';

describe('Compras', () => {
  let fixture: ComponentFixture<Compras>;
  let component: Compras;
  let db: DatabaseService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Compras]
    });

    db = TestBed.inject(DatabaseService);
    db.addProvider({
      name: 'Proveedor Central',
      nit: '900123456',
      contactName: 'Carlos',
      phone: '3001234567',
      email: 'central@proveedor.com'
    });
    db.addSupply({
      code: 'PAN-01',
      name: 'Pan',
      unitOfMeasure: 'unidades'
    });
    db.addSupply({
      code: 'QUESO-01',
      name: 'Queso',
      unitOfMeasure: 'unidades'
    });

    fixture = TestBed.createComponent(Compras);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('permite gestionar múltiples líneas de compra independientes sin trasladar datos entre ellas', () => {
    expect(component.lines.length).toBe(1);

    // Llenar primera línea
    component.lines.at(0).setValue({
      supplyCode: 'PAN-01',
      packages: 5,
      unitsPerPackage: 2,
      packageCost: 10000
    });

    // Agregar segunda línea
    component.addLine();
    expect(component.lines.length).toBe(2);

    // La primera línea conserva sus propios valores de forma intacta
    expect(component.lines.at(0).getRawValue()).toEqual({
      supplyCode: 'PAN-01',
      packages: 5,
      unitsPerPackage: 2,
      packageCost: 10000
    });

    // La segunda línea inicia limpia con sus valores por defecto
    expect(component.lines.at(1).getRawValue().supplyCode).toBe('');
    expect(component.lines.at(1).getRawValue().packages).toBe(1);
    expect(component.lines.at(1).getRawValue().packageCost).toBe(0);

    // Llenar segunda línea con datos diferentes
    component.lines.at(1).setValue({
      supplyCode: 'QUESO-01',
      packages: 3,
      unitsPerPackage: 1,
      packageCost: 20000
    });

    // Cálculos de subtotales independientes
    // Línea 1: 5 * 10000 = 50000
    expect(component.lineTotal(component.lines.at(0))).toBe(50000);
    // Línea 2: 3 * 20000 = 60000
    expect(component.lineTotal(component.lines.at(1))).toBe(60000);

    // Total general de la compra: 50000 + 60000 = 110000
    expect(component.total()).toBe(110000);

    // Quitar la primera línea y verificar que la restante conserva sus datos
    component.removeLine(0);
    expect(component.lines.length).toBe(1);
    expect(component.lines.at(0).getRawValue().supplyCode).toBe('QUESO-01');
    expect(component.total()).toBe(60000);
  });

  it('utiliza modales de confirmación integrados para recibir y anular compras sin window.confirm', () => {
    const provider = db.providers.find(p => p.active);
    expect(provider).toBeDefined();

    const created = db.createPurchase({
      providerId: provider!.id,
      date: new Date().toISOString(),
      items: [{
        supplyCode: 'PAN-01',
        supplyName: 'Pan',
        unitOfMeasure: 'unidades',
        packages: 2,
        unitsPerPackage: 1,
        packageCost: 5000,
        baseQuantity: 2,
        costPerBaseUnit: 5000,
        subtotal: 10000
      }]
    }, false);

    expect(created.ok).toBe(true);
    const purchaseId = created.purchase!.purchaseId;

    // Abrir modal de confirmación para recibir
    component.openReceiveConfirm(purchaseId);
    expect(component.purchaseModal).toBeDefined();
    expect(component.purchaseModal?.action).toBe('receive');

    // Confirmar la acción mediante el modal
    component.confirmPurchaseAction();
    expect(component.purchaseModal).toBeNull();
    expect(component.message).toContain('Compra recibida');

    const recibida = db.purchases.find(p => p.purchaseId === purchaseId);
    expect(recibida?.status).toBe('recibida');
  });
});
