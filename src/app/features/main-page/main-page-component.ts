import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Product } from '../../core/models/product.model';
import { SearchInputComponent } from './components/search-input-component/search-input-component';
import { Store } from '@ngrx/store';
import {
  selectAllProducts,
  selectProductsLoading,
} from '../../core/store/products/products.selectors';
import * as ProductsActions from '../../core/store/products/products.actions';

@Component({
  selector: 'app-main-page-component',
  imports: [CommonModule, MatProgressSpinnerModule, SearchInputComponent],
  templateUrl: './main-page-component.html',
  styleUrl: './main-page-component.scss',
})
export class MainPageComponent {
  private store = inject(Store);

  products = this.store.selectSignal(selectAllProducts);
  isLoading = this.store.selectSignal(selectProductsLoading);

  ngOnInit(): void {
    this.store.dispatch(ProductsActions.loadProducts());
  }

  openDetails(product: Product): void {
    console.log('product', product);
  }

  setDefaultCover(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = 'images/no-cover.png';
  }
}
