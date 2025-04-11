"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ref, push, serverTimestamp } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function AskQuery() {
  const { userData } = useAuth()
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [question, setQuestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userData?.assignedMentorId) {
      setError("You do not have an assigned mentor")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Add query to Realtime Database
      const queriesRef = ref(db, "queries")
      await push(queriesRef, {
        menteeId: userData.uid,
        mentorId: userData.assignedMentorId,
        subject,
        question,
        timestamp: serverTimestamp(),
        status: "pending",
      })

      // Redirect to dashboard
      router.push("/mentee/dashboard")
    } catch (error: any) {
      setError(error.message || "Failed to submit query")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!userData || userData.role !== "mentee") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ask a Query</h1>
          <p className="text-muted-foreground">Ask your mentor a question</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>New Query</CardTitle>
              <CardDescription>Your question will be sent to your assigned mentor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="p-3 text-sm text-white bg-destructive rounded-md">{error}</div>}
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief subject of your query"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="question" className="text-sm font-medium">
                  Your Question
                </label>
                <Textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Describe your question in detail"
                  rows={6}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Query"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
