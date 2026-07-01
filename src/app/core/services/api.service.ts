import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DummyJSONResponse, DummyProduct, Product } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://dummyjson.com/products';
  constructor(private http: HttpClient) {}

  search(query: string = ''): Observable<Product[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;

    return this.http
      .get<DummyJSONResponse>(url)
      .pipe(
        map((res) =>
          res.products.map((item: DummyProduct) =>
            this.mapToProduct(item, `Rating: ${item.rating}`),
          ),
        ),
      );
  }

  getBookDetails(id: string): Observable<Product> {
    return this.http
      .get<DummyProduct>(`${this.baseUrl}/${id}`)
      .pipe(map((item: DummyProduct) => this.mapToProduct(item, `Price: $${item.price}`)));
  }

  private mapToProduct(item: DummyProduct, dynamicSubject: string): Product {
    return {
      id: item.id.toString(),
      title: item.title,
      author: item.brand || 'Unknown Brand',
      imageUrl: item.images?.[0] || null,
      subjects: [item.category, dynamicSubject],
    };
  }
}
