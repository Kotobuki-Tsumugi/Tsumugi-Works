import type { ReactNode } from 'react'
export function Formula({ children, label }: { children: ReactNode; label?: string }) { return <div className="formula" role="math" aria-label={label}>{children}</div> }
