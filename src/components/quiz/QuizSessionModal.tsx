'use client'

import { useState, useMemo, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Check, X, RotateCcw, CheckCircle2 } from 'lucide-react'

export interface QuizQuestion {
  question: string
  answer: string
  type: 'mcq' | 'short_answer'
  options?: string[]
  explanation?: string
}

interface QuestionAttempt {
  question: QuizQuestion
  userAnswer: string
  isCorrect: boolean
}

export interface QuizSessionModalProps {
  open: boolean
  onClose: () => void
  questions: QuizQuestion[]
  noteTitle?: string
  onRetryFull?: () => void
}

export default function QuizSessionModal({
  open,
  onClose,
  questions,
  noteTitle,
}: QuizSessionModalProps) {
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [shortAnswerText, setShortAnswerText] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [selfAssessmentCorrect, setSelfAssessmentCorrect] = useState<boolean | null>(null)
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([])
  const [isFinished, setIsFinished] = useState(false)

  // Reset state when modal opens or questions prop updates
  useEffect(() => {
    if (open) {
      setActiveQuestions(questions || [])
      setCurrentIndex(0)
      setSelectedOption('')
      setShortAnswerText('')
      setIsSubmitted(false)
      setSelfAssessmentCorrect(null)
      setAttempts([])
      setIsFinished(false)
    }
  }, [open, questions])

  const currentQuestion = activeQuestions[currentIndex]
  const isMcq = currentQuestion?.type === 'mcq' && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0
  const isLastQuestion = currentIndex + 1 >= activeQuestions.length

  const handleSubmitMcq = () => {
    if (!selectedOption || isSubmitted) return
    setIsSubmitted(true)
  }

  const handleSubmitShortAnswer = () => {
    if (!shortAnswerText.trim() || isSubmitted) return
    setIsSubmitted(true)
  }

  const handleSkipShortAnswer = () => {
    if (isSubmitted) return
    setShortAnswerText('(No response provided)')
    setIsSubmitted(true)
  }

  const handleAdvance = () => {
    if (!currentQuestion) return

    let isCorrect = false
    let recordedAnswer = ''

    if (isMcq) {
      recordedAnswer = selectedOption
      isCorrect = selectedOption === currentQuestion.answer
    } else {
      recordedAnswer = shortAnswerText.trim() || '(No response provided)'
      isCorrect = Boolean(selfAssessmentCorrect)
    }

    const nextAttempts = [
      ...attempts,
      {
        question: currentQuestion,
        userAnswer: recordedAnswer,
        isCorrect,
      },
    ]
    setAttempts(nextAttempts)

    if (isLastQuestion) {
      setIsFinished(true)
    } else {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption('')
      setShortAnswerText('')
      setIsSubmitted(false)
      setSelfAssessmentCorrect(null)
    }
  }

  const handleRetryMissed = () => {
    const missed = attempts.filter((a) => !a.isCorrect).map((a) => a.question)
    if (missed.length === 0) return
    setActiveQuestions(missed)
    setCurrentIndex(0)
    setSelectedOption('')
    setShortAnswerText('')
    setIsSubmitted(false)
    setSelfAssessmentCorrect(null)
    setAttempts([])
    setIsFinished(false)
  }

  const handleTryAgain = () => {
    setActiveQuestions(questions || [])
    setCurrentIndex(0)
    setSelectedOption('')
    setShortAnswerText('')
    setIsSubmitted(false)
    setSelfAssessmentCorrect(null)
    setAttempts([])
    setIsFinished(false)
  }

  // Summary statistics for finished state
  const totalQuestions = attempts.length
  const correctCount = attempts.filter((a) => a.isCorrect).length
  const incorrectCount = totalQuestions - correctCount
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const missedAttempts = useMemo(() => attempts.filter((a) => !a.isCorrect), [attempts])

  const modalTitle = noteTitle ? `Quiz: ${noteTitle}` : 'Interactive Quiz'

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      {activeQuestions.length === 0 ? (
        <div className="mx-auto max-w-xl py-6 text-center">
          <p className="app-notes-muted text-sm">No quiz questions available.</p>
          <button type="button" onClick={onClose} className="app-notes-primary-button mt-4">
            Close
          </button>
        </div>
      ) : isFinished ? (
        <div className="mx-auto max-w-xl space-y-6 py-2">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-[var(--wzdm-text)]">Quiz Complete</h3>
            <p className="app-notes-muted mt-1 text-sm">Here is how you performed on this session.</p>
          </div>

          <div className="app-notes-surface p-5 text-center sm:p-6">
            <div className="text-4xl font-extrabold tabular-nums text-[var(--wzdm-text)]">{percentage}%</div>
            <p className="mt-1 text-sm font-medium text-[var(--wzdm-text)]">
              {correctCount} of {totalQuestions} questions correct
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold">
              <span className="text-emerald-700 dark:text-emerald-400">{correctCount} correct</span>
              <span className="app-notes-muted">&bull;</span>
              <span className="text-red-700 dark:text-red-400">{incorrectCount} incorrect</span>
            </div>
          </div>

          {incorrectCount > 0 ? (
            <section aria-labelledby="mistakes-review-heading" className="space-y-3">
              <h4 id="mistakes-review-heading" className="text-sm font-semibold text-[var(--wzdm-text)]">
                Review mistakes ({incorrectCount})
              </h4>
              <div className="space-y-3">
                {missedAttempts.map((attempt, idx) => (
                  <article key={idx} className="app-notes-surface space-y-2.5 p-4 text-sm">
                    <p className="font-medium text-[var(--wzdm-text)] leading-relaxed">
                      {attempt.question.question}
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <p className="text-red-700 dark:text-red-300">
                        <span className="font-semibold">Your answer:</span> {attempt.userAnswer}
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-300">
                        <span className="font-semibold">Correct answer:</span> {attempt.question.answer}
                      </p>
                      {attempt.question.explanation && (
                        <p className="app-notes-muted leading-relaxed">
                          <span className="font-semibold text-[var(--wzdm-text)]">Explanation:</span>{' '}
                          {attempt.question.explanation}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="app-notes-surface p-6 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h4 className="mt-2 text-sm font-semibold text-[var(--wzdm-text)]">All answers correct</h4>
              <p className="app-notes-muted mt-1 text-xs">You nailed every question in this quiz.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {incorrectCount > 0 && (
              <button
                type="button"
                onClick={handleRetryMissed}
                className="app-notes-primary-button"
              >
                <RotateCcw size={15} aria-hidden="true" />
                Retry missed questions
              </button>
            )}
            <button
              type="button"
              onClick={handleTryAgain}
              className={incorrectCount > 0 ? 'app-notes-control px-4 text-sm font-semibold hover:bg-[var(--wzdm-subtle)]' : 'app-notes-primary-button'}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-notes-control px-4 text-sm font-semibold hover:bg-[var(--wzdm-subtle)]"
            >
              Done
            </button>
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="mx-auto max-w-xl space-y-5 py-1 sm:space-y-6">
          {/* Progress bar and counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-[var(--wzdm-text)]">
              <span>Question {currentIndex + 1} of {activeQuestions.length}</span>
              <span className="app-notes-tag uppercase tracking-wider font-semibold">
                {isMcq ? 'Multiple choice' : 'Short answer'}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={1}
              aria-valuemax={activeQuestions.length}
              aria-valuenow={currentIndex + 1}
              className="h-1.5 overflow-hidden rounded-full bg-[var(--wzdm-subtle)]"
            >
              <div
                className="h-full rounded-full bg-[var(--wzdm-accent)] transition-all duration-150"
                style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question text */}
          <section aria-labelledby="question-text-title" className="app-notes-surface overflow-hidden">
            <div className="p-5 sm:p-6">
              <p className="app-notes-muted text-xs font-semibold uppercase tracking-wide">Question</p>
              <h3
                id="question-text-title"
                className="mt-3 whitespace-pre-wrap text-base font-semibold leading-relaxed text-[var(--wzdm-text)] sm:text-lg"
              >
                {currentQuestion.question}
              </h3>
            </div>

            {/* MCQ Options */}
            {isMcq && currentQuestion.options && (
              <div
                className="space-y-2.5 px-5 pb-5 sm:px-6 sm:pb-6"
                role="radiogroup"
                aria-labelledby="question-text-title"
              >
                {currentQuestion.options.map((option, idx) => {
                  const optionLetter = String.fromCharCode(65 + idx)
                  const isSelected = selectedOption === option
                  const isCorrect = option === currentQuestion.answer
                  const isWrong = isSubmitted && isSelected && !isCorrect
                  const isRevealedCorrect = isSubmitted && isCorrect

                  let btnStyle =
                    'app-notes-control flex w-full items-center justify-between gap-3 p-3.5 text-left text-sm font-medium transition-colors'

                  if (isSubmitted) {
                    btnStyle += ' cursor-default'
                    if (isRevealedCorrect) {
                      btnStyle +=
                        ' border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                    } else if (isWrong) {
                      btnStyle +=
                        ' border-red-500 bg-red-50/70 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                    } else {
                      btnStyle += ' opacity-60'
                    }
                  } else {
                    if (isSelected) {
                      btnStyle +=
                        ' border-[var(--wzdm-accent)] bg-[var(--wzdm-subtle)] text-[var(--wzdm-text)] ring-1 ring-[var(--wzdm-accent)]'
                    } else {
                      btnStyle += ' hover:bg-[var(--wzdm-subtle)]'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isSubmitted}
                      onClick={() => setSelectedOption(option)}
                      className={btnStyle}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isRevealedCorrect
                              ? 'bg-emerald-600 text-white'
                              : isWrong
                              ? 'bg-red-600 text-white'
                              : isSelected
                              ? 'bg-[var(--wzdm-accent)] text-white dark:text-[#18181b]'
                              : 'bg-[var(--wzdm-subtle)] text-[var(--wzdm-muted)]'
                          }`}
                        >
                          {optionLetter}
                        </span>
                        <span className="break-words">{option}</span>
                      </div>
                      {isRevealedCorrect && (
                        <Check
                          size={18}
                          className="shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-label="Correct option"
                        />
                      )}
                      {isWrong && (
                        <X
                          size={18}
                          className="shrink-0 text-red-600 dark:text-red-400"
                          aria-label="Incorrect option"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Short Answer Input / Display */}
            {!isMcq && (
              <div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
                {!isSubmitted ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="short-answer-input"
                      className="app-notes-muted text-xs font-medium"
                    >
                      Type your answer before revealing the reference answer:
                    </label>
                    <textarea
                      id="short-answer-input"
                      value={shortAnswerText}
                      onChange={(e) => setShortAnswerText(e.target.value)}
                      disabled={isSubmitted}
                      rows={3}
                      placeholder="Type your response here..."
                      className="app-notes-control w-full p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wzdm-accent)]"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md border border-[var(--wzdm-border)] bg-[var(--wzdm-subtle)] p-3 text-sm">
                      <span className="app-notes-muted block text-xs font-semibold uppercase tracking-wider">
                        Your attempt
                      </span>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--wzdm-text)]">
                        {shortAnswerText.trim() || '(No response entered)'}
                      </p>
                    </div>
                    <div className="rounded-md border border-emerald-300 bg-emerald-50/80 p-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Reference answer
                      </span>
                      <p className="mt-1 whitespace-pre-wrap font-medium text-emerald-950 dark:text-emerald-100">
                        {currentQuestion.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Explanation section if submitted */}
            {isSubmitted && currentQuestion.explanation && (
              <div className="border-t border-[var(--wzdm-border)] bg-[var(--wzdm-subtle)] p-4 sm:p-5">
                <span className="app-notes-muted block text-xs font-semibold uppercase tracking-wider">
                  Explanation
                </span>
                <p className="mt-1 text-sm leading-relaxed text-[var(--wzdm-text)]">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
          </section>

          {/* Short Answer Self-Assessment Controls */}
          {!isMcq && isSubmitted && (
            <section aria-labelledby="self-assessment-label" className="app-notes-surface space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h4 id="self-assessment-label" className="text-sm font-semibold text-[var(--wzdm-text)]">
                    Self-assessment: Did you get this right?
                  </h4>
                  <p className="app-notes-muted mt-0.5 text-xs">
                    Compare your attempt with the reference answer above to grade your recall.
                  </p>
                </div>
                {selfAssessmentCorrect !== null && (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                      selfAssessmentCorrect
                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {selfAssessmentCorrect ? (
                      <>
                        <Check size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>Marked as correct</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw size={13} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <span>Marked for review</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelfAssessmentCorrect(true)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-[7px] border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wzdm-accent)] ${
                    selfAssessmentCorrect === true
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : selfAssessmentCorrect === false
                      ? 'border-[var(--wzdm-border)] bg-[var(--wzdm-surface)] text-[var(--wzdm-muted)] opacity-50 hover:opacity-80'
                      : 'border-[var(--wzdm-border)] bg-[var(--wzdm-surface)] text-[var(--wzdm-text)] hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                  }`}
                  aria-pressed={selfAssessmentCorrect === true}
                >
                  <Check size={16} aria-hidden="true" />
                  Got it right
                </button>
                <button
                  type="button"
                  onClick={() => setSelfAssessmentCorrect(false)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-[7px] border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wzdm-accent)] ${
                    selfAssessmentCorrect === false
                      ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                      : selfAssessmentCorrect === true
                      ? 'border-[var(--wzdm-border)] bg-[var(--wzdm-surface)] text-[var(--wzdm-muted)] opacity-50 hover:opacity-80'
                      : 'border-[var(--wzdm-border)] bg-[var(--wzdm-surface)] text-[var(--wzdm-text)] hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                  aria-pressed={selfAssessmentCorrect === false}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  Need more practice
                </button>
              </div>
            </section>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {!isSubmitted ? (
              <div className="flex flex-wrap items-center gap-3">
                {isMcq ? (
                  <button
                    type="button"
                    disabled={!selectedOption}
                    onClick={handleSubmitMcq}
                    className="app-notes-primary-button disabled:opacity-50"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!shortAnswerText.trim()}
                      onClick={handleSubmitShortAnswer}
                      className="app-notes-primary-button disabled:opacity-50"
                    >
                      Submit &amp; Check Answer
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipShortAnswer}
                      className="app-notes-control px-3 text-xs font-medium app-notes-muted hover:text-[var(--wzdm-text)]"
                    >
                      I don&apos;t know / Reveal
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!isMcq && selfAssessmentCorrect === null}
                  onClick={handleAdvance}
                  className="app-notes-primary-button disabled:opacity-50"
                >
                  {isLastQuestion ? 'View Results' : 'Next Question'}
                </button>
                {!isMcq && selfAssessmentCorrect === null && (
                  <span className="app-notes-muted text-xs">
                    Please select an assessment option above to continue.
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="app-notes-control px-3 text-xs font-medium app-notes-muted hover:text-[var(--wzdm-text)]"
            >
              Exit session
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
