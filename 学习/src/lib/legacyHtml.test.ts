import { describe, expect, it } from 'vitest'
import { legacyHtml } from './legacyHtml'

describe('legacyHtml', () => {
  it('keeps lesson content while removing page chrome and executable markup', () => {
    const result = legacyHtml(`<!doctype html><html><head><style>.x{}</style></head><body>
      <header class="site-header"><button id="themeToggle">主题</button></header>
      <aside class="sidebar">旧侧栏</aside><nav class="study-nav">旧导航</nav>
      <button id="printPlan">打印本章</button><script>alert('x')</script>
      <main><h1>正文</h1><p>内容</p><a href="javascript:alert(1)" onclick="alert(2)">链接</a></main>
    </body></html>`)
    expect(result).toContain('<h1>正文</h1>')
    expect(result).not.toMatch(/site-header|sidebar|study-nav|themeToggle|printPlan|<script|<style/i)
    expect(result).not.toMatch(/javascript:|onclick=/i)
  })

  it('annotates legacy quiz and copy controls for React delegation', () => {
    const result = legacyHtml(`<body>
      <div class="quiz"><span class="quiz-option" data-quiz="q1" data-correct="1">正确</span><span class="quiz-option" data-quiz="q1" data-correct="0">错误</span><div id="q1-answer" class="quiz-answer">解释</div></div>
      <pre><code id="code-1">const x = 1</code></pre><button class="copy-btn" data-copy="code-1">复制</button>
    </body>`)
    expect(result).toContain('data-react-quiz="q1"')
    expect(result).toContain('data-react-copy="code-1"')
    expect(result).toContain('data-react-quiz-answer="q1"')
    expect(result).toContain('hidden')
  })
})
