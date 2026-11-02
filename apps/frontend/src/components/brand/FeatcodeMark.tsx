import type { SVGProps } from 'react'

/**
 * Símbolo "F" da Featcode, em vetor para ficar nítido em qualquer tamanho.
 * Mesmo traçado do DS (labs-feattalent: components/brand/feattalent-mark.tsx).
 */
export function FeatcodeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 800 712" fill="#25E2AF" aria-hidden="true" {...props}>
      <path d="M799 0L473 0L340 177L0 178L0 355L257 367L160 523L0 533L0 710L63 710L188 535L621 532L621 355L279 335L395 179L799 177Z" />
    </svg>
  )
}
