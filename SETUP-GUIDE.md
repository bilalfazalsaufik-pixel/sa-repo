# SS Frontend SPA - Setup Guide

## ✅ Project Setup Complete

**Angular Version**: 19.0.0 (Latest Stable)

The Angular frontend project has been set up with the following foundation:

### 📁 Project Structure

```
src/
├── app/
│   ├── core/                    # Core services, guards, interceptors
│   │   ├── guards/
│   │   │   └── auth.guard.ts   # Authentication guard
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts    # JWT token injection
│   │   │   └── tenant.interceptor.ts  # Tenant ID header injection
│   │   └── services/
│   │       ├── api.service.ts  # Base API service
│   │       └── auth.service.ts # Auth0 wrapper service
│   ├── shared/
│   │   └── models/             # TypeScript interfaces matching backend DTOs
│   │       ├── zone.model.ts
│   │       ├── site.model.ts
│   │       ├── device.model.ts
│   │       ├── sensor.model.ts
│   │       └── api-response.model.ts
│   ├── features/               # Feature modules
│   │   ├── zones/
│   │   │   ├── components/
│   │   │   │   └── zone-list/
│   │   │   └── services/
│   │   │       └── zone.service.ts
│   │   ├── sites/
│   │   ├── devices/
│   │   ├── sensors/
│   │   └── auth/
│   │       └── components/
│   │           └── login/
│   ├── layout/
│   │   └── layout.component.ts  # Main layout with header/navigation
│   ├── app.component.ts         # Root component
│   └── app.routes.ts            # Routing configuration
├── environments/
│   ├── environment.ts          # Development environment config
│   └── environment.example.ts  # Example config template
└── styles.css                   # Global styles
```

### 🎯 Features Implemented

1. **✅ Angular 17 Standalone Components**
   - Modern Angular architecture
   - Standalone components (no NgModules)
   - Lazy loading for routes

2. **✅ Auth0 Integration**
   - `@auth0/auth0-angular` configured
   - JWT token injection via interceptor
   - Authentication guard for protected routes
   - Login component

3. **✅ API Integration**
   - Base `ApiService` for HTTP requests
   - Feature-specific services (Zone, Site, Device, Sensor)
   - Error handling
   - Tenant ID header injection

4. **✅ Core Entity Management**
   - **Zones**: Full CRUD (List, Create, Edit, Delete)
   - **Sites**: Full CRUD with Zone selection
   - **Devices**: Full CRUD with Site selection
   - **Sensors**: Full CRUD with Device selection

5. **✅ UI Components**
   - Responsive layout with header navigation
   - Data tables for entity lists
   - Modal forms for create/edit
   - Error messages and loading states
   - Status indicators (for Sites)

### 🔧 Configuration Required

Before running the application, update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7000/api', // Your backend API URL
  auth0: {
    domain: 'your-auth0-domain.auth0.com',        // Your Auth0 domain
    clientId: 'your-auth0-client-id',            // Your Auth0 client ID
    audience: 'your-auth0-audience',              // Your Auth0 audience
    redirectUri: window.location.origin
  }
};
```

### 📦 Installation

1. **Install dependencies:**
```bash
cd ETSW/SS-FrontendSPA
npm install
```

2. **Configure environment:**
   - Update `src/environments/environment.ts` with your Auth0 and API settings

3. **Start development server:**
```bash
npm start
```

The application will be available at `http://localhost:4200`

### 🔐 Authentication Flow

1. User visits any protected route → Redirected to `/login`
2. User clicks "Log In" → Auth0 login redirect
3. After authentication → Redirected back to app
4. JWT token automatically included in API requests
5. Tenant ID extracted from JWT claims and added to `X-Tenant-Id` header

### 📡 API Integration

All API services follow this pattern:
- **GET**: `api.get<T>(endpoint, params?)`
- **POST**: `api.post<T>(endpoint, body)`
- **PUT**: `api.put<T>(endpoint, body)`
- **DELETE**: `api.delete<T>(endpoint)`

**Headers automatically added:**
- `Authorization: Bearer <jwt-token>`
- `X-Tenant-Id: <tenant-id>`

### 🎨 Styling

- Global styles in `src/styles.css`
- Utility classes for buttons, forms, tables, cards
- Responsive design
- Modern, clean UI

### 🚀 Next Steps

1. **Configure Auth0:**
   - Set up Auth0 application
   - Configure callback URLs
   - Add tenant ID to JWT claims

2. **Test API Integration:**
   - Ensure backend API is running
   - Verify CORS is configured
   - Test authentication flow

3. **Enhance UI:**
   - Add loading spinners
   - Improve error messages
   - Add form validation
   - Add confirmation dialogs

4. **Add Features:**
   - Dashboard view
   - Charts and graphs
   - Real-time updates
   - Permission-based UI rendering

### 📝 Notes

- All components use standalone architecture (Angular 17+)
- Services are provided at root level (`providedIn: 'root'`)
- Routes use lazy loading for better performance
- Interceptors handle authentication and tenant context automatically

### 🐛 Troubleshooting

**CORS Issues:**
- Ensure backend CORS is configured to allow `http://localhost:4200`
- Check `appsettings.json` for CORS policy

**Auth0 Issues:**
- Verify Auth0 domain, client ID, and audience are correct
- Check Auth0 application settings (callback URLs, allowed origins)
- Ensure JWT contains tenant ID claim

**API Connection Issues:**
- Verify backend API URL in `environment.ts`
- Check backend is running and accessible
- Verify API endpoints match backend routes

---

**Status**: ✅ Foundation Complete - Ready for Development
