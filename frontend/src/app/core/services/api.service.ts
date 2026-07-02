import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { DummyJSONResponse, DummyProduct, Product } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://dummyjson.com/products';

  private readonly cache = new Map<string, Observable<Product[]>>();

  constructor(private http: HttpClient) {}

  search(query: string = '', limit: number = 20, skip: number = 0): Observable<Product[]> {
    const key = `${query.trim().toLowerCase()}_${limit}_${skip}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}&skip=${skip}`;
    const request$ = this.http.get<DummyJSONResponse>(url).pipe(
      map((res) => res.products.map((item: DummyProduct) => this.mapToProduct(item))),
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError((error) => {
        this.cache.delete(key);
        return throwError(() => error);
      }),
    );

    this.cache.set(key, request$);
    return request$;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getBookDetails(id: string): Observable<Product> {
    return this.http
      .get<DummyProduct>(`${this.baseUrl}/${id}`)
      .pipe(map((item: DummyProduct) => this.mapToProduct(item)));
  }

  private mapToProduct(item: DummyProduct): Product {
    return {
      id: item.id.toString(),
      title: item.title,
      brand: item.brand || '',
      imageUrl: item.images?.[0] || null,
      subjects: [item.category],
      price: item.price,
      description: item.description,
      category: item.category,
      rating: item.rating,
      discountPercentage: item.discountPercentage,
      stock: item.stock,
      availabilityStatus: item.availabilityStatus,
      tags: item.tags,
    };
  }
}
