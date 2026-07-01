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
  polygons: any[];
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
  polygons: [],
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
  })),

  on(ProductsActions.loadProductsSuccess, (state, { products }) => ({
    ...state,
    products,
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
