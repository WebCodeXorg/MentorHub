"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ref, get, push, remove } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { Calendar, Clock, Trash2, Video, Filter, CheckSquare, Square, Users, GraduationCap, ChevronDown, ChevronRight, MessageSquare, FileText, AlertCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"

interface Mentee {
  uid: string
  name: string
  email: string
  class?: string
  year?: string
  section?: string
  enrollmentNo?: string
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  description: string
  mentorId: string
}

interface Session {
  id: string
  topic: string
  description: string
  datetime: string
  meetingLink: string
  mentees: string[]
  timestamp: number
}

export default function MentorSessions() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [allMentees, setAllMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [topic, setTopic] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [meetingLink, setMeetingLink] = useState("")
  const [selectedMentees, setSelectedMentees] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectAllMentees, setSelectAllMentees] = useState(true)
  const [isClassSelectorExpanded, setIsClassSelectorExpanded] = useState(true)
  const [isMenteeSelectorExpanded, setIsMenteeSelectorExpanded] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch classes from Realtime Database
        const classesRef = ref(db, "classes")
        const classesSnapshot = await get(classesRef)

        const classesData: ClassInfo[] = []
        if (classesSnapshot.exists()) {
          const allClasses = classesSnapshot.val()

          // Filter classes assigned to this mentor
          Object.entries(allClasses).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid) {
              classesData.push({
                id,
                ...data,
              })
            }
          })
        }
        setClasses(classesData)
        
        // Set all classes as selected by default
        setSelectedClasses(classesData.map(c => c.id))

        // Fetch mentees from Realtime Database
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        const menteesData: Mentee[] = []
        if (usersSnapshot.exists()) {
          const allUsers = usersSnapshot.val()

          // Filter mentees assigned to this mentor
          Object.entries(allUsers).forEach(([uid, data]: [string, any]) => {
            if (data.role === "mentee" && data.assignedMentorId === userData.uid) {
              menteesData.push({
                uid,
                name: data.name,
                email: data.email,
                class: data.class,
                year: data.year,
                section: data.section,
                enrollmentNo: data.enrollmentNo,
              })
            }
          })
        }
        setAllMentees(menteesData)
        setMentees(menteesData)
        
        // Pre-select all mentees by default
        setSelectedMentees(menteesData.map(m => m.uid))

        // Fetch sessions from Realtime Database
        const sessionsRef = ref(db, "sessions")
        const sessionsSnapshot = await get(sessionsRef)

        const sessionsData: Session[] = []
        if (sessionsSnapshot.exists()) {
          const allSessions = sessionsSnapshot.val()

          // Filter sessions for this mentor
          Object.entries(allSessions).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid) {
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
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchData()
    }
  }, [userData])

  // Filter mentees when selected classes change
  useEffect(() => {
    if (selectedClasses.length === 0) {
      // When no classes are selected, show empty list
      setMentees([])
      setSelectedMentees([])
      return
    }

    const filtered = allMentees.filter(mentee => {
      // Check if mentee belongs to any of the selected classes
      return classes.some(cls => 
        selectedClasses.includes(cls.id) && 
        mentee.class === cls.name && 
        mentee.year === cls.year && 
        mentee.section === cls.section
      )
    })

    setMentees(filtered)
    
    // Update selected mentees based on filtered mentees
    if (selectAllMentees) {
      setSelectedMentees(filtered.map(m => m.uid))
    } else {
      // Keep only the mentees that are still in the filtered list
      setSelectedMentees(prev => prev.filter(id => filtered.some(m => m.uid === id)))
    }
  }, [selectedClasses, allMentees, classes, selectAllMentees])

  const handleClassSelection = (classId: string) => {
    setSelectedClasses(prev => {
      const newSelectedClasses = prev.includes(classId) 
        ? prev.filter(id => id !== classId) 
        : [...prev, classId]
      
      return newSelectedClasses
    })
  }

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([])
    } else {
      setSelectedClasses(classes.map(c => c.id))
    }
  }

  const handleMenteeSelection = (menteeId: string) => {
    setSelectedMentees(prev => {
      if (prev.includes(menteeId)) {
        return prev.filter(id => id !== menteeId)
      } else {
        return [...prev, menteeId]
      }
    })
  }

  const handleSelectAllMentees = () => {
    setSelectAllMentees(!selectAllMentees)
    if (!selectAllMentees) {
      setSelectedMentees(mentees.map(m => m.uid))
    } else {
      setSelectedMentees([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedClasses.length === 0) {
      setError("Please select at least one class")
      return
    }
    
    if (selectedMentees.length === 0) {
      setError("Please select at least one mentee")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Combine date and time
      const datetime = `${date}T${time}:00`

      // Add session to Realtime Database
      const sessionsRef = ref(db, "sessions")
      await push(sessionsRef, {
        mentorId: userData?.uid,
        topic,
        description,
        datetime,
        meetingLink,
        mentees: selectedMentees,
        timestamp: Date.now(),
      })

      // Reset form
      setTopic("")
      setDescription("")
      setDate("")
      setTime("")
      setMeetingLink("")
      // Don't reset selectedMentees and selectedClasses to maintain the user's selection

      // Refresh sessions
      const sessionsSnapshot = await get(ref(db, "sessions"))
      const sessionsData: Session[] = []

      if (sessionsSnapshot.exists()) {
        const allSessions = sessionsSnapshot.val()

        // Filter sessions for this mentor
        Object.entries(allSessions).forEach(([id, data]: [string, any]) => {
          if (data.mentorId === userData?.uid) {
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
    } catch (error: any) {
      setError(error.message || "Failed to schedule session")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return

    try {
      // Delete session from Realtime Database
      await remove(ref(db, `sessions/${sessionId}`))

      // Update local state
      setSessions(sessions.filter((session) => session.id !== sessionId))
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Mentoring Sessions</h1>
          <p className="text-muted-foreground text-lg mt-2">Schedule and manage sessions with your mentees</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <form onSubmit={handleSubmit}>
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <div>
                    <CardTitle>Schedule New Session</CardTitle>
                    <CardDescription>Create a new mentoring session for your mentees</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {error && (
                  <div className="p-3 text-sm text-white bg-red-500 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="topic" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                    Topic
                  </label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Project Planning, Code Review"
                    className="border-amber-200 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what will be covered"
                    className="border-amber-200 focus:ring-amber-500"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      Date
                    </label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border-amber-200 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="time" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      Time
                    </label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="border-amber-200 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="meetingLink" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Video className="h-4 w-4 text-amber-600" />
                    Meeting Link
                  </label>
                  <Input
                    id="meetingLink"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="e.g., https://meet.google.com/xyz"
                    className="border-amber-200 focus:ring-amber-500"
                    required
                  />
                </div>
                
                {/* Class Filter Section */}
                <div className="space-y-2">
                  <Card className="border border-amber-200 shadow-sm">
                    <CardHeader 
                      className="bg-amber-50 p-3 cursor-pointer flex flex-row items-center justify-between"
                      onClick={() => setIsClassSelectorExpanded(!isClassSelectorExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-amber-600" />
                        <CardTitle className="text-sm font-medium text-gray-700">
                          Filter by Class
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white">
                          {selectedClasses.length} of {classes.length} selected
                        </Badge>
                        {isClassSelectorExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isClassSelectorExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-end mb-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={handleSelectAllClasses}
                                className="text-xs h-7"
                              >
                                {selectedClasses.length === classes.length ? "Deselect All" : "Select All"}
                              </Button>
                            </div>
                            
                            <ScrollArea className="max-h-36">
                              <div className="space-y-2">
                                {classes.length > 0 ? (
                                  classes.map((cls) => (
                                    <div key={cls.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`class-${cls.id}`}
                                        checked={selectedClasses.includes(cls.id)}
                                        onCheckedChange={() => handleClassSelection(cls.id)}
                                      />
                                      <label
                                        htmlFor={`class-${cls.id}`}
                                        className="text-sm flex items-center justify-between w-full"
                                      >
                                        <span>{cls.name} {cls.year} ({cls.section})</span>
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {allMentees.filter(m => 
                                            m.class === cls.name && 
                                            m.year === cls.year && 
                                            m.section === cls.section
                                          ).length} mentees
                                        </Badge>
                                      </label>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-2">No classes found</div>
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>
                
                {/* Mentee Selection Section */}
                <div className="space-y-2">
                  <Card className="border border-amber-200 shadow-sm">
                    <CardHeader 
                      className="bg-amber-50 p-3 cursor-pointer flex flex-row items-center justify-between"
                      onClick={() => setIsMenteeSelectorExpanded(!isMenteeSelectorExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-600" />
                        <CardTitle className="text-sm font-medium text-gray-700">
                          Select Mentees
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white">
                          {selectedMentees.length} of {mentees.length} selected
                        </Badge>
                        {isMenteeSelectorExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isMenteeSelectorExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-end mb-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={handleSelectAllMentees}
                                className="text-xs h-7"
                              >
                                {selectAllMentees ? "Deselect All" : "Select All"}
                              </Button>
                            </div>
                            
                            <ScrollArea className="h-64">
                              <div className="space-y-3">
                                {mentees.length > 0 ? (
                                  mentees.map((mentee) => (
                                    <div key={mentee.uid} className="flex items-center space-x-2 py-1">
                                      <Checkbox
                                        id={mentee.uid}
                                        checked={selectedMentees.includes(mentee.uid)}
                                        onCheckedChange={() => handleMenteeSelection(mentee.uid)}
                                      />
                                      <label
                                        htmlFor={mentee.uid}
                                        className="text-sm flex flex-col"
                                      >
                                        <span className="font-medium">{mentee.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {mentee.enrollmentNo && `${mentee.enrollmentNo} • `}
                                          {mentee.class} {mentee.year} ({mentee.section})
                                        </span>
                                      </label>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-4 flex flex-col items-center">
                                    <GraduationCap className="h-8 w-8 text-gray-300 mb-2" />
                                    {selectedClasses.length > 0 
                                      ? "No mentees found in the selected classes" 
                                      : "Please select at least one class to view mentees"}
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                            
                            <div className="flex justify-between text-xs text-gray-500 mt-3">
                              <span>{selectedMentees.length} mentees selected</span>
                              <span>{mentees.length} mentees available</span>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-amber-500 hover:bg-amber-600 w-full"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Session"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled mentoring sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-amber-200 rounded-md p-4 hover:bg-amber-50/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{session.topic}</h3>
                          <p className="text-sm text-muted-foreground">{session.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-1 text-amber-600" />
                        <span>{formatDate(session.datetime)}</span>
                      </div>
                      <div className="mt-1">
                        <a
                          href={session.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 hover:text-amber-700 hover:underline flex items-center"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Join Meeting
                        </a>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Attendees: {session.mentees.length} mentee(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6">
                  <Calendar className="h-12 w-12 text-amber-300 mb-4" />
                  <p className="text-lg font-medium text-gray-800">No sessions scheduled</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Schedule your first session with your mentees
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
