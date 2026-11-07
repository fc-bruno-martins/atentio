'use client'

import { useEffect, useState } from 'react'

/**
 * Animações só rodam quando o navegador suporta e a pessoa não pediu movimento reduzido.
 * Sem `matchMedia` (testes, SSR) tudo aparece pronto, sem animação.
 */
export function motionEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Revela o texto aos poucos, palavra por palavra, como se a IA estivesse escrevendo.
 * Retorna o trecho visível e se ainda está escrevendo.
 */
export function useStreamedText(text: string, wordsPerSecond = 55) {
  const animate = motionEnabled()
  const [state, setState] = useState({ source: text, shown: animate ? 0 : text.length })
  // Texto novo: recomeça a revelação (ajuste durante a renderização, sem efeito extra).
  if (state.source !== text) setState({ source: text, shown: animate ? 0 : text.length })

  useEffect(() => {
    if (!motionEnabled()) return
    const tokens = text.split(/(\s+)/)
    let index = 0
    let length = 0
    const step = Math.max(1, Math.ceil(tokens.length / 400))
    const timer = setInterval(() => {
      for (let i = 0; i < step * 2 && index < tokens.length; i += 1) {
        length += tokens[index]?.length ?? 0
        index += 1
      }
      setState({ source: text, shown: length })
      if (index >= tokens.length) clearInterval(timer)
    }, 1000 / wordsPerSecond)
    return () => clearInterval(timer)
  }, [text, wordsPerSecond])

  const shown = animate ? state.shown : text.length
  return { visible: text.slice(0, shown), streaming: shown < text.length }
}

/** Conta de 0 até `value` em ~0,9 s. */
export function useCountUp(value: number, duration = 900) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    if (!motionEnabled()) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setCurrent(Math.round(value * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])
  return motionEnabled() ? current : value
}

const STOPWORDS = new Set(
  'a o e é de da do das dos em no na nos nas um uma uns umas que se por para pra com sem mas ou ao aos à às os as eu tu ele ela nós vc você vocês isso isto esse essa este esta ja já não sim tá ta né ai aí lá la me te lhe muito mais bem só tb também foi ser ter tem vai vou'.split(
    ' ',
  ),
)

/** Palavras com significado de um texto, sem repetição, para efeitos visuais. */
export function meaningfulWords(texts: string[], limit = 60): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const text of texts) {
    for (const raw of text.split(/\s+/)) {
      const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      const key = word.toLowerCase()
      if (word.length < 3 || STOPWORDS.has(key) || seen.has(key) || /^https?/.test(key)) continue
      seen.add(key)
      words.push(word.length > 18 ? `${word.slice(0, 17)}…` : word)
      if (words.length >= limit) return words
    }
  }
  return words
}

/**
 * Faz palavras saírem das mensagens e voarem até o alvo (o núcleo da IA).
 * Cada fonte é um elemento com o texto da mensagem. Devolve uma função que para o efeito.
 */
export function launchWordFlight({
  sources,
  target,
  intervalMs = 90,
}: {
  sources: HTMLElement[]
  target: HTMLElement
  intervalMs?: number
}): () => void {
  if (!motionEnabled() || sources.length === 0 || typeof Element.prototype.animate !== 'function') {
    return () => undefined
  }
  const layer = document.createElement('div')
  layer.className = 'fx-flight-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  const pool = sources
    .map((element) => ({ element, words: meaningfulWords([element.textContent ?? ''], 12) }))
    .filter((item) => item.words.length > 0)

  const fly = () => {
    if (pool.length === 0) return
    const source = pool[Math.floor(Math.random() * pool.length)]
    if (!source) return
    const word = source.words[Math.floor(Math.random() * source.words.length)] ?? ''
    const from = source.element.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const visible = from.bottom > 0 && from.top < window.innerHeight
    const startX = visible ? from.left + Math.random() * Math.max(10, from.width - 40) : to.left - 300
    const startY = visible ? from.top + from.height / 2 : to.top + (Math.random() - 0.5) * 300
    const endX = to.left + to.width / 2
    const endY = to.top + to.height / 2
    const chip = document.createElement('span')
    chip.className = 'fx-flight-word'
    chip.textContent = word
    chip.style.left = `${startX}px`
    chip.style.top = `${startY}px`
    layer.appendChild(chip)
    const dx = endX - startX
    const dy = endY - startY
    const arc = -60 - Math.random() * 80
    chip
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1.05)', opacity: 1, offset: 0.12 },
          {
            transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 + arc}px)) scale(0.95)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`,
            opacity: 0,
          },
        ],
        { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
      )
      .finished.then(() => chip.remove())
      .catch(() => chip.remove())
  }

  for (let i = 0; i < 6; i += 1) setTimeout(fly, i * 40)
  const timer = setInterval(fly, intervalMs)
  return () => {
    clearInterval(timer)
    setTimeout(() => layer.remove(), 1800)
  }
}
