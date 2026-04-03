/**
 * Default Environment (Local)
 * This file is used as a fallback and for local development
 * For specific environments, use:
 * - environment.local.ts (local development)
 * - environment.dev.ts (development server)
 * - environment.prod.ts (production)
 * 
 * NOTE: When running `ng serve`, make sure to use:
 * - `ng serve --configuration=development` (uses environment.local.ts)
 * - Or `ng serve --configuration=local` (uses environment.local.ts)
 */
export const environment = {
  production: false,
  environment: 'local',
  apiUrl: 'https://localhost:7000/api/v1',
  auth0: {
    // SECURITY: Do not commit real credentials here. Copy environment.example.ts to
    // environment.local.ts and set your actual values there (gitignored).
    domain: 'YOUR_AUTH0_DOMAIN',
    clientId: 'YOUR_AUTH0_CLIENT_ID',
    audience: 'YOUR_AUTH0_AUDIENCE',
    redirectUri: window.location.origin
  },
  enableLogging: true,
  enableDebugMode: true
};
