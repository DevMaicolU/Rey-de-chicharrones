import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product } from '../entidades/modelos';

const crear = (idApi: string, price: number): Product => ({
  id: idApi, idApi, name: idApi, type: 'Comida', price, imageUrl: null, ingredients: [], status: 'Activo'
});

describe('CartService', () => {
  let cart: CartService;
  const lomo = crear('lomo', 28000);
  const mojito = crear('mojito', 17000);

  beforeEach(() => {
    TestBed.resetTestingModule();
    cart = TestBed.inject(CartService);
  });

  it('agrega productos y suma cantidades del mismo producto', () => {
    cart.agregarAlCarrito(lomo, 1);
    cart.agregarAlCarrito(lomo, 2);
    cart.agregarAlCarrito(mojito, 1);
    expect(cart.items).toHaveLength(2);
    expect(cart.items[0].cantidad).toBe(3);
    expect(cart.items[0].subtotal).toBe(84000);
    expect(cart.total()).toBe(101000);
  });

  it('ignora cantidades inválidas al agregar', () => {
    cart.agregarAlCarrito(lomo, 0);
    cart.agregarAlCarrito(lomo, NaN);
    cart.agregarAlCarrito(lomo, null as unknown as number);
    expect(cart.items).toHaveLength(0);
  });

  it('redondea hacia abajo las cantidades decimales', () => {
    cart.agregarAlCarrito(lomo, 2.9);
    expect(cart.items[0].cantidad).toBe(2);
  });

  it('cambiarCantidad respeta el mínimo de 1 y no elimina el producto', () => {
    cart.agregarAlCarrito(lomo, 3);
    cart.cambiarCantidad('lomo', 0);
    expect(cart.items[0].cantidad).toBe(1);
    cart.cambiarCantidad('lomo', 5);
    expect(cart.items[0].cantidad).toBe(5);
    expect(cart.items[0].subtotal).toBe(140000);
  });

  it('cambiarCantidad ignora valores vacíos (input borrado por el usuario)', () => {
    cart.agregarAlCarrito(lomo, 3);
    cart.cambiarCantidad('lomo', null as unknown as number);
    cart.cambiarCantidad('lomo', NaN);
    expect(cart.items[0].cantidad).toBe(3);
  });

  it('elimina productos y vacía el carrito', () => {
    cart.agregarAlCarrito(lomo, 1);
    cart.agregarAlCarrito(mojito, 1);
    cart.eliminarDelCarrito('lomo');
    expect(cart.items.map(i => i.producto.idApi)).toEqual(['mojito']);
    cart.limpiarCarrito();
    expect(cart.items).toHaveLength(0);
    expect(cart.total()).toBe(0);
  });

  it('no modifica listas ni elementos emitidos anteriormente (estado inmutable)', () => {
    cart.agregarAlCarrito(lomo, 1);
    const antes = cart.items;
    const itemAntes = antes[0];
    cart.agregarAlCarrito(lomo, 4);
    expect(antes).not.toBe(cart.items);
    expect(itemAntes.cantidad).toBe(1);
  });

  it('emite el total de unidades para el contador de la barra', () => {
    const emitidos: number[] = [];
    cart.totalItems$.subscribe(total => emitidos.push(total));
    cart.agregarAlCarrito(lomo, 2);
    cart.agregarAlCarrito(mojito, 3);
    expect(emitidos).toEqual([0, 2, 5]);
  });
});
