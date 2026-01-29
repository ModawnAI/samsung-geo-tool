# Samsung GEO Tool - Feature Completion Plan

> **Started**: January 2025
> **Target Completion**: February 2025
> **Status**: Planning Phase

---

## Executive Summary

Samsung GEO Tool의 100% 완성을 위한 8개 기능 구현 계획서입니다.
현재 프로젝트는 약 82% 완성 상태이며, 아래 기능들을 추가하면 100% 완성됩니다.

**제외된 기능**: Competitor Analysis Dashboard (경쟁사 분석)

---

## Progress Overview

| Phase | Feature | Priority | Status | Progress |
|-------|---------|----------|--------|----------|
| Phase 1 | Caching System | HIGH | ⏳ Planned | 0/5 |
| Phase 1 | Brief Templates | MEDIUM | ⏳ Planned | 0/4 |
| Phase 2 | Analytics Date Range | MEDIUM | ⏳ Planned | 0/3 |
| Phase 2 | Export Functionality | HIGH | ⏳ Planned | 0/6 |
| Phase 2 | Streaming Response | HIGH | ⏳ Planned | 0/5 |
| Phase 3 | A/B Generation Comparison | HIGH | ⏳ Planned | 0/6 |
| Phase 3 | AI Exposure Metrics | MEDIUM | ⏳ Planned | 0/4 |
| Phase 3 | User Feedback Collection | MEDIUM | ⏳ Planned | 0/5 |

**Total Progress**: 0/38 tasks (0%)

---

## Phase 1: Foundation (Week 1)

### Feature 1: Persistent Caching System

#### 1.1 Problem Statement
- 현재 인메모리 LRU 캐시만 존재 (`src/lib/cache/generation-cache.ts`)
- 서버 재시작 시 모든 캐시 손실
- 동일 입력에 대한 반복 API 호출 발생 → 비용 증가

#### 1.2 Solution Architecture
Two-tier 캐시 시스템 구현:
- **L1 (Memory)**: 빠른 접근, 휘발성
- **L2 (Supabase)**: 영구 저장, 서버 재시작 후에도 유지

```
Request → L1 Check → L1 Hit? → Return
                  ↓ L1 Miss
           L2 Check → L2 Hit? → Promote to L1 → Return
                  ↓ L2 Miss
           Generate → Store L1 + L2 → Return
```

#### 1.3 Database Schema

**Table: `generation_cache`**
```sql
CREATE TABLE generation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(64) UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  stage VARCHAR(50),                    -- NULL=전체, 'description'=단계별
  input_hash VARCHAR(64),               -- 입력 해시 (검증용)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB                        -- 추가 정보 (모델 버전 등)
);

-- Indexes
CREATE INDEX idx_cache_key ON generation_cache(cache_key);
CREATE INDEX idx_cache_expires ON generation_cache(expires_at);
CREATE INDEX idx_cache_stage ON generation_cache(stage) WHERE stage IS NOT NULL;
```

**Row Level Security:**
```sql
-- 모든 인증된 사용자가 캐시 읽기/쓰기 가능
ALTER TABLE generation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache readable by authenticated users"
ON generation_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cache writable by authenticated users"
ON generation_cache FOR INSERT
TO authenticated
WITH CHECK (true);
```

#### 1.4 Files to Create

**1.4.1 `src/lib/cache/supabase-cache.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
  hitCount: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export class SupabaseCache {
  private tableName = 'generation_cache';

  async get<T>(key: string): Promise<T | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('cache_data, expires_at')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Update hit count and last accessed
    await supabase
      .from(this.tableName)
      .update({
        hit_count: data.hit_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('cache_key', key);

    return data.cache_data as T;
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + ttlMs);

    await supabase
      .from(this.tableName)
      .upsert({
        cache_key: key,
        cache_data: data,
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed_at: new Date().toISOString()
      }, { onConflict: 'cache_key' });
  }

  async invalidate(key: string): Promise<void> {
    const supabase = await createClient();
    await supabase
      .from(this.tableName)
      .delete()
      .eq('cache_key', key);
  }

  async prune(): Promise<number> {
    const supabase = await createClient();
    const { count } = await supabase
      .from(this.tableName)
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('*', { count: 'exact', head: true });

    return count || 0;
  }

  async getStats(): Promise<CacheStats> {
    const supabase = await createClient();

    const { data } = await supabase
      .from(this.tableName)
      .select('hit_count, created_at')
      .gt('expires_at', new Date().toISOString());

    const entries = data || [];
    const totalHits = entries.reduce((sum, e) => sum + e.hit_count, 0);

    return {
      totalEntries: entries.length,
      totalHits,
      totalMisses: 0, // Tracked separately
      hitRate: entries.length > 0 ? totalHits / entries.length : 0,
      oldestEntry: entries.length > 0
        ? new Date(Math.min(...entries.map(e => new Date(e.created_at).getTime())))
        : null,
      newestEntry: entries.length > 0
        ? new Date(Math.max(...entries.map(e => new Date(e.created_at).getTime())))
        : null
    };
  }
}

export const supabaseCache = new SupabaseCache();
```

