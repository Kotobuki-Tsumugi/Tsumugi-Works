import { describe, expect, it } from 'vitest'
import { catalog, getCourse, getLesson, getAdjacentLesson } from './catalog'

describe('study catalog', () => {
  it('registers five courses with stable ids', () => {
    expect(catalog.courses).toHaveLength(5)
    expect(catalog.courses.map((course) => course.id)).toEqual([
      'math-foundations',
      'circuit-basics',
      'signals-systems',
      'go-intro',
      'html-web',
    ])
  })

  it('resolves courses and lessons by id', () => {
    const course = getCourse('math-foundations')
    expect(course?.title).toContain('数学')
    expect(getLesson('math-foundations', 'overview')?.title).toBeTruthy()
  })

  it('provides adjacent lessons across courses', () => {
    const first = getAdjacentLesson('math-foundations', 'overview', 'prev')
    const next = getAdjacentLesson('math-foundations', 'overview', 'next')
    expect(first).toBeUndefined()
    expect(next?.course.id).toBe('circuit-basics')
  })
})
