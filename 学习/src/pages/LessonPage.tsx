import { useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { SectionNav } from '../components/SectionNav'
import { LegacyHtmlContent } from '../components/content/LegacyHtmlContent'
import { getCourse, getLesson } from '../data/catalog'
import { getCourseContent } from '../content/course-content'
import { NotFoundPage } from './NotFoundPage'

export function LessonPage() {
  const { courseId, lessonId } = useParams()
  const course = getCourse(courseId)
  const lesson = getLesson(courseId, lessonId)
  if (!course || !lesson) return <NotFoundPage message="章节不存在或已被移除。" />
  const content = getCourseContent(course.id)
  return <><Breadcrumbs items={[{ label: '学习中心', to: '/' }, { label: course.title, to: `/course/${course.id}` }, { label: lesson.title }]} /><p className="eyebrow">{course.title}</p><h1>{lesson.title}</h1><p className="lead">{lesson.summary}</p><div className="lesson-layout"><aside className="lesson-outline" aria-label="本章目录"><h2>本章目录</h2>{lesson.anchors.map((anchor) => <a href={`#${anchor.id}`} key={anchor.id}>{anchor.title}</a>)}</aside><article className="lesson-content">{content ? <LegacyHtmlContent html={content.html} /> : <p>课程正文暂不可用。</p>}</article></div><SectionNav courseId={course.id} lessonId={lesson.id} /></>
}
