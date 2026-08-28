import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StudyLayout } from './components/StudyLayout'
import { CourseOverviewPage } from './pages/CourseOverviewPage'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return <BrowserRouter><StudyLayout><Routes><Route path="/" element={<HomePage />} /><Route path="/course/:courseId" element={<CourseOverviewPage />} /><Route path="/course/:courseId/lesson/:lessonId" element={<LessonPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></StudyLayout></BrowserRouter>
}
