import { useEffect, useState } from 'react'

export function CodeBlock({ code, language, title }: { code: string; language?: string; title?: string }) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code)
      setStatus('success')
    } catch { setStatus('error') }
  }
  return <figure className="code-block"><figcaption>{title || language || '代码'}<button type="button" onClick={copy} aria-label="复制代码">{status === 'success' ? '已复制' : status === 'error' ? '复制失败' : '复制代码'}</button></figcaption><pre><code className={language ? `language-${language}` : undefined}>{code}</code></pre></figure>
}
