import { useRef, useCallback } from 'react'

export default function AnswerOptions({ options, onSelect, result, correctName, disabled }) {
  return (
    <div className="w-full max-w-sm mx-auto mt-6 grid grid-cols-2 gap-3" role="group" aria-label="Answer choices">
      {options.map((option) => {
        const isCorrect = option.name === correctName
        return (
          <OptionButton
            key={option.name}
            option={option}
            isCorrect={isCorrect}
            disabled={disabled}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}

function OptionButton({ option, isCorrect, disabled, onSelect }) {
  const btnRef = useRef(null)
  const rippleRef = useRef(null)

  const handleClick = useCallback((e) => {
    if (disabled) return

    const btn = btnRef.current
    const ripple = rippleRef.current
    if (btn && ripple) {
      const rect = btn.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.classList.remove('animate-[ripple_0.5s_ease-out]')
      void ripple.offsetWidth
      ripple.classList.add('animate-[ripple_0.5s_ease-out]')
    }

    onSelect(option.name)
  }, [disabled, onSelect, option.name])

  let borderStyle = 'border-[#2a2a2a]'
  if (disabled) {
    borderStyle = isCorrect ? 'border-green-500 scale-105' : 'border-[#2a2a2a] opacity-50'
  }

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      className={`relative border-2 rounded-xl overflow-hidden transition-all duration-200
        bg-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c518]
        ${borderStyle}
        ${!disabled
          ? 'cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(237,29,36,0.3)] hover:border-[#ed1d24] animate-breathe'
          : 'cursor-default'
        }`}
    >
      <img
        src={option.image?.url}
        alt={option.name}
        className="w-full aspect-square object-cover object-top"
      />
      <p className="text-sm font-semibold text-center text-white pt-2 pb-2 px-1 leading-tight">
        {disabled && isCorrect && <span aria-hidden="true">&#x2714; </span>}
        {disabled && !isCorrect && <span aria-hidden="true">&#x2718; </span>}
        {option.name}
      </p>
      <span
        ref={rippleRef}
        className="absolute w-0 h-0 rounded-full bg-white/20 pointer-events-none
          -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: 0 }}
      />
    </button>
  )
}
