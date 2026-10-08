import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { Product } from '../entidades/modelos';

const producto: Product = {
  id: 'p1', idApi: 'p1', name: 'Plato de prueba', type: 'Comida', price: 10000,
  imageUrl: null, ingredients: ['a', 'b'], status: 'Activo'
};

/** Simula recargar la página: se descarta el servicio y se crea uno nuevo que lee de localStorage. */
function recargar(): DatabaseService {
  TestBed.resetTestingModule();
  return TestBed.inject(DatabaseService);
}

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    db = TestBed.inject(DatabaseService);
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
    expect(db.addProvider('   ').ok).toBe(false);
    expect(db.addProvider('Carnes La Central - carnes@ejemplo.com').ok).toBe(false);
    expect(db.addProvider('Lácteos Sur - lacteos@ejemplo.com').ok).toBe(true);
  });

  it('no duplica productos activos', () => {
    db.addActiveProduct(producto);
    db.addActiveProduct(producto);
    expect(db.activeProducts).toHaveLength(1);
    db.removeActiveProduct('p1');
    expect(db.activeProducts).toHaveLength(0);
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
    db.addProvider('Nuevo - nuevo@ejemplo.com');
    db.addOrder({ tableNumber: 3, customerName: 'Luis', employeeId: 2, employeeName: 'E', items: [], total: 5 });

    const recargado = recargar();
    expect(recargado.users.map(u => u.username)).toContain('ana');
    expect(recargado.activeProducts.map(p => p.idApi)).toEqual(['p1']);
    let proveedores: string[] = [];
    let pedidos = 0;
    recargado.providers$.subscribe(p => proveedores = p).unsubscribe();
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
});
