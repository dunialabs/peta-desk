export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin text-gray-900 dark:text-gray-100 ${className}`}
    >
      <rect x="6.125" width="1.75" height="4.375" rx="0.875" fill="currentColor" fillOpacity="0.8"/>
      <rect x="11.3311" y="1.4314" width="1.75" height="4.375" rx="0.875" transform="rotate(45 11.3311 1.4314)" fill="currentColor" fillOpacity="0.1"/>
      <rect x="14" y="6.125" width="1.75" height="4.375" rx="0.875" transform="rotate(90 14 6.125)" fill="currentColor" fillOpacity="0.2"/>
      <rect x="12.5686" y="11.3311" width="1.75" height="4.375" rx="0.875" transform="rotate(135 12.5686 11.3311)" fill="currentColor" fillOpacity="0.3"/>
      <rect x="7.875" y="14" width="1.75" height="4.375" rx="0.875" transform="rotate(180 7.875 14)" fill="currentColor" fillOpacity="0.4"/>
      <rect x="2.66895" y="12.5686" width="1.75" height="4.375" rx="0.875" transform="rotate(-135 2.66895 12.5686)" fill="currentColor" fillOpacity="0.5"/>
      <rect y="7.875" width="1.75" height="4.375" rx="0.875" transform="rotate(-90 0 7.875)" fill="currentColor" fillOpacity="0.6"/>
      <rect x="1.4314" y="2.66895" width="1.75" height="4.375" rx="0.875" transform="rotate(-45 1.4314 2.66895)" fill="currentColor" fillOpacity="0.7"/>
    </svg>
  )
}
