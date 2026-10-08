import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from '../entidades/modelos';

type DatosProducto = Pick<Product, 'id' | 'name' | 'price' | 'imageUrl' | 'ingredients'>;

const COMIDAS: DatosProducto[] = [
  { id: 'comida-lomo-saltado', name: 'Lomo Saltado', price: 28000, imageUrl: '/Images/Comidas/1Lomo Saltado.jpg', ingredients: ['Lomo de res', 'Cebolla roja', 'Tomate', 'Ají amarillo', 'Papas fritas', 'Arroz'] },
  { id: 'comida-camarones-ajillo', name: 'Camarones al Ajillo', price: 34000, imageUrl: '/Images/Comidas/2CamaronesalAjillo.jpg', ingredients: ['Camarones', 'Ajo', 'Aceite de oliva', 'Perejil', 'Ají', 'Limón'] },
  { id: 'comida-ensalada-mediterranea', name: 'Ensalada Mediterránea', price: 20000, imageUrl: '/Images/Comidas/3EnsaladaMediterranea.png', ingredients: ['Lechuga', 'Tomate cherry', 'Pepino', 'Aceitunas', 'Queso feta', 'Aceite de oliva'] },
  { id: 'comida-pollo-naranja', name: 'Pollo a la Naranja', price: 26000, imageUrl: '/Images/Comidas/4PolloaLaNaranja.jpg', ingredients: ['Pechuga de pollo', 'Jugo de naranja', 'Miel', 'Jengibre', 'Salsa de soya'] },
  { id: 'comida-tiramisu', name: 'Tiramisú', price: 14000, imageUrl: '/Images/Comidas/5Tiramisu.jpg', ingredients: ['Mascarpone', 'Café', 'Bizcochos', 'Huevo', 'Cacao'] },
  { id: 'comida-estofado-res', name: 'Estofado de Res', price: 27000, imageUrl: '/Images/Comidas/6EstofadoDeRes.jpg', ingredients: ['Carne de res', 'Papa', 'Zanahoria', 'Cebolla', 'Vino tinto', 'Laurel'] }
];

const BEBIDAS: DatosProducto[] = [
  { id: 'bebida-margarita', name: 'Margarita', price: 18000, imageUrl: '/Images/Bebidas/1Margarita.jpg', ingredients: ['Tequila', 'Triple sec', 'Jugo de lima', 'Sal'] },
  { id: 'bebida-mojito', name: 'Mojito', price: 17000, imageUrl: '/Images/Bebidas/2Mojito.jpg', ingredients: ['Ron blanco', 'Hierbabuena', 'Lima', 'Azúcar', 'Agua con gas'] },
  { id: 'bebida-screwdriver', name: 'Screwdriver', price: 16000, imageUrl: '/Images/Bebidas/3Screwdriver.jpg', ingredients: ['Vodka', 'Jugo de naranja', 'Hielo'] },
  { id: 'bebida-shirley-temple', name: 'Shirley Temple', price: 10000, imageUrl: '/Images/Bebidas/4ShirleyTemple.jpg', ingredients: ['Ginger ale', 'Granadina', 'Cereza al marrasquino'] },
  { id: 'bebida-virgin-mojito', name: 'Virgin Mojito', price: 12000, imageUrl: '/Images/Bebidas/5VirginMojito.jpg', ingredients: ['Hierbabuena', 'Lima', 'Azúcar', 'Agua con gas'] },
  { id: 'bebida-pina-colada', name: 'Piña Colada', price: 19000, imageUrl: '/Images/Bebidas/6PinaColada.jpg', ingredients: ['Ron blanco', 'Crema de coco', 'Jugo de piña', 'Hielo'] }
];

/** Catálogo maestro local (las fotos viven en public/Images). Sustituye a las APIs externas. */
@Injectable({ providedIn: 'root' })
export class MockCatalogoService {
  getMeals(): Observable<Product[]> {
    return of(COMIDAS.map(datos => this.crear(datos, 'Comida')));
  }

  getDrinks(): Observable<Product[]> {
    return of(BEBIDAS.map(datos => this.crear(datos, 'Bebida')));
  }

  getCatalog(): Observable<Product[]> {
    return of([
      ...COMIDAS.map(datos => this.crear(datos, 'Comida')),
      ...BEBIDAS.map(datos => this.crear(datos, 'Bebida'))
    ]);
  }

  private crear(datos: DatosProducto, type: Product['type']): Product {
    return { ...datos, idApi: datos.id, type, status: 'Activo', ingredients: [...datos.ingredients] };
  }
}
