import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Proveedores } from './proveedores';
import { DatabaseService } from '../servicios/database.service';

describe('Proveedores', () => {
  let fixture: ComponentFixture<Proveedores>;
  let component: Proveedores;
  let db: DatabaseService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Proveedores]
    });

    db = TestBed.inject(DatabaseService);
    db.addProvider({
      name: 'Proveedor Inicial',
      nit: '900111222',
      contactName: 'Ana',
      phone: '3112223344',
      email: 'ana@proveedor.com'
    });

    fixture = TestBed.createComponent(Proveedores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('permite abrir y cerrar el detalle de un proveedor correctamente con closeDetail', () => {
    const provider = db.providers[0];
    expect(provider).toBeDefined();

    expect(component.selectedProvider).toBeNull();

    // Abrir detalle
    component.select(provider);
    expect(component.selectedProvider).toEqual(provider);

    // Cerrar detalle con el botón de cierre
    component.closeDetail();
    expect(component.selectedProvider).toBeNull();
  });

  it('gestiona la eliminación de proveedores mediante modal de confirmación integrado sin window.confirm', () => {
    const added = db.addProvider({
      name: 'Proveedor Para Borrar',
      nit: '999888777-1',
      contactName: 'Pedro',
      phone: '3009998877',
      email: 'borrar@test.com'
    });
    expect(added.ok).toBe(true);

    const provider = db.providers.find(p => p.name === 'Proveedor Para Borrar')!;
    expect(provider).toBeDefined();

    // Abrir modal de confirmación
    component.openDeleteModal(provider);
    expect(component.deleteModalVisible).toBe(true);
    expect(component.providerToDelete).toEqual(provider);

    // Confirmar eliminación
    component.confirmDelete();
    expect(component.deleteModalVisible).toBe(false);
    expect(component.providerToDelete).toBeNull();
    expect(component.message).toContain('eliminado');

    const existe = db.providers.some(p => p.id === provider.id);
    expect(existe).toBe(false);
  });
});
