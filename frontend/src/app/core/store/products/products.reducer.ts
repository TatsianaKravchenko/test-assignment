import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import * as ProductsActions from './products.actions';
import { Product } from '../../models/product.model';

export interface SearchQueryEntity {
  id: string;
  query: string;
  timestamp: number;
}

export interface ProductsState {
  products: Product[];
  loading: boolean;
  searchValue: string;
  history: EntityState<SearchQueryEntity>;
  skip: number;
  limit: number;
  reachedEnd: boolean;
}

export const searchHistoryAdapter: EntityAdapter<SearchQueryEntity> =
  createEntityAdapter<SearchQueryEntity>({
    selectId: (entity) => entity.id,
    sortComparer: (a, b) => b.timestamp - a.timestamp,
  });

export const initialState: ProductsState = {
  products: [],
  loading: false,
  searchValue: '',
  history: searchHistoryAdapter.getInitialState(),
  skip: 0,
  limit: 20,
  reachedEnd: false,
};

export const productsReducer = createReducer(
  initialState,

  on(ProductsActions.setLoading, (state, { loading }) => ({
    ...state,
    loading,
  })),

  on(ProductsActions.setSearchValue, (state, { searchValue }) => ({
    ...state,
    searchValue,
    products: [],
    skip: 0,
    reachedEnd: false,
  })),

  on(ProductsActions.loadProductsSuccess, (state, { products }) => ({
    ...state,
    products,
    skip: state.limit,
    reachedEnd: products.length < state.limit,
  })),

  on(ProductsActions.loadMoreProductsSuccess, (state, { products }) => ({
    ...state,
    products: [...state.products, ...products],
    skip: state.skip + state.limit,
    reachedEnd: products.length < state.limit,
  })),

  on(ProductsActions.saveSearchQuery, (state, { query }) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return state;

    const newQuery: SearchQueryEntity = {
      id: trimmed,
      query: query.trim(),
      timestamp: Date.now(),
    };

    return {
      ...state,
      history: searchHistoryAdapter.upsertOne(newQuery, state.history),
    };
  }),
);

const { selectAll } = searchHistoryAdapter.getSelectors((state: ProductsState) => state.history);
export const selectAllQueries = selectAll;
