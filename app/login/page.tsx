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
import { BookOpen, LogIn, InfoIcon, Eye, EyeOff, Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { auth } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import toast from "@/lib/toast"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetEmailLoading, setResetEmailLoading] = useState(false)
  const { signIn, user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && userData) {
      router.push(getRoleBasedRedirect(userData.role))
    }
  }, [user, userData, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await signIn(email, password)
      // Redirect will happen in the useEffect
    } catch (error: any) {
      setError(error.message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (user && userData) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-amber-50/50">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 rounded-lg p-2 text-white">
              <BookOpen size={24} />
            </div>
            <h2 className="text-2xl font-bold">
              Mentor<span className="text-amber-500">Hub</span>
            </h2>
          </div>
        </div>

        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            New accounts can only be created by administrators (for mentors) or mentors (for mentees).
          </AlertDescription>
        </Alert>

        <Card className="border-0 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-8">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 p-6 -mt-4">
              <div className="bg-white rounded-lg p-6 shadow-md">
                {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-amber-200 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setResetEmail(email);
                          setForgotPasswordOpen(true);
                          setResetEmailSent(false);
                        }} 
                        className="text-xs text-amber-600 hover:text-amber-700"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-amber-200 focus:ring-amber-500"
                        required
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 p-6">
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={16} />
                    Sign In
                  </span>
                )}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <span className="text-gray-600">
                  Please contact your administrator or mentor.
                </span>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            {resetEmailSent ? (
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Password Reset Email Sent
              </DialogTitle>
            ) : (
              <DialogTitle>Reset Your Password</DialogTitle>
            )}
            {resetEmailSent ? (
              <DialogDescription>
                We've sent a password reset link to <span className="font-medium">{resetEmail}</span>. 
                Please check your email and follow the instructions to reset your password.
              </DialogDescription>
            ) : (
              <DialogDescription>
                Enter your email address below and we'll send you a link to reset your password.
              </DialogDescription>
            )}
          </DialogHeader>

          {!resetEmailSent ? (
            <div className="space-y-4 py-4">
              {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 border-amber-200 focus:ring-amber-500"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {resetEmailSent ? (
              <Button 
                type="button" 
                className="w-full bg-amber-500 hover:bg-amber-600"
                onClick={() => setForgotPasswordOpen(false)}
              >
                Back to Login
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setForgotPasswordOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  disabled={resetEmailLoading || !resetEmail}
                  onClick={async () => {
                    if (!resetEmail) return;
                    
                    setResetEmailLoading(true);
                    setError("");
                    
                    try {
                      await sendPasswordResetEmail(auth, resetEmail);
                      setResetEmailSent(true);
                      toast({
                        title: "Password reset email sent",
                        description: "Please check your email to reset your password",
                        variant: "success"
                      });
                    } catch (error: any) {
                      setError(error.message || "Failed to send password reset email");
                      toast({
                        title: "Error",
                        description: error.message || "Failed to send password reset email",
                        variant: "destructive"
                      });
                    } finally {
                      setResetEmailLoading(false);
                    }
                  }}
                >
                  {resetEmailLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send Reset Link
                    </span>
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
