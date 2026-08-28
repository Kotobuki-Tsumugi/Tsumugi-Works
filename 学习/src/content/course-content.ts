import type { LessonAnchor } from '../data/types'
import { getLegacyBody, type LegacyCourseId } from './legacy-html'

export type CourseContent = {
  html: string
  anchors: LessonAnchor[]
  sourcePath: string
}

type ContentDefinition = {
  sourcePath: string
  anchors: Array<[id: string, title: string]>
  quiz?: QuizDefinition[]
}

type QuizDefinition = {
  id: string
  question: string
  options: Array<[label: string, correct?: boolean]>
  answer: string
}

const definitions: Record<LegacyCourseId, ContentDefinition> = {
  'math-foundations': {
    sourcePath: '电气工程师/第一章-数学基础学习计划.html',
    anchors: [
      ['math-overview', '概览与学习目标'],
      ['math-week1', '第 1 周：初等数学、函数与极限'],
      ['math-week2', '第 2 周：导数与微分'],
      ['math-week3', '第 3 周：积分与常微分方程'],
      ['math-week4', '第 4 周：线性代数、复数与积分变换'],
      ['math-check', '自测与学习建议'],
    ],
  },
  'circuit-basics': {
    sourcePath: '电气工程师/第二章-电路基础学习计划.html',
    anchors: [
      ['circuit-overview', '概览与学习目标'],
      ['circuit-week1', '第 1 周：基本元件与定律'],
      ['circuit-week2', '第 2 周：直流电路分析'],
      ['circuit-week3', '第 3 周：交流电路与相量法'],
      ['circuit-week4', '第 4 周：暂态分析与磁路'],
      ['circuit-check', '工程实践与自测清单'],
    ],
  },
  'signals-systems': {
    sourcePath: '电气工程师/第三章-信号与系统基础学习计划.html',
    anchors: [
      ['goals', '本章定位与学习目标'],
      ['roadmap', '六周学习路线'],
      ['signals', '信号基础与分类'],
      ['systems', '系统及其基本性质'],
      ['convolution', '卷积与冲激响应'],
      ['fourier', '傅里叶级数、变换与采样'],
      ['laplace', '拉普拉斯变换与传递函数'],
      ['frequency', '频率响应与系统稳定性'],
      ['experiments', '实验任务'],
      ['project', '综合项目'],
      ['quiz', '综合自测'],
    ],
  },
  'go-intro': {
    sourcePath: '编程语言入门/Go/Go入门指南.html',
    anchors: [
      ['overview', '开始之前'], ['setup', '安装与环境'], ['what-is-go', 'Go 是什么'],
      ['first-program', '第一个程序'], ['variables', '变量与常量'], ['types-format', '类型与输出'],
      ['control-flow', '条件与循环'], ['functions', '函数'], ['errors', '错误处理'],
      ['slices', '数组与切片'], ['maps', 'map 与集合'], ['strings', '字符串处理'],
      ['structs', '结构体'], ['methods-pointers', '方法与指针'], ['interfaces', '接口'],
      ['generics', '泛型'], ['goroutines', 'goroutine 并发'], ['channels', 'channel 通信'],
      ['stdlib', '标准库'], ['files-json', '文件与 JSON'], ['http', 'HTTP 与 Web 服务'],
      ['testing', '编写测试'], ['debugging', '调试与工具'], ['modules', '模块与依赖'],
      ['mistakes', '初学者常见错误'], ['project', '完整项目'], ['build-deploy', '编译与发布'],
      ['faq', '常见疑问'], ['quiz', '小测验'], ['next', '下一步学习'],
    ],
    quiz: [
      { id: 'go-q1', question: 'Go 程序从哪里开始执行？', options: [['main() 函数', true], ['start() 函数'], ['文件第一行']], answer: '程序从 main 包里的 main() 函数开始执行。' },
      { id: 'go-q2', question: '函数内部声明并赋值变量最常用的写法是？', options: [['var x = 5'], ['x := 5', true], ['def x = 5']], answer: ':= 是短声明，一步完成声明与赋值。' },
      { id: 'go-q3', question: '启动一个 goroutine 的正确方式是？', options: [['thread 函数()'], ['go 函数()', true], ['async 函数()']], answer: '在函数调用前加 go 关键字即可并发执行。' },
    ],
  },
  'html-web': {
    sourcePath: '编程语言入门/HTML/HTML入门教程.html',
    anchors: [
      ['overview', '开始之前'], ['setup', '学习前的准备'], ['what-is-html', 'HTML 是什么'],
      ['skeleton', '页面骨架'], ['tags', '常用标签'], ['attributes', '属性'],
      ['media', '图片与媒体'], ['forms', '表单'], ['form-validation', '表单校验'],
      ['semantic', '语义化布局'], ['seo', 'SEO 与分享'], ['css', '初见 CSS'],
      ['css-selectors', '选择器与颜色'], ['css-layout', '盒模型与布局'], ['responsive', '响应式设计'],
      ['js-intro', '初识 JavaScript'], ['js-basics', '变量、函数与事件'], ['js-dom', 'DOM 操作'],
      ['jsx-intro', 'JSX 入门'], ['ts-intro', 'TypeScript 入门'], ['react-tsx', 'TSX 与 React'],
      ['react-native', 'React Native'], ['debug', '调试与工具'], ['mistakes', '常见错误'],
      ['project', '完整案例'], ['deploy', '部署上线'], ['faq', '常见疑问'],
      ['quiz', '小测验'], ['next', '下一步学习'],
    ],
    quiz: [
      { id: 'html-q1', question: 'HTML 是什么？', options: [['一种编程语言'], ['一种标记语言', true], ['一种数据库']], answer: 'HTML 是超文本标记语言，用标签描述网页结构。' },
      { id: 'html-q2', question: '哪一行能让中文在浏览器里正常显示？', options: [['<meta charset="UTF-8">', true], ['<meta language="Chinese">'], ['<title>中文</title>']], answer: 'charset="UTF-8" 声明网页使用 UTF-8 编码。' },
      { id: 'html-q3', question: '下面哪个属于语义化标签？', options: [['<div>'], ['<span>'], ['<article>', true]], answer: 'article、header、main 等标签能表达内容含义。' },
    ],
  },
}

