import { useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { SectionNav } from '../components/SectionNav'
import { getCourse, getLesson } from '../data/catalog'
import { NotFoundPage } from './NotFoundPage'

export function LessonPage() {
  const { courseId, lessonId } = useParams()
  const course = getCourse(courseId)
  const lesson = getLesson(courseId, lessonId)
  if (!course || !lesson) return <NotFoundPage message="章节不存在或已被移除。" />
  return <><Breadcrumbs items={[{ label: '学习中心', to: '/' }, { label: course.title, to: `/course/${course.id}` }, { label: lesson.title }]} /><p className="eyebrow">{course.title}</p><h1>{lesson.title}</h1><p className="lead">{lesson.summary}</p><div className="lesson-layout"><aside className="lesson-outline" aria-label="本章目录"><h2>本章目录</h2>{lesson.anchors.map((anchor) => <a href={`#${anchor.id}`} key={anchor.id}>{anchor.title}</a>)}</aside><article className="lesson-content">{lesson.anchors.map((anchor, index) => <section id={anchor.id} key={anchor.id}><h2>{anchor.title}</h2><p>这里是「{anchor.title}」学习内容。我们将通过示例与练习，逐步建立可迁移的知识体系。</p>{index === lesson.anchors.length - 1 && <div className="callout">完成本节后，可以继续浏览下一门课程。</div>}</section>)}</article></div><SectionNav courseId={course.id} lessonId={lesson.id} /></>
}
