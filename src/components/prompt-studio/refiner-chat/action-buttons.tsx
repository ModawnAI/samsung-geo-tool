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
}[] = [
  {
    action: 'analyze',
    label: 'Analyze',
    labelKo: '분석',
    icon: MagnifyingGlass,
    description: 'Analyze strengths, weaknesses, and recommendations',
  },
  {
    action: 'improve',
    label: 'Improve',
    labelKo: '개선',
    icon: Lightning,
    description: 'Generate an improved version of the prompt',
  },
  {
    action: 'test',
    label: 'Test',
    labelKo: '테스트',
    icon: TestTube,
    description: 'Compare current vs improved prompt',
  },
  {
    action: 'chat',
    label: 'Chat',
    labelKo: '대화',
    icon: ChatCircle,
    description: 'Free-form conversation about the prompt',
  },
]

export function ActionButtons({ onAction, isLoading, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ACTIONS.map(({ action, label, icon: Icon, description }) => (
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
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
