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

  search(query: string = '', limit: number = 20, skip: number = 0): Observable<Product[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}&skip=${skip}`;

    return this.http
      .get<DummyJSONResponse>(url)
      .pipe(map((res) => res.products.map((item: DummyProduct) => this.mapToProduct(item))));
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
