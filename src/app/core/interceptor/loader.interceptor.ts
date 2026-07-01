import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { setLoading } from '../store/products/products.actions';
import { finalize } from 'rxjs';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);

  store.dispatch(setLoading({ loading: true }));

  return next(req).pipe(
    finalize(() => {
      store.dispatch(setLoading({ loading: false }));
    }),
  );
};
