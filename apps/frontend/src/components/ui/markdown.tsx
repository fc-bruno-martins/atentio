import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Markdown mínimo e seguro para respostas da IA: títulos, listas, tarefas, citações,
 * negrito, itálico e código. Monta elementos React; nunca injeta HTML.
 */

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'list'; ordered: boolean; items: { text: string; task?: boolean; done?: boolean }[] }
  | { kind: 'quote'; text: string }
  | { kind: 'rule' }
  | { kind: 'paragraph'; text: string }

const BULLET = /^\s*[-*•]\s+(.*)$/
const ORDERED = /^\s*\d+[.)]\s+(.*)$/
const TASK = /^\[( |x|X)\]\s+(.*)$/

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  for (const raw of source.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd()
    const heading = /^(#{1,4})\s+(.*)$/.exec(line.trim())
    const bullet = BULLET.exec(line)
    const ordered = ORDERED.exec(line)
    if (!line.trim()) {
      flush()
    } else if (heading) {
      flush()
      blocks.push({ kind: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' })
    } else if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      flush()
      blocks.push({ kind: 'rule' })
    } else if (bullet || ordered) {
      flush()
      const text = (bullet ?? ordered)?.[1] ?? ''
      const task = TASK.exec(text)
      const item = task ? { text: task[2] ?? '', task: true, done: task[1] !== ' ' } : { text }
      const last = blocks.at(-1)
      if (last?.kind === 'list' && last.ordered === Boolean(ordered)) last.items.push(item)
      else blocks.push({ kind: 'list', ordered: Boolean(ordered), items: [item] })
    } else if (line.trim().startsWith('>')) {
      flush()
      blocks.push({ kind: 'quote', text: line.trim().replace(/^>\s?/, '') })
    } else {
      paragraph.push(line.trim())
    }
  }
  flush()
  return blocks
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g

export function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE).filter(Boolean)
  return (
    <>
      {parts.map((part, index) => {
        if (/^(\*\*|__).+(\*\*|__)$/.test(part))
          return (
            <strong key={index} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          )
        if (/^`.+`$/.test(part))
          return (
            <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {part.slice(1, -1)}
            </code>
          )
        if (/^(\*|_).+(\*|_)$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>
        return <Fragment key={index}>{part}</Fragment>
      })}
    </>
  )
}

const HEADING_ICONS: Record<string, string> = {
  resumo: '◆',
  decisões: '✓',
  decisoes: '✓',
  pendências: '◷',
  pendencias: '◷',
  'pontos de atenção': '!',
  'próximos passos': '→',
}

export function Markdown({
  text,
  className,
  cursor,
}: {
  text: string
  className?: string
  /** Mostra o cursor piscando no fim, enquanto o texto ainda está chegando. */
  cursor?: boolean
}) {
  const blocks = parseMarkdown(text)
  const caret: ReactNode = cursor ? <span className="fx-caret" aria-hidden /> : null
  return (
    <div className={cn('flex flex-col gap-2.5 text-sm leading-relaxed', className)}>
      {blocks.map((block, index) => {
        const last = index === blocks.length - 1
        switch (block.kind) {
          case 'heading': {
            const icon = HEADING_ICONS[block.text.trim().toLowerCase()]
            return (
              <h3
                key={index}
                className={cn(
                  'fx-enter flex items-center gap-2 font-semibold text-foreground',
                  block.level <= 2 ? 'mt-2 text-base first:mt-0' : 'text-sm',
                )}
              >
                {icon && (
                  <span
                    aria-hidden
                    className="grid size-5 place-items-center rounded-md bg-primary/15 font-mono text-[11px] text-primary-ink"
                  >
                    {icon}
                  </span>
                )}
                <Inline text={block.text} />
                {last && caret}
              </h3>
            )
          }
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul'
            return (
              <Tag
                key={index}
                className={cn('flex flex-col gap-1.5', block.ordered ? 'list-decimal pl-5' : '')}
              >
                {block.items.map((item, i) => (
                  <li key={i} className="fx-enter flex items-start gap-2">
                    {!block.ordered &&
                      (item.task ? (
                        <span
                          aria-hidden
                          className={cn(
                            'mt-0.5 grid size-4 shrink-0 place-items-center rounded border text-[10px]',
                            item.done
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-primary/50',
                          )}
                        >
                          {item.done ? '✓' : ''}
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--neon-1)]"
                        />
                      ))}
                    <span className="min-w-0">
                      <Inline text={item.text} />
                      {last && i === block.items.length - 1 && caret}
                    </span>
                  </li>
                ))}
              </Tag>
            )
          }
          case 'quote':
            return (
              <blockquote
                key={index}
                className="border-l-2 border-primary/60 pl-3 text-muted-foreground italic"
              >
                <Inline text={block.text} />
                {last && caret}
              </blockquote>
            )
          case 'rule':
            return <hr key={index} className="border-border" />
          default:
            return (
              <p key={index} className="text-foreground/90">
                <Inline text={block.text} />
                {last && caret}
              </p>
            )
        }
      })}
    </div>
  )
}
