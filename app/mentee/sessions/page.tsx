"use client"

import { useEffect, useState } from "react"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Calendar, Video } from "lucide-react"

interface Session {
  id: string
  topic: string
  description: string
  datetime: string
  meetingLink: string
  mentorId: string
  mentees: string[]
  timestamp: number
}

interface Mentor {
  uid: string
  name: string
  email: string
}

export default function MenteeSessions() {
  const { userData } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch sessions from Realtime Database
        const sessionsRef = ref(db, "sessions")
        const sessionsSnapshot = await get(sessionsRef)

        const sessionsData: Session[] = []
        if (sessionsSnapshot.exists()) {
          const allSessions = sessionsSnapshot.val()

          // Filter sessions for this mentee
          Object.entries(allSessions).forEach(([id, data]: [string, any]) => {
            if (data.mentees && data.mentees.includes(userData.uid)) {
              sessionsData.push({
                id,
                ...data,
              })
            }
          })

          // Sort by datetime (upcoming first)
          sessionsData.sort((a, b) => {
            return new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          })
        }
        setSessions(sessionsData)

        // Fetch mentor info if assigned
        if (userData.assignedMentorId) {
          const mentorRef = ref(db, `users/${userData.assignedMentorId}`)
          const mentorSnapshot = await get(mentorRef)

          if (mentorSnapshot.exists()) {
            setMentor({
              uid: userData.assignedMentorId,
              ...mentorSnapshot.val(),
            })
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentee") {
      fetchData()
    }
  }, [userData])

  if (!userData || userData.role !== "mentee") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Upcoming Sessions</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Your scheduled mentoring sessions with {mentor?.name || "your mentor"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card key={session.id} className="border-0 shadow-lg rounded-xl overflow-hidden card-hover">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <CardTitle>{session.topic}</CardTitle>
                  <CardDescription>{formatDate(session.datetime)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <p className="text-sm text-gray-600">{session.description}</p>

                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                      <span className="text-sm font-medium">
                        {new Date(session.datetime).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-amber-700">
                      {new Date(session.datetime).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <Button className="w-full bg-amber-500 hover:bg-amber-600" asChild>
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Calendar className="h-16 w-16 text-amber-300 mb-4" />
              <p className="text-xl font-medium text-gray-800 mb-2">No upcoming sessions</p>
              <p className="text-sm text-muted-foreground text-center">
                You don't have any scheduled sessions at the moment
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

