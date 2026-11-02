'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCurrentUser } from '../hooks/use-current-user'
import { homeFor } from '../services/nav'

export function HomeRedirect() {
  const router = useRouter()
  const { data: user } = useCurrentUser()

  useEffect(() => {
    if (user) router.replace(homeFor(user.role))
  }, [router, user])

  return null
}
