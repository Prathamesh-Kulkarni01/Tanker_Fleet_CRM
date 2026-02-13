export function TruckMarker({ rotation }: { rotation: number }) {
  return (
    <div
      style={{ transform: `rotate(${rotation}deg)` }}
      className="transition-transform duration-500"
    >
      <div className="relative">
        {/* Pulsing circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-12 w-12 rounded-full bg-blue-500/30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-blue-500/20"></div>
        </div>

        {/* Truck Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative z-10 rounded-full bg-blue-600 p-1.5 shadow-lg"
        >
          <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
          <path d="M14 9h4l4 4v4h-8v-4h-4V9Z" />
          <circle cx="7.5" cy="18.5" r="2.5" />
          <circle cx="17.5" cy="18.5" r="2.5" />
        </svg>
      </div>
    </div>
  );
}
