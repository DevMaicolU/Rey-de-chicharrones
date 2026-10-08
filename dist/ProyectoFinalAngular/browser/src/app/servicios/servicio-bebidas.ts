import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServicioBebida {
  private urlBase = 'https://www.thecocktaildb.com/api/json/v1/1';

  constructor(private http: HttpClient) { }

  buscarBebidaPorNombre(nombre: string): Observable<any> {
    return this.http.get(this.urlBase + '/search.php?s=' + nombre);
  }

  buscarPorIngrediente(ingrediente: string): Observable<any> {
    return this.http.get(this.urlBase + '/filter.php?i=' + ingrediente);
  }

  filtrarPorTipo(tipo: string): Observable<any> {
    return this.http.get(this.urlBase + '/filter.php?a=' + tipo);
  }

  filtrarPorCategoria(categoria: string): Observable<any> {
    return this.http.get(this.urlBase + '/filter.php?c=' + encodeURIComponent(categoria));
  }

  obtenerDetalleBebida(id: string): Observable<any> {
    return this.http.get(this.urlBase + '/lookup.php?i=' + id);
  }
}