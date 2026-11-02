'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, FormError } from '@/components/ui/field'
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

const ROLE_LABELS: Record<CompanyRole, string> = { company_admin: 'Admin', user: 'Usuário' }

function InviteDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: CompanyRole }) =>
      createInvitation(email, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
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
          <select
            id="role"
            name="role"
            defaultValue="user"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="user">Usuário</option>
            <option value="company_admin">Admin</option>
          </select>
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
  const [inviting, setInviting] = useState(false)
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
    onSuccess: refresh,
  })
  const resend = useMutation({ mutationFn: resendInvitation, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: cancelInvitation, onSuccess: refresh })
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
        <Card>
          <ul className="divide-y divide-border">
            {users.data.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge>{ROLE_LABELS[user.role]}</Badge>
                <Badge>{user.is_active ? 'Ativo' : 'Inativo'}</Badge>
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
                  {user.role === 'user' ? 'Tornar admin' : 'Tornar usuário'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    changeUser.mutate({ user, changes: { is_active: !user.is_active } })
                  }
                >
                  {user.is_active ? 'Desativar' : 'Ativar'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {invitations.data && invitations.data.length > 0 && (
        <section aria-label="Convites pendentes" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Convites pendentes</h2>
          <Card>
            <ul className="divide-y divide-border">
              {invitations.data.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="min-w-0 flex-1 text-sm">{invitation.email}</span>
                  {invitation.email_failed && <Badge>Falha no envio</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => resend.mutate(invitation.id)}>
                    Reenviar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => cancel.mutate(invitation.id)}>
                    Cancelar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
    </div>
  )
}
