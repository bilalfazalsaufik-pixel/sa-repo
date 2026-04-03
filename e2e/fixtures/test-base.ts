import { test as base, expect } from '@playwright/test';

/**
 * Custom test fixture with authentication helpers and common utilities
 */

export interface TestUser {
  email: string;
  password: string;
  tenantId: number;
}

export interface TestFixtures {
  authenticatedPage: any; // Page with logged-in user
  testUser: TestUser;
}

export const test = base.extend<TestFixtures>({
  // Mock test user
  testUser: async ({}, use) => {
    const user: TestUser = {
      email: 'test@example.com',
      password: 'Test123!',
      tenantId: 1
    };
    await use(user);
  },

  // Authenticated page fixture
  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login
    await page.goto('/login');
    
    // Mock Auth0 authentication (or actual login if needed)
    // For E2E tests, you might want to use Auth0's test tenants or mock
    
    // Option 1: Mock authentication by setting localStorage
    await page.evaluate((user) => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: user.email,
        tenantId: user.tenantId,
        firstName: 'Test',
        lastName: 'User'
      }));
    }, testUser);
    
    // Navigate to dashboard after "login"
    await page.goto('/dashboard');
    
    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
    
    await use(page);
  }
});

export { expect };
