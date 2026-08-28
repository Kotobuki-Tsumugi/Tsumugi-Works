import type { ReactNode } from 'react'
export function DataTable({ headers, rows, caption }: { headers: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return <div className="data-table-wrapper"><table className="data-table">{caption && <caption>{caption}</caption>}<thead><tr>{headers.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>
}
