"use client"

import { useEffect, useState } from "react"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { 
  FileText, 
  Calendar, 
  MessageSquare, 
  User, 
  ChevronRight, 
  BookOpen, 
  GraduationCap,
  ChevronDown,
  School,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Clock,
  Shield,
  Lock,
  CheckCircle
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Report {
  id: string
  timestamp: number
  title: string
  feedback?: string
  status: string
}

interface Session {
  id: string
  datetime: string
  topic: string
  meetingLink: string
}

interface Query {
  id: string
  question: string
  subject: string
  answer?: string
  status: "pending" | "answered"
  timestamp: number
  menteeId: string
  mentorId: string
}

interface Mentor {
  uid: string
  name: string
  email: string
  photoURL?: string
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  description: string
  mentorId: string
}

export default function MenteeDashboard() {
  const { userData } = useAuth()
  const [menteeData, setMenteeData] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [queries, setQueries] = useState<Query[]>([])
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState({
    profile: false,
    class: false,
    mentor: false
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(timer)
  }, [])

  // Function to check if a session time has arrived
  const isSessionTimeArrived = (sessionDatetime: string) => {
    const sessionTime = new Date(sessionDatetime)
    return currentTime >= sessionTime
  }

  const toggleCardExpansion = (cardName: 'profile' | 'class' | 'mentor') => {
    setExpandedCards(prev => ({
      profile: false,
      class: false,
      mentor: false,
      [cardName]: !prev[cardName]
    }))
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch complete mentee data
        const menteeRef = ref(db, `users/${userData.uid}`)
        const menteeSnapshot = await get(menteeRef)
        
        if (menteeSnapshot.exists()) {
          const completeData = {
            uid: userData.uid,
            ...menteeSnapshot.val()
          }
          setMenteeData(completeData)
          
          // Fetch class info if assigned
          if (completeData.classId) {
            const classRef = ref(db, `classes/${completeData.classId}`)
            const classSnapshot = await get(classRef)

            if (classSnapshot.exists()) {
              setClassInfo({
                id: completeData.classId,
                ...classSnapshot.val()
              })
            }
          }
          
          // Fetch mentor info if assigned
          if (completeData.assignedMentorId) {
            const mentorRef = ref(db, `users/${completeData.assignedMentorId}`)
            const mentorSnapshot = await get(mentorRef)

            if (mentorSnapshot.exists()) {
              setMentor({
                uid: completeData.assignedMentorId,
                ...mentorSnapshot.val(),
              })
            }
          }
        }

        // Fetch reports
        const reportsRef = ref(db, "reports")
        const reportsSnapshot = await get(reportsRef)

        const reportsData: Report[] = []
        if (reportsSnapshot.exists()) {
          const allReports = reportsSnapshot.val()

          // Filter reports for this mentee
          Object.entries(allReports).forEach(([id, data]: [string, any]) => {
            if (data.menteeId === userData.uid) {
              reportsData.push({
                id,
                ...data,
              })
            }
          })
        }
        setReports(reportsData)

        // Fetch upcoming sessions
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
        }
        setSessions(sessionsData)

        // Fetch queries
        const queriesRef = ref(db, "queries")
        const queriesSnapshot = await get(queriesRef)

        const queriesData: Query[] = []
        if (queriesSnapshot.exists()) {
          const allQueries = queriesSnapshot.val()

          // Filter queries for this mentee
          Object.entries(allQueries).forEach(([id, data]: [string, any]) => {
            if (data.menteeId === userData.uid) {
              queriesData.push({
                id,
                ...data,
              })
            }
          })
        }
        setQueries(queriesData)
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
      <div className="container mx-auto py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Welcome, {menteeData?.name || "Mentee"}</h1>

            {/* Main dashboard layout - 2 columns on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column - Summary Cards */}
              <div className="space-y-4">
                {/* Summary Cards - 2 per row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Reports Card */}
                  <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <CardTitle className="text-sm font-medium">Reports Submitted</CardTitle>
                      <div className="bg-amber-100 p-1.5 rounded-lg">
                        <FileText className="h-4 w-4 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-gray-800">{reports.length}</div>
                      <a
                        href="/mentee/reports"
                        className="text-amber-600 hover:text-amber-700 text-xs flex items-center mt-1"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>

                  {/* Sessions Card */}
                  <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                      <div className="bg-amber-100 p-1.5 rounded-lg">
                        <Calendar className="h-4 w-4 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-gray-800">{sessions.length}</div>
                      <a
                        href="/mentee/sessions"
                        className="text-amber-600 hover:text-amber-700 text-xs flex items-center mt-1"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                </div>

                {/* Second row of summary cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Queries Card */}
                  <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <CardTitle className="text-sm font-medium">Pending Queries</CardTitle>
                      <div className="bg-amber-100 p-1.5 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-gray-800">
                        {queries.filter((q) => q.status === "pending").length}
                      </div>
                      <a
                        href="/mentee/queries"
                        className="text-amber-600 hover:text-amber-700 text-xs flex items-center mt-1"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>

                  {/* Answered Queries Card */}
                  <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <CardTitle className="text-sm font-medium">Answered Queries</CardTitle>
                      <div className="bg-amber-100 p-1.5 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-gray-800">
                        {queries.filter((q) => q.status === "answered").length}
                      </div>
                      <a
                        href="/mentee/queries"
                        className="text-amber-600 hover:text-amber-700 text-xs flex items-center mt-1"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Reports Section */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden mt-6">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                    <CardTitle>Recent Reports</CardTitle>
                    <CardDescription>Your recently submitted reports</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {reports.length > 0 ? (
                      <div className="space-y-4">
                        {reports.slice(0, 3).map((report) => (
                          <div
                            key={report.id}
                            className="flex justify-between items-center p-3 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <div>
                              <p className="font-medium">{report.title || `Report #${report.id.substring(0, 6)}`}</p>
                              <p className="text-sm text-muted-foreground">{formatDate(report.timestamp)}</p>
                            </div>
                            <div className="text-sm">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  report.feedback ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {report.feedback ? "Feedback received" : "Pending feedback"}
                              </span>
                            </div>
                          </div>
                        ))}
                        {reports.length > 3 && (
                          <Button variant="link" className="w-full text-amber-600 hover:text-amber-700" asChild>
                            <a href="/mentee/reports">View all reports</a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <FileText className="h-12 w-12 text-amber-300 mx-auto mb-3" />
                        <p className="text-gray-500">No reports submitted yet</p>
                        <Button variant="link" className="text-amber-600 hover:text-amber-700 mt-2" asChild>
                          <a href="/mentee/submit-report">Submit your first report</a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Sessions Section */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                    <CardTitle>Upcoming Sessions</CardTitle>
                    <CardDescription>Your scheduled mentoring sessions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {sessions.length > 0 ? (
                      <div className="space-y-4">
                        {sessions.slice(0, 3).map((session) => (
                          <div
                            key={session.id}
                            className="p-3 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium">{session.topic}</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`px-2 py-1 text-xs rounded-full ${
                                      isSessionTimeArrived(session.datetime) 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-blue-100 text-blue-800"
                                    }`}>
                                      {isSessionTimeArrived(session.datetime) ? "Join Now" : "Upcoming"}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isSessionTimeArrived(session.datetime) 
                                      ? "Session is active now" 
                                      : "Session hasn't started yet"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mb-2">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{new Date(session.datetime).toLocaleString()}</span>
                            </div>
                            {isSessionTimeArrived(session.datetime) && session.meetingLink && (
                              <Button size="sm" className="w-full mt-2 bg-green-500 hover:bg-green-600" asChild>
                                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                                  Join Session
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                        {sessions.length > 3 && (
                          <Button variant="link" className="w-full text-amber-600 hover:text-amber-700" asChild>
                            <a href="/mentee/sessions">View all sessions</a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="h-12 w-12 text-amber-300 mx-auto mb-3" />
                        <p className="text-gray-500">No upcoming sessions scheduled</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Information Cards */}
              <div className="space-y-4">
                {/* Information Cards - Profile, Class, and Mentor Info in a single column */}
                <div className="grid grid-cols-1 gap-4 mb-8 max-w-md mx-auto">
                  {/* Profile Card */}
                  <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => toggleCardExpansion('profile')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-amber-300 flex items-center justify-center text-amber-800 font-semibold">
                          {menteeData?.profileImage || menteeData?.photoURL ? (
                            <Image 
                              src={menteeData.profileImage || menteeData.photoURL} 
                              alt={menteeData.name} 
                              width={40}
                              height={40}
                              className="object-cover rounded-full"
                            />
                          ) : (
                            <User className="h-6 w-6 text-amber-800" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">My Profile</h3>
                          <p className="text-amber-100 text-sm">Personal Information</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-white transition-transform ${expandedCards.profile ? 'rotate-180' : ''}`} 
                      />
                    </div>
                    <AnimatePresence>
                      {expandedCards.profile && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                          style={{ height: expandedCards.profile ? "auto" : 0 }}
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center mb-4">
                              <div className="h-24 w-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-semibold text-2xl mb-3 overflow-hidden">
                                {menteeData?.profileImage || menteeData?.photoURL ? (
                                  <Image 
                                    src={menteeData.profileImage || menteeData.photoURL} 
                                    alt={menteeData.name} 
                                    width={96}
                                    height={96}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  menteeData?.name?.substring(0, 2).toUpperCase() || "ME"
                                )}
                              </div>
                              <h3 className="text-xl font-bold">{menteeData?.name}</h3>
                              <Badge className="mt-1 bg-amber-100 text-amber-800 hover:bg-amber-200">Mentee</Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 mt-4">
                              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md">
                                <Mail className="h-4 w-4 text-amber-600" />
                                <div>
                                  <p className="text-xs text-gray-500">Email</p>
                                  <p className="font-medium">{menteeData?.email}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md">
                                <GraduationCap className="h-4 w-4 text-amber-600" />
                                <div>
                                  <p className="text-xs text-gray-500">Enrollment Number</p>
                                  <p className="font-medium">{menteeData?.enrollmentNo || "Not specified"}</p>
                                </div>
                              </div>
                              
                              {menteeData?.parentMobile && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md">
                                  <Phone className="h-4 w-4 text-amber-600" />
                                  <div>
                                    <p className="text-xs text-gray-500">Parent Contact</p>
                                    <p className="font-medium">{menteeData.parentMobile}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-center mb-4">
                              <h3 className="text-xl font-bold">{menteeData?.name}</h3>
                              <p className="text-gray-500">{menteeData?.email}</p>
                              <Link href="/mentee/my-profile" className="text-sm text-amber-600 hover:text-amber-700 inline-flex items-center mt-2">
                                View full profile <ChevronRight className="h-3 w-3 ml-1" />
                              </Link>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Class Information Card */}
                  <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => toggleCardExpansion('class')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-300 flex items-center justify-center text-blue-800 font-semibold">
                          <School className="h-6 w-6 text-blue-800" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Class Information</h3>
                          <p className="text-blue-100 text-sm">Academic Details</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-white transition-transform ${expandedCards.class ? 'rotate-180' : ''}`} 
                      />
                    </div>
                    <AnimatePresence>
                      {expandedCards.class && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                          style={{ height: expandedCards.class ? "auto" : 0 }}
                        >
                          <CardContent className="p-6">
                            {classInfo ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-center mb-4">
                                  <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                                    <BookOpen className="h-10 w-10 text-blue-600" />
                                  </div>
                                </div>
                                
                                <div className="text-center mb-4">
                                  <h3 className="text-xl font-bold">{classInfo.name}</h3>
                                  <p className="text-gray-500">Year: {classInfo.year} | Section: {classInfo.section}</p>
                                </div>
                                
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {classInfo.description || "No class description available."}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex flex-col items-center p-3 bg-blue-50 rounded-md">
                                    <p className="text-xs text-gray-500">Year</p>
                                    <p className="font-medium text-lg">{classInfo.year}</p>
                                  </div>
                                  
                                  <div className="flex flex-col items-center p-3 bg-blue-50 rounded-md">
                                    <p className="text-xs text-gray-500">Section</p>
                                    <p className="font-medium text-lg">{classInfo.section}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <School className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                                <p className="text-gray-500">No class information available</p>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Mentor Information Card */}
                  <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => toggleCardExpansion('mentor')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-semibold">
                          <Briefcase className="h-6 w-6 text-green-800" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">My Mentor</h3>
                          <p className="text-green-100 text-sm">Mentor Details</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-white transition-transform ${expandedCards.mentor ? 'rotate-180' : ''}`} 
                      />
                    </div>
                    <AnimatePresence>
                      {expandedCards.mentor && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                          style={{ height: expandedCards.mentor ? "auto" : 0 }}
                        >
                          <CardContent className="p-6">
                            {mentor ? (
                              <div className="flex flex-col items-center">
                                <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-semibold text-2xl mb-3 overflow-hidden">
                                  {mentor.photoURL ? (
                                    <Image 
                                      src={mentor.photoURL} 
                                      alt={mentor.name} 
                                      width={96}
                                      height={96}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    mentor.name.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <h3 className="text-xl font-bold">{mentor.name}</h3>
                                <Badge className="mt-1 bg-green-100 text-green-800 hover:bg-green-200">Mentor</Badge>
                                
                                <div className="w-full mt-4 space-y-3">
                                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md">
                                    <Mail className="h-4 w-4 text-green-600" />
                                    <div className="w-full overflow-hidden">
                                      <p className="text-xs text-gray-500">Email</p>
                                      <p className="font-medium truncate">{mentor.email}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <Button className="mt-4 bg-green-500 hover:bg-green-600 w-full" asChild>
                                  <Link href={`/mentee/contact-mentor/${mentor.uid}`}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Contact Mentor
                                  </Link>
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <User className="h-12 w-12 text-green-300 mx-auto mb-3" />
                                <p className="text-gray-500">No mentor assigned yet</p>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
