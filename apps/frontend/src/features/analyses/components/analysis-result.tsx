'use client'

import { Check, Clock, Copy, Cpu, Download, MessagesSquare, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { useModelName } from '@/features/shared'
import { useToast } from '@/components/ui/toast'
import { useStreamedText } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Analysis } from '../services/analyses'


function download(analysis: Analysis) {
  const blob = new Blob([`# Análise\n\n> ${analysis.prompt_text}\n\n${analysis.result ?? ''}\n`], {
    type: 'text/markdown',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `analise-${analysis.created_at?.slice(0, 10) ?? 'atentio'}.md`
  link.click()
  URL.revokeObjectURL(url)
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
      <Icon className="size-3" aria-hidden />
      {children}
    </span>
  )
}

/**
 * Resultado da análise: a resposta "se escreve" na tela, com seções em Markdown,
 * números do que foi lido e ações para copiar, baixar ou recomeçar.
 */
export function AnalysisResult({
  analysis,
  durationMs,
  stream = true,
  onReset,
  large = false,
  className,
}: {
  analysis: Analysis
  durationMs?: number
  stream?: boolean
  onReset?: () => void
  /** Texto maior, para apresentar em telão. */
  large?: boolean
  className?: string
}) {
  const notify = useToast()
  const modelName = useModelName()
  const [copied, setCopied] = useState(false)
  const text = analysis.result ?? ''
  const streamed = useStreamedText(stream ? text : '')
  const visible = stream ? streamed.visible : text
  const streaming = stream && streamed.streaming

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      notify('Análise copiada.')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      notify('Não foi possível copiar.', 'error')
    }
  }

  return (
    <article
      className={cn('fx-reveal flex flex-col gap-3 rounded-lg bg-primary/5 p-4', className)}
      aria-busy={streaming}
    >
      <header className="flex flex-wrap items-center gap-1.5">
        <Chip icon={MessagesSquare}>{analysis.message_count} mensagens</Chip>
        <Chip icon={Cpu}>{modelName(analysis.model)}</Chip>
        {durationMs !== undefined && (
          <Chip icon={Clock}>{(durationMs / 1000).toFixed(1)}s</Chip>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Copiar análise"
            onClick={() => void copy()}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Baixar análise"
            onClick={() => download(analysis)}
          >
            <Download className="size-3.5" />
          </Button>
          {onReset && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Nova análise"
              onClick={onReset}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      </header>
      {/* Leitor de tela recebe o texto completo de uma vez; a animação é só visual. */}
      <div aria-hidden={streaming || undefined}>
        <Markdown
          text={visible}
          cursor={streaming}
          className={large ? 'gap-4 text-base lg:text-lg [&_h3]:text-lg lg:[&_h3]:text-2xl' : undefined}
        />
      </div>
      {streaming && <p className="sr-only">{text}</p>}
    </article>
  )
}
