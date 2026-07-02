import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Product } from '../../core/models/product.model';
import { SearchInputComponent } from './components/search-input-component/search-input-component';
import { Store } from '@ngrx/store';
import {
  selectAllProducts,
  selectProductsLoading,
  selectReachedEnd,
} from '../../core/store/products/products.selectors';
import * as ProductsActions from '../../core/store/products/products.actions';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ProductCardComponent } from '../components/product-card.component/product-card.component';
import { ProductDialogComponent } from '../components/product-dialog.component/product-dialog.component';

@Component({
  selector: 'app-main-page-component',
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    SearchInputComponent,
    ScrollingModule,
    ProductCardComponent,
  ],
  templateUrl: './main-page-component.html',
  styleUrl: './main-page-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent implements OnInit {
  private store = inject(Store);
  private dialog = inject(MatDialog);

  products = this.store.selectSignal(selectAllProducts);
  isLoading = this.store.selectSignal(selectProductsLoading);
  private reachedEnd = this.store.selectSignal(selectReachedEnd);

  ngOnInit(): void {
    this.store.dispatch(ProductsActions.loadProducts());
  }

  openDetails(product: Product): void {
    this.dialog.open(ProductDialogComponent, {
      data: { product },
      width: '960px',
      maxWidth: '95vw',
      disableClose: true,
    });
  }

  onScroll(currentIndex: number): void {
    const totalRows = this.productRows().length;

    if (
      currentIndex >= totalRows - 2 &&
      totalRows > 0 &&
      !this.isLoading() &&
      !this.reachedEnd()
    ) {
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