function toAnchors(definition: ContentDefinition): LessonAnchor[] {
  return definition.anchors.map(([id, title]) => ({ id, title }))
}

function quizMarkup(items: QuizDefinition[]): string {
  return items.map((item) => `<div class="quiz-question"><h4>${item.question}</h4><div class="quiz-options">${item.options.map(([label, correct]) => `<button type="button" class="quiz-option" data-react-quiz="${item.id}" data-correct="${correct ? '1' : '0'}">${label}</button>`).join('')}</div><p class="quiz-answer" id="${item.id}-answer">${item.answer}</p></div>`).join('')
}

function injectQuiz(body: string, items: QuizDefinition[] | undefined): string {
  if (!items?.length) return body
  const markup = quizMarkup(items)
  if (/<div\b[^>]*id=["']quizRoot["'][^>]*>/i.test(body)) {
    return body.replace(/(<div\b[^>]*id=["']quizRoot["'][^>]*>)/i, `$1${markup}`)
  }
  return `${body}<section id="quiz"><h2>小测验</h2>${markup}</section>`
}

export const courseContent: Record<LegacyCourseId, CourseContent> = Object.fromEntries(
  (Object.entries(definitions) as Array<[LegacyCourseId, ContentDefinition]>).map(([id, definition]) => [
    id,
    {
      html: injectQuiz(getLegacyBody(id), definition.quiz),
      anchors: toAnchors(definition),
      sourcePath: definition.sourcePath,
    },
  ]),
) as Record<LegacyCourseId, CourseContent>

export function getCourseContent(courseId?: string): CourseContent | undefined {
  return courseId && courseId in courseContent ? courseContent[courseId as LegacyCourseId] : undefined
}
