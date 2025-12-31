import { describe, it, expect, beforeEach } from 'vitest'
import { useGenerationStore } from './generation-store'

describe('useGenerationStore', () => {
  beforeEach(() => {
    useGenerationStore.getState().reset()
  })

  it('initializes with default values', () => {
    const state = useGenerationStore.getState()
    expect(state.step).toBe('product')
    expect(state.categoryId).toBeNull()
    expect(state.productId).toBeNull()
    expect(state.selectedKeywords).toEqual([])
  })

  it('sets step correctly', () => {
    useGenerationStore.getState().setStep('content')
    expect(useGenerationStore.getState().step).toBe('content')
  })

  it('sets category and resets product', () => {
    const store = useGenerationStore.getState()
    store.setProduct('prod-1', 'Galaxy S25')
    store.setCategory('cat-1')

    const state = useGenerationStore.getState()
    expect(state.categoryId).toBe('cat-1')
    expect(state.productId).toBeNull()
    expect(state.productName).toBeNull()
  })

  it('sets product correctly', () => {
    useGenerationStore.getState().setProduct('prod-1', 'Galaxy S25 Ultra')

    const state = useGenerationStore.getState()
    expect(state.productId).toBe('prod-1')
    expect(state.productName).toBe('Galaxy S25 Ultra')
  })

  it('toggles keywords with max 3 limit', () => {
    const store = useGenerationStore.getState()

    store.toggleKeyword('camera')
    expect(useGenerationStore.getState().selectedKeywords).toEqual(['camera'])

    store.toggleKeyword('battery')
    expect(useGenerationStore.getState().selectedKeywords).toEqual(['camera', 'battery'])

    store.toggleKeyword('design')
    expect(useGenerationStore.getState().selectedKeywords).toEqual(['camera', 'battery', 'design'])

    // Should not add 4th keyword
    store.toggleKeyword('ai')
    expect(useGenerationStore.getState().selectedKeywords).toEqual(['camera', 'battery', 'design'])

    // Should remove existing keyword
    store.toggleKeyword('battery')
    expect(useGenerationStore.getState().selectedKeywords).toEqual(['camera', 'design'])
  })

  it('resets to initial state', () => {
    const store = useGenerationStore.getState()
    store.setCategory('cat-1')
    store.setProduct('prod-1', 'Galaxy S25')
    store.setSrtContent('test content')
    store.toggleKeyword('camera')

    store.reset()

    const state = useGenerationStore.getState()
    expect(state.categoryId).toBeNull()
    expect(state.productId).toBeNull()
    expect(state.srtContent).toBe('')
    expect(state.selectedKeywords).toEqual([])
  })
})
