'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Plus, Power, RotateCw, Shield, Sparkles, UserCheck, Users, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, FormError } from '@/components/ui/field'
import { Initials } from '@/components/ui/initials'
import { Stat } from '@/components/ui/stat'
import { NativeSelect } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  cancelInvitation,
  createInvitation,
  fetchInvitations,
  fetchUsers,
  resendInvitation,
  updateUser,
  type CompanyRole,
  type CompanyUser,
} from '../services/users'
import { AiSettingsDialog } from './ai-settings-dialog'

const ROLE_LABELS: Record<CompanyRole, string> = { company_admin: 'Admin', user: 'Usuário' }

function InviteDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useToast()
  const mutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: CompanyRole }) =>
      createInvitation(email, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      notify('Convite enviado.')
      onClose()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({
      email: String(form.get('email')),
      role: String(form.get('role')) as CompanyRole,
    })
  }

  return (
    <Dialog open onClose={onClose} title="Convidar pessoa">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="email" label="E-mail" type="email" required />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Perfil</Label>
          <NativeSelect id="role" name="role" defaultValue="user">
            <option value="user">Usuário</option>
            <option value="company_admin">Admin</option>
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            Admins convidam pessoas, veem os conectores da empresa e definem os parâmetros.
          </p>
        </div>
        <FormError message={mutation.error?.message} />
        <Button type="submit" disabled={mutation.isPending}>
          Enviar convite
        </Button>
      </form>
    </Dialog>
  )
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const notify = useToast()
  const [inviting, setInviting] = useState(false)
  const [configuring, setConfiguring] = useState<CompanyUser | null>(null)
  const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const invitations = useQuery({ queryKey: ['invitations'], queryFn: fetchInvitations })
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['invitations'] }),
    ])
  const changeUser = useMutation({
    mutationFn: ({ user, changes }: { user: CompanyUser; changes: Partial<CompanyUser> }) =>
      updateUser(user.id, changes),
    onSuccess: async () => {
      notify('Acesso atualizado.')
      await refresh()
    },
  })
  const resend = useMutation({
    mutationFn: resendInvitation,
    onSuccess: async () => {
      notify('Convite reenviado.')
      await refresh()
    },
  })
  const cancel = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: async () => {
      notify('Convite cancelado.')
      await refresh()
    },
  })
  const active = users.data?.filter((user) => user.is_active).length ?? 0
  const admins = users.data?.filter((user) => user.role === 'company_admin').length ?? 0
  const error =
    users.error ?? invitations.error ?? changeUser.error ?? resend.error ?? cancel.error

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        title="Usuários"
        subtitle="Convide pessoas e gerencie os acessos da sua empresa"
        icon={Users}
        actions={
          <Button onClick={() => setInviting(true)}>
            <Plus className="size-4" /> Convidar
          </Button>
        }
      />
      <FormError message={error?.message} />
      {users.data && (
        <div className="fx-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Pessoas ativas" value={active} icon={UserCheck} />
          <Stat label="Admins" value={admins} icon={Shield} />
          <Stat label="Convites pendentes" value={invitations.data?.length ?? 0} icon={Mail} />
        </div>
      )}
      {users.isPending && <div className="feat-skeleton h-40 rounded-xl" />}
      {users.data && (
        <Card>
          <ul className="fx-stagger divide-y divide-border">
            {users.data.map((user) => (
              <li
                key={user.id}
                className={cn(
                  'flex flex-wrap items-center gap-3 p-3 transition-colors hover:bg-muted/50',
                  !user.is_active && 'opacity-60',
                )}
              >
                <Initials name={user.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={user.role === 'company_admin' ? 'brand' : 'secondary'}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                <Badge variant={user.is_active ? 'success' : 'secondary'}>
                  {user.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      changeUser.mutate({
                        user,
                        changes: { role: user.role === 'user' ? 'company_admin' : 'user' },
                      })
                    }
                  >
                    <Shield className="size-3.5" aria-hidden />
                    {user.role === 'user' ? 'Tornar admin' : 'Tornar usuário'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      changeUser.mutate({ user, changes: { is_active: !user.is_active } })
                    }
                  >
                    <Power className="size-3.5" aria-hidden />
                    {user.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfiguring(user)}>
                    <Sparkles className="size-3.5" aria-hidden />
                    Análises
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {invitations.data && invitations.data.length > 0 && (
        <section aria-label="Convites pendentes" className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Convites pendentes
          </h2>
          <Card>
            <ul className="fx-stagger divide-y divide-border">
              {invitations.data.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="grid size-9 place-items-center rounded-full border border-dashed border-primary/40 text-primary-ink">
                    <Mail className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{invitation.email}</span>
                  {invitation.email_failed && <Badge variant="destructive">Falha no envio</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => resend.mutate(invitation.id)}>
                    <RotateCw className="size-3.5" aria-hidden />
                    Reenviar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => cancel.mutate(invitation.id)}>
                    <X className="size-3.5" aria-hidden />
                    Cancelar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
      {configuring && (
        <AiSettingsDialog user={configuring} onClose={() => setConfiguring(null)} />
      )}
    </div>
  )
}