**1.4.2 `src/lib/cache/hybrid-cache.ts`**
```typescript
import { generationCache } from './generation-cache'; // 기존 L1
import { supabaseCache } from './supabase-cache';     // 새 L2

export class HybridCache {
  private l1 = generationCache;  // In-memory
  private l2 = supabaseCache;    // Supabase

  async get<T>(key: string): Promise<{ data: T | null; source: 'l1' | 'l2' | 'miss' }> {
    // L1 check
    const l1Result = this.l1.get(key);
    if (l1Result) {
      return { data: l1Result as T, source: 'l1' };
    }

    // L2 check
    const l2Result = await this.l2.get<T>(key);
    if (l2Result) {
      // Promote to L1
      this.l1.set(key, l2Result);
      return { data: l2Result, source: 'l2' };
    }

    return { data: null, source: 'miss' };
  }

  async set<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    // Write to both layers
    this.l1.set(key, data);
    await this.l2.set(key, data, ttlMs);
  }

  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.invalidate(key);
  }

  async invalidatePattern(pattern: RegExp): Promise<number> {
    // L1 only supports pattern matching
    let count = 0;
    // Implementation depends on L1 structure
    return count;
  }
}

export const hybridCache = new HybridCache();
```

**1.4.3 `src/app/api/cache/stats/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseCache } from '@/lib/cache/supabase-cache';

export async function GET(request: NextRequest) {
  try {
    const stats = await supabaseCache.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pruned = await supabaseCache.prune();
    return NextResponse.json({ pruned });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to prune cache' },
      { status: 500 }
    );
  }
}
```

#### 1.5 Files to Modify

**1.5.1 `src/app/api/generate-v2/route.ts`**

현재 코드 (약 line 180-190):
```typescript
// 기존 인메모리 캐시 사용
const cached = getCachedGeneration(cacheKey);
if (cached) {
  return NextResponse.json(cached);
}
```

변경 후:
```typescript
import { hybridCache } from '@/lib/cache/hybrid-cache';

// Two-tier 캐시 사용
const { data: cached, source } = await hybridCache.get(cacheKey);
if (cached) {
  console.log(`Cache hit from ${source}`);
  return NextResponse.json({ ...cached, cacheHit: true, cacheSource: source });
}
```

현재 코드 (약 line 2150-2160):
```typescript
// 기존 캐시 저장
cacheGeneration(cacheKey, result);
```

변경 후:
```typescript
// Two-tier 캐시 저장
await hybridCache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24시간 TTL
```

**1.5.2 `src/types/database.ts`**

추가:
```typescript
export interface GenerationCache {
  id: string;
  cache_key: string;
  cache_data: Record<string, unknown>;
  stage: string | null;
  input_hash: string | null;
  created_at: string;
  expires_at: string;
  hit_count: number;
  last_accessed_at: string;
  metadata: Record<string, unknown> | null;
}
```

#### 1.6 Verification Steps

1. **Cache Miss → Cache Set**
   - 새로운 입력으로 생성 실행
   - 생성 완료 후 `generation_cache` 테이블에 데이터 확인
   - 예상 결과: 새 row 생성됨

2. **Cache Hit (L2)**
   - 서버 재시작
   - 동일 입력으로 생성 실행
   - 예상 결과: L2 캐시 히트, 빠른 응답

3. **Cache Hit (L1)**
   - 동일 입력으로 재실행 (서버 재시작 없이)
   - 예상 결과: L1 캐시 히트 (더 빠름)

4. **Cache Stats API**
   - `GET /api/cache/stats` 호출
   - 예상 결과: `{ totalEntries, totalHits, hitRate, ... }` 반환

5. **Cache Prune**
   - 만료된 캐시 생성 (TTL=1초)
   - 2초 후 `DELETE /api/cache/prune` 호출
   - 예상 결과: `{ pruned: 1 }` 반환

#### 1.7 Task Checklist

- [ ] Database migration 파일 생성 (`supabase/migrations/xxx_generation_cache.sql`)
- [ ] `supabase-cache.ts` 구현
- [ ] `hybrid-cache.ts` 구현
- [ ] `/api/cache/stats` endpoint 구현
- [ ] `generate-v2/route.ts` 수정하여 hybrid cache 사용

---

### Feature 2: Brief Templates

#### 2.1 Problem Statement
- Brief 생성 시 매번 처음부터 작성
- 유사 제품군에 대해 반복 작업 발생
- 템플릿 재사용 시스템 부재

#### 2.2 Solution Architecture
템플릿 저장/불러오기 시스템:
- Brief를 템플릿으로 저장
- 새 Brief 생성 시 템플릿 선택하여 시작
- 템플릿 사용 통계 추적

```
[Brief 작성] → "템플릿으로 저장" → templates 테이블
                                    ↓
[새 Brief] → "템플릿에서 생성" → 템플릿 선택 → 필드 자동 채움
```

#### 2.3 Database Schema

**Table Modification: `templates`**
```sql
-- 기존 templates 테이블에 컬럼 추가
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_brief_template BOOLEAN DEFAULT FALSE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS brief_defaults JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS preview_thumbnail TEXT;

-- Brief 템플릿 사용 기록
CREATE TABLE brief_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  brief_id UUID REFERENCES briefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_template_usage_template ON brief_template_usage(template_id);
CREATE INDEX idx_template_usage_brief ON brief_template_usage(brief_id);
```

**brief_defaults JSONB 구조:**
```json
{
  "usps": [
    { "category": "Camera", "title": "", "description": "" },
    { "category": "Display", "title": "", "description": "" }
  ],
  "additionalContent": "",
  "targetAudience": "",
  "keyMessages": [],
  "defaultHashtags": []
}
```

#### 2.4 Files to Create

