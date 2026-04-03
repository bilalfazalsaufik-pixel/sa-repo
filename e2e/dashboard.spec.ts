import { test, expect } from './fixtures/test-base';

/**
 * E2E Tests for Dashboard
 * Tests the main dashboard functionality and data visualization
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display dashboard summary cards', async ({ authenticatedPage: page }) => {
    // Check for summary statistics
    await expect(page.locator('[data-testid="total-sites-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-devices-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-sensors-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-events-card"]')).toBeVisible();
  });

  test('should display site status breakdown', async ({ authenticatedPage: page }) => {
    // Check for status indicators
    const greenSites = page.locator('[data-testid="green-sites"]');
    const yellowSites = page.locator('[data-testid="yellow-sites"]');
    const redSites = page.locator('[data-testid="red-sites"]');
    
    // At least one should be visible
    const visibleCount = await Promise.all([
      greenSites.isVisible(),
      yellowSites.isVisible(),
      redSites.isVisible()
    ]);
    
    expect(visibleCount.some(v => v)).toBeTruthy();
  });

  test('should display charts', async ({ authenticatedPage: page }) => {
    // Check for chart containers
    const charts = [
      '[data-testid="level-chart"]',
      '[data-testid="amps-chart"]',
      '[data-testid="events-chart"]'
    ];
    
    for (const chartSelector of charts) {
      const chart = page.locator(chartSelector);
      if (await chart.isVisible()) {
        // Chart should have loaded data (canvas or svg element)
        await expect(chart.locator('canvas, svg')).toBeVisible();
      }
    }
  });

  test('should filter dashboard by date range', async ({ authenticatedPage: page }) => {
    // Find date range picker
    const startDateInput = page.locator('[data-testid="start-date-input"]');
    const endDateInput = page.locator('[data-testid="end-date-input"]');
    
    if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
      // Set date range
      await startDateInput.fill('2024-01-01');
      await endDateInput.fill('2024-01-31');
      
      // Apply filter
      await page.click('[data-testid="apply-filter-button"]');
      
      // Wait for data to reload
      await page.waitForLoadState('networkidle');
      
      // Charts should update (check for loading spinner then data)
      await expect(page.locator('.loading-spinner')).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('should filter dashboard by site', async ({ authenticatedPage: page }) => {
    // Find site filter dropdown
    const siteFilter = page.locator('[data-testid="site-filter"]');
    
    if (await siteFilter.isVisible()) {
      await siteFilter.click();
      
      // Select first site from dropdown
      await page.click('[data-testid="site-option"]', { timeout: 5000 });
      
      // Dashboard should reload with filtered data
      await page.waitForLoadState('networkidle');
      
      // Summary should update
      await expect(page.locator('[data-testid="total-sites-card"]')).toContainText('1');
    }
  });

  test('should navigate to site details from overview table', async ({ authenticatedPage: page }) => {
    // Find site overview table
    const siteTable = page.locator('[data-testid="site-overview-table"]');
    
    if (await siteTable.isVisible()) {
      // Click first site row
      await page.click('table tbody tr:first-child');
      
      // Should navigate to site details
      await expect(page).toHaveURL(/\/sites\/\d+/);
    }
  });

  test('should refresh dashboard data', async ({ authenticatedPage: page }) => {
    // Find refresh button
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    
    if (await refreshButton.isVisible()) {
      // Get current timestamp or data
      const originalText = await page.locator('[data-testid="last-updated"]').textContent();
      
      // Click refresh
      await refreshButton.click();
      
      // Wait for refresh to complete
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
      
      // Timestamp should update
      const newText = await page.locator('[data-testid="last-updated"]').textContent();
      expect(newText).not.toBe(originalText);
    }
  });

  test('should display current readings', async ({ authenticatedPage: page }) => {
    // Check for current level and amps readings
    const levelReadings = page.locator('[data-testid="current-level-readings"]');
    const ampsReadings = page.locator('[data-testid="current-amps-readings"]');
    
    if (await levelReadings.isVisible()) {
      // Should show sensor name and value
      await expect(levelReadings.locator('.sensor-name')).toBeVisible();
      await expect(levelReadings.locator('.sensor-value')).toBeVisible();
    }
    
    if (await ampsReadings.isVisible()) {
      await expect(ampsReadings.locator('.sensor-name')).toBeVisible();
      await expect(ampsReadings.locator('.sensor-value')).toBeVisible();
    }
  });

  test('should handle empty data gracefully', async ({ authenticatedPage: page }) => {
    // Mock empty response by intercepting API
    await page.route('**/api/v1/dashboard**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          summary: {
            totalSites: 0,
            totalDevices: 0,
            totalSensors: 0,
            activeEvents: 0,
            greenSites: 0,
            yellowSites: 0,
            redSites: 0
          },
          levelChartData: [],
          ampsChartData: [],
          stateTransitions: [],
          eventsChartData: [],
          categoryBreakdown: [],
          siteOverview: [],
          currentLevelReadings: [],
          currentAmpsReadings: []
        })
      });
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show "no data" message
    await expect(page.locator('[data-testid="no-data-message"]')).toBeVisible();
  });
});
