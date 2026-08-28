import type { ReactNode } from 'react'
export function ProjectPanel({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) { return <section className="project-panel"><h3>{title}</h3>{description && <p>{description}</p>}{children}</section> }
