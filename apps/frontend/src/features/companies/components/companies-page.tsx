'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, FormError } from '@/components/ui/field'
import { createCompany, fetchCompanies, updateCompany, type Company } from '../services/companies'

const COMPANIES = ['companies']

function NameDialog({ company, onClose }: { company: Company; onClose: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (name: string) => updateCompany(company.id, { name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COMPANIES })
      onClose()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(String(new FormData(event.currentTarget).get('name')))
  }

  return (
    <Dialog open onClose={onClose} title="Renomear empresa">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="name" label="Nome" defaultValue={company.name} required minLength={2} />
        <FormError message={mutation.error?.message} />
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </form>
    </Dialog>
  )
}

function CreateDialog({
  onClose,
  onEmailFailed,
}: {
  onClose: () => void
  onEmailFailed: () => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) => createCompany(name, email),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: COMPANIES })
      if (created.invitation_email_failed) onEmailFailed()
      onClose()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({ name: String(form.get('name')), email: String(form.get('email')) })
  }

  return (
    <Dialog open onClose={onClose} title="Nova empresa">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="name" label="Nome da empresa" required minLength={2} />
        <Field id="email" label="E-mail do primeiro admin" type="email" required />
        <FormError message={mutation.error?.message} />
        <Button type="submit" disabled={mutation.isPending}>
          Criar e enviar convite
        </Button>
      </form>
    </Dialog>
  )
}

export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<Company | null>(null)
  const [emailFailed, setEmailFailed] = useState(false)
  const companies = useQuery({ queryKey: COMPANIES, queryFn: fetchCompanies })
  const toggle = useMutation({
    mutationFn: (company: Company) => updateCompany(company.id, { is_active: !company.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMPANIES }),
  })

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        title="Empresas"
        subtitle="Cadastre empresas e convide o primeiro admin de cada uma"
        icon={Building2}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nova empresa
          </Button>
        }
      />
      {emailFailed && (
        <p role="alert" className="text-sm text-destructive">
          A empresa foi criada, mas o convite não foi enviado. O e-mail precisa ser revisto.
        </p>
      )}
      <FormError message={companies.error?.message ?? toggle.error?.message} />
      {companies.data?.length === 0 && (
        <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" />
      )}
      {companies.data && companies.data.length > 0 && (
        <Card>
          <ul className="divide-y divide-border">
            {companies.data.map((company) => (
              <li key={company.id} className="flex items-center gap-3 p-3">
                <span className="flex-1 text-sm font-medium">{company.name}</span>
                <Badge>{company.is_active ? 'Ativa' : 'Inativa'}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setRenaming(company)}>
                  Renomear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(company)}
                >
                  {company.is_active ? 'Desativar' : 'Ativar'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {creating && (
        <CreateDialog onClose={() => setCreating(false)} onEmailFailed={() => setEmailFailed(true)} />
      )}
      {renaming && <NameDialog company={renaming} onClose={() => setRenaming(null)} />}
    </div>
  )
}
