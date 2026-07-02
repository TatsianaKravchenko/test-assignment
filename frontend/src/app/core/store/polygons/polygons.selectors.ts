import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PolygonShape } from '../../models/polygon.model';
import { PolygonsState, selectAllPolygonEntries } from './polygons.reducer';

export const POLYGONS_FEATURE_KEY = 'polygons';

export const selectPolygonsState = createFeatureSelector<PolygonsState>(POLYGONS_FEATURE_KEY);

export const selectAllPolygonProducts = createSelector(
  selectPolygonsState,
  selectAllPolygonEntries,
);

export const selectPolygonsByProduct = (productId: string) =>
  createSelector(
    selectPolygonsState,
    (state): PolygonShape[] => state.entities[productId]?.shapes ?? [],
  );
