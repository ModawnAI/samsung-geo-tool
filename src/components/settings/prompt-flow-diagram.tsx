'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Package,
  MagnifyingGlass,
  BookOpen,
  Sparkle,
  ListBullets,
  Question,
  BookBookmark,
  Users,
  Hash,
  HashStraight,
  ChartBar,
  ArrowRight,
  ArrowDown,
  Gear,
} from '@phosphor-icons/react'

export type NodeId =
  | 'input'
  | 'grounding'
  | 'rag'
  | 'description'
  | 'usp'
  | 'faq'
  | 'chapters'
  | 'case_studies'
  | 'keywords'
  | 'hashtags'
  | 'scoring'
  | 'output'

export interface FlowNode {
  id: NodeId
  label: string
  sublabel?: string
  icon: React.ReactNode
  type: 'input' | 'system' | 'stage' | 'scoring' | 'output'
  engine?: 'gemini' | 'perplexity' | 'cohere'
  hasPrompt?: boolean
}

interface PromptFlowDiagramProps {
  onNodeClick: (nodeId: NodeId) => void
  selectedNode: NodeId | null
  language: 'ko' | 'en'
}

export function PromptFlowDiagram({
  onNodeClick,
  selectedNode,
  language,
}: PromptFlowDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null)

  const nodes: FlowNode[] = [
    {
      id: 'input',
      label: language === 'ko' ? '입력' : 'Input',
      sublabel: language === 'ko' ? '제품 정보' : 'Product Info',
      icon: <Package className="h-5 w-5" />,
      type: 'input',
    },
    {
      id: 'grounding',
      label: language === 'ko' ? '그라운딩' : 'Grounding',
      sublabel: 'Perplexity',
      icon: <MagnifyingGlass className="h-5 w-5" />,
      type: 'system',
      engine: 'perplexity',
      hasPrompt: true,
    },
    {
      id: 'rag',
      label: language === 'ko' ? 'RAG 검색' : 'RAG Search',
      sublabel: 'Cohere',
      icon: <BookOpen className="h-5 w-5" />,
      type: 'system',
      engine: 'cohere',
      hasPrompt: true,
    },
    {
      id: 'description',
      label: language === 'ko' ? '설명' : 'Description',
      sublabel: 'Gemini',
      icon: <Sparkle className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'usp',
      label: 'USP',
      sublabel: 'Gemini',
      icon: <ListBullets className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'faq',
      label: 'FAQ',
      sublabel: 'Gemini',
      icon: <Question className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'chapters',
      label: language === 'ko' ? '챕터' : 'Chapters',
      sublabel: 'Gemini',
      icon: <BookBookmark className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'case_studies',
      label: language === 'ko' ? '사례' : 'Cases',
      sublabel: 'Gemini',
      icon: <Users className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'keywords',
      label: language === 'ko' ? '키워드' : 'Keywords',
      sublabel: 'Gemini',
      icon: <Hash className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'hashtags',
      label: language === 'ko' ? '해시태그' : 'Hashtags',
      sublabel: 'Gemini',
      icon: <HashStraight className="h-5 w-5" />,
      type: 'stage',
      engine: 'gemini',
      hasPrompt: true,
    },
    {
      id: 'scoring',
      label: language === 'ko' ? 'GEO 점수' : 'GEO Score',
      sublabel: language === 'ko' ? '품질 평가' : 'Quality',
      icon: <ChartBar className="h-5 w-5" />,
      type: 'scoring',
    },
    {
      id: 'output',
      label: language === 'ko' ? '출력' : 'Output',
      sublabel: language === 'ko' ? '최종 결과' : 'Final',
      icon: <Gear className="h-5 w-5" />,
      type: 'output',
    },
  ]

  const getNodeColor = (node: FlowNode, isSelected: boolean, isHovered: boolean) => {
    const baseColors = {
      input: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
      system: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
      stage: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
      scoring: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
      output: 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600',
    }

    const selectedColors = {
      input: 'bg-blue-200 dark:bg-blue-800/50 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/30',
      system: 'bg-purple-200 dark:bg-purple-800/50 border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/30',
      stage: 'bg-emerald-200 dark:bg-emerald-800/50 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/30',
      scoring: 'bg-amber-200 dark:bg-amber-800/50 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/30',
      output: 'bg-slate-200 dark:bg-slate-700/50 border-slate-500 dark:border-slate-500 ring-2 ring-slate-500/30',
    }

    if (isSelected) return selectedColors[node.type]
    if (isHovered && node.hasPrompt) return `${baseColors[node.type]} ring-2 ring-primary/30`
    return baseColors[node.type]
  }

  const getIconColor = (node: FlowNode) => {
    const colors = {
      input: 'text-blue-600 dark:text-blue-400',
      system: 'text-purple-600 dark:text-purple-400',
      stage: 'text-emerald-600 dark:text-emerald-400',
      scoring: 'text-amber-600 dark:text-amber-400',
      output: 'text-slate-600 dark:text-slate-400',
    }
    return colors[node.type]
  }

  const renderNode = (node: FlowNode) => {
    const isSelected = selectedNode === node.id
    const isHovered = hoveredNode === node.id
    const isClickable = node.hasPrompt

    return (
      <button
        key={node.id}
        onClick={() => isClickable && onNodeClick(node.id)}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        disabled={!isClickable}
        className={cn(
          'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all duration-200',
          getNodeColor(node, isSelected, isHovered),
          isClickable ? 'cursor-pointer' : 'cursor-default',
          'min-w-[70px]'
        )}
      >
        <div className={cn('transition-colors', getIconColor(node))}>
          {node.icon}
        </div>
        <span className="text-xs font-medium leading-tight text-center">
          {node.label}
        </span>
        {node.sublabel && (
          <span className="text-[10px] text-muted-foreground leading-tight">
            {node.sublabel}
          </span>
        )}
      </button>
    )
  }

  const ArrowRightIcon = () => (
    <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
  )

  const ArrowDownIcon = () => (
    <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
  )

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px] p-4 space-y-4">
        {/* Row 1: Input → Grounding → RAG */}
        <div className="flex items-center justify-center gap-3">
          {renderNode(nodes[0])} {/* input */}
          <ArrowRightIcon />
          {renderNode(nodes[1])} {/* grounding */}
          <ArrowRightIcon />
          {renderNode(nodes[2])} {/* rag */}
        </div>

        {/* Arrow Down */}
        <div className="flex justify-center">
          <ArrowDownIcon />
        </div>

        {/* Row 2: 7-Stage Generation */}
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-4 bg-muted/20">
          <div className="text-xs text-center text-muted-foreground mb-3 font-medium">
            {language === 'ko' ? '7단계 콘텐츠 생성 (Gemini)' : '7-Stage Generation (Gemini)'}
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {renderNode(nodes[3])} {/* description */}
            <ArrowRightIcon />
            {renderNode(nodes[4])} {/* usp */}
            <ArrowRightIcon />
            {renderNode(nodes[5])} {/* faq */}
            <ArrowRightIcon />
            {renderNode(nodes[6])} {/* chapters */}
            <ArrowRightIcon />
            {renderNode(nodes[7])} {/* case_studies */}
            <ArrowRightIcon />
            {renderNode(nodes[8])} {/* keywords */}
            <ArrowRightIcon />
            {renderNode(nodes[9])} {/* hashtags */}
          </div>
        </div>

        {/* Arrow Down */}
        <div className="flex justify-center">
          <ArrowDownIcon />
        </div>

        {/* Row 3: Scoring → Output */}
        <div className="flex items-center justify-center gap-3">
          {renderNode(nodes[10])} {/* scoring */}
          <ArrowRightIcon />
          {renderNode(nodes[11])} {/* output */}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-800/50 border border-purple-400" />
            <span>{language === 'ko' ? '시스템 프롬프트' : 'System Prompt'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-800/50 border border-emerald-400" />
            <span>{language === 'ko' ? '단계 프롬프트' : 'Stage Prompt'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <span>{language === 'ko' ? '클릭하여 편집' : 'Click to edit'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
