const BLUR_LEVELS = [20, 12, 6, 0] // indexed by hintsUsed; 0 = no hints yet

export default function HeroImage({ hero, hintsUsed, revealed }) {
  const blur = revealed ? 0 : BLUR_LEVELS[Math.min(hintsUsed, 3)]

  return (
    <div className="relative mx-auto w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden
      shadow-[0_0_0_3px_#ed1d24,0_0_20px_6px_rgba(237,29,36,0.4)]
      animate-shimmer"
    >
      <img
        src={hero.image?.url}
        alt={revealed ? hero.name : '???'}
        className="w-full h-full object-cover object-top transition-all duration-700"
        style={{ filter: `blur(${blur}px)`, transform: blur > 0 ? 'scale(1.12)' : 'scale(1)' }}
        draggable={false}
      />

      {!revealed && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-xs font-semibold bg-black/70 text-gray-300 px-3 py-1 rounded-full">
            {hintsUsed === 0 ? 'Who is this hero?' : `${3 - hintsUsed} hint${3 - hintsUsed !== 1 ? 's' : ''} remaining`}
          </span>
        </div>
      )}
    </div>
  )
}
