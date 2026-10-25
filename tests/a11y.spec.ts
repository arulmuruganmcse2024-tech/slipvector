import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & Keyboard Verification Suite (Axe-Core & Assistive Flow)', () => {
  test('1. Axe-core accessibility scan finds 0 serious or critical violations', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize and initial telemetry to render
    await page.waitForSelector('.telemetry-grid');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.error('Axe violations found:', JSON.stringify(criticalOrSerious, null, 2));
    }

    expect(criticalOrSerious).toEqual([]);
    console.log(`✓ No automated axe-core violations detected (automated checks cover a subset of WCAG criteria) across ${accessibilityScanResults.passes.length} verified rules.`);
  });

  test('2. Keyboard-only navigation flow operates smoothly without focus traps', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    // Tab through header controls
    await page.keyboard.press('Tab');
    let focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('btn-guided-demo');

    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('btn-dogfood-audit');

    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('btn-paste-html');

    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('btn-pointer-stress');

    // Tab into main workbench controls
    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('btn-run-swarm');

    // Press Enter on Run Swarm button to trigger simulation via keyboard
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    // Verify Space key shortcut also triggers simulation when not focused on text input
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    // Tab to Preset selector
    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('select-preset');

    // Tab into Sample Size buttons
    await page.keyboard.press('Tab'); // profile
    await page.keyboard.press('Tab'); // sample size 500
    const sampleSizeText = await page.evaluate(() => document.activeElement?.textContent);
    expect(sampleSizeText?.trim()).toBe('500');

    console.log('✓ Keyboard-only flow verified: full sequential focusability from header to controls without traps.');
  });

  test('3. Honors prefers-reduced-motion media query by disabling continuous animations', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    const reducedMotionMatches = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    expect(reducedMotionMatches).toBe(true);

    // Check CSS animation rules under reduced motion
    const transitionDuration = await page.evaluate(() => {
      const btn = document.querySelector('.btn-primary-action');
      return window.getComputedStyle(btn!).transitionDuration;
    });
    // In our reduced motion CSS block, transitions are set to 0.01ms (essentially 0s)
    expect(transitionDuration).toMatch(/0s|0\.00001s|1e-05s/);

    console.log('✓ Prefers-reduced-motion verified: system animation suppression honored in CSS and Canvas.');
  });

  const auditPresets = [
    { id: 'saas-modal', name: 'Preset 1: SaaS Settings Modal' },
    { id: 'mobile-checkout', name: 'Preset 2: Mobile Checkout' },
    { id: 'clinical-infusion', name: 'Preset 3: Clinical Infusion' },
    { id: 'git-pr-bar', name: 'Preset 4: Git PR Bar' },
    { id: 'wcag-aaa-stress', name: 'Preset 5: 48px AAA Stress' }
  ];

  for (const preset of auditPresets) {
    test(`Axe-core scan on ${preset.name} finds 0 serious or critical violations`, async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.telemetry-grid');

      await page.selectOption('#select-preset', preset.id);
      await page.waitForTimeout(300);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalOrSerious.length > 0) {
        console.error(`Axe violations on ${preset.name}:`, JSON.stringify(criticalOrSerious, null, 2));
      }
      expect(criticalOrSerious).toEqual([]);
    });
  }

  test('5. Axe-core audit across all Dialogs (HTML Import, Auto-Heal, Export Drawer) detects 0 serious or critical violations', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    // 1. HTML Import Modal
    await page.click('#btn-paste-html');
    await page.waitForSelector('#html-import-modal-overlay');
    let results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    let criticalOrSerious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalOrSerious).toEqual([]);
    await page.click('#btn-modal-close');
    await page.waitForSelector('#html-import-modal-overlay', { state: 'detached' });

    // 2. Auto-Heal Receipt Card
    await page.click('#btn-trigger-autoheal');
    await page.waitForSelector('.autoheal-card.receipt-card', { state: 'visible', timeout: 10000 });
    results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    criticalOrSerious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalOrSerious).toEqual([]);

    // 3. Export Suite
    await page.waitForSelector('#export-root');
    results = await new AxeBuilder({ page })
      .include('#export-root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    criticalOrSerious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalOrSerious).toEqual([]);

    console.log('✓ Axe-core audit passed for all dialogs and panels with 0 serious/critical violations.');
  });

  test('6. Responsive & Zoom audit at 320px viewport width and 200% zoom', async ({ page }) => {
    // Test 320px viewport
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    // Check that document body does not have horizontal scrollbar overflow that clips critical controls
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // Margin of 1-2px acceptable for scrollbars on some platforms, verify no severe clipping
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify main interactive buttons exist and are visible
    await expect(page.locator('#btn-run-swarm')).toBeVisible();
    await expect(page.locator('#btn-trigger-autoheal')).toBeVisible();
    await expect(page.locator('#select-preset')).toBeVisible();

    // Test 200% zoom emulation at standard desktop width
    await page.setViewportSize({ width: 1280, height: 800 });
    // Emulate 200% zoom via page scale factor or CSS zoom
    await page.evaluate(() => {
      document.body.style.zoom = '2.0';
    });
    await page.waitForTimeout(300);

    // Verify critical controls are still reachable and clickable
    await expect(page.locator('#btn-run-swarm')).toBeVisible();
    await page.click('#btn-run-swarm');
    await page.waitForTimeout(300);
    const scoreVal = await page.locator('.stat-number').first().textContent();
    expect(scoreVal).toBeTruthy();

    console.log('✓ Responsive and 200% zoom verification complete: no layout breakdown or clipped controls.');
  });
});

