import type { ReactNode } from 'react'
export type Week = { title: string; items: ReactNode[] }
export function WeekPlan({ weeks }: { weeks: Week[] }) { return <ol className="week-plan">{weeks.map((week) => <li key={week.title}><h3>{week.title}</h3><ul>{week.items.map((item, i) => <li key={i}>{item}</li>)}</ul></li>)}</ol> }
