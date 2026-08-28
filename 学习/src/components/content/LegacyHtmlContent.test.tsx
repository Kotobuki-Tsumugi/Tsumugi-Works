import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LegacyHtmlContent } from './LegacyHtmlContent'

describe('LegacyHtmlContent', () => {
  it('handles migrated copy and quiz controls without legacy scripts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<LegacyHtmlContent html={`<body>
      <div class="quiz"><span class="quiz-option" data-quiz="q1" data-correct="1">正确</span><span class="quiz-option" data-quiz="q1" data-correct="0">错误</span><div id="q1-answer" class="quiz-answer">解释</div></div>
      <pre><code id="code-1">const x = 1</code></pre><button class="copy-btn" data-copy="code-1">复制</button>
    </body>`} />)

    fireEvent.click(screen.getByRole('button', { name: '正确' }))
    expect(screen.getByRole('button', { name: '正确' })).toBeDisabled()
    expect(screen.getByText('解释')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '复制代码' }))
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('const x = 1'))
    expect(screen.getByRole('button', { name: '复制代码' })).toHaveTextContent('已复制')
  })
})
