import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { getCourse } from '../data/catalog'
import { NotFoundPage } from './NotFoundPage'

export function CourseOverviewPage() {
  const { courseId } = useParams()
  const course = getCourse(courseId)
  if (!course) return <NotFoundPage message="课程不存在或已被移除。" />
  return <><Breadcrumbs items={[{ label: '学习中心', to: '/' }, { label: course.title }]} /><p className="eyebrow">课程路线</p><h1>{course.icon} {course.title}</h1><p className="lead">{course.description}</p><div className="course-meta"><span>{course.level}</span><span>{course.duration}</span></div><h2>课程章节</h2><div className="lesson-list">{course.lessons.map((lesson) => <article className="content-card" key={lesson.id}><h3>{lesson.title}</h3><p>{lesson.summary}</p><Link className="button" to={`/course/${course.id}/lesson/${lesson.id}`}>开始学习 →</Link></article>)}</div></>
}
