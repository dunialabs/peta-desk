export function DisconnectIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <div className="relative inline-flex items-center justify-center w-6 h-6">
      {isHovered && (
        <div className="absolute inset-0 rounded bg-black opacity-5" />
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`relative z-10 ${className}`}
      >
        <path
          d="M8.63098 5.34351L6.03824 2.75078C5.08361 1.79616 3.56778 1.76428 2.65248 2.67958C1.73718 3.59488 1.76906 5.11071 2.72368 6.06534L5.31641 8.65808"
          stroke={isHovered ? "#FF3B30" : "black"}
          strokeOpacity={isHovered ? "1" : "0.5"}
          strokeWidth="1.33"
          strokeLinejoin="round"
        />
        <path
          d="M10.6388 7.35693L13.2315 9.94967C14.1861 10.9043 14.3098 12.3745 13.3027 13.3354C12.2957 14.2964 10.8716 14.2188 9.91695 13.2642L7.32422 10.6715"
          stroke={isHovered ? "#FF3B30" : "black"}
          strokeOpacity={isHovered ? "1" : "0.5"}
          strokeWidth="1.33"
          strokeLinejoin="round"
        />
        <path
          d="M7.07957 7.02537L5.7832 5.729"
          stroke={isHovered ? "#FF3B30" : "black"}
          strokeOpacity={isHovered ? "1" : "0.5"}
          strokeWidth="1.33"
          strokeLinejoin="round"
        />
        <path
          d="M10.1045 10.05L8.80811 8.75366"
          stroke={isHovered ? "#FF3B30" : "black"}
          strokeOpacity={isHovered ? "1" : "0.5"}
          strokeWidth="1.33"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
