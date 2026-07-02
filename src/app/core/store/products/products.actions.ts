import { createAction, props } from '@ngrx/store';
import { Product } from '../../models/product.model';

export const loadProducts = createAction('[Products] Load Products');

export const loadProductsSuccess = createAction(
  '[Products] Load Products Success',
  props<{ products: Product[] }>(),
);

export const loadProductsFailure = createAction(
  '[Products] Load Products Failure',
  props<{ error: string }>(),
);

export const setSearchValue = createAction(
  '[Products] Set Search Value',
  props<{ searchValue: string }>(),
);

export const setLoading = createAction('[Products] Set Loading', props<{ loading: boolean }>());

export const saveSearchQuery = createAction(
  '[Products] Save Search Query',
  props<{ query: string }>(),
);

export const loadMoreProducts = createAction('[Products] Load More Products');

export const loadMoreProductsSuccess = createAction(
  '[Products] Load More Products Success',
  props<{ products: Product[] }>(),
);
