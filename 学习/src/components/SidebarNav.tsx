import { NavLink } from 'react-router-dom'
import { catalog } from '../data/catalog'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return <nav className="study-sidebar" aria-label="学习路线">
    <p className="sidebar-label">学习路线</p>
    {catalog.routes.map((route) => <div className="sidebar-group" key={route.id}>
      <h2>{route.title}</h2>
      {route.courses.map((course) => <NavLink key={course.id} to={`/course/${course.id}`} onClick={onNavigate} className={({ isActive }) => isActive ? 'active' : undefined}>{course.icon} {course.title}</NavLink>)}
    </div>)}
  </nav>
}
