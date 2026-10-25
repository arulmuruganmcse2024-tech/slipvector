/**
 * Realistic Presets and Motor Profiles for SlipVector
 * Includes Preset #5: 48px WCAG AAA Stress Case that demonstrates how AAA-compliant
 * targets still suffer destructive collisions under directional overshoot.
 */

import { UIElement, MotorProfile } from './biomechanics.ts';

export interface PresetLayout {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  container: { width: number; height: number };
  elements: UIElement[];
  recommendedProfileId: string;
}

export const MOTOR_PROFILES: MotorProfile[] = [
  {
    id: 'steady-baseline',
    name: 'Steady Baseline',
    frequency: 0,
    amplitude: 0,
    jerkImpulse: 0,
    urgency: 1.0,
    overshootRatio: 1.5,
    description: 'Calibrated baseline motor control with minimum-jerk approach and ballistic noise.'
  },
  {
    id: 'essential-tremor',
    name: 'Essential-Tremor-Like Oscillation (6 Hz)',
    frequency: 6.0,
    amplitude: 8.0,
    jerkImpulse: 0,
    urgency: 1.0,
    overshootRatio: 1.5,
    description: 'Typical 4–8 Hz kinetic/action tremor modeled as sinusoidal oscillation with OU drift.'
  },
  {
    id: 'transit-sway',
    name: 'Transit Sway & Jolt (~2.5 Hz)',
    frequency: 2.5,
    amplitude: 14.0,
    jerkImpulse: 8.0,
    urgency: 1.1,
    overshootRatio: 1.6,
    description: 'Commuter motion on bus/train with continuous low-frequency sway and impulsive vehicle jolts.'
  },
  {
    id: 'parkinsonian-approx',
    name: 'Parkinsonian Postural/Action Approximation (5 Hz)',
    frequency: 5.0,
    amplitude: 12.0,
    jerkImpulse: 0,
    urgency: 0.9,
    overshootRatio: 1.5,
    description: 'Parametric postural/action tremor approximation (Model approximation; not a clinical diagnostic).'
  },
  {
    id: 'thumb-reach',
    name: 'One-Handed Mobile Thumb Reach',
    frequency: 3.0,
    amplitude: 6.0,
    jerkImpulse: 4.0,
    urgency: 1.3,
    overshootRatio: 1.8,
    description: 'Radial thumb reach asymmetry characterized by increased directional overshoot.'
  }
];

