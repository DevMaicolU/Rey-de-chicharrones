import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Product } from '../entidades/modelos';

interface MealApiItem {
  idMeal: string;
  strMeal: string;
  strMealThumb: string | null;
  [key: string]: string | null;
}

interface DrinkApiItem {
  idDrink: string;
  strDrink: string;
  strDrinkThumb: string | null;
  [key: string]: string | null;
}

interface MealApiResponse { meals: MealApiItem[] | null; }
interface DrinkApiResponse { drinks: DrinkApiItem[] | null; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly mealApi = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';
  private readonly cocktailApi = 'https://www.thecocktaildb.com/api/json/v1/1/search.php?s=';

  constructor(private readonly http: HttpClient) {}

  getMeals(search = ''): Observable<Product[]> {
    return this.http.get<MealApiResponse>(`${this.mealApi}${encodeURIComponent(search)}`).pipe(
      map(response => (response.meals ?? []).map(meal => this.mapMeal(meal)))
    );
  }

  getDrinks(search = ''): Observable<Product[]> {
    return this.http.get<DrinkApiResponse>(`${this.cocktailApi}${encodeURIComponent(search)}`).pipe(
      map(response => (response.drinks ?? []).map(drink => this.mapDrink(drink)))
    );
  }

  getCatalog(search = ''): Observable<Product[]> {
    return forkJoin({ meals: this.getMeals(search), drinks: this.getDrinks(search) }).pipe(
      map(({ meals, drinks }) => [...meals, ...drinks])
    );
  }

  private mapMeal(meal: MealApiItem): Product {
    return {
      id: meal.idMeal,
      idApi: meal.idMeal,
      name: meal.strMeal,
      price: 25000,
      imageUrl: meal.strMealThumb || null,
      type: 'Comida',
      status: 'Activo',
      ingredients: this.readIngredients(meal)
    };
  }

  private mapDrink(drink: DrinkApiItem): Product {
    return {
      id: drink.idDrink,
      idApi: drink.idDrink,
      name: drink.strDrink,
      price: 15000,
      imageUrl: drink.strDrinkThumb || null,
      type: 'Bebida',
      status: 'Activo',
      ingredients: this.readIngredients(drink)
    };
  }

  private readIngredients(item: MealApiItem | DrinkApiItem): string[] {
    return Array.from({ length: 20 }, (_, index) => item[`strIngredient${index + 1}`]?.trim() ?? '')
      .filter(Boolean);
  }
}