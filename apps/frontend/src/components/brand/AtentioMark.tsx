import type { SVGProps } from 'react'

/** Símbolo da Atentio: um olho atento, em vetor para ficar nítido em qualquer tamanho. */
export function AtentioMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2 16C6.5 8.5 11 5.5 16 5.5S25.5 8.5 30 16c-4.5 7.5-9 10.5-14 10.5S6.5 23.5 2 16Z"
        stroke="#25E2AF"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="5" fill="#25E2AF" />
    </svg>
  )
}
