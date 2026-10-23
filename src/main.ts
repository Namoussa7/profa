import {LOCALE_ID,isDevMode} from '@angular/core';
import {provideServiceWorker} from '@angular/service-worker';
import {registerLocaleData} from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {bootstrapApplication} from '@angular/platform-browser';
import {PreloadAllModules,provideRouter,withInMemoryScrolling,withPreloading} from '@angular/router';
import {provideHttpClient,withInterceptors} from '@angular/common/http';
import {AppComponent} from './app/app.component';
import {routes} from './app/app.routes';
import {authInterceptor} from './app/core/interceptors/auth.interceptor';

registerLocaleData(localeFr);

bootstrapApplication(AppComponent,{providers:[
 {provide:LOCALE_ID,useValue:'fr'},
 provideRouter(routes,withInMemoryScrolling({scrollPositionRestoration:'top'}),withPreloading(PreloadAllModules)),
 provideHttpClient(withInterceptors([authInterceptor])),
 // Offline cache: app shell + public catalogue, so pages open instantly even while the API wakes up.
 provideServiceWorker('ngsw-worker.js',{enabled:!isDevMode(),registrationStrategy:'registerWhenStable:20000'})
]}).catch(console.error);
