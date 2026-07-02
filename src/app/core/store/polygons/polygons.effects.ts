import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, tap, withLatestFrom } from 'rxjs/operators';
import { PolygonStorageService } from '../../services/polygon-storage.service';
import * as PolygonsActions from './polygons.actions';
import { selectAllPolygonProducts } from './polygons.selectors';

@Injectable()
export class PolygonsEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private storage = inject(PolygonStorageService);

  hydrate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => PolygonsActions.hydratePolygons({ entries: this.storage.load() })),
    ),
  );

  persist$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          PolygonsActions.addPolygon,
          PolygonsActions.updatePolygon,
          PolygonsActions.removePolygon,
          PolygonsActions.clearPolygons,
        ),
        withLatestFrom(this.store.select(selectAllPolygonProducts)),
        tap(([, entries]) => this.storage.save(entries)),
      ),
    { dispatch: false },
  );
}
