/**
 * High-Performance 60 FPS Swarm Renderer & Interactive Stage
 * Renders UI layout elements, approach cones, covariance ellipses,
 * animated particle tracers, and distinct geometric scatter markers.
 *
 * Complies with WCAG 2.3.1 (zero flashing) and respects prefers-reduced-motion.
 */

import { UIElement, MotorProfile, rectCenter } from '../engine/biomechanics.ts';
import { WorkerResponse } from '../worker/simWorker.ts';
import { renderGaussianHeatmap } from './heatmap.ts';

export interface SwarmRendererOptions {
  canvas: HTMLCanvasElement;
  onElementChange?: (elements: UIElement[]) => void;
  onElementSelect?: (element: UIElement | null) => void;
}

export class SwarmRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private elements: UIElement[] = [];
  private container = { width: 560, height: 320 };
  private profile!: MotorProfile;
  private result: WorkerResponse | null = null;

  public showHeatmap = false;
  public showCovariance = true;
  public showTrajectories = true;

  private animationFrameId: number | null = null;
  private animProgress = 0; // 0 to 1
  private animSpeed = 0.015; // smooth 60 FPS loop
  private prefersReducedMotion = false;

  // Dragging state
  private selectedElementId: string | null = null;
  private draggingElementId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private onElementChange?: (elements: UIElement[]) => void;
  private onElementSelect?: (element: UIElement | null) => void;

  constructor(options: SwarmRendererOptions) {
    this.canvas = options.canvas;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.onElementChange = options.onElementChange;
    this.onElementSelect = options.onElementSelect;

    this.checkReducedMotion();
    this.attachEvents();
    this.startAnimationLoop();
  }

  private checkReducedMotion(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = media.matches;
      media.addEventListener('change', e => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  public updateLayout(elements: UIElement[], container: { width: number; height: number }, profile: MotorProfile): void {
    this.elements = elements.map(e => ({ ...e, rect: { ...e.rect } }));
    this.container = { ...container };
    this.profile = { ...profile };
    this.resizeCanvas();
    this.render();
  }

  public setSimulationResult(result: WorkerResponse | null): void {
    this.result = result;
    this.animProgress = 0;
    this.render();
  }

  public selectElement(id: string | null): void {
    this.selectedElementId = id;
    this.render();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.container.width * dpr;
    this.canvas.height = this.container.height * dpr;
    this.canvas.style.width = `${this.container.width}px`;
    this.canvas.style.height = `${this.container.height}px`;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  private startAnimationLoop = (): void => {
    const loop = () => {
      if (this.showTrajectories && !this.prefersReducedMotion && this.result) {
        this.animProgress += this.animSpeed;
        if (this.animProgress > 1.4) {
          this.animProgress = 0; // Loop cycle
        }
        this.render();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  };

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public render(): void {
    const { ctx, container } = this;
    ctx.clearRect(0, 0, container.width, container.height);

    // 1. Grid pattern background
    this.renderGrid();

    // 2. Approach Vector & Covariance Ellipse
    if (this.showCovariance) {
      this.renderApproachConeAndEllipse();
    }

    // 3. Gaussian Heatmap Overlay
    if (this.showHeatmap && this.result) {
      renderGaussianHeatmap(ctx, this.result.endpoints, container.width, container.height, false);
    }

    // 4. Animated Trajectory Tracers
    if (this.showTrajectories && this.result && !this.prefersReducedMotion) {
      this.renderAnimatedTrajectories();
    }

    // 5. Static or Finished Endpoint Scatter Markers
    if (this.result) {
      this.renderEndpoints();
    }

    // 6. UI Layout Elements (Buttons, Inputs)
    this.renderElements();
  }

  private renderGrid(): void {
    const { ctx, container } = this;
    ctx.save();
    ctx.strokeStyle = '#161D2E';
    ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x <= container.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, container.height);
      ctx.stroke();
    }
    for (let y = 0; y <= container.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(container.width, y);
      ctx.stroke();
    }

    // Container border outline
    ctx.strokeStyle = '#232D42';
    ctx.strokeRect(0, 0, container.width, container.height);
    ctx.restore();
  }

  private renderApproachConeAndEllipse(): void {
    const anchorEl = this.elements.find(e => e.role === 'anchor') ?? this.elements[0];
    const primaryEl = this.elements.find(e => e.role === 'primary');
    if (!anchorEl || !primaryEl) return;

    const { ctx } = this;
    const a = rectCenter(anchorEl.rect);
    const p = rectCenter(primaryEl.rect);

    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);

    ctx.save();

    // Approach arrow from anchor to primary
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw arrowhead at target
    const arrowLen = 10;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x - arrowLen * Math.cos(angle - Math.PI / 6),
      p.y - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      p.x - arrowLen * Math.cos(angle + Math.PI / 6),
      p.y - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Covariance 2-sigma ellipse around primary
    const urgency = this.profile ? this.profile.urgency : 1.0;
    const overshoot = this.profile ? this.profile.overshootRatio : 1.5;
    const sigmaPerp = 0.055 * dist * urgency;
    const sigmaPar = overshoot * sigmaPerp;

    const semiMajor = Math.max(8, 2 * sigmaPar);
    const semiMinor = Math.max(6, 2 * sigmaPerp);

    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, semiMajor, semiMinor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderAnimatedTrajectories(): void {
    if (!this.result) return;
    const { trajectorySamples, trajectoryLengths } = this.result;
    const { ctx } = this;

    ctx.save();
    let offset = 0;
    const progress = Math.min(1.0, this.animProgress);

    for (let i = 0; i < trajectoryLengths.length; i++) {
      const len = trajectoryLengths[i];
      if (len < 2) continue;

      const pointsToDraw = Math.floor(len * progress);
      if (pointsToDraw > 1) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let j = 0; j < pointsToDraw; j++) {
          const px = trajectorySamples[(offset + j) * 3 + 0];
          const py = trajectorySamples[(offset + j) * 3 + 1];
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Animated particle head
        const headX = trajectorySamples[(offset + pointsToDraw - 1) * 3 + 0];
        const headY = trajectorySamples[(offset + pointsToDraw - 1) * 3 + 1];
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.beginPath();
        ctx.arc(headX, headY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      offset += len;
    }
    ctx.restore();
  }

  private renderEndpoints(): void {
    if (!this.result) return;
    const { endpoints } = this.result;
    const { ctx } = this;
    const count = endpoints.length / 3;

    // Determine how many endpoints to reveal based on animation progress
    const revealLimit = this.prefersReducedMotion
      ? count
      : Math.floor(count * Math.min(1.0, this.animProgress * 1.2));

    ctx.save();
    for (let i = 0; i < revealLimit; i++) {
      const x = endpoints[i * 3 + 0];
      const y = endpoints[i * 3 + 1];
      const hitCode = endpoints[i * 3 + 2];

      if (hitCode === 0) {
        // Emerald Circle = Primary Hit
        ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (hitCode === 1) {
        // Crimson Diamond = Destructive Collision
        ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 1.5;
        const size = 5;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (hitCode === 2) {
        // Amber Triangle = Neutral Miss
        ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        const s = 4;
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s, y + s);
        ctx.lineTo(x - s, y + s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Slate dot = Outer Miss
        ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderElements(): void {
    const { ctx } = this;

    for (const el of this.elements) {
      const { rect, role, label, id } = el;
      const isSelected = id === this.selectedElementId;

      ctx.save();

      // Theme-based styling for each element role
      let bg = '#1E293B';
      let border = '#334155';
      let textColor = '#F8FAFC';
      let badgeColor = '#94A3B8';

      if (role === 'primary') {
        bg = el.style?.background || '#0284C7';
        border = '#38BDF8';
        badgeColor = '#38BDF8';
      } else if (role === 'destructive') {
        bg = el.style?.background || '#DC2626';
        border = '#F43F5E';
        badgeColor = '#F43F5E';
      } else if (role === 'anchor') {
        bg = '#0F172A';
        border = '#06B6D4';
        badgeColor = '#06B6D4';
      }

      // Draw element shadow & background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = bg;
      ctx.strokeStyle = isSelected ? '#38BDF8' : border;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      const r = 6; // rounded corners
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';

      // Draw active selection outline
      if (isSelected) {
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(rect.x - 4, rect.y - 4, rect.width + 8, rect.height + 8);
        ctx.setLineDash([]);
      }

      // Draw element label
      ctx.fillStyle = textColor;
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxTextWidth = rect.width - 16;
      ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2, maxTextWidth);

      // Draw small role tag above element
      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 9px "JetBrains Mono", Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(role.toUpperCase(), rect.x, rect.y - 3);

      ctx.restore();
    }
  }

  // --- Mouse & Drag Interaction ---
  private attachEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);

    // Check elements top-to-bottom
    let hit: UIElement | null = null;
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (
        pos.x >= el.rect.x &&
        pos.x <= el.rect.x + el.rect.width &&
        pos.y >= el.rect.y &&
        pos.y <= el.rect.y + el.rect.height
      ) {
        hit = el;
        break;
      }
    }

    if (hit) {
      this.selectedElementId = hit.id;
      this.draggingElementId = hit.id;
      this.dragOffsetX = pos.x - hit.rect.x;
      this.dragOffsetY = pos.y - hit.rect.y;
      this.onElementSelect?.(hit);
      this.render();
    } else {
      this.selectedElementId = null;
      this.draggingElementId = null;
      this.onElementSelect?.(null);
      this.render();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.draggingElementId) return;

    const pos = this.getCanvasPos(e);
    const el = this.elements.find(item => item.id === this.draggingElementId);
    if (!el) return;

    // Calculate new position clamped to container bounds
    const newX = Math.max(0, Math.min(this.container.width - el.rect.width, pos.x - this.dragOffsetX));
    const newY = Math.max(0, Math.min(this.container.height - el.rect.height, pos.y - this.dragOffsetY));

    el.rect.x = Math.round(newX);
    el.rect.y = Math.round(newY);

    this.render();
  };

  private handleMouseUp = (): void => {
    if (this.draggingElementId) {
      this.draggingElementId = null;
      this.onElementChange?.(this.elements);
    }
  };
}