**2.4.1 `src/lib/templates/brief-templates.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

export interface BriefTemplate {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  briefDefaults: {
    usps: Array<{ category: string; title: string; description: string }>;
    additionalContent: string;
    targetAudience: string;
    keyMessages: string[];
    defaultHashtags: string[];
  };
  usageCount: number;
  createdAt: string;
  createdBy: string;
}

export async function getBriefTemplates(categoryId?: string): Promise<BriefTemplate[]> {
  const supabase = await createClient();

  let query = supabase
    .from('templates')
    .select('*')
    .eq('is_brief_template', true)
    .order('usage_count', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as BriefTemplate[];
}

export async function createBriefTemplate(
  name: string,
  description: string,
  briefDefaults: BriefTemplate['briefDefaults'],
  categoryId?: string
): Promise<BriefTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('templates')
    .insert({
      name,
      description,
      brief_defaults: briefDefaults,
      category_id: categoryId,
      is_brief_template: true,
      usage_count: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data as BriefTemplate;
}

export async function applyTemplate(
  templateId: string,
  briefId: string
): Promise<void> {
  const supabase = await createClient();

  // Record usage
  await supabase
    .from('brief_template_usage')
    .insert({ template_id: templateId, brief_id: briefId });

  // Increment usage count
  await supabase.rpc('increment_template_usage', { template_id: templateId });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);
}
```

**2.4.2 `src/components/features/template-selector.tsx`**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, Star } from '@phosphor-icons/react';
import type { BriefTemplate } from '@/lib/templates/brief-templates';

interface TemplateSelectorProps {
  categoryId?: string;
  onSelect: (template: BriefTemplate) => void;
}

