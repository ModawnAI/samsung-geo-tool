'use client'

import { useMemo } from 'react'

export interface FeatureFlags {
  phase1Enabled: boolean
  phase2Enabled: boolean
  phase3Enabled: boolean
}

const defaultFlags: FeatureFlags = {
  phase1Enabled: true,
  phase2Enabled: false,
  phase3Enabled: false,
}

export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') {
    return {
      phase1Enabled: process.env.NEXT_PUBLIC_PHASE1_ENABLED === 'true' || defaultFlags.phase1Enabled,
      phase2Enabled: process.env.NEXT_PUBLIC_PHASE2_ENABLED === 'true' || defaultFlags.phase2Enabled,
      phase3Enabled: process.env.NEXT_PUBLIC_PHASE3_ENABLED === 'true' || defaultFlags.phase3Enabled,
    }
  }

  return {
    phase1Enabled: process.env.NEXT_PUBLIC_PHASE1_ENABLED === 'true' || defaultFlags.phase1Enabled,
    phase2Enabled: process.env.NEXT_PUBLIC_PHASE2_ENABLED === 'true' || defaultFlags.phase2Enabled,
    phase3Enabled: process.env.NEXT_PUBLIC_PHASE3_ENABLED === 'true' || defaultFlags.phase3Enabled,
  }
}

export function useFeatureFlags(): FeatureFlags {
  return useMemo(() => getFeatureFlags(), [])
}

export function isPhaseEnabled(phase: 1 | 2 | 3): boolean {
  const flags = getFeatureFlags()
  switch (phase) {
    case 1:
      return flags.phase1Enabled
    case 2:
      return flags.phase2Enabled
    case 3:
      return flags.phase3Enabled
    default:
      return false
  }
}

export function getEnabledPhases(): number[] {
  const flags = getFeatureFlags()
  const phases: number[] = []
  if (flags.phase1Enabled) phases.push(1)
  if (flags.phase2Enabled) phases.push(2)
  if (flags.phase3Enabled) phases.push(3)
  return phases
}
