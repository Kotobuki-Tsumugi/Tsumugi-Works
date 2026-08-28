export default function App() {
  return (
    <div className="study-app">
      <header className="study-header">
        <a className="brand" href="/">学习中心</a>
        <span className="header-kicker">循序渐进，构建知识体系</span>
      </header>
      <main className="study-main">
        <aside className="study-sidebar" aria-label="学习路线">
          <p className="sidebar-label">学习路线</p>
          <nav>
            <a href="#engineering">电气工程师</a>
            <a href="#programming">编程语言入门</a>
          </nav>
        </aside>
        <section className="study-content" aria-labelledby="welcome-title">
          <p className="eyebrow">欢迎回来</p>
          <h1 id="welcome-title">学习中心</h1>
          <p className="lead">选择一条学习路线，按章节掌握从基础到实践的完整知识。</p>
          <div className="route-grid">
            <article id="engineering" className="route-card">
              <span className="route-icon" aria-hidden="true">⚡</span>
              <h2>电气工程师</h2>
              <p>数学、电路与信号系统基础</p>
            </article>
            <article id="programming" className="route-card">
              <span className="route-icon" aria-hidden="true">⌘</span>
              <h2>编程语言入门</h2>
              <p>从 Go 到 HTML/Web 的实践路径</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
