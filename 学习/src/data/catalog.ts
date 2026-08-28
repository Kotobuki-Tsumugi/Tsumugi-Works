import type { Catalog, Course, Lesson, Route } from './types'

const anchorIdSets: Record<string, string[]> = {
  '数学基础学习计划': ['math-overview', 'math-week1', 'math-week2', 'math-week3', 'math-week4', 'math-check'],
  '电路基础学习计划': ['circuit-overview', 'circuit-week1', 'circuit-week2', 'circuit-week3', 'circuit-week4', 'circuit-check'],
  '信号与系统基础学习计划': ['goals', 'roadmap', 'signals', 'systems', 'convolution', 'fourier', 'laplace', 'frequency', 'experiments', 'project', 'quiz'],
  'Go 入门指南': ['overview', 'setup', 'what-is-go', 'first-program', 'variables', 'types-format', 'control-flow', 'functions', 'errors', 'slices', 'maps', 'strings', 'structs', 'methods-pointers', 'interfaces', 'generics', 'goroutines', 'channels', 'stdlib', 'files-json', 'http', 'testing', 'debugging', 'modules', 'mistakes', 'project', 'build-deploy', 'faq', 'quiz', 'next'],
  'HTML 入门教程': ['overview', 'setup', 'what-is-html', 'skeleton', 'tags', 'attributes', 'media', 'forms', 'form-validation', 'semantic', 'seo', 'css', 'css-selectors', 'css-layout', 'responsive', 'js-intro', 'js-basics', 'js-dom', 'jsx-intro', 'ts-intro', 'react-tsx', 'react-native', 'debug', 'mistakes', 'project', 'deploy', 'faq', 'quiz', 'next'],
}

const lesson = (id: string, title: string, summary: string, anchors: string[]): Lesson => ({
  id,
  title,
  summary,
  anchors: anchors.map((anchor, index) => ({ id: anchorIdSets[title]?.[index] ?? `section-${index + 1}`, title: anchor })),
})

const courses: Course[] = [
  { id: 'math-foundations', title: '数学基础', description: '为电气工程建立扎实的数学工具箱。', route: 'engineering', sourcePath: '电气工程师/第一章-数学基础学习计划.html', icon: '∑', level: '基础', duration: '2 周', prerequisites: [], lessons: [lesson('overview', '数学基础学习计划', '函数、微积分与复数的工程应用。', ['概览与学习目标', '第 1 周：初等数学、函数与极限', '第 2 周：导数与微分', '第 3 周：积分与常微分方程', '第 4 周：线性代数、复数与积分变换', '自测与学习建议'])] },
  { id: 'circuit-basics', title: '电路基础', description: '从电压电流到常用电路定理。', route: 'engineering', sourcePath: '电气工程师/第二章-电路基础学习计划.html', icon: '⚡', level: '基础', duration: '3 周', prerequisites: ['数学基础'], lessons: [lesson('overview', '电路基础学习计划', '掌握直流与交流电路分析。', ['概览与学习目标', '第 1 周：基本元件与定律', '第 2 周：直流电路分析', '第 3 周：交流电路与相量法', '第 4 周：暂态分析与磁路', '工程实践与自测清单'])] },
  { id: 'signals-systems', title: '信号与系统', description: '理解信号表示、变换及系统响应。', route: 'engineering', sourcePath: '电气工程师/第三章-信号与系统基础学习计划.html', icon: '∿', level: '进阶', duration: '3 周', prerequisites: ['电路基础'], lessons: [lesson('overview', '信号与系统基础学习计划', '使用时域和频域方法分析系统。', ['本章定位与学习目标', '六周学习路线', '信号基础与分类', '系统及其基本性质', '卷积与冲激响应', '傅里叶级数、变换与采样', '拉普拉斯变换与传递函数', '频率响应与系统稳定性', '实验任务', '综合项目', '综合自测'])] },
  { id: 'go-intro', title: 'Go 入门', description: '用 Go 构建可靠、并发的程序。', route: 'programming', sourcePath: '编程语言入门/Go/Go入门指南.html', icon: '◉', level: '基础', duration: '2 周', prerequisites: [], lessons: [lesson('overview', 'Go 入门指南', '从语法到并发，完成第一个 Go 项目。', ['开始之前', '安装与环境', 'Go 是什么', '第一个程序', '变量与常量', '类型与输出', '条件与循环', '函数', '错误处理', '数组与切片', 'map 与集合', '字符串处理', '结构体', '方法与指针', '接口', '泛型', 'goroutine 并发', 'channel 通信', '标准库', '文件与 JSON', 'HTTP 与 Web 服务', '编写测试', '调试与工具', '模块与依赖', '初学者常见错误', '完整项目', '编译与发布', '常见疑问', '小测验', '下一步学习'])] },
  { id: 'html-web', title: 'HTML / Web 基础', description: '掌握语义化 HTML 与现代 Web 基础。', route: 'programming', sourcePath: '编程语言入门/HTML/HTML入门教程.html', icon: '◇', level: '基础', duration: '2 周', prerequisites: [], lessons: [lesson('overview', 'HTML 入门教程', '构建结构清晰、可访问的网页。', ['开始之前', '学习前的准备', 'HTML 是什么', '页面骨架', '常用标签', '属性', '图片与媒体', '表单', '表单校验', '语义化布局', 'SEO 与分享', '初见 CSS', '选择器与颜色', '盒模型与布局', '响应式设计', '初识 JavaScript', '变量、函数与事件', 'DOM 操作', 'JSX 入门', 'TypeScript 入门', 'TSX 与 React', 'React Native', '调试与工具', '常见错误', '完整案例', '部署上线', '常见疑问', '小测验', '下一步学习'])] },
]

const routeMeta: Omit<Route, 'courses'>[] = [
  { id: 'engineering', title: '电气工程师', description: '数学、电路与信号系统基础', icon: '⚡' },
  { id: 'programming', title: '编程语言入门', description: '从 Go 到 HTML/Web 的实践路径', icon: '⌘' },
]

export const catalog: Catalog = {
  courses,
  routes: routeMeta.map((route) => ({ ...route, courses: courses.filter((course) => course.route === route.id) })),
}

export const getCourse = (courseId?: string): Course | undefined => catalog.courses.find((course) => course.id === courseId)
export const getLesson = (courseId?: string, lessonId?: string): Lesson | undefined => getCourse(courseId)?.lessons.find((item) => item.id === lessonId)
export const getRoute = (routeId?: string): Route | undefined => catalog.routes.find((route) => route.id === routeId)

export function getAdjacentLesson(courseId: string, lessonId: string, direction: 'prev' | 'next') {
  const entries = catalog.courses.flatMap((course) => course.lessons.map((lesson) => ({ course, lesson })))
  const index = entries.findIndex((entry) => entry.course.id === courseId && entry.lesson.id === lessonId)
  if (index < 0) return undefined
  return entries[index + (direction === 'prev' ? -1 : 1)]
}
