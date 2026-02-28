export default function WelcomeScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f0f] px-4">
      {/* Logo / Title */}
      <div className="mb-2 text-center">
        <h1 className="font-bangers text-7xl md:text-9xl tracking-widest text-[#ed1d24] drop-shadow-[0_0_20px_rgba(237,29,36,0.6)]">
          MARVEL<span className="text-white">ME</span>
        </h1>
        <p className="text-[#f5c518] font-bangers text-2xl tracking-widest mt-1">
          GUESS THE HERO
        </p>
      </div>

      {/* Rules Card */}
      <div className="mt-10 max-w-md w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bangers text-2xl text-white tracking-wider mb-4">HOW TO PLAY</h2>
        <ul className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">①</span>
            <span>A blurred hero image is shown with <strong className="text-white">4 name choices</strong>.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">②</span>
            <span>Use up to <strong className="text-white">3 hints</strong> to reveal clues — but each hint costs you a point.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">③</span>
            <span>Score <strong className="text-[#f5c518]">3 pts</strong> with no hints · <strong className="text-[#f5c518]">2 pts</strong> · <strong className="text-[#f5c518]">1 pt</strong> · <strong className="text-gray-400">0 pts</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">④</span>
            <span>Complete <strong className="text-white">10 rounds</strong> then see your final grade!</span>
          </li>
        </ul>

        {/* Hint legend */}
        <div className="mt-5 pt-4 border-t border-[#2a2a2a] grid grid-cols-3 gap-2 text-xs text-center text-gray-400">
          <div>
            <div className="text-[#ed1d24] font-semibold mb-1">Hint 1</div>
            First appearance &amp; publisher
          </div>
          <div>
            <div className="text-[#ed1d24] font-semibold mb-1">Hint 2</div>
            Power stats chart
          </div>
          <div>
            <div className="text-[#ed1d24] font-semibold mb-1">Hint 3</div>
            Real name revealed
          </div>
        </div>
      </div>

      <button
        onClick={onStart}
        className="mt-8 font-bangers text-3xl tracking-widest px-12 py-4 rounded-xl
          bg-[#ed1d24] hover:bg-[#ff2d35] active:scale-95
          text-white shadow-[0_0_20px_rgba(237,29,36,0.5)]
          transition-all duration-150"
      >
        START GAME
      </button>

      <p className="mt-6 text-xs text-gray-600">
        Powered by superheroapi.com
      </p>
    </div>
  )
}
