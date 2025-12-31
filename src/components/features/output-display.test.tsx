import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OutputDisplay } from './output-display'
import { useGenerationStore } from '@/store/generation-store'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}
Object.assign(navigator, { clipboard: mockClipboard })

describe('OutputDisplay', () => {
  beforeEach(() => {
    useGenerationStore.getState().reset()
    vi.clearAllMocks()
  })

  it('shows empty state when no content is generated', () => {
    render(<OutputDisplay />)
    expect(screen.getByText('No generated content yet.')).toBeInTheDocument()
  })

  it('displays description when available', () => {
    useGenerationStore.getState().setOutput({
      description: 'Test description content',
      timestamps: '',
      hashtags: [],
      faq: '',
    })

    render(<OutputDisplay />)
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Test description content')).toBeInTheDocument()
  })

  it('displays timestamps when available', () => {
    useGenerationStore.getState().setOutput({
      description: '',
      timestamps: '0:00 Intro\n0:30 Main content',
      hashtags: [],
      faq: '',
    })

    render(<OutputDisplay />)
    expect(screen.getByText('Timestamps')).toBeInTheDocument()
    expect(screen.getByText(/0:00 Intro/)).toBeInTheDocument()
    expect(screen.getByText(/0:30 Main content/)).toBeInTheDocument()
  })

  it('displays hashtags when available', () => {
    useGenerationStore.getState().setOutput({
      description: '',
      timestamps: '',
      hashtags: ['#Samsung', '#GalaxyS25', '#Camera'],
      faq: '',
    })

    render(<OutputDisplay />)
    expect(screen.getByText('Hashtags')).toBeInTheDocument()
    expect(screen.getByText('#Samsung')).toBeInTheDocument()
    expect(screen.getByText('#GalaxyS25')).toBeInTheDocument()
    expect(screen.getByText('#Camera')).toBeInTheDocument()
  })

  it('displays FAQ when available', () => {
    useGenerationStore.getState().setOutput({
      description: '',
      timestamps: '',
      hashtags: [],
      faq: 'Q: What is the battery life?\nA: All day battery.',
    })

    render(<OutputDisplay />)
    expect(screen.getByText('FAQ (Pinned Comment)')).toBeInTheDocument()
    expect(screen.getByText(/What is the battery life/)).toBeInTheDocument()
    expect(screen.getByText(/All day battery/)).toBeInTheDocument()
  })

  it('displays product name and keywords', () => {
    useGenerationStore.getState().setProduct('prod-1', 'Galaxy S25 Ultra')
    useGenerationStore.getState().toggleKeyword('Camera')
    useGenerationStore.getState().toggleKeyword('Battery')
    useGenerationStore.getState().setOutput({
      description: 'Test content',
      timestamps: '',
      hashtags: [],
      faq: '',
    })

    render(<OutputDisplay />)
    expect(screen.getByText('Galaxy S25 Ultra')).toBeInTheDocument()
    expect(screen.getByText('Camera')).toBeInTheDocument()
    expect(screen.getByText('Battery')).toBeInTheDocument()
  })

  it('copies description to clipboard when copy button is clicked', async () => {
    useGenerationStore.getState().setOutput({
      description: 'Copy this description',
      timestamps: '',
      hashtags: [],
      faq: '',
    })

    render(<OutputDisplay />)

    const copyButtons = screen.getAllByText('Copy')
    fireEvent.click(copyButtons[0])

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Copy this description')
    })
  })

  it('displays all content sections when fully populated', () => {
    useGenerationStore.getState().setProduct('prod-1', 'Galaxy S25')
    useGenerationStore.getState().setOutput({
      description: 'Full description',
      timestamps: '0:00 Start',
      hashtags: ['#Test'],
      faq: 'Q: Test?\nA: Yes.',
    })

    render(<OutputDisplay />)
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Timestamps')).toBeInTheDocument()
    expect(screen.getByText('Hashtags')).toBeInTheDocument()
    expect(screen.getByText('FAQ (Pinned Comment)')).toBeInTheDocument()
    expect(screen.getByText('Save as Draft')).toBeInTheDocument()
    expect(screen.getByText('Mark as Confirmed')).toBeInTheDocument()
  })
})
