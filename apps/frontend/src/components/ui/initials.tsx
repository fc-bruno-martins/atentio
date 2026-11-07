import { cn } from '@/lib/utils'

const GRADIENTS = [
  'from-[#25e2af] to-[#22d3ee]',
  'from-[#22d3ee] to-[#8b5cf6]',
  'from-[#8b5cf6] to-[#ec4899]',
  'from-[#f59e0b] to-[#ef4444]',
  'from-[#10b981] to-[#3b82f6]',
  'from-[#06b6d4] to-[#25e2af]',
]

function hash(text: string): number {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

/** Avatar com as iniciais e uma cor estável por nome. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const letters =
    name
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '#'
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-[#04120d] shadow-[0_0_14px_-4px_rgb(37_226_175/0.6)]',
        GRADIENTS[hash(name) % GRADIENTS.length],
        className,
      )}
    >
      {letters}
    </span>
  )
}
