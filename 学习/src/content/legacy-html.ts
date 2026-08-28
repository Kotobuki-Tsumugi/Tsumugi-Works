/**
 * Static imports for the five lesson documents that are being migrated.
 *
 * Vite's `?raw` suffix keeps the source in the bundle without making it an
 * iframe or a second page.  The content map below removes executable script
 * blocks before the markup reaches React; `LegacyHtmlContent` performs the
 * final DOM sanitisation and wires the supported controls.
 */
import mathFoundations from '../../电气工程师/第一章-数学基础学习计划.html?raw'
import circuitBasics from '../../电气工程师/第二章-电路基础学习计划.html?raw'
import signalsSystems from '../../电气工程师/第三章-信号与系统基础学习计划.html?raw'
import goIntro from '../../编程语言入门/Go/Go入门指南.html?raw'
import htmlWeb from '../../编程语言入门/HTML/HTML入门教程.html?raw'

export const legacyHtmlSources = {
  'math-foundations': mathFoundations,
  'circuit-basics': circuitBasics,
  'signals-systems': signalsSystems,
  'go-intro': goIntro,
  'html-web': htmlWeb,
} as const

export type LegacyCourseId = keyof typeof legacyHtmlSources

/** Return only the original document body, falling back to the source itself. */
export function extractLegacyBody(source: string): string {
  const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? source

  // Scripts/styles are page implementation details, not learning content.
  // Removing them here keeps the generated bundle smaller and prevents a raw
  // legacy script from ever being inserted into the React tree.  Interactive
  // quiz/copy markup remains and is adapted by LegacyHtmlContent at render
  // time.
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
}

export function getLegacyBody(courseId: LegacyCourseId): string {
  return extractLegacyBody(legacyHtmlSources[courseId])
}
