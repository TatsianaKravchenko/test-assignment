import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { ProductPolygons } from '../../models/polygon.model';
import * as PolygonsActions from './polygons.actions';

export type PolygonsState = EntityState<ProductPolygons>;

export const polygonsAdapter: EntityAdapter<ProductPolygons> = createEntityAdapter<ProductPolygons>(
  {
    selectId: (entry) => entry.productId,
  },
);

export const initialPolygonsState: PolygonsState = polygonsAdapter.getInitialState();

function shapesOf(state: PolygonsState, productId: string) {
  return state.entities[productId]?.shapes ?? [];
}

export const polygonsReducer = createReducer(
  initialPolygonsState,

  on(PolygonsActions.hydratePolygons, (state, { entries }) =>
    polygonsAdapter.setAll(entries, state),
  ),

  on(PolygonsActions.addPolygon, (state, { productId, shape }) =>
    polygonsAdapter.upsertOne({ productId, shapes: [...shapesOf(state, productId), shape] }, state),
  ),

  on(PolygonsActions.updatePolygon, (state, { productId, shape }) =>
    polygonsAdapter.upsertOne(
      {
        productId,
        shapes: shapesOf(state, productId).map((s) => (s.id === shape.id ? shape : s)),
      },
      state,
    ),
  ),

  on(PolygonsActions.removePolygon, (state, { productId, shapeId }) =>
    polygonsAdapter.upsertOne(
      {
        productId,
        shapes: shapesOf(state, productId).filter((s) => s.id !== shapeId),
      },
      state,
    ),
  ),

  on(PolygonsActions.clearPolygons, (state, { productId }) =>
    polygonsAdapter.upsertOne({ productId, shapes: [] }, state),
  ),
);

export const { selectAll: selectAllPolygonEntries } = polygonsAdapter.getSelectors();
