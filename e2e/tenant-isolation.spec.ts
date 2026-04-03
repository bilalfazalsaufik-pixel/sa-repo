import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Multi-Tenancy Isolation
 * Ensures users can only access their own tenant's data
 */

test.describe('Tenant Isolation', () => {
  test('should only show data for authenticated tenant', async ({ page }) => {
    // Login as Tenant 1 user
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'tenant1@example.com',
        tenantId: 1,
        firstName: 'Tenant1',
        lastName: 'User'
      }));
    });
    
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');
    
    // Intercept API calls to verify tenant ID is sent
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify X-Tenant-Id header is present and correct
    const apiRequests = requests.filter(r => r.url.includes('/api/v1/zone'));
    expect(apiRequests.length).toBeGreaterThan(0);
    expect(apiRequests[0].headers['x-tenant-id']).toBe('1');
  });

  test('should prevent direct URL access to other tenant resources', async ({ page }) => {
    // Login as Tenant 1 user
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'tenant1@example.com',
        tenantId: 1
      }));
    });
    
    // Try to access a resource that might belong to another tenant
    // This should either return 403 or show "not found"
    await page.route('**/api/v1/zones/9999', route => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ error: 'Forbidden', message: 'Access denied to tenant resource' })
      });
    });
    
    await page.goto('/zones/9999');
    
    // Should show error message or redirect
    await expect(page.locator('.error-message, [data-testid="access-denied"]')).toBeVisible({ timeout: 5000 });
  });

  test('should include tenant ID in all API requests', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        tenantId: 1
      }));
    });
    
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    // Navigate through different pages
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/sites');
    await page.waitForLoadState('networkidle');
    
    // All API requests should have X-Tenant-Id header
    for (const request of apiRequests) {
      expect(request.headers).toHaveProperty('x-tenant-id');
      expect(request.headers['x-tenant-id']).toBe('1');
    }
  });

  test('should clear tenant context on logout', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        tenantId: 1
      }));
    });
    
    await page.goto('/dashboard');
    
    // Logout
    await page.click('[data-testid="logout-button"]');
    
    // Verify tenant context is cleared
    const userData = await page.evaluate(() => localStorage.getItem('user'));
    expect(userData).toBeNull();
    
    // Try to access protected route - should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
