import { describe, expect, it } from 'vitest'
import { catalog } from '../data/catalog'
import { courseContent } from './course-content'

describe('migrated course content', () => {
  it('resolves substantial content and every catalog anchor for all five courses', () => {
    for (const course of catalog.courses) {
      const content = courseContent[course.id]
      expect(content, `missing content for ${course.id}`).toBeDefined()
      expect(content.html.length, `${course.id} content is too short`).toBeGreaterThan(500)
      expect(content.anchors.length, `${course.id} has no anchors`).toBeGreaterThan(0)

      for (const anchor of course.lessons.flatMap((lesson) => lesson.anchors)) {
        expect(content.html, `${course.id} is missing anchor #${anchor.id}`).toContain(`id="${anchor.id}"`)
      }
    }
  })
})
