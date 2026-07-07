import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import * as ProductsActions from './products.actions';
import * as ProductsSelectors from './products.selectors';
import { Store } from '@ngrx/store';

@Injectable()
export class ProductsEffects {
  private actions$ = inject(Actions);
  private apiService = inject(ApiService);
  private store = inject(Store);

  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.loadProducts, ProductsActions.setSearchValue),
      switchMap((action) => {
        const currentQuery =
          action.type === ProductsActions.setSearchValue.type ? action.searchValue : '';

        return this.apiService.search(currentQuery).pipe(
          tap((products) => {
            if (currentQuery && currentQuery.trim().length > 0 && products.length > 0) {
              this.store.dispatch(ProductsActions.saveSearchQuery({ query: currentQuery }));
            }
          }),
          map((products) => ProductsActions.loadProductsSuccess({ products })),
          catchError((error) => of(ProductsActions.loadProductsFailure({ error: error.message }))),
        );
      }),
    ),
  );

  loadMoreProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.loadMoreProducts),
      withLatestFrom(
        this.store.select(ProductsSelectors.selectSearchValue),
        this.store.select(ProductsSelectors.selectProductsSkip),
        this.store.select(ProductsSelectors.selectProductsLimit),
      ),
      switchMap(([action, query, skip, limit]) => {
        return this.apiService.search(query || '', limit, skip).pipe(
          map((products) => ProductsActions.loadMoreProductsSuccess({ products })),
          catchError((error) => of(ProductsActions.loadProductsFailure({ error: error.message }))),
        );
      }),
    ),
  );
}
