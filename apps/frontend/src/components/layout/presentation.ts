'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Onde as teclas pertencem à tela: campos, listas, abas e diálogos usam as setas e o Esc. */
const OWNS_KEYS =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"], [role="listbox"], [role="tablist"], [role="slider"], [role="radiogroup"], [role="combobox"], [role="menu"]'

/** Atalho global só quando ninguém mais usou a tecla e o foco não está num controle. */
export function isFreeKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return false
  const target = event.target as Element | null
  return !target?.closest?.(OWNS_KEYS)
}

/**
 * Modo telão: esconde a casca, tenta tela cheia e devolve o controle de ligar e desligar.
 * Sem suporte a tela cheia (ou se o navegador recusar), o modo funciona só sem a casca.
 */
export function usePresentation(): [boolean, () => void] {
  const [on, setOn] = useState(false)
  // Só sai do telão pela tela cheia se foi o telão que a pediu.
  const ownsFullscreen = useRef(false)

  const enter = useCallback(() => {
    setOn(true)
    const root = document.documentElement
    if (root.requestFullscreen && !document.fullscreenElement) {
      root
        .requestFullscreen()
        .then(() => {
          ownsFullscreen.current = true
        })
        .catch(() => undefined)
    }
  }, [])

  const exit = useCallback(() => {
    setOn(false)
    if (ownsFullscreen.current && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined)
    }
    ownsFullscreen.current = false
  }, [])

  const toggle = useCallback(() => (on ? exit() : enter()), [on, enter, exit])

  useEffect(() => {
    // O navegador sai da tela cheia com Esc sem entregar a tecla à página.
    const onFullscreen = () => {
      if (!document.fullscreenElement && ownsFullscreen.current) {
        ownsFullscreen.current = false
        setOn(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (!isFreeKey(event)) return
      if (event.key === 'Escape' && on) exit()
      else if (event.key.toLowerCase() === 't' && !event.shiftKey) toggle()
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
      window.removeEventListener('keydown', onKey)
    }
  }, [on, exit, toggle])

  return [on, toggle]
}

/** No telão, ← e → (e PageUp/PageDown) andam pelos menus; ↑ e ↓ ficam para a tela. */
export function useMenuArrows<T>(enabled: boolean, items: T[], index: number, go: (item: T) => void) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (!isFreeKey(event)) return
      const step =
        event.key === 'ArrowRight' || event.key === 'PageDown'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'PageUp'
            ? -1
            : 0
      if (!step) return
      const next = items[index + step]
      if (!next) return
      event.preventDefault()
      go(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, items, index, go])
}
