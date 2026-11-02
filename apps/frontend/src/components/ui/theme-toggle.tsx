'use client'

import { useTheme } from 'next-themes'
import { useMounted } from '@/lib/use-mounted'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  // Render a stable placeholder until client hydration completes to avoid an
  // SSR/client mismatch (resolvedTheme is undefined on the server).
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Alternar tema"
        className="text-muted-foreground hover:text-foreground"
        disabled
      >
        <Moon className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="text-muted-foreground hover:text-foreground"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}
