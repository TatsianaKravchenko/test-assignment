import { createAction, props } from '@ngrx/store';
import { PolygonShape, ProductPolygons } from '../../models/polygon.model';

export const addPolygon = createAction(
  '[Polygons] Add Polygon',
  props<{ productId: string; shape: PolygonShape }>(),
);

export const updatePolygon = createAction(
  '[Polygons] Update Polygon',
  props<{ productId: string; shape: PolygonShape }>(),
);

export const removePolygon = createAction(
  '[Polygons] Remove Polygon',
  props<{ productId: string; shapeId: string }>(),
);

export const clearPolygons = createAction(
  '[Polygons] Clear Polygons',
  props<{ productId: string }>(),
);

export const hydratePolygons = createAction(
  '[Polygons] Hydrate',
  props<{ entries: ProductPolygons[] }>(),
);
