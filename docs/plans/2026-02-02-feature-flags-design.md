# Feature Flags for Video Analysis & TikTok

**Date:** 2026-02-02
**Status:** Approved

## Overview

Hide YouTube/video analysis features and TikTok platform until client pays. Two separate feature flags for independent control.

## Environment Variables

```env
# Feature Flags (Premium Features)
NEXT_PUBLIC_VIDEO_ANALYSIS_ENABLED=false
NEXT_PUBLIC_TIKTOK_ENABLED=false
```

- `NEXT_PUBLIC_` prefix for client-side access
- Default: disabled (safe default)
- Location: `.env` and `.env.example`

## Implementation

### 1. Feature Flag Config

**New file:** `src/lib/feature-flags.ts`

```typescript
export const featureFlags = {
  videoAnalysis: process.env.NEXT_PUBLIC_VIDEO_ANALYSIS_ENABLED === 'true',
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_ENABLED === 'true',
} as const

export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature]
}
```

### 2. Content Input Tabs (srt-input.tsx)

When `VIDEO_ANALYSIS_ENABLED=false`:
- Hide "AI 분석" tab
- Hide "YouTube" tab
- Show only "텍스트" tab
- Default to "text" tab
- Grid: 3 cols → 1 col
- Hide "AI 비디오 분석" in advanced options

### 3. Platform Selector (platform-selector.tsx)

When `TIKTOK_ENABLED=false`:
- Remove TikTok from platform list entirely
- Grid: 3 cols → 2 cols
- Update keyboard navigation bounds
- Fallback selection if current is 'tiktok'

### 4. API Route Protection

Return 403 when feature disabled:

**Routes to protect:**
- `/api/video-analysis/upload/route.ts`
- `/api/video-analysis/analyze/route.ts`
- `/api/video-analysis/[id]/route.ts`
- `/api/video-analysis/route.ts`
- `/api/video-analysis/thumbnails/route.ts`

```typescript
if (!featureFlags.videoAnalysis) {
  return Response.json(
    { error: 'Video analysis feature is not enabled' },
    { status: 403 }
  )
}
```

## Files to Modify

| File | Change |
|------|--------|
| `.env` | Add feature flag variables |
| `.env.example` | Add feature flag variables with comments |
| `src/lib/feature-flags.ts` | Create (new file) |
| `src/components/features/srt-input.tsx` | Conditional tabs + advanced options |
| `src/components/features/platform-selector.tsx` | Filter TikTok, adjust grid |
| `src/app/api/video-analysis/upload/route.ts` | Add 403 guard |
| `src/app/api/video-analysis/analyze/route.ts` | Add 403 guard |
| `src/app/api/video-analysis/[id]/route.ts` | Add 403 guard |
| `src/app/api/video-analysis/route.ts` | Add 403 guard |
| `src/app/api/video-analysis/thumbnails/route.ts` | Add 403 guard |

## Testing

1. Set both flags to `false` → verify only YouTube/Instagram platforms visible, only text tab visible
2. Set both flags to `true` → verify all features visible
3. With flags `false`, call API directly → verify 403 response
4. Toggle flags and refresh → verify UI updates correctly