export function TemplateSelector({ categoryId, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<BriefTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, categoryId]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?categoryId=${categoryId || ''}&type=brief`);
      const data = await res.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(template: BriefTemplate) {
    onSelect(template);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          템플릿에서 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Brief 템플릿 선택</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>저장된 템플릿이 없습니다</p>
            <p className="text-sm">Brief 작성 후 "템플릿으로 저장"을 눌러 템플릿을 만드세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelect(template)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    {template.name}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {template.usageCount}회 사용
                    </span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {template.briefDefaults.usps.slice(0, 3).map((usp, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {usp.category}
                      </span>
                    ))}
                    {template.briefDefaults.usps.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{template.briefDefaults.usps.length - 3}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**2.4.3 `src/components/features/template-manager.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookmarkSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface TemplateManagerProps {
  briefData: {
    usps: Array<{ category: string; title: string; description: string }>;
    additionalContent: string;
    targetAudience?: string;
    keyMessages?: string[];
  };
  categoryId?: string;
}

export function SaveAsTemplateButton({ briefData, categoryId }: TemplateManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error('템플릿 이름을 입력하세요');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type: 'brief',
          categoryId,
          briefDefaults: briefData
        })
      });

      if (!res.ok) throw new Error('Failed to save template');

      toast.success('템플릿이 저장되었습니다');
      setOpen(false);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error('템플릿 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookmarkSimple className="h-4 w-4" />
          템플릿으로 저장
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Brief 템플릿 저장</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">템플릿 이름 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Galaxy S Series 기본 템플릿"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 템플릿의 용도를 간단히 설명하세요"
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">저장될 내용:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• USP {briefData.usps.length}개 카테고리</li>
              <li>• 추가 콘텐츠 {briefData.additionalContent ? '포함' : '없음'}</li>
              {briefData.targetAudience && <li>• 타겟 오디언스 포함</li>}
              {briefData.keyMessages?.length && <li>• 키 메시지 {briefData.keyMessages.length}개</li>}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**2.4.4 `src/app/api/templates/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('categoryId');
  const type = searchParams.get('type');

  try {
    const supabase = await createClient();

    let query = supabase.from('templates').select('*');

    if (type === 'brief') {
      query = query.eq('is_brief_template', true);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('usage_count', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ templates: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, categoryId, briefDefaults } = body;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name,
        description,
        category_id: categoryId,
        is_brief_template: type === 'brief',
        brief_defaults: briefDefaults,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    await supabase.from('templates').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
```

#### 2.5 Files to Modify

**2.5.1 `src/app/(dashboard)/briefs/page.tsx`**

추가할 위치 (약 line 200-250, Brief 생성 버튼 근처):
```typescript
import { TemplateSelector } from '@/components/features/template-selector';
import { SaveAsTemplateButton } from '@/components/features/template-manager';

// Brief 생성 영역에 추가
<div className="flex gap-2">
  <Button onClick={handleCreateBrief}>
    <Plus className="h-4 w-4 mr-2" />
    새 Brief 생성
  </Button>
  <TemplateSelector
    categoryId={selectedCategory}
    onSelect={handleApplyTemplate}
  />
</div>

// handleApplyTemplate 함수 추가
function handleApplyTemplate(template: BriefTemplate) {
  setFormData({
    ...formData,
    usps: template.briefDefaults.usps,
    additionalContent: template.briefDefaults.additionalContent,
    targetAudience: template.briefDefaults.targetAudience || '',
    // ... 기타 필드
  });
  setShowCreateDialog(true);
}
```

추가할 위치 (약 line 400-450, Brief 편집 폼 하단):
```typescript
// Brief 편집 폼 하단에 저장 버튼 옆에 추가
<div className="flex gap-2 justify-end">
  <SaveAsTemplateButton
    briefData={{
      usps: formData.usps,
      additionalContent: formData.additionalContent,
      targetAudience: formData.targetAudience,
      keyMessages: formData.keyMessages
    }}
    categoryId={selectedCategory}
  />
  <Button onClick={handleSaveBrief}>저장</Button>
</div>
```

#### 2.6 Verification Steps

1. **템플릿 저장**
   - Brief 작성 완료 → "템플릿으로 저장" 클릭
   - 이름, 설명 입력 → 저장
   - 예상 결과: templates 테이블에 새 row 생성 (is_brief_template=true)

2. **템플릿 불러오기**
   - "템플릿에서 생성" 클릭
   - 템플릿 목록 표시 확인 (usage_count 순 정렬)
   - 템플릿 선택 → 폼 자동 채움 확인

3. **사용 통계 추적**
   - 템플릿 적용 후 usage_count 증가 확인
   - brief_template_usage 테이블에 기록 확인

#### 2.7 Task Checklist

- [ ] Database migration 파일 생성
- [ ] `brief-templates.ts` 구현
- [ ] `template-selector.tsx` 구현
- [ ] `template-manager.tsx` 구현
- [ ] `/api/templates` endpoint 구현
- [ ] `briefs/page.tsx` 수정하여 컴포넌트 통합

---

## Phase 2: Core Features (Week 2)

### Feature 3: Analytics Date Range Filtering

#### 3.1 Problem Statement
- Analytics 페이지에서 날짜 범위가 30일로 고정
- 사용자가 원하는 기간의 데이터 조회 불가
- 트렌드 비교 및 분석 제한

#### 3.2 Solution Architecture

```
[Date Range Picker]
    ↓
[Presets] → 7일 | 30일 | 90일 | Custom
    ↓
[API Call with from/to params]
    ↓
[Updated Charts & Metrics]
```

URL 동기화: `/analytics?from=2025-01-01&to=2025-01-31`

#### 3.3 Files to Create

**3.3.1 `src/components/analytics/date-range-picker.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarBlank, CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

const PRESETS = [
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 },
  { label: '최근 1년', days: 365 },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  function handlePreset(days: number) {
    onChange({
      from: startOfDay(subDays(new Date(), days)),
      to: endOfDay(new Date())
    });
    setOpen(false);
  }

  function formatDateRange(): string {
    if (!value?.from) return '날짜 선택';
    if (!value.to) return format(value.from, 'PPP', { locale: ko });
    return `${format(value.from, 'PP', { locale: ko })} - ${format(value.to, 'PP', { locale: ko })}`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start text-left font-normal', className)}
        >
          <CalendarBlank className="mr-2 h-4 w-4" />
          {formatDateRange()}
          <CaretDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            {PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePreset(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              locale={ko}
            />
          </div>
        </div>
        <div className="border-t p-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            적용
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**3.3.2 `src/hooks/useAnalyticsFilters.ts`**
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface AnalyticsFilters {
  dateRange: DateRange | undefined;
  productId?: string;
  categoryId?: string;
}

export function useAnalyticsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    return {
      dateRange: from && to ? {
        from: parseISO(from),
        to: parseISO(to)
      } : {
        from: startOfDay(subDays(new Date(), 30)),
        to: endOfDay(new Date())
      },
      productId: searchParams.get('productId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined
    };
  });

  // Sync to URL
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };

      // Update URL
      const params = new URLSearchParams();
      if (updated.dateRange?.from) {
        params.set('from', updated.dateRange.from.toISOString().split('T')[0]);
      }
      if (updated.dateRange?.to) {
        params.set('to', updated.dateRange.to.toISOString().split('T')[0]);
      }
      if (updated.productId) params.set('productId', updated.productId);
      if (updated.categoryId) params.set('categoryId', updated.categoryId);

      router.push(`?${params.toString()}`, { scroll: false });

      return updated;
    });
  }, [router]);

  return {
    filters,
    updateFilters,
    setDateRange: (range: DateRange | undefined) => updateFilters({ dateRange: range }),
    setProductId: (id: string | undefined) => updateFilters({ productId: id }),
    setCategoryId: (id: string | undefined) => updateFilters({ categoryId: id })
  };
}
```

#### 3.4 Files to Modify

**3.4.1 `src/app/(dashboard)/analytics/page.tsx`**

추가할 import:
```typescript
import { DateRangePicker } from '@/components/analytics/date-range-picker';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
```

수정할 부분 (약 line 50-80):
```typescript
// 기존
const [dateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });

// 변경
const { filters, setDateRange } = useAnalyticsFilters();
const { dateRange } = filters;
```

추가할 UI (약 line 100-150):
```typescript
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Analytics</h1>
  <DateRangePicker
    value={dateRange}
    onChange={setDateRange}
    className="w-[300px]"
  />
</div>
```

수정할 부분 (약 line 200-300, API 호출):
```typescript
// 기존
const res = await fetch('/api/analytics');

// 변경
const params = new URLSearchParams();
if (dateRange?.from) params.set('from', dateRange.from.toISOString());
if (dateRange?.to) params.set('to', dateRange.to.toISOString());

const res = await fetch(`/api/analytics?${params.toString()}`);
```

**3.4.2 `src/app/api/analytics/route.ts`**

수정할 부분:
```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // 기본값: 최근 30일
  const fromDate = from ? new Date(from) : subDays(new Date(), 30);
  const toDate = to ? new Date(to) : new Date();

  const supabase = await createClient();

  // 기존 쿼리에 날짜 필터 추가
  const { data: generations } = await supabase
    .from('generations')
    .select('*')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString());

  // ... 나머지 로직
}
```

#### 3.5 Verification Steps

1. 기본 로드 시 최근 30일 데이터 표시
2. "최근 7일" 프리셋 클릭 → 데이터 변경 확인
3. Custom 날짜 선택 → URL 파라미터 변경 확인
4. URL 직접 입력 → 해당 기간 데이터 로드 확인

#### 3.6 Task Checklist

- [ ] `date-range-picker.tsx` 구현
- [ ] `useAnalyticsFilters.ts` 구현
- [ ] `analytics/page.tsx` 수정
- [ ] `/api/analytics` route 수정

---

### Feature 4: Export Functionality

#### 4.1 Problem Statement
- 생성된 콘텐츠를 외부에서 사용하기 어려움
- PDF, Markdown, CMS 포맷 지원 부재
- 보고서 형태로 공유 불가

#### 4.2 Solution Architecture

```
[Generation Result]
        ↓
[Export Dialog] → Format 선택 (PDF/Markdown/CMS/JSON)
        ↓
[Format-specific Renderer]
        ↓
[Download / Copy]
```

#### 4.3 Dependencies

**package.json 추가:**
```json
{
  "dependencies": {
    "@react-pdf/renderer": "^3.1.0",
    "marked": "^12.0.0"
  }
}
```

#### 4.4 Files to Create

**4.4.1 `src/lib/geo-v2/export-pdf.ts`**
```typescript
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { GenerationResult } from '@/types/geo-v2';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1 solid #eee',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1428A0', // Samsung Blue
  },
  text: {
    fontSize: 11,
    lineHeight: 1.5,
  },
  score: {
    fontSize: 12,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    marginBottom: 10,
  },
  hashtag: {
    fontSize: 10,
    color: '#1428A0',
  },
  faq: {
    marginBottom: 10,
  },
  question: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  answer: {
    fontSize: 11,
    color: '#444',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
  },
});

interface ExportPDFOptions {
  includeScore?: boolean;
  includeTimestamps?: boolean;
  includeFAQ?: boolean;
  includeMetadata?: boolean;
}

function GEODocument({ result, options }: { result: GenerationResult; options: ExportPDFOptions }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{result.productName}</Text>
          <Text style={styles.subtitle}>
            Generated: {new Date(result.createdAt).toLocaleDateString('ko-KR')}
          </Text>
        </View>

        {/* Score */}
        {options.includeScore && result.score && (
          <View style={styles.score}>
            <Text>GEO Score: {result.score.total}/140</Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.text}>{result.description}</Text>
        </View>

        {/* Timestamps */}
        {options.includeTimestamps && result.timestamps && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timestamps</Text>
            <Text style={styles.text}>{result.timestamps}</Text>
          </View>
        )}

        {/* Hashtags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hashtags</Text>
          <Text style={styles.hashtag}>{result.hashtags}</Text>
        </View>

        {/* FAQ */}
        {options.includeFAQ && result.faq && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FAQ</Text>
            {result.faq.map((item, i) => (
              <View key={i} style={styles.faq}>
                <Text style={styles.question}>Q: {item.question}</Text>
                <Text style={styles.answer}>A: {item.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Samsung GEO Tool - Generated with AI Optimization
        </Text>
      </Page>
    </Document>
  );
}

export async function exportToPDF(
  result: GenerationResult,
  options: ExportPDFOptions = {}
): Promise<Blob> {
  const defaultOptions: ExportPDFOptions = {
    includeScore: true,
    includeTimestamps: true,
    includeFAQ: true,
    includeMetadata: true,
    ...options,
  };

  const doc = <GEODocument result={result} options={defaultOptions} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}
```

**4.4.2 `src/lib/geo-v2/export-markdown.ts`**
```typescript
import type { GenerationResult } from '@/types/geo-v2';

interface ExportMarkdownOptions {
  includeScore?: boolean;
  includeTimestamps?: boolean;
  includeFAQ?: boolean;
  includeMetadata?: boolean;
  includeFrontmatter?: boolean;
}

export function exportToMarkdown(
  result: GenerationResult,
  options: ExportMarkdownOptions = {}
): string {
  const {
    includeScore = true,
    includeTimestamps = true,
    includeFAQ = true,
    includeMetadata = true,
    includeFrontmatter = true,
  } = options;

  let md = '';

  // Frontmatter
  if (includeFrontmatter) {
    md += `---
title: "${result.productName}"
date: "${new Date(result.createdAt).toISOString()}"
product: "${result.productName}"
category: "${result.category || 'Unknown'}"
${includeScore && result.score ? `score: ${result.score.total}` : ''}
---

`;
  }

  // Title
  md += `# ${result.productName}\n\n`;

  // Score
  if (includeScore && result.score) {
    md += `> **GEO Score**: ${result.score.total}/140\n\n`;
    md += `| Category | Score |\n`;
    md += `|----------|-------|\n`;
    md += `| E-E-A-T | ${result.score.eeat}/100 |\n`;
    md += `| GEO Specific | ${result.score.geoSpecific}/40 |\n\n`;
  }

  // Description
  md += `## Description\n\n`;
  md += `${result.description}\n\n`;

  // Timestamps
  if (includeTimestamps && result.timestamps) {
    md += `## Timestamps\n\n`;
    md += `\`\`\`\n${result.timestamps}\n\`\`\`\n\n`;
  }

  // Hashtags
  md += `## Hashtags\n\n`;
  md += `${result.hashtags}\n\n`;

  // FAQ
  if (includeFAQ && result.faq?.length) {
    md += `## FAQ\n\n`;
    result.faq.forEach((item, i) => {
      md += `### Q${i + 1}: ${item.question}\n\n`;
      md += `${item.answer}\n\n`;
    });
  }

  // Metadata
  if (includeMetadata) {
    md += `---\n\n`;
    md += `*Generated by Samsung GEO Tool on ${new Date(result.createdAt).toLocaleDateString('ko-KR')}*\n`;
  }

  return md;
}
```

**4.4.3 `src/lib/geo-v2/export-cms.ts`**
```typescript
import type { GenerationResult } from '@/types/geo-v2';

