import { Component, computed, inject } from '@angular/core';
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
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-main-page-component',
  imports: [CommonModule, MatProgressSpinnerModule, SearchInputComponent, ScrollingModule],
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

  onScroll(currentIndex: number): void {
    const totalRows = this.productRows().length;

    if (currentIndex >= totalRows - 2 && totalRows > 0 && !this.isLoading()) {
      this.store.dispatch(ProductsActions.loadMoreProducts());
    }
  }

  trackById(index: number, item: Product): number | string {
    return item.id;
  }

  trackRow(index: number, row: Product[]): number {
    return index;
  }

  protected readonly productRows = computed(() => {
    const list = this.products();
    const rows = [];
    const itemsPerRow = 4;

    for (let i = 0; i < list.length; i += itemsPerRow) {
      rows.push(list.slice(i, i + itemsPerRow));
    }
    return rows;
  });
}
