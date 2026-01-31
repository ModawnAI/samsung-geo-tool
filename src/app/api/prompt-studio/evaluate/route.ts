/**
 * Evaluation API Route
 *
 * POST /api/prompt-studio/evaluate
 * Evaluates a stage output using LLM-as-Judge and stores feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateOutput, calculateAggregateScore } from '@/lib/prompt-studio/evaluation-service'
import type { PromptStage, StageTestInputData, StageOutput, EvaluateResponse } from '@/types/prompt-studio'

interface EvaluateRequestBody {
  executionId?: string
  stage: PromptStage
  input: StageTestInputData
  output: StageOutput
  prompt: string
  // For linking to test runs
  testRunId?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as EvaluateRequestBody
    const { executionId, stage, input, output, prompt, testRunId } = body

    // Validate required fields (prompt can be empty string for default prompts)
    if (!stage || !input || !output) {
      return NextResponse.json(
        { error: 'Missing required fields: stage, input, output' },
        { status: 400 }
      )
    }

    // Check if output has actual content
    if (typeof output !== 'object' || Object.keys(output).length === 0) {
      return NextResponse.json(
        { error: 'Output is empty or invalid' },
        { status: 400 }
      )
    }

    // Create or get execution record
    let execId = executionId

    if (!execId) {
      // Create a new execution record
      const { data: execution, error: execError } = await supabase
        .from('prompt_studio_executions')
        .insert({
          stage,
          input,
          output,
          status: 'completed',
          created_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (execError) {
        console.error('Error creating execution:', execError)
        // Continue without execution record - we can still store feedback
        execId = undefined
      } else {
        execId = execution.id
      }
    }

    // Run LLM-as-Judge evaluation
    const evaluation = await evaluateOutput(stage, input, output, prompt)
    const aggregateScore = calculateAggregateScore(evaluation.scores)

    // Store feedback in database if we have an execution ID
    let feedbackId: string | undefined

    if (execId) {
      const { data: feedback, error: feedbackError } = await supabase
        .from('prompt_studio_feedback')
        .insert({
          execution_id: execId,
          stage,
          feedback_type: 'llm_judge',
          overall_score: evaluation.scores.overall,
          relevance_score: evaluation.scores.relevance,
          quality_score: evaluation.scores.quality,
          creativity_score: evaluation.scores.creativity,
          feedback_text: evaluation.feedback.summary,
          strengths: evaluation.feedback.strengths,
          weaknesses: evaluation.feedback.weaknesses,
          suggestions: evaluation.feedback.suggestions,
          judge_model: evaluation.judgeModel,
          raw_evaluation: {
            scores: evaluation.scores,
            feedback: evaluation.feedback,
            rawResponse: evaluation.rawResponse,
          },
          created_by: user.id,
        })
        .select('id')
        .single()

      if (feedbackError) {
        console.error('Error storing feedback:', feedbackError)
      } else {
        feedbackId = feedback.id
      }
    }

    // Update test run with evaluation data if provided
    if (testRunId) {
      await supabase
        .from('prompt_test_runs')
        .update({
          quality_score: Math.round(aggregateScore * 20), // Convert 1-5 to 0-100
          score_breakdown: {
            evaluation: evaluation.scores,
            feedback: evaluation.feedback,
          },
        })
        .eq('id', testRunId)
    }

    const response: EvaluateResponse = {
      feedbackId: feedbackId || '',
      evaluation,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Evaluation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prompt-studio/evaluate?executionId=xxx
 * Get evaluation feedback for an execution
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const executionId = searchParams.get('executionId')

    if (!executionId) {
      return NextResponse.json({ error: 'executionId is required' }, { status: 400 })
    }

    const { data: feedback, error } = await supabase
      .from('prompt_studio_feedback')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get feedback' },
      { status: 500 }
    )
  }
}
