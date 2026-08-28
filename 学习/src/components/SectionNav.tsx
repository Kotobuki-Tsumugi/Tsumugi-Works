import { Link } from 'react-router-dom'
import { getAdjacentLesson } from '../data/catalog'

export function SectionNav({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const prev = getAdjacentLesson(courseId, lessonId, 'prev')
  const next = getAdjacentLesson(courseId, lessonId, 'next')
  return <nav className="section-nav" aria-label="课程章节导航">
    {prev ? <Link to={`/course/${prev.course.id}/lesson/${prev.lesson.id}`}>← {prev.lesson.title}</Link> : <span />}
    {next ? <Link to={`/course/${next.course.id}/lesson/${next.lesson.id}`}>{next.lesson.title} →</Link> : <span />}
  </nav>
}
