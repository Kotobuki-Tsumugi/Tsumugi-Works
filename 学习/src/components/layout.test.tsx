import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudyLayout } from './StudyLayout'

describe('StudyLayout', () => {
  it('renders route A shell with navigation and content', () => {
    render(
      <MemoryRouter>
        <StudyLayout>
          <h1>测试内容</h1>
        </StudyLayout>
      </MemoryRouter>,
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '学习路线' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '测试内容' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /打印/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /回到顶部/ })).not.toBeInTheDocument()
  })
})
