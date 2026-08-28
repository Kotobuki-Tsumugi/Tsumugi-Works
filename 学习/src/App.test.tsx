import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App smoke test', () => {
  test('renders the study center shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '学习中心' })).toBeInTheDocument()
  })
})
