export type LessonAnchor = { id: string; title: string }

export type Lesson = {
  id: string
  title: string
  summary: string
  anchors: LessonAnchor[]
}

export type RouteId = 'engineering' | 'programming'

/** A learning path that groups related courses in the navigation. */
export type Route = {
  id: RouteId
  title: string
  description: string
  icon: string
  courses: Course[]
}

export type Course = {
  id: string
  title: string
  description: string
  route: RouteId
  /** Original static page migrated into this course. */
  sourcePath: string
  icon: string
  level: string
  duration: string
  prerequisites: string[]
  lessons: Lesson[]
}

export type Catalog = {
  /** Flat list retained for lookups and adjacent-course navigation. */
  courses: Course[]
  /** Grouped learning paths used by home and sidebar navigation. */
  routes: Route[]
}