interface CMSExportFormat {
  wordpress: WordPressFormat;
  contentful: ContentfulFormat;
  generic: GenericCMSFormat;
}

interface WordPressFormat {
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_status: string;
  meta: Record<string, string>;
  tags: string[];
}

interface ContentfulFormat {
  sys: { contentType: { sys: { id: string } } };
  fields: {
    title: { 'ko-KR': string };
    description: { 'ko-KR': string };
    hashtags: { 'ko-KR': string[] };
    timestamps: { 'ko-KR': string };
    faq: { 'ko-KR': Array<{ question: string; answer: string }> };
  };
}

interface GenericCMSFormat {
  id: string;
  title: string;
  content: {
    description: string;
    timestamps: string | null;
    hashtags: string[];
    faq: Array<{ question: string; answer: string }> | null;
  };
  metadata: {
    product: string;
    category: string;
    score: number | null;
    createdAt: string;
  };
}

export function exportToCMS(
  result: GenerationResult,
  format: 'wordpress' | 'contentful' | 'generic' = 'generic'
): CMSExportFormat[typeof format] {
  switch (format) {
    case 'wordpress':
      return {
        post_title: result.productName,
        post_content: result.description,
        post_excerpt: result.description.slice(0, 150) + '...',
        post_status: 'draft',
        meta: {
          _geo_score: String(result.score?.total || 0),
          _geo_timestamps: result.timestamps || '',
          _geo_hashtags: result.hashtags || '',
        },
        tags: result.hashtags?.split(' ').map(t => t.replace('#', '')) || [],
      };

    case 'contentful':
      return {
        sys: { contentType: { sys: { id: 'geoContent' } } },
        fields: {
          title: { 'ko-KR': result.productName },
          description: { 'ko-KR': result.description },
          hashtags: { 'ko-KR': result.hashtags?.split(' ') || [] },
          timestamps: { 'ko-KR': result.timestamps || '' },
          faq: { 'ko-KR': result.faq || [] },
        },
      };

    case 'generic':
    default:
      return {
        id: result.id,
        title: result.productName,
        content: {
          description: result.description,
          timestamps: result.timestamps || null,
          hashtags: result.hashtags?.split(' ') || [],
          faq: result.faq || null,
        },
        metadata: {
          product: result.productName,
          category: result.category || 'Unknown',
          score: result.score?.total || null,
          createdAt: result.createdAt,
        },
      };
  }
}
```

**4.4.4 `src/components/features/export-dialog.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DownloadSimple, Copy, FilePdf, FileText, Code } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { exportToPDF } from '@/lib/geo-v2/export-pdf';
import { exportToMarkdown } from '@/lib/geo-v2/export-markdown';
import { exportToCMS } from '@/lib/geo-v2/export-cms';
import type { GenerationResult } from '@/types/geo-v2';

