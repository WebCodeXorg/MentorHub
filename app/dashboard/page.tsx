"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getRoleBasedRedirect } from "@/lib/utils"

export default function Dashboard() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user && userData) {
        router.push(getRoleBasedRedirect(userData.role))
      } else {
        router.push("/login")
      }
    }
  }, [user, userData, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}

