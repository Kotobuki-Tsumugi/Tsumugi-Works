import type { ReactNode } from 'react'
export function Diagram({ children, title }: { children: ReactNode; title?: string }) { return <figure className="diagram">{title && <figcaption>{title}</figcaption>}<pre>{children}</pre></figure> }
