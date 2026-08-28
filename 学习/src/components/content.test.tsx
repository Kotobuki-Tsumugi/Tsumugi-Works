import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Checklist, CodeBlock, Quiz, PrintButton, BackToTop } from './content'

describe('Checklist', () => {
  it('reconciles checked state when item count changes', () => {
    const { rerender } = render(<Checklist items={['A', 'B']} />)
    fireEvent.click(screen.getByLabelText('A'))
    rerender(<Checklist items={['A']} />)
    expect(screen.getByLabelText('A')).toBeChecked()
    rerender(<Checklist items={['A', 'B', 'C']} />)
    expect(screen.getByLabelText('C')).not.toBeChecked()
  })
})

describe('Quiz', () => {
  it('disables options and shows explanation after selecting an answer', () => {
    render(
      <Quiz
        question="2 + 2 = ?"
        options={[{ id: 'a', label: '3' }, { id: 'b', label: '4' }]}
        answer="b"
        explanation="加法结果为 4。"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    expect(screen.getByText('加法结果为 4。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '4' })).toBeDisabled()
  })
})

describe('CodeBlock', () => {
  it('copies code and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<CodeBlock code="const x = 1" language="ts" />)
    fireEvent.click(screen.getByRole('button', { name: /复制代码/ }))
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('const x = 1'))
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  it('clears copy status after two seconds', async () => {
    vi.useFakeTimers()
    try {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })
      render(<CodeBlock code="const y = 2" language="ts" />)
      fireEvent.click(screen.getByRole('button', { name: /复制代码/ }))
      await act(async () => { await Promise.resolve() })
      expect(screen.getByText('已复制')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.getByText('复制代码')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('PrintButton', () => {
  it('invokes browser print', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    render(<PrintButton />)
    fireEvent.click(screen.getByRole('button', { name: /打印/ }))
    expect(print).toHaveBeenCalled()
  })
})

describe('BackToTop', () => {
  it('scrolls to top when activated', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 })
    render(<BackToTop />)
    fireEvent.click(screen.getByRole('button', { name: /回到顶部/ }))
    expect(scrollTo).toHaveBeenCalled()
  })
})
