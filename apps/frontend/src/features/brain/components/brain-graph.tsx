'use client'

import { BrainCircuit, Bot } from 'lucide-react'
import { useMemo, useState } from 'react'
import { channelLabel, channelLook } from '@/features/shared'
import { cn } from '@/lib/utils'

export interface GraphConversation {
  id: string
  name: string
  channel: string
  group: boolean
  messages: number
  last24h: number
  analyses: number
}

interface Point {
  x: number
  y: number
}

const W = 1000
const H = 720
const CENTER: Point = { x: W / 2, y: H / 2 }
const CHANNEL_RING = 165
const CONVERSATION_RING = 305
const colorOf = (channel: string) => channelLook(channel).color
const AGENT_COLOR = '#8b5cf6'

const polar = (radius: number, angle: number): Point => ({
  x: CENTER.x + radius * Math.cos(angle),
  y: CENTER.y + radius * Math.sin(angle),
})

/** Curva suave entre dois pontos, puxada levemente para o centro. */
function curve(from: Point, to: Point, pull = 0.25): string {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const control = {
    x: mid.x + (CENTER.x - mid.x) * pull,
    y: mid.y + (CENTER.y - mid.y) * pull,
  }
  return `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${control.x.toFixed(1)},${control.y.toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`
}

interface Layout {
  channels: { id: string; at: Point; total: number }[]
  agent: Point
  conversations: (GraphConversation & { at: Point; radius: number; channelAt: Point })[]
}

function layout(conversations: GraphConversation[], channelIds: string[]): Layout {
  const ids = [...new Set([...channelIds, ...conversations.map((c) => c.channel)])]
  // Canais e o agente dividem o anel interno; o agente fica embaixo.
  const slots = ids.length + 1
  const channelAngle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / slots
  const channels = ids.map((id, index) => ({
    id,
    at: polar(CHANNEL_RING, channelAngle(index)),
    total: conversations.filter((c) => c.channel === id).reduce((sum, c) => sum + c.messages, 0),
  }))
  const agent = polar(CHANNEL_RING, channelAngle(ids.length))

  const max = Math.max(1, ...conversations.map((c) => c.messages))
  const placed: Layout['conversations'] = []
  const span = (2 * Math.PI) / slots
  ids.forEach((id, index) => {
    const mine = conversations.filter((c) => c.channel === id)
    const center = channelAngle(index)
    // Cada canal espalha suas conversas num leque em volta da própria direção.
    const fan = Math.min(span * 0.92, Math.max(0.35, mine.length * 0.16))
    mine.forEach((conversation, i) => {
      const t = mine.length === 1 ? 0.5 : i / (mine.length - 1)
      const angle = center - fan / 2 + t * fan
      const ring = CONVERSATION_RING + (i % 3) * 34 - 34
      placed.push({
        ...conversation,
        at: polar(ring, angle),
        radius: 6 + Math.sqrt(conversation.messages / max) * 16,
        channelAt: channels[index]!.at,
      })
    })
  })
  return { channels, agent, conversations: placed }
}

/**
 * Grafo do "cérebro": a Atentio no centro, canais e o agente em volta, conversas na borda.
 * Partículas correm das conversas com atividade recente até o centro.
 */
