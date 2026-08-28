export type LessonAnchor = { id: string; title: string }

export type Lesson = {
  id: string
  title: string
  summary: string
  anchors: LessonAnchor[]
}

export type Course = {
  id: string
  title: string
  description: string
  route: 'engineering' | 'programming'
  icon: string
  level: string
  duration: string
  prerequisites: string[]
  lessons: Lesson[]
}

export type Catalog = { courses: Course[] }
