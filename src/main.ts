import {LOCALE_ID} from '@angular/core';
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
 provideHttpClient(withInterceptors([authInterceptor]))
]}).catch(console.error);