interface ExportDialogProps {
  result: GenerationResult;
}

type ExportFormat = 'pdf' | 'markdown' | 'cms-wordpress' | 'cms-contentful' | 'cms-generic' | 'json';

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF', icon: FilePdf, description: '브랜딩된 PDF 문서' },
  { value: 'markdown', label: 'Markdown', icon: FileText, description: 'GitHub 호환 마크다운' },
  { value: 'cms-generic', label: 'CMS (Generic)', icon: Code, description: '범용 CMS 포맷' },
  { value: 'cms-wordpress', label: 'WordPress', icon: Code, description: 'WordPress 호환' },
  { value: 'json', label: 'JSON', icon: Code, description: '원본 JSON 데이터' },
];

export function ExportDialog({ result }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [options, setOptions] = useState({
    includeScore: true,
    includeTimestamps: true,
    includeFAQ: true,
    includeMetadata: true,
  });
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      let content: Blob | string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'pdf':
          content = await exportToPDF(result, options);
          filename = `${result.productName}-geo.pdf`;
          mimeType = 'application/pdf';
          break;

        case 'markdown':
          content = exportToMarkdown(result, options);
          filename = `${result.productName}-geo.md`;
          mimeType = 'text/markdown';
          break;

        case 'cms-wordpress':
        case 'cms-contentful':
        case 'cms-generic':
          const cmsFormat = format.replace('cms-', '') as 'wordpress' | 'contentful' | 'generic';
          content = JSON.stringify(exportToCMS(result, cmsFormat), null, 2);
          filename = `${result.productName}-${cmsFormat}.json`;
          mimeType = 'application/json';
          break;

        case 'json':
        default:
          content = JSON.stringify(result, null, 2);
          filename = `${result.productName}-geo.json`;
          mimeType = 'application/json';
      }

      // Download
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${filename} 다운로드 완료`);
      setOpen(false);
    } catch (error) {
      toast.error('내보내기 실패');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  }

  async function handleCopyToClipboard() {
    try {
      let content: string;

      switch (format) {
        case 'markdown':
          content = exportToMarkdown(result, options);
          break;
        case 'cms-wordpress':
        case 'cms-contentful':
        case 'cms-generic':
          const cmsFormat = format.replace('cms-', '') as 'wordpress' | 'contentful' | 'generic';
          content = JSON.stringify(exportToCMS(result, cmsFormat), null, 2);
          break;
        case 'json':
        default:
          content = JSON.stringify(result, null, 2);
      }

      await navigator.clipboard.writeText(content);
      toast.success('클립보드에 복사됨');
    } catch (error) {
      toast.error('복사 실패');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <DownloadSimple className="h-4 w-4" />
          내보내기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>콘텐츠 내보내기</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>포맷 선택</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              {FORMAT_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex items-center gap-2 cursor-pointer">
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">- {option.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>포함할 내용</Label>
            <div className="space-y-2">
              {[
                { key: 'includeScore', label: 'GEO 점수' },
                { key: 'includeTimestamps', label: '타임스탬프' },
                { key: 'includeFAQ', label: 'FAQ' },
                { key: 'includeMetadata', label: '메타데이터' },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={opt.key}
                    checked={options[opt.key as keyof typeof options]}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, [opt.key]: checked }))
                    }
                  />
                  <Label htmlFor={opt.key} className="cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {format !== 'pdf' && (
            <Button variant="outline" onClick={handleCopyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              복사
            </Button>
          )}
          <Button onClick={handleExport} disabled={exporting}>
            <DownloadSimple className="h-4 w-4 mr-2" />
            {exporting ? '내보내는 중...' : '다운로드'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.5 Verification Steps

1. PDF 내보내기 → 브랜딩 스타일 확인
2. Markdown 내보내기 → frontmatter 포함 확인
3. CMS 포맷 내보내기 → JSON 구조 확인
4. 옵션 토글 → 포함/제외 내용 확인

#### 4.6 Task Checklist

- [ ] `@react-pdf/renderer`, `marked` 패키지 설치
- [ ] `export-pdf.ts` 구현
- [ ] `export-markdown.ts` 구현
- [ ] `export-cms.ts` 구현
- [ ] `export-dialog.tsx` 구현
- [ ] Generation 결과 페이지에 Export 버튼 추가

---

### Feature 5: Streaming Response

#### 5.1 Problem Statement
- 현재 생성 진행률이 시뮬레이션 기반
- 실제 단계 완료와 UI 진행률 불일치
- 사용자가 실제 진행 상황을 알 수 없음

#### 5.2 Solution Architecture

```
[Client]                    [Server]
    |                          |
    |-- POST /generate-v2-stream
    |                          |
    |<-- event: stage_start ---
    |<-- event: stage_progress-
    |<-- event: stage_complete-
    |          ...             |
    |<-- event: complete ------
