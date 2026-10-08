import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { MockCatalogoService } from './mock-catalogo.service';

describe('MockCatalogoService', () => {
  let servicio: MockCatalogoService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    servicio = TestBed.inject(MockCatalogoService);
  });

  it('devuelve comidas y bebidas con tipos correctos e ids únicos', async () => {
    const catalogo = await firstValueFrom(servicio.getCatalog());
    expect(catalogo.filter(p => p.type === 'Comida')).toHaveLength(6);
    expect(catalogo.filter(p => p.type === 'Bebida')).toHaveLength(6);
    expect(new Set(catalogo.map(p => p.idApi)).size).toBe(catalogo.length);
  });

  it('todas las imágenes del catálogo existen en public/', async () => {
    const catalogo = await firstValueFrom(servicio.getCatalog());
    const faltantes = catalogo
      .filter(p => !p.imageUrl || !existsSync(join(process.cwd(), 'public', p.imageUrl)))
      .map(p => p.name);
    expect(faltantes).toEqual([]);
  });
});
