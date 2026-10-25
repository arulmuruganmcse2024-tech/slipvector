import { test, expect } from '@playwright/test';

test.describe('Step 1: Comprehensive Button-by-Button & Functional Interactivity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Collect all page console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
    (page as any).__consoleErrors = consoleErrors;
  });

  test('1. Audits all Header interactive buttons (Mouse & Keyboard)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    // Header buttons
    const btnDemo = page.locator('#btn-guided-demo');
    const btnDogfood = page.locator('#btn-dogfood-audit');
    const btnPaste = page.locator('#btn-paste-html');
    const btnStress = page.locator('#btn-pointer-stress');

    await expect(btnDemo).toBeVisible();
    await expect(btnDogfood).toBeVisible();
    await expect(btnPaste).toBeVisible();
    await expect(btnStress).toBeVisible();

    // 1a. Dogfood Audit button click
    await btnDogfood.click();
    await page.waitForTimeout(400);
    const canvasHint = await page.locator('.canvas-hint').textContent();
    expect(canvasHint).toContain('Drag buttons');

    // 1b. Paste HTML Modal open & close
    await btnPaste.click();
    await expect(page.locator('#html-import-modal-overlay')).toBeVisible();
    await page.click('#btn-modal-close');
    await expect(page.locator('#html-import-modal-overlay')).not.toBeVisible();

    // 1c. Keyboard activation for Paste HTML (Tab + Enter)
    await page.locator('#btn-paste-html').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#html-import-modal-overlay')).toBeVisible();
    await page.keyboard.press('Escape'); // or click cancel
    await page.click('#btn-cancel');
    await expect(page.locator('#html-import-modal-overlay')).not.toBeVisible();

    // 1d. Motor Perturbation Opt-in start and ESC exit
    await btnStress.click();
    await expect(page.locator('#pointer-stress-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#pointer-stress-overlay')).not.toBeVisible();

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('2. Audits Canvas stage checkboxes & toggles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    const chkTraj = page.locator('#chk-toggle-trajectories');
    const chkCov = page.locator('#chk-toggle-covariance');
    const chkHeat = page.locator('#chk-toggle-heatmap');

    await expect(chkTraj).toBeChecked();
    await expect(chkCov).toBeChecked();
    await expect(chkHeat).not.toBeChecked();

    // Mouse toggle
    await chkTraj.click();
    await expect(chkTraj).not.toBeChecked();
    await chkTraj.click();
    await expect(chkTraj).toBeChecked();

    await chkHeat.click();
    await expect(chkHeat).toBeChecked();
    await chkHeat.click();
    await expect(chkHeat).not.toBeChecked();

    // Keyboard toggle via Space
    await chkCov.focus();
    await page.keyboard.press('Space');
    await expect(chkCov).not.toBeChecked();
    await page.keyboard.press('Space');
    await expect(chkCov).toBeChecked();

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('3. Audits Control Deck: Presets, Profiles, Sample Size, Sliders, and Run Swarm', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    // 3a. Run Swarm button click
    const btnRun = page.locator('#btn-run-swarm');
    await btnRun.click();
    await page.waitForTimeout(300);

    // 3b. Space key shortcut for Run Swarm
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // 3c. Preset selector dropdown
    const selPreset = page.locator('#select-preset');
    await selPreset.selectOption('mobile-checkout');
    await page.waitForTimeout(400);
    const subtitle = await page.locator('.preset-subtitle').textContent();
    expect(subtitle).toContain('transit sway');

    // 3d. Motor Profile selector dropdown
    const selProfile = page.locator('#select-profile');
    await selProfile.selectOption('transit-sway');
    await page.waitForTimeout(400);

    // 3e. Sample size buttons (500, 2000, 10000)
    const btn500 = page.locator('.btn-sample[data-size="500"]');
    const btn2000 = page.locator('.btn-sample[data-size="2000"]');
    const btn10000 = page.locator('.btn-sample[data-size="10000"]');

    await btn2000.click();
    await expect(btn2000).toHaveClass(/active/);
    await expect(page.locator('#val-sample-size')).toHaveText('2,000');

    await btn10000.click();
    await expect(btn10000).toHaveClass(/active/);
    await expect(page.locator('#val-sample-size')).toHaveText('10,000');

    await btn500.click();
    await expect(btn500).toHaveClass(/active/);
    await expect(page.locator('#val-sample-size')).toHaveText('500');

    // 3f. Parametric Sliders (Keyboard arrow & programmatic input)
    const slOvershoot = page.locator('#slider-overshoot');
    await slOvershoot.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const overshootVal = await page.locator('#val-overshoot').textContent();
    expect(overshootVal).toMatch(/\d\.\d\dx/);

    // Set slider value and dispatch input
    await slOvershoot.evaluate((el: HTMLInputElement) => {
      el.value = '1.85';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#val-overshoot')).toHaveText('1.85x');

    const slFreq = page.locator('#slider-frequency');
    await slFreq.evaluate((el: HTMLInputElement) => {
      el.value = '7.5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#val-frequency')).toHaveText('7.5 Hz');

    const slAmp = page.locator('#slider-amplitude');
    await slAmp.evaluate((el: HTMLInputElement) => {
      el.value = '15';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#val-amplitude')).toHaveText('15.0 px');

    const slJerk = page.locator('#slider-jerk');
    await slJerk.evaluate((el: HTMLInputElement) => {
      el.value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#val-jerk')).toHaveText('5.0 px');

    const slUrg = page.locator('#slider-urgency');
    await slUrg.evaluate((el: HTMLInputElement) => {
      el.value = '1.4';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#val-urgency')).toHaveText('1.40x');

    // 3g. Element Geometry Inspector inputs
    const inpX = page.locator('#inp-geom-x');
    if (await inpX.isVisible()) {
      await inpX.fill('35');
      await inpX.dispatchEvent('change');
      await page.waitForTimeout(200);
    }

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('4. Audits Sensitivity Sweeps, Auto-Heal Solver, and Export Suite', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    // 4a. Sensitivity Parameter Toggles
    const btnSwpOvershoot = page.locator('#btn-sweep-overshoot');
    const btnSwpAmp = page.locator('#btn-sweep-amplitude');

    await btnSwpAmp.click();
    await expect(btnSwpAmp).toHaveClass(/active/);

    await btnSwpOvershoot.click();
    await expect(btnSwpOvershoot).toHaveClass(/active/);

    // 4b. Auto-Heal Solver Execution & Receipt Generation
    const btnHeal = page.locator('#btn-trigger-autoheal');
    await btnHeal.click();
    await page.waitForSelector('.receipt-card', { timeout: 5000 });

    const statusBadge = page.locator('.receipt-header .badge');
    const badgeText = await statusBadge.textContent();
    expect(badgeText).toMatch(/SOLVED|NO CHANGE NEEDED|PARTIALLY MITIGATED/);

    // 4c. Export Suite Buttons (Copy CSS, Copy Tailwind, Download JSON)
    const btnCss = page.locator('#btn-copy-css');
    const btnTailwind = page.locator('#btn-copy-tailwind');
    const btnJson = page.locator('#btn-download-json');

    await btnCss.click();
    const toast = page.locator('#export-toast');
    await expect(toast).toBeVisible();

    await btnTailwind.click();
    await expect(toast).toBeVisible();

    // Verify reproducible JSON download
    const downloadPromise = page.waitForEvent('download');
    await btnJson.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/slipvector-audit-\d+\.json/);

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('5. Audits HTML Sandbox Security: Blocks scripts and network tags', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.telemetry-grid');

    await page.click('#btn-paste-html');
    await expect(page.locator('#html-import-modal-overlay')).toBeVisible();

    // Inject malicious markup with <script> and dangerous attributes
    const maliciousHTML = `
      <div id="test-sandbox-root" style="padding:20px;">
        <button id="safe-action" style="width:100px; height:40px;">Safe Action</button>
        <button id="danger-action" style="width:100px; height:40px;">Delete Record</button>
        <script>window.__slipvector_xss_injected = true;</script>
        <img src="x" onerror="window.__slipvector_onerror_injected = true;" />
      </div>
    `;

    await page.locator('#inp-custom-html').fill(maliciousHTML);
    await page.click('#btn-extract-dom');

    await page.waitForSelector('#extraction-results', { state: 'visible' });
    const count = await page.locator('#extracted-count').textContent();
    expect(parseInt(count || '0', 10)).toBeGreaterThan(0);

    // Verify sandbox completely blocked script execution
    const xssEscaped = await page.evaluate(() => (window as any).__slipvector_xss_injected);
    const onerrorEscaped = await page.evaluate(() => (window as any).__slipvector_onerror_injected);
    expect(xssEscaped).toBeUndefined();
    expect(onerrorEscaped).toBeUndefined();

    // Load into studio
    await page.click('#btn-load-into-studio');
    await expect(page.locator('#html-import-modal-overlay')).not.toBeVisible();

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('6. Audits Footer Documentation Links', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.footer-nav');

    const links = page.locator('.footer-nav a');
    const count = await links.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');

      expect(href).toMatch(/^https:\/\/github\.com\/arulmuruganmcse2024-tech\/slipvector/);
      expect(target).toBe('_blank');
      expect(rel).toContain('noopener');
    }

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('7. Audits Canvas element drag and selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#canvas-swarm');

    const canvas = page.locator('#canvas-swarm');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Click near element to select
    await page.mouse.click(box.x + 350, box.y + 154);
    await page.waitForTimeout(300);

    // Drag from (350, 154) to (380, 154)
    await page.mouse.move(box.x + 350, box.y + 154);
    await page.mouse.down();
    await page.mouse.move(box.x + 380, box.y + 154, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });

  test('8. Audits Guided Demo walkthrough executes cleanly', async ({ page }) => {
    test.setTimeout(25000); // 10-second demo needs ample timeout
    await page.goto('/');
    await page.waitForSelector('#btn-guided-demo');

    const btnDemo = page.locator('#btn-guided-demo');
    await btnDemo.click();

    // Verify button text changes to progress states
    await expect(btnDemo).toHaveText(/Step 1\/3/);

    // Wait for the walkthrough to finish and restore original title
    await expect(btnDemo).toHaveText(/Run 10-Second Guided Demo/, { timeout: 15000 });

    const errors = (page as any).__consoleErrors as string[];
    expect(errors).toEqual([]);
  });
});

