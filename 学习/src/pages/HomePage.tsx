import { Link } from 'react-router-dom'
import { catalog } from '../data/catalog'
import { Breadcrumbs } from '../components/Breadcrumbs'

export function HomePage() {
  return <><Breadcrumbs items={[{ label: '学习中心' }]} /><p className="eyebrow">欢迎回来</p><h1>学习中心</h1><p className="lead">选择一条学习路线，按章节掌握从基础到实践的完整知识。</p>
    <div className="route-grid">{[{ key: 'engineering', title: '电气工程师', icon: '⚡', desc: '数学、电路与信号系统基础' }, { key: 'programming', title: '编程语言入门', icon: '⌘', desc: '从 Go 到 HTML/Web 的实践路径' }].map((route) => <section className="route-card" key={route.key}><span className="route-icon" aria-hidden="true">{route.icon}</span><h2>{route.title}</h2><p>{route.desc}</p><ul>{catalog.courses.filter((course) => course.route === route.key).map((course) => <li key={course.id}><Link to={`/course/${course.id}`}>{course.title}</Link></li>)}</ul></section>)}</div>
  </>
}
