'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Modo apresentação: coloca só o elemento em tela cheia. */
export function useFullscreen(ref: RefObject<HTMLElement | null>): [boolean, () => void] {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [ref])
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void ref.current?.requestFullscreen?.()
  }
  return [active, toggle]
}
