import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';




@Injectable({
  providedIn: 'root'
})
export class ServicioComida {
  private urlBase = 'https://www.themealdb.com/api/json/v1/1';

  constructor(private http: HttpClient) { }

  obtenerCategorias(): Observable<any> {
    return this.http.get(this.urlBase + '/categories.php');
  }

  obtenerComidasPorCategoria(categoria: string): Observable<any> {
    return this.http.get(this.urlBase + '/filter.php?c=' + categoria);
  }

  buscarComidaPorNombre(nombre: string): Observable<any> {
    return this.http.get(this.urlBase + '/search.php?s=' + nombre);
  }

  buscarComidaPorIngrediente(ingrediente: string): Observable<any> {
    return this.http.get(this.urlBase + '/filter.php?i=' + ingrediente);
  }

  obtenerDetalleComida(id: string): Observable<any> {
    return this.http.get(this.urlBase + '/lookup.php?i=' + id);
  }
}
