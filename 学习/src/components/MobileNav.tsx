import { SidebarNav } from './SidebarNav'

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <div className="mobile-nav-overlay" role="presentation" onClick={onClose}>
    <div className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="学习路线" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="mobile-nav-close" onClick={onClose} aria-label="关闭学习路线">×</button>
      <SidebarNav onNavigate={onClose} />
    </div>
  </div>
}
