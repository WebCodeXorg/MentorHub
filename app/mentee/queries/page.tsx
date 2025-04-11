"use client"

import { useEffect, useState } from "react"
import { ref, get, onValue } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, ChevronDown, Clock, CheckCircle, XCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Query {
  id: string
  subject: string
  question: string
  answer?: string
  status: "pending" | "answered"
  timestamp: number
  menteeId: string
  mentorId: string
}

export default function QueriesHistory() {
  const { userData } = useAuth()
  const [queries, setQueries] = useState<Query[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedQueries, setExpandedQueries] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!userData) return

    const queriesRef = ref(db, "queries")
    
    // Use onValue to get real-time updates when mentors answer queries
    const unsubscribe = onValue(queriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const allQueries = snapshot.val()
        const menteeQueries: Query[] = []

        Object.entries(allQueries).forEach(([id, data]: [string, any]) => {
          if (data.menteeId === userData.uid) {
            menteeQueries.push({
              id,
              ...data,
              timestamp: data.timestamp || Date.now(),
            })
          }
        })

        // Sort queries by timestamp (newest first)
        menteeQueries.sort((a, b) => b.timestamp - a.timestamp)
        setQueries(menteeQueries)
      } else {
        setQueries([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userData])

  const toggleQueryExpansion = (queryId: string) => {
    setExpandedQueries(prev => ({
      ...prev,
      [queryId]: !prev[queryId]
    }))
  }

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return "Unknown date"
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      return "Invalid date"
    }
  }

  if (!userData || userData.role !== "mentee") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Queries</h1>
            <p className="text-gray-500">View all your queries and mentor responses</p>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600" asChild>
            <Link href="/mentee/ask-query">
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask New Query
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : queries.length === 0 ? (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden text-center p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-16 w-16 text-amber-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Queries Yet</h3>
              <p className="text-gray-500 mb-6">You haven't asked any queries yet.</p>
              <Button className="bg-amber-500 hover:bg-amber-600" asChild>
                <Link href="/mentee/ask-query">Ask Your First Query</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {queries.map((query) => (
              <Card key={query.id} className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div 
                  className={`p-4 flex justify-between items-center cursor-pointer ${
                    query.status === "answered" ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-amber-500 to-amber-600"
                  }`}
                  onClick={() => toggleQueryExpansion(query.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      query.status === "answered" ? "bg-green-300 text-green-800" : "bg-amber-300 text-amber-800"
                    }`}>
                      {query.status === "answered" ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Clock className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{query.subject}</h3>
                      <p className="text-sm text-white opacity-80">{formatTimestamp(query.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={query.status === "answered" ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800"}>
                      {query.status === "answered" ? "Answered" : "Pending"}
                    </Badge>
                    <ChevronDown 
                      className={`h-5 w-5 text-white transition-transform ${expandedQueries[query.id] ? 'rotate-180' : ''}`} 
                    />
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedQueries[query.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                      style={{ height: expandedQueries[query.id] ? "auto" : 0 }}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Your Question</h4>
                            <div className="p-4 bg-amber-50 rounded-lg">
                              <p className="text-gray-800 whitespace-pre-wrap">{query.question}</p>
                            </div>
                          </div>
                          
                          {query.status === "answered" && query.answer ? (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Mentor's Answer</h4>
                              <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-gray-800 whitespace-pre-wrap">{query.answer}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-lg text-center">
                              <Clock className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                              <p className="text-gray-500">Waiting for mentor's response</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
