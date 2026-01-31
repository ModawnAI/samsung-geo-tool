'use client'

import { MagnifyingGlass, Lightning, TestTube, ChatCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RefinerAction } from '@/types/prompt-studio'

interface ActionButtonsProps {
  onAction: (action: RefinerAction) => void
  isLoading: boolean
  disabled?: boolean
}

const ACTIONS: {
  action: RefinerAction
  label: string
  labelKo: string
  icon: typeof MagnifyingGlass
  description: string
  descriptionKo: string
}[] = [
  {
    action: 'analyze',
    label: 'Analyze',
    labelKo: '분석',
    icon: MagnifyingGlass,
    description: 'Analyze strengths, weaknesses, and recommendations',
    descriptionKo: '프롬프트의 강점, 약점 및 개선 권장사항 분석',
  },
  {
    action: 'improve',
    label: 'Improve',
    labelKo: '개선',
    icon: Lightning,
    description: 'Generate an improved version of the prompt',
    descriptionKo: '개선된 프롬프트 버전 생성',
  },
  {
    action: 'test',
    label: 'Test',
    labelKo: '테스트',
    icon: TestTube,
    description: 'Compare current vs improved prompt',
    descriptionKo: '현재 프롬프트와 개선된 프롬프트 비교',
  },
  {
    action: 'chat',
    label: 'Chat',
    labelKo: '대화',
    icon: ChatCircle,
    description: 'Free-form conversation about the prompt',
    descriptionKo: '프롬프트에 대한 자유로운 대화',
  },
]

export function ActionButtons({ onAction, isLoading, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ACTIONS.map(({ action, label, icon: Icon, descriptionKo }) => (
        <Tooltip key={action}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(action)}
              disabled={isLoading || disabled}
              className="flex items-center gap-1.5"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{descriptionKo}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
