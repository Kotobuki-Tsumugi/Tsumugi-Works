import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

describe('App smoke test', () => {
  test('renders the study center shell', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('学习中心')
  })
})
