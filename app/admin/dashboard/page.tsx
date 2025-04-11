"use client"

import { useEffect, useState } from "react"
import { ref, get, set } from "firebase/database"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Users, FileText, MessageSquare, Sparkles, Save, UserPlus, Key, LogIn, Edit, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalMentors: 0,
    totalMentees: 0,
  })
  const [loading, setLoading] = useState(true)
  const [mentorCredentials, setMentorCredentials] = useState({
    email: "",
    password: "",
    name: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false)

  useEffect(() => {
    // Load saved mentor credentials if they exist
    const loadMentorCredentials = async () => {
      if (!userData?.uid) return
      
      try {
        const credentialsRef = ref(db, `adminSettings/${userData.uid}/mentorCredentials`)
        const snapshot = await get(credentialsRef)
        
        if (snapshot.exists()) {
          const savedCredentials = snapshot.val()
          setMentorCredentials({
            email: savedCredentials.email || "",
            password: savedCredentials.password || "",
            name: savedCredentials.name || ""
          })
          setHasSavedCredentials(true)
        }
      } catch (error) {
        console.error("Error loading mentor credentials:", error)
      }
    }
    
    if (userData && userData.role === "admin") {
      loadMentorCredentials()
    }
  }, [userData])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get all users
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        let mentorCount = 0
        let menteeCount = 0

        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val()

          // Count mentors and mentees
          Object.values(usersData).forEach((user: any) => {
            if (user.role === "mentor") mentorCount++
            if (user.role === "mentee") menteeCount++
          })
        }

        setStats({
          totalMentors: mentorCount,
          totalMentees: menteeCount,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "admin") {
      fetchStats()
    }
  }, [userData])

  if (!userData || userData.role !== "admin") {
    return null
  }

  const saveMentorCredentials = async () => {
    if (!userData?.uid) return
    
    try {
      setIsSaving(true)
      const credentialsRef = ref(db, `adminSettings/${userData.uid}/mentorCredentials`)
      await set(credentialsRef, mentorCredentials)
      
      toast({
        title: "Credentials saved",
        description: "Your mentor account credentials have been saved successfully.",
      })
      setHasSavedCredentials(true)
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving mentor credentials:", error)
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const loginAsMentor = async () => {
    if (!mentorCredentials.email || !mentorCredentials.password) {
      toast({
        title: "Missing credentials",
        description: "Please provide both email and password to login.",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsLoggingIn(true)
      
      // Sign out current user (admin)
      await signOut(auth)
      
      // Sign in as mentor
      await signInWithEmailAndPassword(auth, mentorCredentials.email, mentorCredentials.password)
      
      toast({
        title: "Login successful",
        description: "You are now logged in as a mentor.",
      })
      
      // Redirect to mentor dashboard
      router.push("/mentor/dashboard")
    } catch (error) {
      console.error("Error logging in as mentor:", error)
      toast({
        title: "Login failed",
        description: "Invalid credentials or account does not exist.",
        variant: "destructive"
      })
      
      // Try to sign back in as admin if mentor login fails
      try {
        // This assumes the admin is already logged in, so we just refresh the page
        window.location.reload()
      } catch (e) {
        console.error("Failed to restore admin session:", e)
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-2">Welcome back, {userData.name}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardTitle className="text-lg font-medium">Total Mentors</CardTitle>
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-800">{stats.totalMentors}</div>
                <p className="text-sm text-muted-foreground mt-1">Active mentors in the system</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardTitle className="text-lg font-medium">Total Mentees</CardTitle>
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-800">{stats.totalMentees}</div>
                <p className="text-sm text-muted-foreground mt-1">Active mentees in the system</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <CardTitle>System Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-1">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Recent Activity</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      The system is actively being used by {stats.totalMentors + stats.totalMentees} users.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Quick Actions</h3>
                  <div className="space-y-2">
                    <a
                      href="/admin/users"
                      className="text-amber-600 hover:text-amber-700 text-sm flex items-center gap-1"
                    >
                      <Users className="h-4 w-4" /> Manage Users
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-600" />
                <CardTitle>My Mentor Account</CardTitle>
              </div>
              <CardDescription>Save your mentor account credentials for easy access</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {hasSavedCredentials && !isEditing ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Mentor Account Details
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Name:</span>
                        <span className="text-sm ml-2">{mentorCredentials.name}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email:</span>
                        <span className="text-sm ml-2">{mentorCredentials.email}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Password:</span>
                        <span className="text-sm ml-2">••••••••</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    
                    <Button 
                      className="flex-1" 
                      onClick={loginAsMentor}
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          Logging in...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Login as Mentor
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="mentor-name">Name</Label>
                    <Input 
                      id="mentor-name" 
                      placeholder="Your mentor name" 
                      value={mentorCredentials.name}
                      onChange={(e) => setMentorCredentials({...mentorCredentials, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="mentor-email">Email</Label>
                    <Input 
                      id="mentor-email" 
                      type="email" 
                      placeholder="mentor@example.com" 
                      value={mentorCredentials.email}
                      onChange={(e) => setMentorCredentials({...mentorCredentials, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="mentor-password">Password</Label>
                    <Input 
                      id="mentor-password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={mentorCredentials.password}
                      onChange={(e) => setMentorCredentials({...mentorCredentials, password: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 px-6 py-4">
              {hasSavedCredentials && !isEditing ? (
                <div className="text-xs text-center text-gray-500 w-full">
                  <Check className="h-3 w-3 inline-block mr-1 text-green-500" />
                  Your mentor credentials are saved and ready to use
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={saveMentorCredentials}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {hasSavedCredentials ? "Update Credentials" : "Save Credentials"}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

