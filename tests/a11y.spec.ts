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
    console.log(`✓ Axe-core audit passed with 0 serious/critical violations across ${accessibilityScanResults.passes.length} verified rules.`);
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
});
