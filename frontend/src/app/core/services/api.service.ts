import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { Product, ProductDto } from '../models/product.model';
import { environment } from '../../../environments/environment';

interface SearchResponse {
  data: ProductDto[];
  meta: {
    total: number;
    limit: number;
    skip: number;
  };
}

interface CacheEntry {
  value$: Observable<Product[]>;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  private static readonly CACHE_TTL_MS = 60_000;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private http: HttpClient) {}

  search(query: string = '', limit: number = 20, skip: number = 0): Observable<Product[]> {
    const key = `${query.trim().toLowerCase()}_${limit}_${skip}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value$;
    }

    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=${limit}&skip=${skip}`;
    const request$ = this.http.get<SearchResponse>(url).pipe(
      map((res) => res.data.map((item: ProductDto) => this.mapToProduct(item))),
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError((error) => {
        this.cache.delete(key);
        return throwError(() => error);
      }),
    );

    this.cache.set(key, { value$: request$, expiresAt: Date.now() + ApiService.CACHE_TTL_MS });
    return request$;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private mapToProduct(item: ProductDto): Product {
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
