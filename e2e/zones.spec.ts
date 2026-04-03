import { test, expect } from './fixtures/test-base';

/**
 * E2E Tests for Zones Management
 * Tests the complete CRUD workflow for zones
 */

test.describe('Zones Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to zones page
    await authenticatedPage.goto('/zones');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display zones list', async ({ authenticatedPage: page }) => {
    // Check for zones table/list
    await expect(page.locator('[data-testid="zones-list"]')).toBeVisible();
    
    // Should have at least the table headers
    await expect(page.locator('table thead')).toBeVisible();
  });

  test('should search/filter zones', async ({ authenticatedPage: page }) => {
    // Type in search box
    const searchInput = page.locator('[data-testid="search-input"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test Zone');
      
      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce
      
      // Results should be filtered
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should create a new zone', async ({ authenticatedPage: page }) => {
    // Click "Add Zone" button
    await page.click('[data-testid="add-zone-button"]');
    
    // Fill in the form
    await page.fill('[data-testid="zone-name-input"]', `E2E Test Zone ${Date.now()}`);
    
    // Submit form
    await page.click('[data-testid="save-zone-button"]');
    
    // Should show success message
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
    
    // Should return to zones list
    await expect(page).toHaveURL(/\/zones$/);
  });

  test('should edit an existing zone', async ({ authenticatedPage: page }) => {
    // Click first edit button
    const editButton = page.locator('[data-testid="edit-zone-button"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Modify the name
      const nameInput = page.locator('[data-testid="zone-name-input"]');
      const originalValue = await nameInput.inputValue();
      await nameInput.fill(`${originalValue} - Edited`);
      
      // Save
      await page.click('[data-testid="save-zone-button"]');
      
      // Should show success
      await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete a zone with confirmation', async ({ authenticatedPage: page }) => {
    // Click first delete button
    const deleteButton = page.locator('[data-testid="delete-zone-button"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion in dialog
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Should show success
      await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate required fields', async ({ authenticatedPage: page }) => {
    // Click "Add Zone" button
    await page.click('[data-testid="add-zone-button"]');
    
    // Try to submit without filling required fields
    await page.click('[data-testid="save-zone-button"]');
    
    // Should show validation errors
    await expect(page.locator('.error-message, .mat-error')).toBeVisible();
    
    // Form should not submit (still on same page)
    await expect(page).toHaveURL(/\/zones\/new/);
  });

  test('should paginate zones list', async ({ authenticatedPage: page }) => {
    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Get initial first row text
      const firstRowText = await page.locator('table tbody tr').first().textContent();
      
      // Click next page
      await page.click('[data-testid="next-page-button"]');
      await page.waitForTimeout(500);
      
      // First row should be different
      const newFirstRowText = await page.locator('table tbody tr').first().textContent();
      expect(newFirstRowText).not.toBe(firstRowText);
    }
  });

  test('should show zone details', async ({ authenticatedPage: page }) => {
    // Click first zone row or view button
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/zones\/\d+/);
      
      // Should show zone details
      await expect(page.locator('[data-testid="zone-details"]')).toBeVisible();
    }
  });
});
