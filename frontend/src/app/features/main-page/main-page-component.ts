import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
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
  private destroyRef = inject(DestroyRef);

  private readonly gridContainer = viewChild.required<ElementRef<HTMLElement>>('gridContainer');

  private static readonly MAX_COLUMNS = 4;
  private static readonly MIN_CARD_WIDTH = 240;
  private static readonly GAP = 24;
  private static readonly ROW_PADDING = 32;

  products = this.store.selectSignal(selectAllProducts);
  isLoading = this.store.selectSignal(selectProductsLoading);
  private reachedEnd = this.store.selectSignal(selectReachedEnd);

  private readonly containerWidth = signal(0);

  protected readonly columns = computed(() => {
    const available = this.containerWidth() - MainPageComponent.ROW_PADDING;
    if (available <= 0) {
      return MainPageComponent.MAX_COLUMNS;
    }
    const fit = Math.floor(
      (available + MainPageComponent.GAP) /
        (MainPageComponent.MIN_CARD_WIDTH + MainPageComponent.GAP),
    );
    return Math.min(MainPageComponent.MAX_COLUMNS, Math.max(1, fit));
  });

  protected readonly gridTemplate = computed(() => `repeat(${this.columns()}, 1fr)`);

  constructor() {
    afterNextRender(() => {
      const el = this.gridContainer().nativeElement;
      const observer = new ResizeObserver((entries) => {
        this.containerWidth.set(entries[0].contentRect.width);
      });
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

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

    if (currentIndex >= totalRows - 2 && totalRows > 0 && !this.isLoading() && !this.reachedEnd()) {
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
    const itemsPerRow = this.columns();
    const rows = [];

    for (let i = 0; i < list.length; i += itemsPerRow) {
      rows.push(list.slice(i, i + itemsPerRow));
    }
    return rows;
  });
}
