import { playCorrect, playWrong } from '../services/sounds'

export default function AnswerOptions({ options, onSelect, result, correctName, disabled }) {
  return (
    <div className="w-full max-w-sm mx-auto mt-6 grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isCorrect = option.name === correctName

        let borderStyle = 'border-[#2a2a2a] hover:border-[#ed1d24]'
        let overlayStyle = ''

        if (disabled) {
          if (isCorrect) {
            borderStyle = 'border-green-500 scale-105'
          } else {
            borderStyle = 'border-[#2a2a2a] opacity-50'
          }
        }

        return (
          <button
            key={option.name}
            onClick={() => {
              if (!disabled) {
                isCorrect ? playCorrect() : playWrong()
                onSelect(option.name)
              }
            }}
            disabled={disabled}
            className={`border-2 rounded-xl overflow-hidden transition-all duration-200
              bg-[#1a1a1a]
              ${borderStyle}
              ${!disabled ? 'cursor-pointer active:scale-95' : 'cursor-default'}
              ${overlayStyle}
            `}
          >
            <img
              src={option.image?.url}
              alt={option.name}
              className="w-full aspect-square object-cover object-top"
            />
            <p className="text-sm font-semibold text-center text-white pt-2 pb-2 px-1 leading-tight">
              {option.name}
            </p>
          </button>
        )
      })}
    </div>
  )
}
