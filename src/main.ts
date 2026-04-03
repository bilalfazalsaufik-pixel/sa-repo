import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAuth0 } from '@auth0/auth0-angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

// Import Lara theme
import LaraTheme from '@primeuix/themes/lara';
import { routes } from './app/app.routes';
import { tenantInterceptor } from './app/core/interceptors/tenant.interceptor';
import { retryInterceptor } from './app/core/interceptors/retry.interceptor';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { environment } from './environments/environment';

// Validate Auth0 configuration
function validateAuth0Config() {
  // Match common placeholder patterns: 'your-auth0', 'YOUR_AUTH0', 'REPLACE_WITH_*'
  const isPlaceholder = (v: string) => /your[-_]auth0/i.test(v) || /^REPLACE_WITH_/i.test(v);
  const hasPlaceholder =
    isPlaceholder(environment.auth0.domain) ||
    isPlaceholder(environment.auth0.clientId) ||
    isPlaceholder(environment.auth0.audience);
  
  if (hasPlaceholder) {
    const errorMsg = `
      ⚠️ Auth0 Configuration Error ⚠️
      
      The application is using placeholder Auth0 values.
      Please ensure you're using the correct environment file:
      - For local development: Use environment.local.ts
      - Start the server with: ng serve --configuration=development
      
      Current values:
      - Domain: ${environment.auth0.domain}
      - Client ID: ${environment.auth0.clientId}
      - Audience: ${environment.auth0.audience}
    `;
    console.error(errorMsg);
    
    // SECURITY FIX: Use textContent instead of innerHTML to prevent XSS
    // Display error in the browser using safe DOM manipulation
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 2rem; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;';
    
    const h1 = document.createElement('h1');
    h1.style.color = '#d32f2f';
    h1.textContent = '⚠️ Configuration Error';
    errorDiv.appendChild(h1);
    
    const p1 = document.createElement('p');
    p1.textContent = 'The application is using placeholder Auth0 configuration values.';
    errorDiv.appendChild(p1);
    
    const h2a = document.createElement('h2');
    h2a.textContent = 'To fix this:';
    errorDiv.appendChild(h2a);
    
    const ol = document.createElement('ol');
    const li1 = document.createElement('li');
    li1.textContent = 'Make sure you\'re using the correct environment file (environment.local.ts)';
    ol.appendChild(li1);
    const li2 = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = 'ng serve --configuration=development';
    li2.appendChild(document.createTextNode('Start the dev server with: '));
    li2.appendChild(code);
    ol.appendChild(li2);
    const li3 = document.createElement('li');
    li3.textContent = 'Or update environment.ts with valid Auth0 credentials';
    ol.appendChild(li3);
    errorDiv.appendChild(ol);
    
    const h2b = document.createElement('h2');
    h2b.textContent = 'Current Configuration:';
    errorDiv.appendChild(h2b);
    
    const ul = document.createElement('ul');
    const configItems = [
      ['Domain', environment.auth0.domain],
      ['Client ID', environment.auth0.clientId],
      ['Audience', environment.auth0.audience]
    ];
    configItems.forEach(([label, value]) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(value));
      ul.appendChild(li);
    });
    errorDiv.appendChild(ul);
    
    const p2 = document.createElement('p');
    p2.style.cssText = 'margin-top: 2rem; color: #666;';
    p2.textContent = 'Check the browser console for more details.';
    errorDiv.appendChild(p2);
    
    document.body.appendChild(errorDiv);
    throw new Error('Invalid Auth0 configuration');
  }
}

// Validate configuration before bootstrapping
try {
  validateAuth0Config();
} catch (error) {
  // Error already displayed in DOM
  throw error;
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      // Interceptor order: auth → tenant → retry → error
      withInterceptors([authInterceptor, tenantInterceptor, retryInterceptor, errorInterceptor])
    ),
    providePrimeNG({
      theme: {
        preset: LaraTheme,
        options: {
          darkModeSelector: false
        }
      }
    }), // PrimeNG configuration - must be after HttpClient
    MessageService, // PrimeNG Toast service
    ConfirmationService, // PrimeNG ConfirmDialog service
    DialogService, // PrimeNG Dialog service
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: environment.auth0.redirectUri,
        audience: environment.auth0.audience
      },
      // FIX: Completely disable Auth0's built-in httpInterceptor
      // We handle token management in our custom authInterceptor with proper refresh logic
      // This gives us full control over token refresh behavior
      // Use localstorage in development for convenience (tokens persist across refreshes)
      // Use memory storage in production (more secure against XSS)
      cacheLocation: 'localstorage',

      // Use refresh tokens for silent auth renewal (more reliable than iframes in production;
      // modern browsers block third-party cookies which breaks iframe-based silent auth)
      useRefreshTokens: true
    })
  ]
}).catch(err => {
  // Bootstrap error - log to console as LoggerService may not be available yet
  console.error('[Main] Application bootstrap error:', err);
  
  // SECURITY FIX: Use textContent instead of innerHTML to prevent XSS
  // Display error in the browser if DOM is available using safe DOM manipulation
  if (document.body) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 2rem; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;';
    
    const h1 = document.createElement('h1');
    h1.style.color = '#d32f2f';
    h1.textContent = '❌ Application Bootstrap Error';
    errorDiv.appendChild(h1);
    
    const p1 = document.createElement('p');
    p1.textContent = 'An error occurred while starting the application.';
    errorDiv.appendChild(p1);
    
    const pre = document.createElement('pre');
    pre.style.cssText = 'background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;';
    pre.textContent = err.message || String(err);
    errorDiv.appendChild(pre);
    
    const p2 = document.createElement('p');
    p2.style.cssText = 'margin-top: 1rem; color: #666;';
    p2.textContent = 'Please check the browser console for more details.';
    errorDiv.appendChild(p2);
    
    document.body.appendChild(errorDiv);
  }
});
