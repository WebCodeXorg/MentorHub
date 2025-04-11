"use client"

import { useEffect, useState } from "react"
import { ref, get, set } from "firebase/database"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { FileText, MessageSquare, Users, ArrowRight, BookOpen, Shield, Sparkles, Edit, GraduationCap, UserPlus, Eye, EyeOff } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

interface Mentee {
  uid: string
  name: string
  email: string
  enrollmentNo?: string
  profileImage?: string
  classId?: string
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  description: string
  mentorId: string
  menteeCount?: number
}

interface Report {
  id: string
  menteeId: string
  title: string
  timestamp: number
  status: "pending" | "reviewed"
}

interface Query {
  id: string
  menteeId: string
  subject: string
  timestamp: number
  status: "pending" | "answered"
}

interface Session {
  id: string
  topic: string
  datetime: string
}

export default function MentorDashboard() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [adminAccount, setAdminAccount] = useState<{
    uid: string;
    email: string;
    name: string;
    password: string;
  } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false)
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [pendingReports, setPendingReports] = useState<Report[]>([])
  const [pendingQueries, setPendingQueries] = useState<Query[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [menteesWithNames, setMenteesWithNames] = useState<{[key: string]: string}>({})

  // Save admin credentials to Firebase
  const saveAdminCredentials = async (credentials: { email: string; password: string }) => {
    if (!userData?.uid) return
    
    try {
      setIsSaving(true)
      const credentialsRef = ref(db, `users/${userData.uid}/adminCredentials`)
      await set(credentialsRef, credentials)
      
      toast({
        title: "Credentials saved",
        description: "Your admin account credentials have been saved successfully.",
      })
      setHasSavedCredentials(true)
      setIsEditing(false)
      
      // Reload credentials to update the display
      await loadAdminCredentials()
    } catch (error) {
      console.error("Error saving admin credentials:", error)
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Load mentee names for display
  const loadMenteeNames = async (menteeIds: string[]) => {
    const names: {[key: string]: string} = {}
    await Promise.all(
      menteeIds.map(async (id) => {
        const menteeRef = ref(db, `users/${id}`)
        const snapshot = await get(menteeRef)
        if (snapshot.exists()) {
          names[id] = snapshot.val().name
        }
      })
    )
    setMenteesWithNames(names)
  }

  // Load admin credentials from Firebase
  const loadAdminCredentials = async () => {
    if (!userData?.uid) return

    try {
      const mentorRef = ref(db, `users/${userData.uid}`)
      const snapshot = await get(mentorRef)
      
      if (snapshot.exists()) {
        const mentorData = snapshot.val()
        if (mentorData.adminCredentials) {
          setAdminAccount({
            uid: userData.uid,
            email: mentorData.adminCredentials.email,
            password: mentorData.adminCredentials.password,
            name: userData.name || ''
          })
          setHasSavedCredentials(true)
        }
      }
    } catch (error) {
      console.error("Error loading admin credentials:", error)
    }
  }

  // Effect to check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      await loadAdminCredentials()
      if (!userData?.uid) return
      
      try {
        const mentorRef = ref(db, `users/${userData.uid}`)
        const mentorSnapshot = await get(mentorRef)
        
        if (mentorSnapshot.exists()) {
          const mentorData = mentorSnapshot.val()
          setHasAdminAccess(mentorData.hasAdminAccess || false)
        }
      } catch (error) {
        console.error('Error checking admin access:', error)
      }
    }
    
    checkAdminAccess()
  }, [userData?.uid])

  // Effect to load admin account info
  useEffect(() => {
    const loadAdminAccount = async () => {
      if (!userData?.uid || !hasAdminAccess) return
      
      try {
        const mentorRef = ref(db, `users/${userData.uid}`)
        const mentorSnapshot = await get(mentorRef)
        
        if (mentorSnapshot.exists()) {
          const mentorData = mentorSnapshot.val()
          if (mentorData.adminAccountId) {
            // Get the admin account details
            const adminRef = ref(db, `users/${mentorData.adminAccountId}`)
            const adminSnapshot = await get(adminRef)
            
            if (adminSnapshot.exists()) {
              const adminData = adminSnapshot.val()
              // Get admin credentials from mentor data
              const adminCredentials = mentorData.adminCredentials || {}
              setAdminAccount({
                uid: adminData.uid,
                email: adminData.email,
                name: adminData.name,
                password: mentorData.adminCredentials?.password || ''
              })
              setHasSavedCredentials(true)
            }
          }
        }
      } catch (error) {
        console.error('Error loading admin account:', error)
      }
    }
    
    loadAdminAccount()
  }, [userData?.uid, hasAdminAccess])

  // Effect to load mentor data
  useEffect(() => {
    const loadData = async () => {
      if (!userData?.uid) return
      setLoading(true)
      
      try {
        
        // Load mentees
        const menteesRef = ref(db, `mentors/${userData.uid}/mentees`)
        const menteesSnapshot = await get(menteesRef)
        if (menteesSnapshot.exists()) {
          const menteeIds = Object.keys(menteesSnapshot.val())
          const menteePromises = menteeIds.map(async (id) => {
            const menteeRef = ref(db, `users/${id}`)
            const menteeSnapshot = await get(menteeRef)
            if (menteeSnapshot.exists()) {
              return { uid: id, ...menteeSnapshot.val() }
            }
            return null
          })
          const menteeData = (await Promise.all(menteePromises)).filter(Boolean) as Mentee[]
          setMentees(menteeData)
          
          // Load mentee names for display
          await loadMenteeNames(menteeIds)
        }
        
        // Load classes
        const classesRef = ref(db, `mentors/${userData.uid}/classes`)
        const classesSnapshot = await get(classesRef)
        if (classesSnapshot.exists()) {
          const classData = Object.entries(classesSnapshot.val()).map(([id, data]) => ({
            id,
            ...(data as Omit<ClassInfo, 'id'>)
          }))
          setClasses(classData)
        }
        
        // Load pending reports
        const reportsRef = ref(db, `mentors/${userData.uid}/reports`)
        const reportsSnapshot = await get(reportsRef)
        if (reportsSnapshot.exists()) {
          const pendingReportData = Object.entries(reportsSnapshot.val())
            .map(([id, data]) => ({ id, ...(data as Omit<Report, 'id'>) }))
            .filter(report => report.status === 'pending')
          setPendingReports(pendingReportData)
        }
        
        // Load pending queries
        const queriesRef = ref(db, `mentors/${userData.uid}/queries`)
        const queriesSnapshot = await get(queriesRef)
        if (queriesSnapshot.exists()) {
          const pendingQueryData = Object.entries(queriesSnapshot.val())
            .map(([id, data]) => ({ id, ...(data as Omit<Query, 'id'>) }))
            .filter(query => query.status === 'pending')
          setPendingQueries(pendingQueryData)
        }

        // Load upcoming sessions
        const sessionsRef = ref(db, `mentors/${userData.uid}/sessions`)
        const sessionsSnapshot = await get(sessionsRef)
        if (sessionsSnapshot.exists()) {
          const sessionData = Object.entries(sessionsSnapshot.val())
            .map(([id, data]) => ({ id, ...(data as Omit<Session, 'id'>) }))
            // Filter for upcoming sessions (sessions with datetime in the future)
            .filter(session => new Date(session.datetime) > new Date())
            // Sort by datetime
            .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
          setUpcomingSessions(sessionData)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setLoading(false)
      }
    }
    
    if (userData) {
      loadData()
    }
  }, [userData])

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Get all users
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        const menteesData: Mentee[] = []
        const menteeNames: {[key: string]: string} = {}

        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val()

          // Filter mentees assigned to this mentor
          Object.entries(usersData).forEach(([uid, data]: [string, any]) => {
            if (data.role === "mentee" && data.assignedMentorId === userData.uid) {
              menteesData.push({
                uid,
                ...data,
              })
              menteeNames[uid] = data.name
            }
          })
        }
        setMentees(menteesData)
        setMenteesWithNames(menteeNames)

        // Get classes
        const classesRef = ref(db, "classes")
        const classesSnapshot = await get(classesRef)

        const classesData: ClassInfo[] = []
        if (classesSnapshot.exists()) {
          const allClasses = classesSnapshot.val()

          // Filter classes created by this mentor
          Object.entries(allClasses).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid) {
              // Count mentees in this class
              const menteeCount = menteesData.filter(mentee => mentee.classId === id).length
              
              classesData.push({
                id,
                ...data,
                menteeCount
              })
            }
          })
        }
        setClasses(classesData)

        // Get reports
        const reportsRef = ref(db, "reports")
        const reportsSnapshot = await get(reportsRef)

        const pendingReportsData: Report[] = []

        if (reportsSnapshot.exists()) {
          const reportsData = reportsSnapshot.val()

          // Filter pending reports for this mentor
          Object.entries(reportsData).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid && data.status === "pending") {
              pendingReportsData.push({
                id,
                ...data,
              })
            }
          })
        }
        setPendingReports(pendingReportsData)

        // Get queries
        const queriesRef = ref(db, "queries")
        const queriesSnapshot = await get(queriesRef)

        const pendingQueriesData: Query[] = []

        if (queriesSnapshot.exists()) {
          const queriesData = queriesSnapshot.val()

          // Filter pending queries for this mentor
          Object.entries(queriesData).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid && data.status === "pending") {
              pendingQueriesData.push({
                id,
                ...data,
              })
            }
          })
        }
        setPendingQueries(pendingQueriesData)

        // Get sessions
        const sessionsRef = ref(db, "sessions")
        const sessionsSnapshot = await get(sessionsRef)

        const upcomingSessionsData: Session[] = []

        if (sessionsSnapshot.exists()) {
          const sessionsData = sessionsSnapshot.val()

          // Filter sessions for this mentor
          Object.entries(sessionsData).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid) {
              upcomingSessionsData.push({
                id,
                ...data,
              })
            }
          })
        }
        setUpcomingSessions(upcomingSessionsData)
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

  if (!userData || (userData.role !== "mentor" && userData.role !== "admin+mentor")) {
    return null
  }


  
  const loginAsAdmin = async (credentials: { email: string; password: string }) => {
    if (!credentials?.email || !credentials?.password) {
      toast({
        title: "Missing credentials",
        description: "Please provide both email and password to login.",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsLoggingIn(true)
      
      // Sign out current user (mentor)
      await signOut(auth)
      
      // Sign in as admin
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
      
      toast({
        title: "Login successful",
        description: "You are now logged in as an admin.",
      })
      
      // Redirect to admin dashboard
      router.push("/admin/dashboard")
    } catch (error) {
      console.error("Error logging in as admin:", error)
      toast({
        title: "Login failed",
        description: "Invalid credentials or account does not exist.",
        variant: "destructive"
      })
      
      // Try to sign back in as mentor if admin login fails
      try {
        window.location.reload()
      } catch (e) {
        console.error("Failed to restore mentor session:", e)
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSwitchToAdmin = async () => {
    if (!adminAccount) return;
    
    try {
      setIsLoggingIn(true);
      
      // Sign out from mentor account
      await signOut(auth);
      
      // Sign in with admin account
      await signInWithEmailAndPassword(auth, adminAccount.email, adminAccount.password);
      
      toast({
        title: "Switched to admin account",
        description: "You are now logged in as an admin."
      });
      
      // Redirect to admin dashboard
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Error switching to admin account:", error);
      toast({
        title: "Error",
        description: "Failed to switch to admin account. Please try again.",
        variant: "destructive"
      });
      
      // Try to sign back in as mentor if admin login fails
      try {
        window.location.reload();
      } catch (e) {
        console.error("Failed to restore mentor session:", e);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {userData?.name}</h1>
            <p className="text-muted-foreground">Here's an overview of your mentoring activities</p>
          </div>
          
          {/* Admin Account Switch Button for admin+mentor role */}
          {userData?.role === "admin+mentor" && adminAccount && (
            <Button 
              variant="outline"
              className="flex items-center gap-2 bg-amber-50 border-amber-200 hover:bg-amber-100"
              onClick={handleSwitchToAdmin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></span>
                  Switching...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-amber-600" />
                  Switch to Admin
                </>
              )}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Mentees</p>
                      <p className="text-3xl font-bold text-amber-600">{mentees.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <Users className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/mentees" className="flex items-center">
                      View all mentees <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                      <p className="text-3xl font-bold text-amber-600">{classes.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <BookOpen className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/classes" className="flex items-center">
                      Manage classes <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                      <p className="text-3xl font-bold text-amber-600">{pendingReports.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/reports" className="flex items-center">
                      Review reports <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Queries</p>
                      <p className="text-3xl font-bold text-amber-600">{pendingQueries.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <MessageSquare className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/queries" className="flex items-center">
                      Answer queries <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Admin Credentials Section */}
            {hasAdminAccess && (
              <div className="mb-8">
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-500/20 to-purple-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <CardTitle>Admin Credentials</CardTitle>
                      </div>
                      {!isEditing && adminAccount && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Credentials
                        </Button>
                      )}
                    </div>
                    <CardDescription>
                      {adminAccount 
                        ? "Use these credentials to access your admin account"
                        : "Set up your admin account credentials"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label>Admin Email</Label>
                            <Input 
                              type="email" 
                              value={adminAccount?.email || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminAccount(prev => ({...prev!, email: e.target.value}))}
                              placeholder="Enter admin email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Admin Password</Label>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                value={adminAccount?.password || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminAccount(prev => ({...prev!, password: e.target.value}))}
                                placeholder="Enter admin password"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false)
                              // Reset to original values if canceling
                              setAdminAccount(adminAccount)
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (adminAccount) {
                                saveAdminCredentials({
                                  email: adminAccount.email,
                                  password: adminAccount.password
                                })
                              }
                              setIsEditing(false)
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save Credentials"}
                          </Button>
                        </div>
                      </div>
                    ) : adminAccount ? (
                      <div className="space-y-4">
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                            <div>
                              <p className="text-sm text-purple-600 font-medium">Admin Email</p>
                              <p className="text-gray-700">{adminAccount.email}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          onClick={handleSwitchToAdmin}
                          disabled={isLoggingIn}
                        >
                          {isLoggingIn ? (
                            "Switching..."
                          ) : (
                            <>
                              Switch to Admin Account
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No admin credentials set</p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAdminAccount({
                              uid: '',
                              email: '',
                              name: '',
                              password: ''
                            })
                            setIsEditing(true)
                          }}
                          className="mt-2"
                        >
                          Set Up Credentials
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Classes and Mentees */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden h-full">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-amber-600" />
                        <CardTitle>My Classes</CardTitle>
                      </div>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600" asChild>
                        <Link href="/mentor/classes">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Manage Classes
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {classes.length > 0 ? (
                      <div className="space-y-4">
                        {classes.map((classInfo) => (
                          <div key={classInfo.id} className="border border-amber-100 rounded-xl p-4 hover:bg-amber-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-lg">{classInfo.name}</h3>
                              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">
                                {classInfo.year}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <span>Section: {classInfo.section}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{classInfo.menteeCount || 0} mentees</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{classInfo.description}</p>
                            <div className="flex justify-between items-center">
                              <Button variant="outline" size="sm" className="border-amber-200 hover:bg-amber-50 text-amber-700" asChild>
                                <Link href={`/mentor/mentees?classId=${classInfo.id}`}>
                                  <Users className="h-3 w-3 mr-1" />
                                  View Mentees
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" className="border-amber-200 hover:bg-amber-50 text-amber-700" asChild>
                                <Link href={`/mentor/mentees?classId=${classInfo.id}`}>
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Add Mentee
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <BookOpen className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-800 mb-2">No classes created yet</p>
                        <p className="text-sm text-muted-foreground mb-4">Create classes to organize your mentees</p>
                        <Button className="bg-amber-500 hover:bg-amber-600" asChild>
                          <Link href="/mentor/classes">Create Your First Class</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden h-full">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-600" />
                    <CardTitle>Recent Mentees</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {mentees.length > 0 ? (
                    <div className="space-y-4">
                      {mentees.slice(0, 5).map((mentee) => (
                        <div key={mentee.uid} className="flex items-center gap-3">
                          {mentee.profileImage ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                              <Image 
                                src={mentee.profileImage} 
                                alt={mentee.name} 
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold">
                              {mentee.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mentee.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{mentee.enrollmentNo || mentee.email}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" asChild>
                              <Link href={`/mentee/${mentee.uid}`} title="View Profile">
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" asChild>
                              <Link href={`/mentor/edit-mentee/${mentee.uid}`} title="Edit Mentee">
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No mentees assigned yet</p>
                    </div>
                  )}
                </CardContent>
                {mentees.length > 5 && (
                  <CardFooter className="border-t p-4">
                    <Button variant="link" className="w-full text-amber-600" asChild>
                      <Link href="/mentor/mentees">View all mentees</Link>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>

            {/* Reports and Queries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                    <CardTitle>Pending Reports</CardTitle>
                  </div>
                  <CardDescription>Reports that need your review</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {pendingReports.length > 0 ? (
                    <div className="space-y-4">
                      {pendingReports.slice(0, 3).map((report) => (
                        <div
                          key={report.id}
                          className="flex justify-between items-center p-3 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <span>By: {menteesWithNames[report.menteeId] || "Unknown"}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{formatDate(report.timestamp)}</span>
                            </p>
                          </div>
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600" asChild>
                            <a href="/mentor/reports">Review</a>
                          </Button>
                        </div>
                      ))}
                      {pendingReports.length > 3 && (
                        <Button variant="link" className="w-full text-amber-600 hover:text-amber-700" asChild>
                          <a href="/mentor/reports">View all reports</a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No pending reports</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-amber-600" />
                    <CardTitle>Pending Queries</CardTitle>
                  </div>
                  <CardDescription>Questions from your mentees</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {pendingQueries.length > 0 ? (
                    <div className="space-y-4">
                      {pendingQueries.slice(0, 3).map((query) => (
                        <div
                          key={query.id}
                          className="flex justify-between items-center p-3 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{query.subject}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <span>By: {menteesWithNames[query.menteeId] || "Unknown"}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{formatDate(query.timestamp)}</span>
                            </p>
                          </div>
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600" asChild>
                            <a href="/mentor/queries">Answer</a>
                          </Button>
                        </div>
                      ))}
                      {pendingQueries.length > 3 && (
                        <Button variant="link" className="w-full text-amber-600 hover:text-amber-700" asChild>
                          <a href="/mentor/queries">View all queries</a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No pending queries</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <CardTitle>Mentor Tips</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-medium text-amber-800 mb-2">Effective Feedback</h3>
                    <p className="text-sm text-gray-600">
                      Provide specific, actionable feedback that helps mentees understand what they did well and how
                      they can improve.
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-medium text-amber-800 mb-2">Regular Check-ins</h3>
                    <p className="text-sm text-gray-600">
                      Schedule regular sessions to maintain momentum and provide consistent guidance to your mentees.
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-medium text-amber-800 mb-2">Ask Questions</h3>
                    <p className="text-sm text-gray-600">
                      Ask open-ended questions to encourage reflection and help mentees develop their own solutions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