export const PRESETS: PresetLayout[] = [
  {
    id: 'saas-modal',
    name: '1. SaaS Settings Modal',
    subtitle: 'Passes AA (24px), Fails AAA (44px) — High Collision',
    description: 'Save Changes (28px) placed right next to Delete Workspace (28px, 4px gap) approached diagonally from an input anchor.',
    container: { width: 520, height: 280 },
    recommendedProfileId: 'essential-tremor',
    elements: [
      {
        id: 'anchor-input',
        label: 'Workspace Name',
        role: 'anchor',
        rect: { x: 40, y: 40, width: 240, height: 36 }
      },
      {
        id: 'btn-save',
        label: 'Save Changes',
        role: 'primary',
        rect: { x: 260, y: 200, width: 110, height: 28 },
        style: { background: '#2563EB', color: '#FFFFFF' }
      },
      {
        id: 'btn-delete',
        label: 'Delete Workspace',
        role: 'destructive',
        rect: { x: 374, y: 200, width: 130, height: 28 },
        style: { background: '#DC2626', color: '#FFFFFF' }
      }
    ]
  },
  {
    id: 'mobile-checkout',
    name: '2. Mobile Commuter Checkout',
    subtitle: 'Cramped bottom sheet under transit sway (~2.5 Hz)',
    description: 'Large Complete Order button stacked directly above Cancel & Clear Cart on a mobile viewport during transit sway.',
    container: { width: 340, height: 500 },
    recommendedProfileId: 'transit-sway',
    elements: [
      {
        id: 'anchor-promo',
        label: 'Promo Code Field',
        role: 'anchor',
        rect: { x: 30, y: 60, width: 280, height: 44 }
      },
      {
        id: 'btn-complete',
        label: 'Complete Order',
        role: 'primary',
        rect: { x: 30, y: 370, width: 280, height: 48 },
        style: { background: '#10B981', color: '#FFFFFF' }
      },
      {
        id: 'btn-cancel',
        label: 'Cancel & Clear Cart',
        role: 'destructive',
        rect: { x: 30, y: 426, width: 280, height: 36 },
        style: { background: 'transparent', color: '#EF4444', border: '1px solid #EF4444' }
      }
    ]
  },
  {
    id: 'clinical-infusion',
    name: '3. Clinical Infusion Keypad',
    subtitle: 'High-stakes bedside infusion dosage control',
    description: 'Confirm Bolus adjacent to Reset Pump. High consequence of accidental reset under healthcare worker fatigue or tremor.',
    container: { width: 440, height: 300 },
    recommendedProfileId: 'parkinsonian-approx',
    elements: [
      {
        id: 'anchor-dose',
        label: 'Infusion Rate (mL/hr)',
        role: 'anchor',
        rect: { x: 50, y: 40, width: 220, height: 42 }
      },
      {
        id: 'btn-confirm',
        label: 'Confirm Bolus',
        role: 'primary',
        rect: { x: 50, y: 200, width: 140, height: 44 },
        style: { background: '#059669', color: '#FFFFFF' }
      },
      {
        id: 'btn-reset',
        label: 'Reset Pump',
        role: 'destructive',
        rect: { x: 200, y: 200, width: 140, height: 44 },
        style: { background: '#B91C1C', color: '#FFFFFF' }
      }
    ]
  },
  {
    id: 'git-pr-bar',
    name: '4. Git Pull Request Bar',
    subtitle: 'Developer action bar below commit box',
    description: 'Merge Pull Request placed next to Close & Delete Branch. Common AI-generated layout in developer tools.',
    container: { width: 560, height: 260 },
    recommendedProfileId: 'essential-tremor',
    elements: [
      {
        id: 'anchor-commit',
        label: 'Commit Message',
        role: 'anchor',
        rect: { x: 40, y: 30, width: 480, height: 64 }
      },
      {
        id: 'btn-merge',
        label: 'Merge Pull Request',
        role: 'primary',
        rect: { x: 40, y: 150, width: 160, height: 38 },
        style: { background: '#15803D', color: '#FFFFFF' }
      },
      {
        id: 'btn-close-pr',
        label: 'Close & Delete Branch',
        role: 'destructive',
        rect: { x: 208, y: 150, width: 180, height: 38 },
        style: { background: '#B91C1C', color: '#FFFFFF' }
      }
    ]
  },
  {
    id: 'wcag-aaa-stress',
    name: '5. 48px WCAG AAA Stress Case',
    subtitle: 'Defeats the 28px Strawman — Passes AAA (48px) yet collides',
    description: 'Both buttons are 48x48px targets (passing both WCAG AA 2.5.8 and AAA 2.5.5), but Revoke Production Keys sits directly behind Publish Release along the ballistic approach vector.',
    container: { width: 560, height: 280 },
    recommendedProfileId: 'essential-tremor',
    elements: [
      {
        id: 'anchor-version',
        label: 'Release Version Tag (v1.0.4)',
        role: 'anchor',
        rect: { x: 40, y: 160, width: 140, height: 48 }
      },
      {
        id: 'btn-publish',
        label: 'Publish Release',
        role: 'primary',
        rect: { x: 230, y: 160, width: 48, height: 48 },
        style: { background: '#0284C7', color: '#FFFFFF' }
      },
      {
        id: 'btn-revoke',
        label: 'Revoke Production Keys',
        role: 'destructive',
        rect: { x: 286, y: 160, width: 48, height: 48 },
        style: { background: '#BE123C', color: '#FFFFFF' }
      }
    ]
  }
];
