# Frontend E2E Tests (Playwright)

## Overview

End-to-end tests for the Angular SPA using Playwright. These tests verify complete user journeys and critical workflows.

## Test Suites

### 1. Authentication (`auth.spec.ts`)
- Login/logout flows
- Session persistence
- Unauthorized access protection
- Token management

### 2. Zones Management (`zones.spec.ts`)
- List zones
- Search/filter
- Create new zone
- Edit zone
- Delete zone
- Form validation
- Pagination

### 3. Dashboard (`dashboard.spec.ts`)
- Summary cards display
- Site status breakdown
- Charts rendering
- Date range filtering
- Site filtering
- Data refresh
- Current readings
- Empty state handling

### 4. Tenant Isolation (`tenant-isolation.spec.ts`)
- Tenant ID header verification
- Cross-tenant access prevention
- Tenant context cleanup

## Setup

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Install Browsers

```bash
npx playwright install chromium firefox webkit
```

## Running Tests

### Run All Tests

```bash
# Run all tests
npx playwright test

# Run with UI mode (recommended for development)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/zones.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
```

### Run Specific Tests

```bash
# Run tests matching a pattern
npx playwright test --grep "should create"

# Run tests in a specific file
npx playwright test e2e/auth.spec.ts
```

### Debug Tests

```bash
# Debug mode (step through tests)
npx playwright test --debug

# Debug specific test
npx playwright test e2e/zones.spec.ts --debug
```

## Test Reports

### View HTML Report

```bash
# Generate and open HTML report
npx playwright show-report
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Playwright tests
  run: npx playwright test
  
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/feature');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.click('[data-testid="button"]');
    
    // Act
    await page.fill('[data-testid="input"]', 'value');
    
    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Using Test Fixtures

```typescript
import { test, expect } from './fixtures/test-base';

test('authenticated test', async ({ authenticatedPage }) => {
  // Already logged in!
  await authenticatedPage.goto('/protected-route');
  await expect(authenticatedPage).toHaveURL(/\/protected-route/);
});
```

### Best Practices

1. **Use data-testid attributes** for reliable selectors:
   ```html
   <button data-testid="save-button">Save</button>
   ```
   ```typescript
   await page.click('[data-testid="save-button"]');
   ```

2. **Wait for network idle** when loading data:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Mock API responses** for consistent tests:
   ```typescript
   await page.route('**/api/v1/zones', route => {
     route.fulfill({
       status: 200,
       body: JSON.stringify([{ id: 1, name: 'Test Zone' }])
     });
   });
   ```

4. **Use descriptive test names**:
   ```typescript
   test('should display validation error when zone name is empty', ...)
   ```

5. **Keep tests independent** - each test should work in isolation

6. **Use page objects** for complex pages (optional):
   ```typescript
   class ZonesPage {
     constructor(private page: Page) {}
     
     async createZone(name: string) {
       await this.page.click('[data-testid="add-zone-button"]');
       await this.page.fill('[data-testid="zone-name-input"]', name);
       await this.page.click('[data-testid="save-zone-button"]');
     }
   }
   ```

## Debugging Tips

### Take Screenshots

```typescript
await page.screenshot({ path: 'screenshot.png' });
```

### Inspect Element State

```typescript
const text = await page.locator('[data-testid="element"]').textContent();
console.log('Element text:', text);

const isVisible = await page.locator('[data-testid="element"]').isVisible();
console.log('Is visible:', isVisible);
```

### Slow Down Tests

```typescript
test.use({ 
  headless: false,
  slowMo: 1000 // Wait 1 second between actions
});
```

### Trace Viewer

```bash
# Generate trace on failure
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Configuration

Edit `playwright.config.ts` to customize:

- Test timeout
- Retry strategy
- Parallel execution
- Browsers to test
- Base URL
- Screenshots/videos
- Reporters

## Adding Tests for New Features

1. Create new test file: `e2e/feature-name.spec.ts`
2. Import test and expect: `import { test, expect } from '@playwright/test';`
3. Write test cases following existing patterns
4. Use `data-testid` attributes in components
5. Run tests: `npx playwright test e2e/feature-name.spec.ts`
6. Fix any failures
7. Commit tests with feature code

## CI/CD

Tests run automatically in CI when:
- Pull requests are created
- Code is pushed to main branch
- Manual workflow trigger

Failed tests will block merges.

## Troubleshooting

### Tests Timeout

- Increase timeout in config: `timeout: 60 * 1000`
- Wait for network: `await page.waitForLoadState('networkidle')`
- Wait for specific element: `await page.waitForSelector('[data-testid="element"]')`

### Flaky Tests

- Add explicit waits
- Use `waitForLoadState('networkidle')`
- Mock slow API responses
- Increase retry count in CI

### Element Not Found

- Check selector is correct
- Verify element has `data-testid` attribute
- Wait for element: `await page.waitForSelector('[data-testid="element"]')`
- Check if element is in iframe

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Selectors](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/assertions)
