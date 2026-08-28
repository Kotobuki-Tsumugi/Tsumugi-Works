import type { ReactNode } from 'react'

export function ContentCard({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return <article className={`content-card ${className}`.trim()}>{title && <h3>{title}</h3>}{children}</article>
}
