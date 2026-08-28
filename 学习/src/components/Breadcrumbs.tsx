import { Link } from 'react-router-dom'

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return <nav className="breadcrumbs" aria-label="面包屑导航">{items.map((item, index) => <span key={`${item.label}-${index}`}>{index > 0 && <span aria-hidden="true"> / </span>}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav>
}
