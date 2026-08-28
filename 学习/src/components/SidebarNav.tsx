import { NavLink } from 'react-router-dom'
import { catalog } from '../data/catalog'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const groups = [
    { key: 'engineering', label: '电气工程师' },
    { key: 'programming', label: '编程语言入门' },
  ] as const
  return <nav className="study-sidebar" aria-label="学习路线">
    <p className="sidebar-label">学习路线</p>
    {groups.map((group) => <div className="sidebar-group" key={group.key}>
      <h2>{group.label}</h2>
      {catalog.courses.filter((course) => course.route === group.key).map((course) => <NavLink key={course.id} to={`/course/${course.id}`} onClick={onNavigate} className={({ isActive }) => isActive ? 'active' : undefined}>{course.icon} {course.title}</NavLink>)}
    </div>)}
  </nav>
}
