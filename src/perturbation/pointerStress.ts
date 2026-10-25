/**
 * Opt-In Motor-Variability Pointer Perturbation Test
 * Allows users to directly experience simulated motor variability / tremor.
 * Respectful, non-clinical terminology; strictly off by default.
 * Exits instantly on ESC key or mouse click.
 */

import { MotorProfile } from '../engine/biomechanics.ts';

export class PointerStressTester {
  private active = false;
  private overlay: HTMLElement | null = null;
  private virtualCursor: HTMLElement | null = null;
  private profile!: MotorProfile;
  private animId: number | null = null;

  private currentX = 0;
  private currentY = 0;
  private noiseX = 0;
  private noiseY = 0;
  private ouX = 0;
  private ouY = 0;
  private startTime = 0;

  public isSupported(): boolean {
    // Check if mouse/pointer device is present (not purely touch)
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: fine)').matches;
  }

  public start(profile: MotorProfile): void {
    if (this.active) return;

    if (!this.isSupported()) {
      alert('Pointer perturbation testing requires mouse or trackpad pointing hardware. Touch-only screens do not support synthetic pointer offset.');
      return;
    }

    this.profile = profile;
    this.active = true;
    this.startTime = performance.now();

    this.createOverlay();
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('keydown', this.handleKeyDown);
    this.startPerturbationLoop();
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;

    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.virtualCursor = null;
  }

  private createOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'pointer-stress-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '99999';
    overlay.style.cursor = 'none';
    overlay.style.background = 'rgba(10, 13, 20, 0.45)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.userSelect = 'none';

    // HUD Banner
    const hud = document.createElement('div');
    hud.style.position = 'absolute';
    hud.style.top = '24px';
    hud.style.left = '50%';
    hud.style.transform = 'translateX(-50%)';
    hud.style.background = '#111622';
    hud.style.border = '1px solid #F59E0B';
    hud.style.color = '#F8FAFC';
    hud.style.padding = '12px 24px';
    hud.style.borderRadius = '9999px';
    hud.style.fontFamily = 'system-ui, sans-serif';
    hud.style.fontSize = '14px';
    hud.style.fontWeight = '600';
    hud.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '12px';
    hud.innerHTML = `
      <span style="color:#F59E0B">🖐️ Active Profile: ${this.profile.name}</span>
      <span style="color:#94A3B8; font-size:12px;">Move pointer to feel simulated motor variability • Press <strong>ESC</strong> or click to exit</span>
    `;

    // Synthetic Cursor Ring
    const cursor = document.createElement('div');
    cursor.id = 'virtual-cursor';
    cursor.style.position = 'absolute';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.borderRadius = '50%';
    cursor.style.border = '2px solid #06B6D4';
    cursor.style.background = 'rgba(6, 182, 212, 0.2)';
    cursor.style.boxShadow = '0 0 10px #06B6D4';
    cursor.style.pointerEvents = 'none';
    cursor.style.transform = 'translate(-50%, -50%)';

    overlay.appendChild(hud);
    overlay.appendChild(cursor);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => this.stop());

    this.overlay = overlay;
    this.virtualCursor = cursor;
  }

  private handleMouseMove = (e: MouseEvent): void => {
    this.currentX = e.clientX;
    this.currentY = e.clientY;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.stop();
    }
  };

  private startPerturbationLoop = (): void => {
    const loop = () => {
      if (!this.active) return;

      const now = performance.now();
      const t = (now - this.startTime) / 1000;
      const freq = this.profile.frequency;
      const amp = this.profile.amplitude * 1.5;

      // Sinusoidal tremor oscillation
      const sinX = amp * Math.sin(2 * Math.PI * freq * t);
      const sinY = amp * Math.cos(2 * Math.PI * freq * t * 0.9 + 1.2);

      // Stochastic Ornstein-Uhlenbeck drift
      const dt = 0.016;
      const theta = 3.5;
      const sigma = 0.8 * Math.sqrt(amp + 1);
      const randN1 = (Math.random() + Math.random() + Math.random() - 1.5) * 1.5;
      const randN2 = (Math.random() + Math.random() + Math.random() - 1.5) * 1.5;

      this.ouX = this.ouX * Math.exp(-theta * dt) + sigma * randN1;
      this.ouY = this.ouY * Math.exp(-theta * dt) + sigma * randN2;

      this.noiseX = sinX + this.ouX;
      this.noiseY = sinY + this.ouY;

      if (this.virtualCursor) {
        const posX = Math.round(this.currentX + this.noiseX);
        const posY = Math.round(this.currentY + this.noiseY);
        this.virtualCursor.style.left = `${posX}px`;
        this.virtualCursor.style.top = `${posY}px`;
      }

      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  };
}
