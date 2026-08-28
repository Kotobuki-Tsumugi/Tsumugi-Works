import type { Catalog, Course, Lesson } from './types'

const lesson = (id: string, title: string, summary: string, anchors: string[]): Lesson => ({
  id,
  title,
  summary,
  anchors: anchors.map((anchor, index) => ({ id: `section-${index + 1}`, title: anchor })),
})

export const catalog: Catalog = {
  courses: [
    { id: 'math-foundations', title: '数学基础', description: '为电气工程建立扎实的数学工具箱。', route: 'engineering', icon: '∑', level: '基础', duration: '2 周', prerequisites: [], lessons: [lesson('overview', '数学基础学习计划', '函数、微积分与复数的工程应用。', ['学习目标', '函数与图像', '微积分入门', '复数与相量'])] },
    { id: 'circuit-basics', title: '电路基础', description: '从电压电流到常用电路定理。', route: 'engineering', icon: '⚡', level: '基础', duration: '3 周', prerequisites: ['数学基础'], lessons: [lesson('overview', '电路基础学习计划', '掌握直流与交流电路分析。', ['学习目标', '基本定律', '节点与网孔', '工程实践'])] },
    { id: 'signals-systems', title: '信号与系统', description: '理解信号表示、变换及系统响应。', route: 'engineering', icon: '∿', level: '进阶', duration: '3 周', prerequisites: ['电路基础'], lessons: [lesson('overview', '信号与系统基础学习计划', '使用时域和频域方法分析系统。', ['学习目标', '信号分类', '傅里叶变换', '系统响应'])] },
    { id: 'go-intro', title: 'Go 入门', description: '用 Go 构建可靠、并发的程序。', route: 'programming', icon: '◉', level: '基础', duration: '2 周', prerequisites: [], lessons: [lesson('overview', 'Go 入门指南', '从语法到并发，完成第一个 Go 项目。', ['学习目标', '语法速览', '并发模型', '实战项目'])] },
    { id: 'html-web', title: 'HTML / Web 基础', description: '掌握语义化 HTML 与现代 Web 基础。', route: 'programming', icon: '◇', level: '基础', duration: '2 周', prerequisites: [], lessons: [lesson('overview', 'HTML 入门教程', '构建结构清晰、可访问的网页。', ['学习目标', '文档结构', '语义化标签', '表单与可访问性'])] },
  ],
}

export const getCourse = (courseId?: string): Course | undefined => catalog.courses.find((course) => course.id === courseId)
export const getLesson = (courseId?: string, lessonId?: string): Lesson | undefined => getCourse(courseId)?.lessons.find((item) => item.id === lessonId)

export function getAdjacentLesson(courseId: string, lessonId: string, direction: 'prev' | 'next') {
  const entries = catalog.courses.flatMap((course) => course.lessons.map((lesson) => ({ course, lesson })))
  const index = entries.findIndex((entry) => entry.course.id === courseId && entry.lesson.id === lessonId)
  if (index < 0) return undefined
  return entries[index + (direction === 'prev' ? -1 : 1)]
}
