export default function AnswerOptions({ options, onSelect, result, correctName, disabled }) {
  return (
    <div className="w-full max-w-sm mx-auto mt-6 grid grid-cols-2 gap-3">
      {options.map((name) => {
        let style = 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:border-[#ed1d24] hover:bg-[#2a0000]'

        if (disabled) {
          if (name === correctName) {
            style = 'bg-green-900/50 border-green-500 text-green-300 scale-105'
          } else if (result === 'wrong' && name !== correctName) {
            style = 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-600 opacity-50'
          }
        }

        return (
          <button
            key={name}
            onClick={() => !disabled && onSelect(name)}
            disabled={disabled}
            className={`border-2 rounded-xl px-3 py-3 text-sm font-semibold
              transition-all duration-200 text-center leading-tight
              ${style}
              ${!disabled ? 'cursor-pointer active:scale-95' : 'cursor-default'}
            `}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
