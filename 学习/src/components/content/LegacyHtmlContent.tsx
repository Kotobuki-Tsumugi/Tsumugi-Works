import { useEffect, useMemo, useRef } from 'react'
import { legacyHtml } from '../../lib/legacyHtml'

/** Render migrated markup while wiring the small set of supported controls. */
export function LegacyHtmlContent({ html, className = '' }: { html: string; className?: string }) {
  const cleaned = useMemo(() => legacyHtml(html), [html])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const copyButton = target?.closest<HTMLElement>('[data-react-copy]')
      if (copyButton && container.contains(copyButton)) {
        const sourceId = copyButton.dataset.reactCopy
        const source = sourceId ? container.querySelector<HTMLElement>(`#${escapeSelector(sourceId)}`) : null
        if (!source || !navigator.clipboard?.writeText) {
          copyButton.dataset.copyStatus = 'error'
          copyButton.textContent = '复制失败'
          return
        }
        try {
          await navigator.clipboard.writeText(source.textContent ?? '')
          copyButton.dataset.copyStatus = 'success'
          copyButton.textContent = '已复制'
        } catch {
          copyButton.dataset.copyStatus = 'error'
          copyButton.textContent = '复制失败'
        }
        return
      }

      const quizOption = target?.closest<HTMLButtonElement>('[data-react-quiz]')
      if (!quizOption || !container.contains(quizOption)) return
      const quizId = quizOption.dataset.reactQuiz
      if (!quizId) return
      const options = [...container.querySelectorAll<HTMLButtonElement>(`[data-react-quiz="${escapeSelector(quizId)}"]`)]
      const isCorrect = quizOption.dataset.correct === '1' || quizOption.dataset.correct === 'true'
      options.forEach((option) => {
        option.disabled = true
        option.classList.toggle('correct', option === quizOption && isCorrect)
        option.classList.toggle('incorrect', option === quizOption && !isCorrect)
      })
      const answer = container.querySelector<HTMLElement>(`[data-react-quiz-answer="${escapeSelector(quizId)}"]`)
      if (answer) answer.hidden = false
    }
    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [cleaned])

  return <div ref={containerRef} className={`legacy-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: cleaned }} />
}

function escapeSelector(value: string) {
  const css = globalThis.CSS
  return css?.escape ? css.escape(value) : value.replace(/(["\\])/g, '\\$1')
}
