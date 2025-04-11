"use client"

import { useEffect, useState } from "react"
import { ref, get, update, onValue, off } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { MessageSquare } from "lucide-react"

interface Mentee {
  uid: string
  name: string
  email: string
}

interface Query {
  id: string
  menteeId: string
  subject: string
  question: string
  answer?: string
  timestamp: number
  status: "pending" | "answered"
}

export default function MentorQueries() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Record<string, Mentee>>({})
  const [queries, setQueries] = useState<Query[]>([])
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [answer, setAnswer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData || userData.role !== "mentor") return
    
    const fetchMentees = async () => {
      try {
        // Fetch mentees from Realtime Database
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        const menteesData: Record<string, Mentee> = {}
        if (usersSnapshot.exists()) {
          const allUsers = usersSnapshot.val()

          // Filter mentees assigned to this mentor
          Object.entries(allUsers).forEach(([uid, data]: [string, any]) => {
            if (data.role === "mentee" && data.assignedMentorId === userData.uid) {
              menteesData[uid] = {
                uid,
                name: data.name,
                email: data.email,
              }
            }
          })
        }
        setMentees(menteesData)
      } catch (error) {
        console.error("Error fetching mentees:", error)
      }
    }

    // Set up real-time listener for queries
    const setupQueriesListener = () => {
      const queriesRef = ref(db, "queries")
      
      // Use onValue to get real-time updates when new queries are added
      onValue(queriesRef, (snapshot) => {
        try {
          const queriesData: Query[] = []
          if (snapshot.exists()) {
            const allQueries = snapshot.val()

            // Filter queries for this mentor
            Object.entries(allQueries).forEach(([id, data]: [string, any]) => {
              if (data.mentorId === userData.uid) {
                queriesData.push({
                  id,
                  ...data,
                  timestamp: data.timestamp || Date.now(),
                })
              }
            })

            // Sort by timestamp (newest first) and status (pending first)
            queriesData.sort((a, b) => {
              if (a.status === "pending" && b.status !== "pending") return -1
              if (a.status !== "pending" && b.status === "pending") return 1
              return b.timestamp - a.timestamp
            })
          }

          setQueries(queriesData)

          // Set first pending query as selected if no query is currently selected
          if (!selectedQuery) {
            const pendingQuery = queriesData.find((q) => q.status === "pending")
            if (pendingQuery) {
              setSelectedQuery(pendingQuery)
              setAnswer(pendingQuery.answer || "")
            } else if (queriesData.length > 0) {
              setSelectedQuery(queriesData[0])
              setAnswer(queriesData[0].answer || "")
            }
          } else {
            // If a query is already selected, update its data if it changed
            const updatedSelectedQuery = queriesData.find(q => q.id === selectedQuery.id)
            if (updatedSelectedQuery && updatedSelectedQuery.answer !== selectedQuery.answer) {
              setSelectedQuery(updatedSelectedQuery)
              setAnswer(updatedSelectedQuery.answer || "")
            }
          }
          
          setLoading(false)
        } catch (error) {
          console.error("Error processing queries:", error)
        }
      })

      // Return cleanup function
      return () => {
        off(queriesRef)
      }
    }

    fetchMentees()
    const cleanupListener = setupQueriesListener()
    
    return () => {
      if (cleanupListener) cleanupListener()
    }
  }, [userData, selectedQuery])

  const handleSelectQuery = (query: Query) => {
    setSelectedQuery(query)
    setAnswer(query.answer || "")
  }

  const handleSubmitAnswer = async () => {
    if (!selectedQuery) return

    setIsSubmitting(true)

    try {
      // Update query in Realtime Database
      await update(ref(db, `queries/${selectedQuery.id}`), {
        answer,
        status: "answered",
      })

      // Update local state
      setQueries(
        queries.map((query) => (query.id === selectedQuery.id ? { ...query, answer, status: "answered" } : query)),
      )
      setSelectedQuery((prev) => (prev ? { ...prev, answer, status: "answered" } : null))
    } catch (error) {
      console.error("Error submitting answer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Mentee Queries</h1>
          <p className="text-muted-foreground text-lg mt-2">Answer questions from your mentees</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : queries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <CardTitle>Queries</CardTitle>
                  <CardDescription>Select a query to answer</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {queries.map((query) => (
                      <div
                        key={query.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedQuery?.id === query.id ? "bg-amber-500 text-white" : "hover:bg-amber-50"
                        }`}
                        onClick={() => handleSelectQuery(query)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p
                              className={`font-medium ${selectedQuery?.id === query.id ? "text-white" : "text-gray-800"}`}
                            >
                              {query.subject}
                            </p>
                            <p
                              className={`text-xs ${selectedQuery?.id === query.id ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              From: {mentees[query.menteeId]?.name || "Unknown"}
                            </p>
                            <p
                              className={`text-xs ${selectedQuery?.id === query.id ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {formatDate(query.timestamp)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              query.status === "answered"
                                ? selectedQuery?.id === query.id
                                  ? "bg-white/20 text-white"
                                  : "bg-green-100 text-green-800"
                                : selectedQuery?.id === query.id
                                  ? "bg-white/20 text-white"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {query.status === "answered" ? "Answered" : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              {selectedQuery ? (
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                    <CardTitle>{selectedQuery.subject}</CardTitle>
                    <CardDescription>
                      From {mentees[selectedQuery.menteeId]?.name || "Unknown"} on {formatDate(selectedQuery.timestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Question</h3>
                      <p className="text-sm text-gray-800">{selectedQuery.question}</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700">Your Answer</h3>
                      <Textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="border-amber-200 focus:ring-amber-500 min-h-[150px]"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-6 py-4">
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={
                        isSubmitting || (selectedQuery.status === "answered" && answer === selectedQuery.answer)
                      }
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : selectedQuery.status === "answered"
                          ? "Update Answer"
                          : "Submit Answer"}
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <MessageSquare className="h-16 w-16 text-amber-300 mb-4" />
                    <p className="text-xl font-medium text-gray-800 mb-2">No query selected</p>
                    <p className="text-sm text-muted-foreground text-center">
                      Select a query from the list to view and answer
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <MessageSquare className="h-16 w-16 text-amber-300 mb-4" />
              <p className="text-xl font-medium text-gray-800 mb-2">No queries yet</p>
              <p className="text-sm text-muted-foreground text-center">Your mentees haven't asked any questions yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
