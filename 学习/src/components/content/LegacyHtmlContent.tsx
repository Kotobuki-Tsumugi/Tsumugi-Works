import { useMemo } from 'react'
import { legacyHtml } from '../../lib/legacyHtml'
export function LegacyHtmlContent({ html, className = '' }: { html: string; className?: string }) { const cleaned = useMemo(() => legacyHtml(html), [html]); return <div className={`legacy-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: cleaned }} /> }
