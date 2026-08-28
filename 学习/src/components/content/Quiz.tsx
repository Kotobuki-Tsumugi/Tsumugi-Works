import { useState, type ReactNode } from 'react'
export type QuizOption = { id?: string; label: ReactNode; correct?: boolean }
export function Quiz({ question, options, answer, explanation }: { question: ReactNode; options: QuizOption[]; answer?: string; explanation?: ReactNode }) {
  const [selected, setSelected] = useState<string | number | null>(null)
  return <fieldset className="quiz"><legend>{question}</legend><div className="quiz-options">{options.map((option, i) => { const id = option.id ?? i; const isCorrect = answer !== undefined ? String(id) === String(answer) || String(i) === String(answer) : option.correct === true; const chosen = selected !== null && String(selected) === String(id); return <button key={String(id)} type="button" aria-pressed={chosen} className={chosen ? (isCorrect ? 'correct' : 'incorrect') : undefined} disabled={selected !== null} onClick={() => setSelected(id)}>{option.label}</button> })}</div>{selected !== null && explanation && <p className="quiz-explanation">{explanation}</p>}</fieldset>
}
