import { useState, type ReactNode } from 'react'
import { MobileNav } from './MobileNav'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
import { BackToTop } from './behaviors/BackToTop'
import { PrintButton } from './behaviors/PrintButton'

export function StudyLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return <div className="study-app">
    <TopBar onMenu={() => setMobileOpen(true)} />
    <div className="study-main">
      <SidebarNav />
      <main className="study-content"><div className="study-actions"><PrintButton /></div>{children}</main>
    </div>
    <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    <BackToTop />
  </div>
}
