import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService } from '../servicios/database.service';
import { Registros } from './registros';

const pedido = (employeeId: number, customerName: string, total: number) => ({
  tableNumber: 1, customerName, employeeId, employeeName: 'x', total,
  items: [{ productId: 'p', productName: 'Lomo Saltado', quantity: 2, unitPrice: total / 2 }]
});

describe('Registros', () => {
  let db: DatabaseService;
  let auth: AuthService;

  const render = (): ComponentFixture<Registros> => {
    const fixture = TestBed.createComponent(Registros);
    fixture.detectChanges();
    return fixture;
  };
  const filas = (f: ComponentFixture<Registros>) => Array.from<HTMLElement>(f.nativeElement.querySelectorAll('tbody tr'));

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    db = TestBed.inject(DatabaseService);
    auth = TestBed.inject(AuthService);
  });

  it('muestra solo los pedidos del empleado con sesión y el más reciente primero', () => {
    db.addOrder(pedido(2, 'Ana', 10000));
    db.addOrder(pedido(1, 'Del admin', 99999));
    db.addOrder(pedido(2, 'Beto', 20000));
    auth.login('empleado', 'empleado123');

    const texto = filas(render()).map(fila => fila.textContent ?? '');
    expect(texto).toHaveLength(2);
    expect(texto[0]).toContain('Beto');
    expect(texto[1]).toContain('Ana');
    expect(texto.join('')).not.toContain('Del admin');
  });

  it('muestra los productos de cada pedido', () => {
    db.addOrder(pedido(2, 'Ana', 10000));
    auth.login('empleado', 'empleado123');
    expect(filas(render())[0].textContent).toContain('2× Lomo Saltado');
  });

  it('muestra el mensaje vacío cuando el empleado no tiene pedidos aunque otros sí', () => {
    db.addOrder(pedido(1, 'Del admin', 5000));
    auth.login('empleado', 'empleado123');
    const filasVista = filas(render());
    expect(filasVista).toHaveLength(1);
    expect(filasVista[0].textContent).toContain('No tienes pedidos registrados');
  });
});