```

**SSE (Server-Sent Events) 프로토콜 사용**

#### 5.3 Files to Create

**5.3.1 `src/app/api/generate-v2-stream/route.ts`**
```typescript
import { NextRequest } from 'next/server';
import { streamGenerator, type StreamEvent } from '@/lib/geo-v2/stream-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: StreamEvent) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        for await (const event of streamGenerator(body)) {
          sendEvent(event);

          if (event.type === 'complete' || event.type === 'error') {
            controller.close();
            return;
          }
        }
      } catch (error) {
        sendEvent({
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: false
          }
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**5.3.2 `src/lib/geo-v2/stream-generator.ts`**
```typescript
import { generateDescription, generateFAQ, generateHashtags } from './stages';
import { hybridCache } from '@/lib/cache/hybrid-cache';
import type { GEOv2GenerateRequest, GenerationResult } from '@/types/geo-v2';

export interface StreamEvent {
  type: 'stage_start' | 'stage_progress' | 'stage_complete' | 'error' | 'complete';
  data: {
    stage?: string;
    message?: string;
    progress?: number;
    result?: Partial<GenerationResult>;
    error?: string;
    recoverable?: boolean;
    finalScore?: number;
    duration?: number;
  };
}

const STAGES = [
  { id: 'usp', name: 'USP Extraction', weight: 10 },
  { id: 'description', name: 'Description', weight: 25 },
  { id: 'timestamps', name: 'Timestamps', weight: 15 },
  { id: 'faq', name: 'FAQ', weight: 20 },
  { id: 'keywords', name: 'Keywords', weight: 15 },
  { id: 'hashtags', name: 'Hashtags', weight: 15 },
];

export async function* streamGenerator(
  input: GEOv2GenerateRequest
): AsyncGenerator<StreamEvent> {
  const startTime = Date.now();
  const result: Partial<GenerationResult> = {};
  let progress = 0;

  // Check cache first
  const cacheKey = generateCacheKey(input);
  const { data: cached } = await hybridCache.get<GenerationResult>(cacheKey);

  if (cached) {
    yield {
      type: 'complete',
      data: {
        result: cached,
        finalScore: cached.score?.total,
        duration: 0,
        message: 'Loaded from cache'
      }
    };
    return;
  }

  for (const stage of STAGES) {
    // Stage start
    yield {
      type: 'stage_start',
      data: {
        stage: stage.id,
        message: `Generating ${stage.name}...`,
        progress
      }
    };

    try {
      // Execute stage
      const stageResult = await executeStage(stage.id, input, result);
      Object.assign(result, stageResult);

      progress += stage.weight;

      // Stage complete
      yield {
        type: 'stage_complete',
        data: {
          stage: stage.id,
          result: stageResult,
          progress
        }
      };
    } catch (error) {
      yield {
        type: 'error',
        data: {
          stage: stage.id,
          error: error instanceof Error ? error.message : 'Stage failed',
          recoverable: true
        }
      };
      // Continue to next stage on non-critical error
    }
  }

  // Calculate final score
  const finalScore = calculateScore(result);
  result.score = finalScore;

  // Cache result
  await hybridCache.set(cacheKey, result as GenerationResult);

  // Complete
  yield {
    type: 'complete',
    data: {
      result,
      finalScore: finalScore.total,
      duration: Date.now() - startTime
    }
  };
}

async function executeStage(
  stageId: string,
  input: GEOv2GenerateRequest,
  currentResult: Partial<GenerationResult>
): Promise<Partial<GenerationResult>> {
  switch (stageId) {
    case 'usp':
      // USP extraction logic
      return { usps: [] };

    case 'description':
      const description = await generateDescription(input, currentResult.usps);
      return { description };

    case 'timestamps':
      // Timestamp generation logic
      return { timestamps: '' };

    case 'faq':
      const faq = await generateFAQ(input, currentResult);
      return { faq };

    case 'keywords':
      // Keyword extraction logic
      return { keywords: [] };

    case 'hashtags':
      const hashtags = await generateHashtags(input, currentResult);
      return { hashtags };

    default:
      return {};
  }
}

function generateCacheKey(input: GEOv2GenerateRequest): string {
  const hash = require('crypto')
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16);
  return `gen-${input.productId}-${hash}`;
}

function calculateScore(result: Partial<GenerationResult>): { total: number; eeat: number; geoSpecific: number } {
  // Score calculation logic
  return { total: 85, eeat: 60, geoSpecific: 25 };
}
```

**5.3.3 `src/hooks/useStreamGeneration.ts`**
```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import type { GenerationResult } from '@/types/geo-v2';

interface StreamState {
  status: 'idle' | 'generating' | 'complete' | 'error';
  progress: number;
  currentStage: string | null;
  result: Partial<GenerationResult> | null;
  error: string | null;
  duration: number | null;
}

export function useStreamGeneration() {
  const [state, setState] = useState<StreamState>({
    status: 'idle',
    progress: 0,
    currentStage: null,
    result: null,
    error: null,
    duration: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (input: unknown) => {
    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState({
      status: 'generating',
      progress: 0,
      currentStage: null,
      result: null,
      error: null,
      duration: null,
    });

    try {
      const response = await fetch('/api/generate-v2-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/event: (\w+)/);
          const dataMatch = line.match(/data: (.+)/);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const eventData = JSON.parse(dataMatch[1]);

            switch (eventType) {
              case 'stage_start':
                setState(prev => ({
                  ...prev,
                  currentStage: eventData.stage,
                  progress: eventData.progress,
                }));
                break;

              case 'stage_complete':
                setState(prev => ({
                  ...prev,
                  progress: eventData.progress,
                  result: { ...prev.result, ...eventData.result },
                }));
                break;

              case 'error':
                if (!eventData.recoverable) {
                  setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: eventData.error,
                  }));
                }
                break;

              case 'complete':
                setState({
                  status: 'complete',
                  progress: 100,
                  currentStage: null,
                  result: eventData.result,
                  error: null,
                  duration: eventData.duration,
                });
                break;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Intentional abort
      }
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  return {
    ...state,
    generate,
    cancel,
    isGenerating: state.status === 'generating',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
  };
}
```

#### 5.4 Verification Steps

1. 생성 시작 → 각 단계별 진행률 실시간 업데이트 확인
2. 브라우저 Network 탭 → SSE 이벤트 스트림 확인
3. 중간에 취소 → 요청 중단 확인
4. 에러 발생 시 → recoverable 에러는 계속 진행, non-recoverable은 중단

#### 5.5 Task Checklist

- [ ] `stream-generator.ts` 구현
- [ ] `/api/generate-v2-stream` endpoint 구현
- [ ] `useStreamGeneration.ts` hook 구현
- [ ] Generation progress UI 수정
- [ ] 기존 `/api/generate-v2` 리팩토링 (공유 로직 추출)

---

## Phase 3: Advanced Features (Week 3)

### Feature 6: A/B Generation Comparison

*상세 내용은 별도 섹션으로 작성*

#### Task Checklist
- [ ] Database migration (ab_tests 테이블)
- [ ] `ab-runner.ts` 구현
- [ ] `ab-weight-compare.tsx` 구현
- [ ] `/ab-testing` 페이지 구현
- [ ] `/api/ab-testing` endpoint 구현
- [ ] Navigation에 메뉴 추가

---

### Feature 7: AI Exposure Metrics Visualization

*상세 내용은 별도 섹션으로 작성*

#### Task Checklist
- [ ] Database 테이블 확인/생성
- [ ] `ai-exposure-chart.tsx` 구현
- [ ] `ai-exposure-metrics.tsx` 구현
- [ ] `/api/analytics/ai-exposure` endpoint 구현
- [ ] Analytics 페이지에 섹션 추가

---

### Feature 8: User Feedback Collection

*상세 내용은 별도 섹션으로 작성*

#### Task Checklist
- [ ] Database migration (user_feedback 테이블)
- [ ] `feedback-widget.tsx` 구현
- [ ] `feedback-summary.tsx` 구현
- [ ] `/api/feedback` endpoint 구현
- [ ] `/feedback` 관리 페이지 구현
- [ ] Generation 결과에 위젯 추가

---

## Summary

### Total Tasks: 38

| Phase | Features | Tasks | Estimated Days |
|-------|----------|-------|----------------|
| Phase 1 | Caching + Templates | 11 | 4-5 days |
| Phase 2 | Date Range + Export + Streaming | 15 | 6-8 days |
| Phase 3 | A/B + AI Exposure + Feedback | 12 | 6-8 days |

### Total Estimated Time: 16-21 days (약 3-4주)

### Parallel Work Opportunities

- Phase 1: Caching ↔ Templates (병렬 가능)
- Phase 2: Date Range ↔ Export (병렬 가능)
- Phase 3: AI Exposure ↔ Feedback (병렬 가능)

---

## Change Log

| Date | Task | Change | Status |
|------|------|--------|--------|
| Jan 2025 | Plan created | Initial planning document | ✅ Complete |

---

## Notes

- 모든 변경사항은 기존 기능과 호환성 유지
- 각 Phase 완료 후 테스트 진행
- Database migration은 Supabase MCP 도구 사용
- UI 컴포넌트는 기존 shadcn/ui 패턴 따름
