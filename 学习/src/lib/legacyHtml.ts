/**
 * Convert an imported lesson document into safe article markup.
 *
 * The old files contain a complete page (styles, scripts and their own
 * navigation).  Only the body content is kept.  Interactive controls are
 * tagged with data attributes so `LegacyHtmlContent` can provide equivalent
 * React event handling without evaluating any legacy script.
 */
export function legacyHtml(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  if (typeof DOMParser === 'undefined') return fallbackCleanup(body)

  const document = new DOMParser().parseFromString(`<body>${body}</body>`, 'text/html')
  const root = document.body

  // Remove page chrome and anything executable.  Selectors are deliberately
  // class/id based so article `<nav>` elements are not accidentally dropped.
  root.querySelectorAll('script, style, noscript, iframe, object, embed, header.site-header, .sidebar, nav.study-nav, .skip-link, #themeToggle, #printPlan, #backTop, .theme-toggle, .print-plan, .back-top, .print, .top').forEach((node) => node.remove())
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || attribute.name === 'style') {
        element.removeAttribute(attribute.name)
        continue
      }
      if (/^(?:href|src|action|formaction|xlink:href)$/i.test(attribute.name) && /^(?:javascript|vbscript|data:text\/html):/i.test(attribute.value.trim())) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  // Legacy quiz options were clickable spans.  Turn them into real buttons
  // and preserve the correct-answer metadata for the delegated React handler.
  root.querySelectorAll<HTMLElement>('.quiz-option').forEach((option) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = option.className
    button.setAttribute('data-react-quiz', option.dataset.quiz ?? '')
    button.setAttribute('data-correct', option.dataset.correct ?? '0')
    button.innerHTML = option.innerHTML
    option.replaceWith(button)
  })

  // Keep answer explanations in the DOM but hidden until a choice is made.
  root.querySelectorAll<HTMLElement>('.quiz-answer').forEach((answer) => {
    answer.hidden = true
    answer.setAttribute('data-react-quiz-answer', answer.id.replace(/-answer$/, ''))
  })

  // Copy buttons are retained as controls, but no longer carry legacy inline
  // handlers.  Their `data-copy` target is consumed by React below.
  root.querySelectorAll<HTMLElement>('.copy-btn[data-copy]').forEach((button) => {
    button.removeAttribute('onclick')
    button.setAttribute('data-react-copy', button.dataset.copy ?? '')
    button.setAttribute('aria-label', '复制代码')
  })

  // Any remaining legacy buttons/selectors depended on removed scripts (tabs,
  // demos, chapter paging, form previews).  Drop them so the migrated page
  // never presents controls that cannot work in React.
  root.querySelectorAll('.tab-btn, #chapterSelect, #prevChapter, #nextChapter, #bottomPrev, #bottomNext, button:not([data-react-copy]):not([data-react-quiz]), select').forEach((node) => node.remove())

  return root.innerHTML
}

function fallbackCleanup(body: string): string {
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<(?:aside|header|nav)\b[^>]*(?:sidebar|study-nav|site-header|navigation)[^>]*>[\s\S]*?<\/(?:aside|header|nav)>/gi, '')
    .replace(/<button[^>]*(?:print|top|theme|dark)[^>]*>[\s\S]*?<\/button>/gi, '')
}
