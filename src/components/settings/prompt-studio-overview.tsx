'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkle } from '@phosphor-icons/react'
import { PromptFlowDiagram, type NodeId } from './prompt-flow-diagram'
import { PromptEditorPanel } from './prompt-editor-panel'

interface PromptStudioOverviewProps {
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
}

export function PromptStudioOverview({ language, getAuthToken }: PromptStudioOverviewProps) {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null)

  const handleNodeClick = (nodeId: NodeId) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId)
  }

  return (
    <div className="space-y-6">
      {/* Prompt Studio Link Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Sparkle className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                {language === 'ko' ? '프롬프트 스튜디오' : 'Prompt Studio'}
              </CardTitle>
              <CardDescription className="text-sm">
                {language === 'ko'
                  ? '고급 프롬프트 편집, AI 리파이너, 테스트, 버전 관리는 프롬프트 스튜디오에서 이용하세요'
                  : 'Use Prompt Studio for advanced prompt editing, AI refiner, testing, and version management'}
              </CardDescription>
            </div>
          </div>
          <Button asChild variant="default" size="sm" className="gap-2 shrink-0">
            <Link href="/prompt-studio">
              {language === 'ko' ? '스튜디오 열기' : 'Open Studio'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {/* Pipeline Flow Diagram + Editor */}
      <div className={`grid ${selectedNode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {/* Flow Diagram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {language === 'ko' ? '생성 파이프라인' : 'Generation Pipeline'}
            </CardTitle>
            <CardDescription>
              {language === 'ko'
                ? '노드를 클릭하여 프롬프트를 편집합니다'
                : 'Click a node to edit its prompt'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PromptFlowDiagram
              onNodeClick={handleNodeClick}
              selectedNode={selectedNode}
              language={language}
            />
          </CardContent>
        </Card>

        {/* Editor Panel */}
        {selectedNode && (
          <div className="min-h-[500px] rounded-lg border bg-background">
            <PromptEditorPanel
              selectedNode={selectedNode}
              onClose={() => setSelectedNode(null)}
              language={language}
              getAuthToken={getAuthToken}
            />
          </div>
        )}
      </div>
    </div>
  )
}
