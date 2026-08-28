import { useState, type ReactNode } from 'react'
import { MobileNav } from './MobileNav'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'

export function StudyLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return <div className="study-app">
    <TopBar onMenu={() => setMobileOpen(true)} />
    <div className="study-main">
      <SidebarNav />
      <main className="study-content">{children}</main>
    </div>
    <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
  </div>
}
