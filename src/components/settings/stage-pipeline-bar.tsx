'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  FileText,
  Star,
  ChatCircle,
  ListNumbers,
  Briefcase,
  Tag,
  Hash,
  MagnifyingGlass,
  PencilSimple,
  type Icon,
} from '@phosphor-icons/react'
import {
  STAGE_CONFIG,
  WORKFLOW_STATUS_CONFIG,
  PROMPT_STAGES,
  STAGE_ENGINE_MAP,
  ENGINE_CONFIG,
  type PromptStage,
  type StageStatusSummary,
} from '@/types/prompt-studio'

const STAGE_ICONS: Record<PromptStage, Icon> = {
  grounding: MagnifyingGlass,
  description: FileText,
  usp: Star,
  faq: ChatCircle,
  chapters: ListNumbers,
  case_studies: Briefcase,
  keywords: Tag,
  hashtags: Hash,
}

interface StagePipelineBarProps {
  language: 'ko' | 'en'
  selectedStage: PromptStage | null
  stageStatuses: StageStatusSummary[]
  onStageSelect: (stage: PromptStage) => void
}

export function StagePipelineBar({
  language,
  selectedStage,
  stageStatuses,
  onStageSelect,
}: StagePipelineBarProps) {
  const getStageStatus = (stage: PromptStage): StageStatusSummary | undefined => {
    return stageStatuses.find((s) => s.stage === stage)
  }

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto pb-2">
        {/* Grid layout for cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 min-w-max lg:min-w-0">
          {PROMPT_STAGES.map((stageId) => {
            const config = STAGE_CONFIG[stageId]
            const status = getStageStatus(stageId)
            const Icon = STAGE_ICONS[stageId]
            const isSelected = selectedStage === stageId
            const workflowConfig = status
              ? WORKFLOW_STATUS_CONFIG[status.workflowStatus]
              : WORKFLOW_STATUS_CONFIG.draft

            // Get engine info
            const engine = STAGE_ENGINE_MAP[stageId]
            const engineConfig = ENGINE_CONFIG[engine]
            const temperature = status?.temperature ?? 0.7
            const model = status?.model ?? engineConfig.defaultModel
            // Shorten model name for display
            const shortModel = model.replace('gemini-3-', 'g3-').replace('-preview', '').replace('sonar-', 's-')

            return (
              <Tooltip key={stageId}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onStageSelect(stageId)}
                    className={cn(
                      'flex flex-col rounded-lg border-2 transition-all text-left p-3 min-w-[140px]',
                      'hover:shadow-md hover:border-primary/50',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:bg-accent/50'
                    )}
                  >
                    {/* Header: Icon + Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          'p-1.5 rounded-md',
                          isSelected ? 'bg-primary/10' : 'bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                          weight={isSelected ? 'fill' : 'regular'}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {language === 'ko' ? config.labelKo : config.label}
                      </span>
                    </div>

                    {/* Engine + Model row */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-5 font-medium',
                          engineConfig.bgColor,
                          engineConfig.color
                        )}
                      >
                        {engineConfig.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        {shortModel}
                      </span>
                    </div>

                    {/* Temperature row */}
                    <div className="text-[10px] text-muted-foreground mb-2">
                      T: {temperature.toFixed(1)}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border my-1" />

                    {/* Version + Status row */}
                    <div className="flex items-center justify-between mb-1.5">
                      {status?.currentVersion ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          v{status.currentVersion}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground/70">
                          v1
                          <span className="text-[9px] ml-0.5">({language === 'ko' ? '기본' : 'default'})</span>
                        </span>
                      )}
                      <div
                        className={cn(
                          'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                          status?.workflowStatus === 'active'
                            ? 'bg-green-100 text-green-700'
                            : status?.workflowStatus === 'testing'
                              ? 'bg-blue-100 text-blue-700'
                              : status?.workflowStatus === 'pending_approval'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            status?.workflowStatus === 'active'
                              ? 'bg-green-500'
                              : status?.workflowStatus === 'testing'
                                ? 'bg-blue-500'
                                : status?.workflowStatus === 'pending_approval'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                          )}
                        />
                        {language === 'ko' ? workflowConfig.labelKo : workflowConfig.label}
                      </div>
                    </div>

                    {/* Score + Test count row */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {status?.avgQualityScore != null
                          ? `${status.avgQualityScore.toFixed(0)}%`
                          : '--'}
                      </span>
                      <span>({status?.testCount ?? 0} tests)</span>
                    </div>

                    {/* Edit indicator */}
                    <div className="mt-2 pt-2 border-t border-border">
                      <div
                        className={cn(
                          'w-full h-7 text-xs flex items-center justify-center gap-1 rounded-md font-medium',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <PencilSimple className="h-3 w-3" />
                        {language === 'ko' ? '편집' : 'Edit'}
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[250px]">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ko' ? config.descriptionKo : config.description}
                      </p>
                    </div>
                    <div className="text-xs space-y-1 pt-1 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Engine:</span>
                        <span className={engineConfig.color}>{engineConfig.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-mono">{model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Temperature:</span>
                        <span>{temperature}</span>
                      </div>
                      {status && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {language === 'ko' ? '상태:' : 'Status:'}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] h-4',
                                workflowConfig.bgColor,
                                workflowConfig.color
                              )}
                            >
                              {language === 'ko' ? workflowConfig.labelKo : workflowConfig.label}
                            </Badge>
                          </div>
                          {status.avgQualityScore != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {language === 'ko' ? '품질 점수:' : 'Quality:'}
                              </span>
                              <span>{status.avgQualityScore.toFixed(0)}%</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {language === 'ko' ? '테스트 수:' : 'Tests:'}
                            </span>
                            <span>{status.testCount}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
