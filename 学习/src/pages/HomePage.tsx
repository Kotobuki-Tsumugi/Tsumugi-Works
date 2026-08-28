import { Link } from 'react-router-dom'
import { catalog } from '../data/catalog'
import { Breadcrumbs } from '../components/Breadcrumbs'

export function HomePage() {
  return <><Breadcrumbs items={[{ label: '学习中心' }]} /><p className="eyebrow">欢迎回来</p><h1>学习中心</h1><p className="lead">选择一条学习路线，按章节掌握从基础到实践的完整知识。</p>
    <div className="route-grid">{catalog.routes.map((route) => <section className="route-card" key={route.id}><span className="route-icon" aria-hidden="true">{route.icon}</span><h2>{route.title}</h2><p>{route.description}</p><ul>{route.courses.map((course) => <li key={course.id}><Link to={`/course/${course.id}`}>{course.title}</Link></li>)}</ul></section>)}</div>
  </>
}
