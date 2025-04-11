"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getRoleBasedRedirect } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, UserPlus } from "lucide-react"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"mentee" | "mentor">("mentee")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signUp, user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Redirect to login page - public registration is disabled
      router.push("/login")
    }
  }, [loading, router])

  // Rest of the component is kept for reference but will not be used
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password, name, role)
      // Redirect will happen in the useEffect
    } catch (error: any) {
      setError(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  // Always show loading or redirect
  return (
    <div className="flex items-center justify-center min-h-screen bg-amber-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
    </div>
  )
}
