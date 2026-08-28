import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarNav } from './SidebarNav'

describe('SidebarNav', () => {
  it('renders every catalog route and its course links', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SidebarNav />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: '学习路线' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '电气工程师' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '编程语言入门' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /数学基础/ })).toHaveAttribute('href', '/course/math-foundations')
    expect(screen.getByRole('link', { name: /HTML \/ Web 基础/ })).toHaveAttribute('href', '/course/html-web')
  })
})
