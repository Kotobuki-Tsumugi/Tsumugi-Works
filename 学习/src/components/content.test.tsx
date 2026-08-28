import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CodeBlock, Quiz, PrintButton, BackToTop } from './content'

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
    expect(screen.getByText('已复制')).toBeInTheDocument()
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
    render(<BackToTop />)
    fireEvent.click(screen.getByRole('button', { name: /回到顶部/ }))
    expect(scrollTo).toHaveBeenCalled()
  })
})
