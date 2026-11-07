import { cn } from '@/lib/utils'
import { channelLabel } from '../services/connection'
import { channelLook } from '../services/channel-look'

/** Ícone e nome do conector, para listas e cabeçalhos. */
export function ConnectorBadge({
  channel,
  className,
  iconOnly = false,
}: {
  channel: string
  className?: string
  iconOnly?: boolean
}) {
  const look = channelLook(channel)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium',
        className,
      )}
      title={channelLabel(channel)}
    >
      <look.icon className="size-3.5" />
      {iconOnly ? <span className="sr-only">{channelLabel(channel)}</span> : channelLabel(channel)}
    </span>
  )
}
