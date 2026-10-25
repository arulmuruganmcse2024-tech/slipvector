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
  defaultSampleSize?: 500 | 2000 | 10000;
  layoutRationale?: string;
}

export const MOTOR_PROFILES: MotorProfile[] = [
  {
    id: 'steady-baseline',
    name: 'Steady Baseline',
    frequency: 0,
    amplitude: 0,
    jerkImpulse: 0,
    urgency: 1.0,
    overshootRatio: 1.2,
    description: 'Calibrated baseline motor control with minimum-jerk approach and ballistic noise (~4% error on 40px target at D≈300px).'
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
    name: 'Parkinsonian Postural/Action Approximation [illustrative, not a medical device, not validated] (5 Hz)',
    frequency: 5.0,
    amplitude: 12.0,
    jerkImpulse: 0,
    urgency: 0.9,
    overshootRatio: 1.5,
    description: 'Parametric postural/action tremor approximation (Model approximation; illustrative, not a medical device, not validated).'
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
    description: 'Save Changes (28px) placed right next to Delete Workspace (28px, 4px gap) directly along the ballistic approach vector.',
    layoutRationale: 'Realistic SaaS settings dialog action bar: pointer approaches Save Changes (28px) rightward from an input/cancel anchor; Delete Workspace (28px) is placed directly behind it along the approach vector with a 4px gap.',
    container: { width: 520, height: 280 },
    recommendedProfileId: 'essential-tremor',
    defaultSampleSize: 500,
    elements: [
      {
        id: 'anchor-input',
        label: 'Workspace Slug',
        role: 'anchor',
        rect: { x: 30, y: 140, width: 120, height: 28 }
      },
      {
        id: 'btn-save',
        label: 'Save Changes',
        role: 'primary',
        rect: { x: 330, y: 140, width: 40, height: 28 },
        style: { background: '#2563EB', color: '#FFFFFF' }
      },
      {
        id: 'btn-delete',
        label: 'Delete Workspace',
        role: 'destructive',
        rect: { x: 374, y: 140, width: 110, height: 28 },
        style: { background: '#DC2626', color: '#FFFFFF' }
      }
    ]
  },
  {
    id: 'mobile-checkout',
    name: '2. Mobile Commuter Checkout',
    subtitle: 'Cramped bottom sheet under transit sway (~2.5 Hz)',
    description: 'Large Complete Order button stacked directly above Cancel & Clear Cart on a mobile viewport during transit sway.',
    layoutRationale: 'Mobile bottom sheet checkout footer: primary Complete Order button stacked immediately above Cancel & Clear Cart, directly aligned with top-to-bottom downward thumb trajectory.',
    container: { width: 340, height: 500 },
    recommendedProfileId: 'transit-sway',
    defaultSampleSize: 500,
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
    name: '3. Clinical Infusion Keypad [illustrative, not a medical device, not validated]',
    subtitle: 'Illustrative, not a medical device, not validated — Bedside Keypad Mock',
    description: 'Confirm Bolus (28px) placed directly in front of Reset Pump (28px, 4px gap) along approach vector. Illustrative mock, not a medical device, not validated.',
    layoutRationale: 'Illustrative infusion keypad mockup (not a medical device, not validated). Dosage confirmation action (28px) sits 4px in front of Reset Pump (28px) directly along the clinician reach path.',
    container: { width: 440, height: 300 },
    recommendedProfileId: 'parkinsonian-approx',
    defaultSampleSize: 500,
    elements: [
      {
        id: 'anchor-dose',
        label: 'Infusion Rate (mL/hr)',
        role: 'anchor',
        rect: { x: 30, y: 140, width: 110, height: 28 }
      },
      {
        id: 'btn-confirm',
        label: 'Confirm Bolus',
        role: 'primary',
        rect: { x: 260, y: 140, width: 60, height: 28 },
        style: { background: '#059669', color: '#FFFFFF' }
      },
      {
        id: 'btn-reset',
        label: 'Reset Pump',
        role: 'destructive',
        rect: { x: 324, y: 140, width: 60, height: 28 },
        style: { background: '#B91C1C', color: '#FFFFFF' }
      }
    ]
  },
  {
    id: 'git-pr-bar',
    name: '4. Git Pull Request Bar',
    subtitle: 'Developer action bar below commit box',
    description: 'Merge Pull Request (28px) placed next to Close & Delete Branch (28px, 4px gap) directly along the approach vector.',
    layoutRationale: 'Developer PR conversation footer: Merge Pull Request (28px) placed 4px ahead of Close & Delete Branch (28px) directly along the rightward ballistic approach from the review dropdown.',
    container: { width: 560, height: 260 },
    recommendedProfileId: 'essential-tremor',
    defaultSampleSize: 500,
    elements: [
      {
        id: 'anchor-commit',
        label: 'Review Changes Dropdown',
        role: 'anchor',
        rect: { x: 30, y: 140, width: 130, height: 28 }
      },
      {
        id: 'btn-merge',
        label: 'Merge Pull Request',
        role: 'primary',
        rect: { x: 290, y: 140, width: 70, height: 28 },
        style: { background: '#15803D', color: '#FFFFFF' }
      },
      {
        id: 'btn-close-pr',
        label: 'Close & Delete Branch',
        role: 'destructive',
        rect: { x: 364, y: 140, width: 120, height: 28 },
        style: { background: '#B91C1C', color: '#FFFFFF' }
      }
    ]
  },
  {
    id: 'wcag-aaa-stress',
    name: '5. 48px WCAG AAA Stress Case',
    subtitle: 'Defeats the 28px Strawman — Passes AAA (48px) yet collides',
    description: 'Both buttons are 48x48px targets (passing both WCAG AA 2.5.8 and AAA 2.5.5), but Revoke Production Keys sits directly behind Publish Release along the ballistic approach vector.',
    layoutRationale: 'Defeats the 28px strawman by proving that even when both primary and destructive actions pass WCAG 2.2 AAA with large 48x48px targets, placing the destructive target directly behind the primary along the approach vector causes directional overshoot collisions.',
    container: { width: 560, height: 280 },
    recommendedProfileId: 'essential-tremor',
    defaultSampleSize: 10000,
    elements: [
      {
        id: 'anchor-version',
        label: 'Release Version Tag (v1.0.4)',
        role: 'anchor',
        rect: { x: 30, y: 116, width: 100, height: 48 }
      },
      {
        id: 'btn-publish',
        label: 'Publish Release',
        role: 'primary',
        rect: { x: 330, y: 116, width: 48, height: 48 },
        style: { background: '#0284C7', color: '#FFFFFF' }
      },
      {
        id: 'btn-revoke',
        label: 'Revoke Production Keys',
        role: 'destructive',
        rect: { x: 382, y: 116, width: 48, height: 48 },
        style: { background: '#BE123C', color: '#FFFFFF' }
      }
    ]
  }
];
