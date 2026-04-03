# Environment-Based Logging System

## Overview

The application now uses an environment-aware logging system that automatically enables/disables console logging based on the environment configuration. This ensures that:

- **Local/Dev environments**: All console logs (debug, info, warn, error) are shown
- **Production environment**: All console logs are disabled for security and performance

## How It Works

### LoggerService

The `LoggerService` (`src/app/core/services/logger.service.ts`) checks the `environment.enableLogging` flag and `environment.production` flag to determine whether to log messages.

```typescript
// Example usage
private logger = inject(LoggerService);

// These will only log in non-production environments
this.logger.debug('Debug message', data);
this.logger.log('Info message', data);
this.logger.warn('Warning message', data);
this.logger.error('Error message', error);
this.logger.errorWithPrefix('ComponentName', 'Error message', error);
```

### Environment Configuration

Each environment file has an `enableLogging` flag:

- **environment.local.ts**: `enableLogging: true` (logs enabled)
- **environment.dev.ts**: `enableLogging: true` (logs enabled)
- **environment.prod.ts**: `enableLogging: false` (logs disabled)

The service also checks `production: true/false` as a fallback.

## Usage Examples

### In Components

```typescript
import { LoggerService } from '../../../../core/services/logger.service';

export class MyComponent {
  private logger = inject(LoggerService);

  loadData(): void {
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.logger.log('Data loaded successfully', data);
        },
        error: (err) => {
          this.logger.errorWithPrefix('MyComponent', 'Failed to load data', err);
          this.errorService.setErrorFromHttp(err);
        }
      });
  }
}
```

### In Services

```typescript
import { LoggerService } from '../services/logger.service';

@Injectable({ providedIn: 'root' })
export class MyService {
  private logger = inject(LoggerService);

  processData(data: any): void {
    this.logger.debug('Processing data', data);
    // ... processing logic
  }
}
```

### In Interceptors

```typescript
import { LoggerService } from '../services/logger.service';

export const myInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const logger = inject(LoggerService);
    // ... interceptor logic
    return next(req).pipe(
      catchError((error) => {
        logger.errorWithPrefix('MyInterceptor', 'Request failed', error);
        return throwError(() => error);
      })
    );
  } catch (error) {
    const logger = inject(LoggerService);
    logger.errorWithPrefix('MyInterceptor', 'Interceptor error', error);
    return next(req);
  }
};
```

## Available Methods

### Basic Logging Methods

- `debug(message: string, ...args: any[])` - Debug messages
- `log(message: string, ...args: any[])` - Informational messages
- `warn(message: string, ...args: any[])` - Warning messages
- `error(message: string, ...args: any[])` - Error messages

### Advanced Methods

- `logWithPrefix(prefix: string, message: string, ...args: any[])` - Log with custom prefix
- `errorWithPrefix(prefix: string, message: string, ...args: any[])` - Error with custom prefix (recommended for components/services)
- `group(label: string)` - Start a console group
- `groupEnd()` - End a console group
- `isLoggingEnabled(): boolean` - Check if logging is currently enabled

## Best Practices

1. **Use `errorWithPrefix` for component/service errors**: This makes it easier to identify where errors originate
   ```typescript
   this.logger.errorWithPrefix('ComponentName', 'Operation failed', error);
   ```

2. **Use appropriate log levels**:
   - `debug()` - Detailed debugging information
   - `log()` - General informational messages
   - `warn()` - Warning messages (non-critical issues)
   - `error()` - Error messages (critical issues)

3. **Don't log sensitive information**: Even though logs are disabled in production, avoid logging:
   - Passwords
   - Tokens
   - Personal identifiable information (PII)
   - Credit card numbers

4. **Use structured logging**: Pass objects as additional arguments for better debugging
   ```typescript
   this.logger.errorWithPrefix('MyComponent', 'API call failed', {
     url: request.url,
     status: error.status,
     message: error.message
   });
   ```

## Testing

To test the logging system:

1. **Local/Dev**: Run the app and check the browser console - you should see all logs
2. **Production**: Build with production configuration:
   ```bash
   ng build --configuration production
   ```
   Then check the console - no logs should appear

## Migration Notes

All existing console statements have been replaced with LoggerService calls:
- `console.log()` → `logger.log()`
- `console.warn()` → `logger.warn()`
- `console.error()` → `logger.error()` or `logger.errorWithPrefix()`
- `console.debug()` → `logger.debug()`

This ensures consistent logging behavior across the application and automatic environment-based control.
