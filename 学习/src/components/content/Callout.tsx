import type { ReactNode } from 'react'

export type CalloutVariant = 'tip' | 'warning' | 'note' | 'success' | 'example'
export function Callout({ variant = 'note', title, children }: { variant?: CalloutVariant; title?: ReactNode; children: ReactNode }) {
  return <aside className={`callout callout-${variant}`} role={variant === 'warning' ? 'alert' : undefined}>{title && <strong>{title}</strong>}{children}</aside>
}
