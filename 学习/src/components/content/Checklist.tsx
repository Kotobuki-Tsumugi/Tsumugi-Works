import { useEffect, useState, type ReactNode } from 'react'

export function Checklist({ items }: { items: ReactNode[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false))
  useEffect(() => {
    setChecked((current) => items.map((_, index) => current[index] ?? false))
  }, [items.length])
  return <ul className="checklist">{items.map((item, i) => <li key={i}><label><input type="checkbox" checked={checked[i] ?? false} onChange={() => setChecked((v) => v.map((x, j) => j === i ? !x : x))} />{item}</label></li>)}</ul>
}