export function BrainGraph({
  conversations,
  channelIds,
  selected,
  onSelect,
  pulseKey,
}: {
  conversations: GraphConversation[]
  channelIds: string[]
  selected: string | null
  onSelect: (id: string | null) => void
  /** Muda quando chegam mensagens novas: o centro pulsa. */
  pulseKey: number
}) {
  const [hover, setHover] = useState<string | null>(null)
  const graph = useMemo(() => layout(conversations, channelIds), [conversations, channelIds])
  const focus = hover ?? selected
  const focused = graph.conversations.find((c) => c.id === focus)
  const labelled = new Set(
    [...graph.conversations]
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 8)
      .map((c) => c.id),
  )
  const dim = (id: string, channel: string) =>
    focused ? focused.id !== id && focused.channel !== channel : false

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full select-none"
      role="img"
      aria-label={`Grafo com ${graph.channels.length} conectores e ${graph.conversations.length} conversas`}
      onClick={() => onSelect(null)}
    >
      <defs>
        <radialGradient id="brain-core" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#b9fff0" />
          <stop offset="45%" stopColor="#25e2af" />
          <stop offset="100%" stopColor="#0a5c47" />
        </radialGradient>
        <radialGradient id="brain-halo">
          <stop offset="0%" stopColor="#25e2af" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#25e2af" stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Anéis de órbita */}
      <circle cx={CENTER.x} cy={CENTER.y} r={CHANNEL_RING} fill="none" stroke="rgb(120 255 220 / 0.12)" strokeDasharray="2 8" className="fx-orbit" />
      <circle cx={CENTER.x} cy={CENTER.y} r={CONVERSATION_RING} fill="none" stroke="rgb(120 255 220 / 0.08)" strokeDasharray="1 10" className="fx-orbit-rev" />
      <circle cx={CENTER.x} cy={CENTER.y} r={CONVERSATION_RING + 50} fill="none" stroke="rgb(139 92 246 / 0.08)" strokeDasharray="40 30" className="fx-orbit" />

      {/* Arestas centro → canais e agente */}
      {graph.channels.map((channel) => (
        <line
          key={channel.id}
          x1={CENTER.x}
          y1={CENTER.y}
          x2={channel.at.x}
          y2={channel.at.y}
          stroke={colorOf(channel.id)}
          strokeOpacity={0.5}
          strokeWidth={2}
          className="fx-edge"
        />
      ))}
      <line
        x1={CENTER.x}
        y1={CENTER.y}
        x2={graph.agent.x}
        y2={graph.agent.y}
        stroke={AGENT_COLOR}
        strokeOpacity={0.6}
        strokeWidth={2}
        strokeDasharray="6 6"
      />

      {/* Arestas canal → conversa, com partículas onde houve atividade */}
      {graph.conversations.map((conversation) => {
        const path = curve(conversation.at, conversation.channelAt, 0.15)
        const color = colorOf(conversation.channel)
        const active = focused?.id === conversation.id
        return (
          <g key={`e-${conversation.id}`} opacity={dim(conversation.id, conversation.channel) ? 0.12 : 1} className="fx-edge">
            <path d={path} fill="none" stroke={color} strokeOpacity={active ? 0.9 : 0.28} strokeWidth={active ? 2.5 : 1} />
            {conversation.last24h > 0 &&
              [0, 1].map((n) => (
                <circle key={n} r={2.4} fill={color} filter="url(#glow)">
                  <animateMotion
                    dur={`${Math.max(1.6, 4.5 - Math.log2(conversation.last24h + 1) * 0.6)}s`}
                    begin={`${n * 1.1}s`}
                    repeatCount="indefinite"
                    path={path}
                  />
                </circle>
              ))}
          </g>
        )
      })}

      {/* Agente → conversas já analisadas */}
      {graph.conversations
        .filter((conversation) => conversation.analyses > 0)
        .map((conversation) => {
          const path = curve(graph.agent, conversation.at, 0.45)
          return (
            <g key={`a-${conversation.id}`} opacity={dim(conversation.id, conversation.channel) ? 0.1 : 1} className="fx-edge">
              <path d={path} fill="none" stroke={AGENT_COLOR} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="3 5" />
              <circle r={2.2} fill={AGENT_COLOR} filter="url(#glow)">
                <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />
              </circle>
            </g>
          )
        })}

      {/* Partículas dos canais até o centro */}
      {graph.channels.map((channel) => (
        <circle key={`p-${channel.id}`} r={3} fill="#b9fff0" filter="url(#glow)">
          <animateMotion
            dur="1.8s"
            repeatCount="indefinite"
            path={`M${channel.at.x},${channel.at.y} L${CENTER.x},${CENTER.y}`}
          />
        </circle>
      ))}

      {/* Conversas */}
      {graph.conversations.map((conversation) => {
        const color = colorOf(conversation.channel)
        const active = focus === conversation.id
        const showLabel = active || labelled.has(conversation.id)
        const right = conversation.at.x >= CENTER.x
        return (
          <g
            key={conversation.id}
            role="button"
            tabIndex={0}
            aria-label={`${conversation.name}: ${conversation.messages} mensagens`}
            aria-pressed={selected === conversation.id}
            opacity={dim(conversation.id, conversation.channel) ? 0.25 : 1}
            className="fx-edge cursor-pointer outline-none"
            onMouseEnter={() => setHover(conversation.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(conversation.id)}
            onBlur={() => setHover(null)}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(conversation.id)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(conversation.id)
              }
            }}
          >
            {conversation.last24h > 0 && (
              <circle cx={conversation.at.x} cy={conversation.at.y} r={conversation.radius + 6} fill="none" stroke={color} strokeOpacity={0.5}>
                <animate attributeName="r" values={`${conversation.radius + 2};${conversation.radius + 12};${conversation.radius + 2}`} dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            {conversation.analyses > 0 && (
              <circle cx={conversation.at.x} cy={conversation.at.y} r={conversation.radius + 3.5} fill="none" stroke={AGENT_COLOR} strokeWidth={1.5} />
            )}
            <circle
              cx={conversation.at.x}
              cy={conversation.at.y}
              r={active ? conversation.radius + 3 : conversation.radius}
              fill={color}
              fillOpacity={active ? 0.95 : 0.7}
              stroke="#fff"
              strokeOpacity={active ? 0.9 : 0.25}
              strokeWidth={active ? 2 : 1}
              filter={active ? 'url(#glow)' : undefined}
              style={{ transition: 'r 0.25s ease' }}
            />
            {conversation.group && (
              <circle cx={conversation.at.x} cy={conversation.at.y} r={2.2} fill="#04120d" />
            )}
            {showLabel && (
              <text
                x={conversation.at.x + (right ? conversation.radius + 6 : -conversation.radius - 6)}
                y={conversation.at.y + 4}
                textAnchor={right ? 'start' : 'end'}
                className={cn('fill-foreground text-[12px] font-medium', !active && 'opacity-75')}
                style={{ paintOrder: 'stroke', stroke: 'var(--canvas)', strokeWidth: 4 }}
              >
                {conversation.name.length > 22 ? `${conversation.name.slice(0, 21)}…` : conversation.name}
              </text>
            )}
          </g>
        )
      })}

      {/* Canais */}
      {graph.channels.map((channel) => {
        const look = channelLook(channel.id)
        const color = colorOf(channel.id)
        return (
          <g key={`c-${channel.id}`} className="fx-float">
            <circle cx={channel.at.x} cy={channel.at.y} r={30} fill="#fff" stroke={color} strokeWidth={2.5} filter="url(#glow)" />
            <look.icon x={channel.at.x - 16} y={channel.at.y - 16} width={32} height={32} aria-hidden />
            <text x={channel.at.x} y={channel.at.y + 48} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {channelLabel(channel.id)}
            </text>
          </g>
        )
      })}

      {/* Agente analista */}
      <g className="fx-float">
        <circle cx={graph.agent.x} cy={graph.agent.y} r={28} fill="var(--canvas)" stroke={AGENT_COLOR} strokeWidth={2.5} filter="url(#glow)" />
        <Bot x={graph.agent.x - 12} y={graph.agent.y - 12} width={24} height={24} color={AGENT_COLOR} aria-hidden />
        <text x={graph.agent.x} y={graph.agent.y + 46} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
          Agente analista
        </text>
      </g>

      {/* Núcleo */}
      <circle cx={CENTER.x} cy={CENTER.y} r={110} fill="url(#brain-halo)" />
      <g key={pulseKey} className="fx-brain-pulse">
        <circle cx={CENTER.x} cy={CENTER.y} r={52} fill="url(#brain-core)" filter="url(#glow)" />
      </g>
      <circle cx={CENTER.x} cy={CENTER.y} r={64} fill="none" stroke="#25e2af" strokeOpacity={0.6} strokeDasharray="4 6" className="fx-orbit" />
      <BrainCircuit x={CENTER.x - 24} y={CENTER.y - 24} width={48} height={48} color="#04120d" aria-hidden />
      <text x={CENTER.x} y={CENTER.y + 92} textAnchor="middle" className="fill-foreground text-[15px] font-bold tracking-[0.3em]">
        ATENTIO
      </text>
    </svg>
  )
}
