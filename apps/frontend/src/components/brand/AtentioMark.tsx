import type { SVGProps } from 'react'

/**
 * Símbolo da Atentio: um olho atento, em vetor para ficar nítido em qualquer tamanho.
 * Com `animated`, a pupila varre o entorno e a pálpebra pisca de vez em quando.
 */
export function AtentioMark({ animated = false, ...props }: SVGProps<SVGSVGElement> & { animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <g className={animated ? 'fx-eye-lid' : undefined}>
        <path
          d="M2 16C6.5 8.5 11 5.5 16 5.5S25.5 8.5 30 16c-4.5 7.5-9 10.5-14 10.5S6.5 23.5 2 16Z"
          stroke="#25E2AF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle
          className={animated ? 'fx-eye-pupil' : undefined}
          cx="16"
          cy="16"
          r="5"
          fill="#25E2AF"
        />
      </g>
    </svg>
  )
}
