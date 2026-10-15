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

  it('permite abrir el modal de edición, buscar y agregar un producto por autocomplete', () => {
    const componente = fixture.componentInstance;
    const pedidoMock = {
      id: 'ped-1',
      mesa: 2,
      cliente: 'Carlos',
      cedulaCliente: '1020304050',
      empleadoId: 2,
      empleadoNombre: 'Empleado Principal',
      items: [{ producto: lomo, cantidad: 1, subtotal: 28000 }],
      total: 28000,
      fecha: new Date().toISOString(),
      hora: '20:00',
      estado: 'en-espera' as const
    };

    componente.abrirEdicion(pedidoMock);
    expect(componente.pedidoEditando).toBe(pedidoMock);
    expect(componente.itemsEditando).toHaveLength(1);
    expect(componente.busquedaMenu).toBe('');
    expect(componente.mostrarDropdownMenu).toBe(false);

    // Búsqueda en autocomplete
    componente.busquedaMenu = 'lomo';
    expect(componente.productosFiltradosComida()).toHaveLength(1);
    expect(componente.tieneResultadosBusqueda()).toBe(true);

    // Agregar producto existente incrementa cantidad
    componente.seleccionarProductoAutocomplete(lomo);
    expect(componente.itemsEditando[0].cantidad).toBe(2);
    expect(componente.itemsEditando[0].subtotal).toBe(56000);
    expect(componente.totalEdicion()).toBe(56000);
    expect(componente.busquedaMenu).toBe('');
    expect(componente.mostrarDropdownMenu).toBe(false);

    // Disminuir y quitar
    componente.cambiarCantidadEdicion(componente.itemsEditando[0], 1);
    expect(componente.itemsEditando[0].cantidad).toBe(1);
    expect(componente.totalEdicion()).toBe(28000);

    componente.eliminarItemEdicion(componente.itemsEditando[0]);
    expect(componente.itemsEditando).toHaveLength(0);
    expect(componente.totalEdicion()).toBe(0);

    componente.cerrarEdicion();
    expect(componente.pedidoEditando).toBeNull();
  });

  it('no agrega ni incrementa productos si no hay suficiente stock en insumos', () => {
    const componente = fixture.componentInstance;
    const pedidoMock = {
      id: 'ped-2',
      mesa: 3,
      cliente: 'Mario',
      cedulaCliente: '1020304051',
      empleadoId: 2,
      empleadoNombre: 'Empleado Principal',
      items: [{ producto: lomo, cantidad: 10, subtotal: 280000 }], // Ya tiene 10 unidades (todo el stock de PAN-001)
      total: 280000,
      fecha: new Date().toISOString(),
      hora: '20:00',
      estado: 'en-espera' as const
    };

    componente.abrirEdicion(pedidoMock);
    // Intentar agregar otra unidad cuando no hay más stock
    componente.seleccionarProductoAutocomplete(lomo);
    // Debe mantenerse en 10 porque no hay stock para la 11va
    expect(componente.itemsEditando[0].cantidad).toBe(10);
  });

  it('registrarPedido descuenta el stock inmediatamente y previene sobreventa', () => {
    const componente = fixture.componentInstance;
    const stockPan = () => db.supplies.find(s => s.code === 'PAN-001')?.quantity;
    // Había 10 unidades iniciales de PAN-001
    expect(stockPan()).toBe(10);

    // Carrito tiene 2 lomos (consumen 2 PAN-001)
    componente.tableNumber = 5;
    componente.customerName = 'Julian';
    componente.customerCedula = '12345678';
    componente.registrarPedido();

    // El stock debe reducirse de 10 a 8 inmediatamente
    expect(stockPan()).toBe(8);
    expect(cart.items).toHaveLength(0);

    // Ahora intentamos agregar 9 unidades (solo quedan 8 en inventario)
    cart.agregarAlCarrito(lomo, 9);
    // CartService rechaza la adición por falta de stock
    expect(cart.items).toHaveLength(0);

    // Si agregamos exactamente las 8 restantes
    cart.agregarAlCarrito(lomo, 8);
    expect(cart.items[0].cantidad).toBe(8);

    componente.tableNumber = 6;
    componente.customerName = 'Diana';
    componente.customerCedula = '87654321';
    componente.registrarPedido();

    // El stock queda exactamente en 0
    expect(stockPan()).toBe(0);

    // Si alguien intenta pedir 1 más, no puede
    cart.agregarAlCarrito(lomo, 1);
    expect(cart.items).toHaveLength(0);
  });

  it('cancela un pedido en espera y reintegra el stock al inventario', () => {
    const componente = fixture.componentInstance;
    const stockPan = () => db.supplies.find(s => s.code === 'PAN-001')?.quantity;

    // Pedido con 2 lomos
    componente.tableNumber = 7;
    componente.customerName = 'Esteban';
    componente.customerCedula = '11223344';
    componente.registrarPedido();
    expect(stockPan()).toBe(8);

    const pedido = componente.pedidosEnEspera().find(p => p.mesa === 7)!;
    expect(pedido).toBeDefined();

    // Cancelar pedido
    componente.abrirCancelacion(pedido);
    componente.confirmarCancelacion();

    // El stock vuelve de 8 a 10
    expect(stockPan()).toBe(10);
  });

  it('valida el monto recibido, calcula el vuelto correctamente e impide pagar con monto menor en efectivo', () => {
    const componente = fixture.componentInstance;

    // Crear un pedido
    componente.tableNumber = 8;
    componente.customerName = 'Catalina';
    componente.customerCedula = '99887766';
    componente.registrarPedido();

    const pedido = componente.pedidosEnEspera().find(p => p.mesa === 8)!;
    expect(pedido).toBeDefined();
    expect(pedido.total).toBe(56000); // 2 lomos * 28000 = 56000

    // Abrir modal de cobro
    componente.abrirCobro(pedido);
    expect(componente.totalCobro()).toBe(56000);
    expect(componente.paymentMethod).toBe('efectivo');
    expect(componente.montoRecibido).toBeNull();
    // En efectivo, si no ha ingresado monto, el pago no es válido
    expect(componente.pagoValido()).toBe(false);

    // Intentar pagar con monto menor (ej: 50.000 cuando el total es 56.000)
    componente.montoRecibido = 50000;
    expect(componente.pagoValido()).toBe(false);
    expect(componente.vuelto()).toBe(0);

    // Intentar finalizar cobro con monto menor: debe fallar con error
    componente.finalizarCobro();
    expect(componente.errorCobro).toContain('no puede ser menor');

    // Usar botón de monto exacto
    componente.fijarMontoExacto();
    expect(componente.montoRecibido).toBe(56000);
    expect(componente.pagoValido()).toBe(true);
    expect(componente.vuelto()).toBe(0);

    // Pagar con un billete mayor (ej: 100.000)
    componente.fijarMonto(100000);
    expect(componente.pagoValido()).toBe(true);
    // Vuelto debe ser 100.000 - 56.000 = 44.000
    expect(componente.vuelto()).toBe(44000);

    // Con descuento del 10%
    componente.applyDiscount = true;
    componente.onDiscountChange();
    // Nuevo total: 56.000 - 5.600 = 50.400
    expect(componente.totalCobro()).toBe(50400);
    // Vuelto con 100.000: 100.000 - 50.400 = 49.600
    expect(componente.vuelto()).toBe(49600);

    // Finalizar cobro exitosamente
    componente.finalizarCobro();
    expect(componente.errorCobro).toBe('');
    expect(componente.modalCobroVisible()).toBe(false);

    // Verificar que la orden guardó amountPaid y change
    const ultimaOrden = db.orders[db.orders.length - 1];
    expect(ultimaOrden.amountPaid).toBe(100000);
    expect(ultimaOrden.change).toBe(49600);
  });

  it('permite cobrar normalmente sin solicitar monto recibido ni vuelto cuando el método de pago no es efectivo', () => {
    const componente = fixture.componentInstance;

    // Crear un pedido
    componente.tableNumber = 9;
    componente.customerName = 'Mariana';
    componente.customerCedula = '11223344';
    componente.registrarPedido();

    const pedido = componente.pedidosEnEspera().find(p => p.mesa === 9)!;
    expect(pedido).toBeDefined();

    // Abrir modal de cobro y seleccionar método no efectivo (ej: Nequi)
    componente.abrirCobro(pedido);
    componente.paymentMethod = 'nequi';
    componente.onPaymentMethodChange();

    expect(componente.montoRecibido).toBeNull();
    // Para pagos electrónicos pasa normal sin exigir monto recibido
    expect(componente.pagoValido()).toBe(true);

    componente.finalizarCobro();
    expect(componente.errorCobro).toBe('');
    expect(componente.modalCobroVisible()).toBe(false);

    const ordenNequi = db.orders[db.orders.length - 1];
    expect(ordenNequi.paymentMethod).toBe('nequi');
    expect(ordenNequi.amountPaid).toBeUndefined();
    expect(ordenNequi.change).toBeUndefined();
  });

  it('cierra el menú de autocompletado al hacer clic por fuera o presionar escape', () => {
    const componente = fixture.componentInstance;
    componente.mostrarDropdownMenu = true;

    // Presionar escape
    componente.onEscapePress();
    expect(componente.mostrarDropdownMenu).toBe(false);

    // Abrir de nuevo y simular clic por fuera
    componente.mostrarDropdownMenu = true;
    const dummyElement = document.createElement('div');
    document.body.appendChild(dummyElement);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: dummyElement });
    componente.onDocumentClick(event);

    expect(componente.mostrarDropdownMenu).toBe(false);
    dummyElement.remove();
  });

  it('impide registrar pedidos simultáneos en curso para la misma mesa o la misma cédula', () => {
    const componente = fixture.componentInstance;
    const cart = TestBed.inject(CartService);

    // Preparar carrito con producto
    const lomo = db.activeProducts.find(p => p.name.includes('Lomo'))!;
    cart.agregarAlCarrito(lomo, 1);

    // Registrar primer pedido para Mesa 12 con cédula 12345678
    componente.tableNumber = 12;
    componente.customerName = 'Roberto';
    componente.customerCedula = '12345678';
    componente.registrarPedido();
    expect(componente.error).toBe('');

    const pedidoActivo = componente.pedidosEnEspera().find(p => p.mesa === 12);
    expect(pedidoActivo).toBeDefined();

    // Intentar registrar otro pedido para la misma Mesa 12 (distinto cliente)
    cart.agregarAlCarrito(lomo, 1);
    componente.tableNumber = 12;
    componente.customerName = 'Elena';
    componente.customerCedula = '87654321';
    componente.registrarPedido();

    expect(componente.error).toContain('Ya existe un pedido en curso para la Mesa 12');

    // Intentar registrar un pedido con la misma cédula 12345678 en otra Mesa 15
    componente.tableNumber = 15;
    componente.customerName = 'Roberto';
    componente.customerCedula = '12345678';
    componente.registrarPedido();

    expect(componente.error).toContain('ya tiene un pedido en curso en la Mesa 12');
  });
});




