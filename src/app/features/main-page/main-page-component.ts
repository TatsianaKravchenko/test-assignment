import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Product } from '../../core/models/product.model';
import { SearchInputComponent } from './components/search-input-component/search-input-component';

@Component({
  selector: 'app-main-page-component',
  imports: [CommonModule, MatProgressSpinnerModule, SearchInputComponent],
  templateUrl: './main-page-component.html',
  styleUrl: './main-page-component.scss',
})
export class MainPageComponent {
  products = signal<Product[]>([]);
  isLoading = signal(false);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.apiService.search('').subscribe((data) => {
      this.products.set(data);
      this.isLoading.set(false);
    });
  }

  updateList(results: Product[]): void {
    this.products.set(results);
  }

  toggleLoader(isSearching: boolean): void {
    this.isLoading.set(isSearching);
  }

  openDetails(product: Product): void {
    console.log('product', product);
  }

  setDefaultCover(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = 'images/no-cover.png';
  }
}
