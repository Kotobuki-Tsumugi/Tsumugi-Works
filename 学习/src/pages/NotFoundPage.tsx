import { Link } from 'react-router-dom'
export function NotFoundPage({ message = '你访问的学习内容不存在。' }: { message?: string }) {
  return <><h1>页面未找到</h1><p className="lead">{message}</p><Link className="button" to="/">返回学习中心</Link></>
}
