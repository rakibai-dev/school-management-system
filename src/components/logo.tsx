import { cn } from "@/lib/utils"

/** Full lockup: app mark + wordmark (from the brand SVGs in /public). */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      {/* Same artwork; only wordmark colors differ per background */}
      <img
        src="/edudesk-logo-light-bg.svg"
        alt="EduDesk"
        className={cn("h-8 w-auto dark:hidden", className)}
      />
      <img src="/edudesk-logo.svg" alt="EduDesk" className={cn("hidden h-8 w-auto dark:block", className)} />
    </>
  )
}

/** Just the 512px app icon (blue gradient rounded square). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/edudesk-icon.svg"
      alt=""
      aria-hidden
      className={cn("size-8 rounded-lg", className)}
    />
  )
}
