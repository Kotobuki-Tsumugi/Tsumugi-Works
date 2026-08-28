import { Link } from 'react-router-dom'

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  return <header className="study-header" role="banner">
    <button className="mobile-menu-button" type="button" onClick={onMenu} aria-label="打开学习路线">☰</button>
    <Link className="brand" to="/">学习中心</Link>
    <span className="header-kicker">循序渐进，构建知识体系</span>
  </header>
}
