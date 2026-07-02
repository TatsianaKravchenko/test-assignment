import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProductsState, selectAllQueries } from './products.reducer';

export const selectProductsState = createFeatureSelector<ProductsState>('products');

export const selectAllProducts = createSelector(selectProductsState, (state) => state.products);

export const selectProductsLoading = createSelector(selectProductsState, (state) => state.loading);

export const selectSearchValue = createSelector(selectProductsState, (state) => state.searchValue);

export const selectSearchHistory = createSelector(selectProductsState, selectAllQueries);

export const selectProductsSkip = createSelector(selectProductsState, (state) => state.skip);

export const selectProductsLimit = createSelector(selectProductsState, (state) => state.limit);
