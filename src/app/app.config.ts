import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { productsReducer } from './core/store/products/products.reducer';
import { provideEffects } from '@ngrx/effects';
import { ProductsEffects } from './core/store/products/products.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { loaderInterceptor } from './core/interceptor/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loaderInterceptor])),
    provideStore({ products: productsReducer }),
    provideEffects([ProductsEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
