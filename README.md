# SS Frontend SPA

Angular frontend application for the SS (Sensor System) dashboard.

## Features

- Auth0 authentication integration
- Multi-tenant support
- Core entity management (Zones, Sites, Devices, Sensors)
- Permission-based UI rendering
- Responsive design

## Development

### Prerequisites

- Node.js 18+ and npm
- Angular CLI 19+

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
   - Copy `src/environments/environment.example.ts` to `src/environments/environment.ts`
   - Update Auth0 and API configuration

3. Start development server:
```bash
npm start
```

The application will be available at `http://localhost:4200`

## Project Structure

```
src/
├── app/
│   ├── core/              # Core services, guards, interceptors
│   ├── shared/             # Shared components, models, utilities
│   ├── features/           # Feature modules
│   │   ├── zones/
│   │   ├── sites/
│   │   ├── devices/
│   │   └── sensors/
│   └── layout/             # Layout components (header, sidebar, etc.)
├── assets/                # Static assets
└── environments/          # Environment configuration
```

## API Integration

The frontend communicates with the backend API at the URL specified in `environment.ts`.

All API requests include:
- JWT token in Authorization header
- X-Tenant-Id header for multi-tenancy
