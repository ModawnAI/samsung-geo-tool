'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Info,
  Buildings,
  Newspaper,
  Users,
  Question,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { SOURCE_AUTHORITY_TIERS } from '@/types/geo-v2'
import { GROUNDING_CONFIG } from '@/lib/scoring/scoring-config'

interface TierExplanationDialogProps {
  language?: 'ko' | 'en'
  triggerClassName?: string
}

const TIER_UI_CONFIG: Record<1 | 2 | 3 | 4, {
  labelKo: string
  labelEn: string
  descriptionKo: string
  descriptionEn: string
  color: string
  bgColor: string
  borderColor: string
  icon: typeof Buildings
}> = {
  1: {
    labelKo: '공식 삼성',
    labelEn: 'Official Samsung',
    descriptionKo: '삼성 공식 웹사이트 및 뉴스룸. 가장 높은 신뢰도를 가진 공식 소스입니다.',
    descriptionEn: 'Samsung official websites and newsrooms. Most authoritative official sources.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: Buildings,
  },
  2: {
    labelKo: '테크 미디어',
    labelEn: 'Tech Media',
    descriptionKo: '신뢰할 수 있는 기술 출판물 및 전문 뉴스 매체입니다.',
    descriptionEn: 'Trusted technology publications and professional news outlets.',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Newspaper,
  },
  3: {
    labelKo: '커뮤니티',
    labelEn: 'Community',
    descriptionKo: '소셜 미디어 및 커뮤니티 기반 콘텐츠입니다.',
    descriptionEn: 'Social media and community-driven content.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Users,
  },
  4: {
    labelKo: '기타',
    labelEn: 'Other',
    descriptionKo: '분류되지 않은 기타 웹 소스입니다. 점수에 포함되지 않습니다.',
    descriptionEn: 'Unrecognized web sources. Not included in scoring.',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    icon: Question,
  },
}

export function TierExplanationDialog({
  language = 'ko',
  triggerClassName,
}: TierExplanationDialogProps) {
  const [open, setOpen] = useState(false)
  const isKorean = language === 'ko'

  const tierScores = GROUNDING_CONFIG.TIER_SCORES

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1.5 h-8', triggerClassName)}
        >
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isKorean ? '티어 설명' : 'Tier Info'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {isKorean ? '소스 신뢰도 티어' : 'Source Authority Tiers'}
          </DialogTitle>
          <DialogDescription>
            {isKorean
              ? '그라운딩 품질 점수는 소스의 신뢰도 티어에 따라 계산됩니다.'
              : 'Grounding quality score is calculated based on source authority tiers.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Tier 1 */}
            <TierCard
              tier={1}
              config={TIER_UI_CONFIG[1]}
              domains={SOURCE_AUTHORITY_TIERS.tier1}
              pointsPerSource={tierScores.tier1.pointsPerSource}
              maxPoints={tierScores.tier1.maxPoints}
              language={language}
            />

            {/* Tier 2 */}
            <TierCard
              tier={2}
              config={TIER_UI_CONFIG[2]}
              domains={SOURCE_AUTHORITY_TIERS.tier2}
              pointsPerSource={tierScores.tier2.pointsPerSource}
              maxPoints={tierScores.tier2.maxPoints}
              language={language}
            />

            {/* Tier 3 */}
            <TierCard
              tier={3}
              config={TIER_UI_CONFIG[3]}
              domains={SOURCE_AUTHORITY_TIERS.tier3}
              pointsPerSource={tierScores.tier3.pointsPerSource}
              maxPoints={tierScores.tier3.maxPoints}
              language={language}
            />

            {/* Tier 4 */}
            <TierCard
              tier={4}
              config={TIER_UI_CONFIG[4]}
              domains={[]}
              pointsPerSource={0}
              maxPoints={0}
              language={language}
            />
          </div>
        </ScrollArea>

        {/* Footer Note */}
        <div className="pt-4 border-t text-xs text-muted-foreground">
          {isKorean
            ? '* Source Authority 점수는 최대 4점이며, 각 티어별 점수 합계로 계산됩니다.'
            : '* Source Authority score is max 4 points, calculated from sum of tier scores.'}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TierCardProps {
  tier: 1 | 2 | 3 | 4
  config: typeof TIER_UI_CONFIG[1]
  domains: readonly string[]
  pointsPerSource: number
  maxPoints: number
  language: 'ko' | 'en'
}

function TierCard({
  tier,
  config,
  domains,
  pointsPerSource,
  maxPoints,
  language,
}: TierCardProps) {
  const isKorean = language === 'ko'
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', config.color)} weight="fill" />
          <span className={cn('font-semibold', config.color)}>
            Tier {tier}: {isKorean ? config.labelKo : config.labelEn}
          </span>
        </div>
        <Badge variant="outline" className={cn('text-xs', config.color)}>
          {pointsPerSource > 0
            ? `${pointsPerSource}pts/${isKorean ? '소스' : 'source'} (${isKorean ? '최대' : 'max'} ${maxPoints}pts)`
            : isKorean ? '0점' : '0pts'}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3">
        {isKorean ? config.descriptionKo : config.descriptionEn}
      </p>

      {/* Domain List */}
      {domains.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {domains.map((domain) => (
            <Badge
              key={domain}
              variant="secondary"
              className="text-xs font-mono"
            >
              {domain}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {isKorean
            ? '위 티어에 포함되지 않는 모든 도메인'
            : 'All domains not included in tiers above'}
        </p>
      )}
    </div>
  )
}

export { TIER_UI_CONFIG }
