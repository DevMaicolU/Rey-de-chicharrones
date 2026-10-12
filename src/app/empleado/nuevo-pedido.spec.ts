import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { CartService } from '../servicios/cart.service';
import { DatabaseService } from '../servicios/database.service';
import { Product } from '../entidades/modelos';
import { NuevoPedido } from './nuevo-pedido';

const lomo: Product = {
  id: 'lomo', idApi: 'lomo', name: 'Lomo de prueba', description: '', type: 'Comida', price: 28000,
  imageUrl: null, recipe: [{ insumoCode: 'PAN-001', quantityNeeded: 1 }], ingredients: [], status: 'Activo'
};

describe('NuevoPedido', () => {
  let cart: CartService;
  let db: DatabaseService;
  let fixture: ComponentFixture<NuevoPedido>;
  let navegaciones: string[];

  const campoCantidad = () => fixture.nativeElement.querySelector('input[aria-label="Cantidad"]') as HTMLInputElement;
  const escribirCantidad = (valor: string) => {
    const campo = campoCantidad();
    campo.value = valor;
    campo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const ordenes = () => { let n = 0; db.orders$.subscribe(o => n = o.length).unsubscribe(); return n; };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    cart = TestBed.inject(CartService);
    db = TestBed.inject(DatabaseService);
    TestBed.inject(AuthService).login('empleado', 'empleado123');
    db.addProvider({
      name: 'Proveedor de pruebas',
      nit: '900000001',
      contactName: 'Contacto',
      phone: '3000000000',
      email: 'proveedor-pruebas@example.com'
    });
    db.addInsumo({ code: 'PAN-001', name: 'Pan de prueba', unitOfMeasure: 'unidades' });
    db.addActiveProduct(lomo);
    db.createPurchase({
      providerId: 1, date: new Date().toISOString(), items: [{
        supplyCode: 'PAN-001', supplyName: '', unitOfMeasure: 'unidades',
        packages: 10, unitsPerPackage: 1, packageCost: 10,
        baseQuantity: 0, costPerBaseUnit: 0, subtotal: 0
      }]
    }, true);

    navegaciones = [];
    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => { navegaciones.push(url); return Promise.resolve(true); }) as Router['navigateByUrl'];

    cart.agregarAlCarrito(lomo, 2);
    fixture = TestBed.createComponent(NuevoPedido);
    fixture.detectChanges();
  });

  it('muestra los productos del carrito', () => {
    expect(fixture.nativeElement.textContent).toContain('Lomo de prueba');
    expect(campoCantidad().value).toBe('2');
  });

  it('si se borra el campo de cantidad, el producto se conserva con su cantidad anterior', () => {
    escribirCantidad('');
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].cantidad).toBe(2);
    expect(campoCantidad().value).toBe('2');
  });

  it('una cantidad menor a 1 se corrige a 1 y así se muestra', () => {
    escribirCantidad('0');
    expect(cart.items[0].cantidad).toBe(1);
    expect(campoCantidad().value).toBe('1');
  });

  it('actualiza la cantidad y el subtotal al escribir un número válido', () => {
    escribirCantidad('5');
    expect(cart.items[0].cantidad).toBe(5);
    expect(cart.total()).toBe(140000);
  });

  it('no finaliza el pedido sin una mesa válida', () => {
    const componente = fixture.componentInstance;
    componente.customerName = 'Ana';
    componente.tableNumber = null;
    componente.finalizarPedido();
    expect(componente.error).toContain('mesa');
    componente.tableNumber = 2.5;
    componente.finalizarPedido();
    expect(componente.error).toContain('mesa');
    expect(ordenes()).toBe(0);
    expect(cart.items).toHaveLength(1);
  });

  it('no finaliza el pedido sin nombre de cliente', () => {
    const componente = fixture.componentInstance;
    componente.tableNumber = 3;
    componente.customerName = '   ';
    componente.finalizarPedido();
    expect(componente.error).toContain('cliente');
    expect(ordenes()).toBe(0);
  });

  it('al finalizar crea el pedido, vacía el carrito y va a Mis Registros', () => {
    const componente = fixture.componentInstance;
    componente.tableNumber = 4;
    componente.customerName = ' Ana ';
    componente.finalizarPedido();

    let guardado: { customerName: string; total: number; tableNumber: number }[] = [];
    db.orders$.subscribe(o => guardado = o).unsubscribe();
    expect(guardado).toHaveLength(1);
    expect(guardado[0].customerName).toBe('Ana');
    expect(guardado[0].total).toBe(56000);
    expect(guardado[0].tableNumber).toBe(4);
    expect(cart.items).toHaveLength(0);
    expect(navegaciones).toEqual(['/empleado/registros']);
  });
});
