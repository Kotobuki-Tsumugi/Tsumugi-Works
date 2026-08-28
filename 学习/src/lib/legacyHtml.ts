/** Remove unsafe/legacy page chrome before rendering imported lesson markup. */
export function legacyHtml(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<button[^>]*(?:print|top|theme|dark)[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<nav[^>]*class=["'][^"']*(?:navbar|navigation|sidebar)[^"']*["'][^>]*>[\s\S]*?<\/nav>/gi, '')
}
