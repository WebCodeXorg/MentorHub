"use client"

import { useEffect, useState } from "react"
import { ref, get, update, remove, set } from "firebase/database"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Users, UserPlus, Eye, EyeOff, Plus, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { Image } from "@/components/ui/image"
import { Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface User {
  uid: string
  name: string
  email: string
  role: "admin" | "mentor" | "mentee"
  assignedMentorId?: string
  enrollmentNo?: string
  class?: string
  year?: string
  section?: string
  classId?: string
  profileImage?: string
  photoURL?: string
  adminCredentials?: {
    email: string
    password: string
  }
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  description: string
  mentorId: string
}

export default function AdminUsers() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [mentors, setMentors] = useState<User[]>([])
  const [mentees, setMentees] = useState<User[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [createdUser, setCreatedUser] = useState<User | null>(null)
  const [newUserPassword, setNewUserPassword] = useState("")
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(0)
  const [showRedirectCountdown, setShowRedirectCountdown] = useState(false)
  const [newMentor, setNewMentor] = useState({
    name: "",
    email: "",
    password: "",
    role: "mentor" as "admin" | "mentor" | "admin+mentor",
    adminCredentials: {
      email: "",
      password: ""
    }
  })
  
  // Update admin credentials when name changes for admin+mentor role
  useEffect(() => {
    if (newMentor.role === "admin+mentor" && newMentor.name) {
      // When name changes, update the admin email suggestion if it follows a pattern
      if (!newMentor.adminCredentials.email || 
          newMentor.adminCredentials.email.includes('@admin') ||
          newMentor.adminCredentials.email.endsWith('.admin')) {
        // Generate a suggested admin email based on the mentor email
        const emailParts = newMentor.email.split('@');
        if (emailParts.length === 2) {
          const suggestedAdminEmail = `${emailParts[0]}.admin@${emailParts[1]}`;
          setNewMentor(prev => ({
            ...prev,
            adminCredentials: {
              ...prev.adminCredentials,
              email: suggestedAdminEmail
            }
          }));
        }
      }
    }
  }, [newMentor.name, newMentor.email, newMentor.role])
  const router = useRouter()

  const [filteredMentees, setFilteredMentees] = useState<User[]>([])
  const [unassignedMentees, setUnassignedMentees] = useState<User[]>([])
  const [assignedMentees, setAssignedMentees] = useState<User[]>([])
  const [selectedMentorId, setSelectedMentorId] = useState("")
  const [selectedMenteeId, setSelectedMenteeId] = useState("")
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [expandedMentorCards, setExpandedMentorCards] = useState<Record<string, boolean>>({})
  const [expandedMenteeCards, setExpandedMenteeCards] = useState<Record<string, boolean>>({})
  const [expandedAdminCards, setExpandedAdminCards] = useState<Record<string, boolean>>({})
  const [selectedMentorIds, setSelectedMentorIds] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = ref(db, "users")
        const snapshot = await get(usersRef)

        if (snapshot.exists()) {
          const usersData = snapshot.val()
          const usersArray: User[] = []
          const mentorsArray: User[] = []
          const menteesArray: User[] = []
          const adminsArray: User[] = []
          const assignedMenteesArray: User[] = []
          const unassignedMenteesArray: User[] = []

          // Convert object to array and filter by roles
          Object.entries(usersData).forEach(([uid, data]: [string, any]) => {
            const user = { uid, ...data } as User
            usersArray.push(user)

            if (user.role === "mentor") {
              mentorsArray.push(user)
            } else if (user.role === "mentee") {
              menteesArray.push(user)
            } else if (user.role === "admin") {
              adminsArray.push(user)
            }
          })

          setUsers(usersArray)
          setMentors(mentorsArray)
          setMentees(menteesArray)
          setAdmins(adminsArray)
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    const fetchClasses = async () => {
      try {
        // Fetch classes from Realtime Database
        const classesRef = ref(db, "classes")
        const classesSnapshot = await get(classesRef)

        const classesData: ClassInfo[] = []
        if (classesSnapshot.exists()) {
          const allClasses = classesSnapshot.val()

          Object.entries(allClasses).forEach(([id, data]: [string, any]) => {
            classesData.push({
              id,
              ...data,
            })
          })
        }

        // setClasses(classesData)
      } catch (error) {
        console.error("Error fetching classes:", error)
      }
    }

    if (userData && userData.role === "admin") {
      fetchUsers()
      fetchClasses()
    }
  }, [userData])

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showRedirectCountdown && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
    } else if (showRedirectCountdown && redirectCountdown === 0 && createdUser) {
      // Redirect to mentor login
      setShowRedirectCountdown(false);
      handleLoginAsNewUser();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showRedirectCountdown, redirectCountdown, createdUser]);

  const handleLoginAsNewUser = async () => {
    if (!createdUser) return;
    
    try {
      // Sign out current user (admin)
      await signOut(auth);
      
      // Sign in as new user
      await signInWithEmailAndPassword(auth, createdUser.email, newUserPassword);
      
      // Redirect to appropriate dashboard based on role
      if (createdUser.role === "mentor") {
        router.push("/mentor/dashboard");
      } else if (createdUser.role === "admin") {
        router.push("/admin/dashboard");
      }
    } catch (error) {
      console.error("Error logging in as new user:", error);
    }
  };

  const handleAssignMentor = async (menteeId: string, mentorId: string) => {
    try {
      const menteeRef = ref(db, `users/${menteeId}`)
      await update(menteeRef, {
        assignedMentorId: mentorId,
      })

      // Update local state
      setUsers(users.map((user) => (user.uid === menteeId ? { ...user, assignedMentorId: mentorId } : user)))
      
      // Update mentees state
      const updatedMentees = mentees.map((mentee) => 
        mentee.uid === menteeId ? { ...mentee, assignedMentorId: mentorId } : mentee
      );
      setMentees(updatedMentees);
      
      // Re-filter mentees
      const assigned = updatedMentees.filter(mentee => mentee.assignedMentorId);
      const unassigned = updatedMentees.filter(mentee => !mentee.assignedMentorId);
      
      // setAssignedMentees(assigned);
      // setUnassignedMentees(unassigned);
      
      toast({
        title: "Mentor assigned successfully",
        description: `Mentee has been assigned to ${getMentorName(mentorId)}`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error assigning mentor:", error)
      toast({
        title: "Error assigning mentor",
        description: "There was an error assigning the mentor. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      await remove(ref(db, `users/${userId}`))

      // Update local state
      setUsers(users.filter((user) => user.uid !== userId))
      if (users.find((user) => user.uid === userId)?.role === "mentor") {
        setMentors(mentors.filter((mentor) => mentor.uid !== userId))
      } else if (users.find((user) => user.uid === userId)?.role === "mentee") {
        setMentees(mentees.filter((mentee) => mentee.uid !== userId))
      } else if (users.find((user) => user.uid === userId)?.role === "admin") {
        setAdmins(admins.filter((admin) => admin.uid !== userId))
      }
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  const handleCreateMentor = async () => {
    if (!newMentor.name || !newMentor.email || !newMentor.password) {
      setError("Please fill all fields")
      return
    }



    setError("")
    setIsCreating(true)

    try {
      // Store current admin credentials
      const adminEmail = auth.currentUser?.email
      const adminUid = auth.currentUser?.uid

      // Create mentor account in Firebase Authentication
      const mentorCredential = await createUserWithEmailAndPassword(auth, newMentor.email, newMentor.password)
      const mentorUser = mentorCredential.user



      // Create user document in Realtime Database
      const userData: any = {
        uid: mentorUser.uid,
        email: mentorUser.email,
        name: newMentor.name,
        role: newMentor.role,
        createdBy: adminUid,
        createdAt: new Date().toISOString(),
      }
      


      // Save mentor user data
      await set(ref(db, `users/${mentorUser.uid}`), userData)

      // Sign out the newly created account(s)
      await signOut(auth)
      
      // Sign back in as admin
      if (adminEmail) {
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
        } catch (error) {
          console.error("Error signing back in as admin:", error)
        }
      }

      // Update local state
      const newMentorUser = { ...userData, uid: mentorUser.uid } as User
      setUsers([...users, newMentorUser])
      setMentors([...mentors, newMentorUser])
      


      // Store created user data for success dialog
      setCreatedUser(newMentorUser)
      
      // Store the password for login purposes
      setNewUserPassword(newMentor.password)
      
      // Close dialog and open success dialog
      setIsDialogOpen(false)
      setIsSuccessDialogOpen(true)
      
      // Start countdown for redirection
      setRedirectCountdown(15)
      setShowRedirectCountdown(true)

      // Reset form
      setNewMentor({
        name: "",
        email: "",
        password: "",
        role: "mentor",
        adminCredentials: {
          email: "",
          password: ""
        }
      })

      toast({
        title: "User created successfully",
        description: "User account has been created.",
      })
    } catch (error: any) {
      console.error("Error creating user:", error)
      setError(error.message || "Failed to create user")
    } finally {
      setIsCreating(false)
    }
  }

  // Get the selected class name for display
  const getSelectedClassName = () => {
    // if (!selectedClassId || selectedClassId === "all") return "All Classes"
    // const selectedClass = classes.find(c => c.id === selectedClassId)
    // return selectedClass ? `${selectedClass.name} - ${selectedClass.year} (${selectedClass.section})` : "Selected Class"
  }

  // Get mentor name by ID
  const getMentorName = (mentorId: string | undefined) => {
    if (!mentorId) return "None"
    const mentor = mentors.find((m) => m.uid === mentorId)
    return mentor ? mentor.name : "Unknown Mentor"
  }

  // Get class name by ID
  const getClassName = (classId: string | undefined) => {
    if (!classId) return "N/A"
    // const classInfo = classes.find(c => c.id === classId)
    // return classInfo ? `${classInfo.name} - ${classInfo.year}` : "Unknown Class"
  }

  // Toggle card expansion
  const toggleMentorCardExpansion = (mentorId: string) => {
    setExpandedMentorCards(prev => ({
      ...prev,
      [mentorId]: !prev[mentorId]
    }))
  }

  const toggleMenteeCardExpansion = (menteeId: string) => {
    setExpandedMenteeCards(prev => ({
      ...prev,
      [menteeId]: !prev[menteeId]
    }))
  }

  const toggleAdminCardExpansion = (adminId: string) => {
    setExpandedAdminCards(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }))
  }

  const handleSelectMentor = (menteeId: string, mentorId: string) => {
    setSelectedMentorIds(prev => ({
      ...prev,
      [menteeId]: mentorId
    }))
    
    // Immediately assign the mentor to the mentee
    handleAssignMentor(menteeId, mentorId)
  }

  if (!userData || userData.role !== "admin") {
    return null
  }

  function setShowCreateMentorModal(arg0: boolean): void {
    throw new Error("Function not implemented.")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {userData?.role === "admin" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Manage Users</h1>
                <p className="text-muted-foreground mt-1">View and manage all users in the system</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-500 hover:bg-blue-600">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>
                      Create New {newMentor.role === "mentor" ? "Mentor" : "Admin"}
                    </DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new {newMentor.role === "mentor" ? "mentor" : "admin"} account.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="p-6">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6">{error}</div>
                    )}
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                          <Input
                            id="name"
                            value={newMentor.name}
                            onChange={(e) => setNewMentor({ ...newMentor, name: e.target.value })}
                            placeholder="Enter full name"
                            className="h-11"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                          <Select
                            value={newMentor.role}
                            onValueChange={(value) => {
                              const role = value as "mentor" | "admin" | "admin+mentor";
                              // Generate random password for mentor role
                              if (role === "mentor" && newMentor.role !== "mentor") {
                                const randomPassword = Math.random().toString(36).slice(-8) + 
                                  Math.random().toString(36).toUpperCase().slice(-2) + 
                                  Math.floor(Math.random() * 10) + "!";
                                setNewMentor({ 
                                  ...newMentor, 
                                  role,
                                  password: randomPassword
                                });
                              } else {
                                setNewMentor({ ...newMentor, role });
                              }
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mentor">Mentor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newMentor.email}
                            onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })}
                            placeholder="Enter email address"
                            className="h-11"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            {newMentor.role === "mentor" && (
                              <button
                                type="button"
                                onClick={() => {
                                  const randomPassword = Math.random().toString(36).slice(-8) + 
                                    Math.random().toString(36).toUpperCase().slice(-2) + 
                                    Math.floor(Math.random() * 10) + "!";
                                  setNewMentor({ ...newMentor, password: randomPassword });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Generate Random
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={newMentor.password}
                              onChange={(e) => setNewMentor({ ...newMentor, password: e.target.value })}
                              placeholder="Enter password"
                              className="h-11 pr-10"
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
                    </div>
                  </div>
                  
                  <DialogFooter className="px-6 py-4 bg-gray-50">
                    <div className="flex gap-3 justify-end w-full">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        className="px-4 py-2 h-11"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => setShowPasswordDialog(true)} 
                        disabled={isCreating} 
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 h-11"
                      >
                        {isCreating ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Admin Password Dialog */}
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Confirm Your Password</DialogTitle>
                    <DialogDescription>
                      Please enter your password to continue. This is needed to sign back in after creating the new account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Your Password</Label>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
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
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowPasswordDialog(false);
                        handleCreateMentor();
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Continue
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Success Dialog */}
              <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      Account Created Successfully
                    </DialogTitle>
                    <DialogDescription>
                      The {createdUser?.role} account has been created and is ready to use.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {createdUser?.role === "mentor" ? (
                          <UserPlus className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{createdUser?.name}</p>
                        <p className="text-sm text-muted-foreground">{createdUser?.email}</p>
                      </div>
                    </div>
                    
                    {showRedirectCountdown && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <p className="text-sm text-blue-700 flex items-center gap-2">
                          <span className="animate-pulse">⏱️</span>
                          Redirecting to {createdUser?.role} account in {redirectCountdown} seconds...
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsSuccessDialogOpen(false);
                        setShowRedirectCountdown(false);
                      }}
                      className="sm:flex-1"
                    >
                      Stay as Admin
                    </Button>
                    <Button 
                      onClick={handleLoginAsNewUser}
                      className="bg-blue-600 hover:bg-blue-700 sm:flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Login as {createdUser?.role}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <Tabs defaultValue="admins" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="admins">Administrators</TabsTrigger>
                  <TabsTrigger value="mentors">Mentors</TabsTrigger>
                  <TabsTrigger value="mentees">Mentees</TabsTrigger>
                </TabsList>
                
                {/* Admins Tab */}
                <TabsContent value="admins">
                  <div className="space-y-4">
                    {admins.length === 0 ? (
                      <div className="text-center p-4 border rounded-lg">
                        <p>No administrators found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {admins.map((admin) => (
                          <div key={admin.uid} className="border rounded-lg overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 flex justify-between items-center cursor-pointer"
                              onClick={() => toggleAdminCardExpansion(admin.uid)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-semibold">
                                  {admin.profileImage || admin.photoURL ? (
                                    <Image 
                                      src={admin.profileImage || admin.photoURL || ''} 
                                      alt={admin.name} 
                                      fill 
                                      className="object-cover"
                                    />
                                  ) : (
                                    admin.name.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">{admin.name}</h3>
                                  <p className="text-purple-100 text-sm">{admin.email}</p>
                                </div>
                              </div>
                              <motion.div
                                animate={{ rotate: expandedAdminCards[admin.uid] ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ChevronDown className="h-5 w-5 text-white" />
                              </motion.div>
                            </div>
                            <AnimatePresence>
                              {expandedAdminCards[admin.uid] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 bg-white">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="bg-purple-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Role</p>
                                        <p className="font-medium">Administrator</p>
                                      </div>
                                      <div className="bg-purple-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">User ID</p>
                                        <p className="font-medium text-sm truncate">{admin.uid}</p>
                                      </div>
                                    </div>
                                    
                                    {userData?.uid !== admin.uid && (
                                      <div className="flex justify-end">
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleDeleteUser(admin.uid)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete User
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Mentors Tab */}
                <TabsContent value="mentors">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Mentors</h2>
                    </div>

                    {mentors.length === 0 ? (
                      <div className="text-center p-4 border rounded-lg">
                        <p>No mentors found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mentors.map((mentor) => (
                          <div key={mentor.uid} className="border rounded-lg overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-700 p-4 flex justify-between items-center cursor-pointer"
                              onClick={() => toggleMentorCardExpansion(mentor.uid)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-blue-300 flex items-center justify-center text-blue-800 font-semibold relative">
                                  {mentor.profileImage || mentor.photoURL ? (
                                    <Image 
                                      src={mentor.profileImage || mentor.photoURL || ''} 
                                      alt={mentor.name} 
                                      width={40}
                                      height={40}
                                      className="object-cover rounded-full"
                                    />
                                  ) : (
                                    mentor.name.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">{mentor.name}</h3>
                                  <p className="text-blue-100 text-sm">{mentor.email}</p>
                                </div>
                              </div>
                              <motion.div
                                animate={{ rotate: expandedMentorCards[mentor.uid] ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ChevronDown className="h-5 w-5 text-white" />
                              </motion.div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedMentorCards[mentor.uid] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <CardContent className="space-y-4 p-6">
                                    <div className="space-y-3">
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs font-medium text-gray-500">Role</p>
                                        <p className="text-sm font-medium">Mentor</p>
                                      </div>
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs font-medium text-gray-500">Assigned Mentees</p>
                                        <p className="text-sm font-medium">
                                          {mentees.filter(m => m.assignedMentorId === mentor.uid).length}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-3 mt-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-center border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700"
                                        onClick={() => handleDeleteUser(mentor.uid)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete User
                                      </Button>
                                    </div>
                                  </CardContent>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                        {mentors.length === 0 && (
                          <div className="col-span-3 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                            <Users className="h-16 w-16 text-blue-300 mb-4" />
                            <p className="text-xl font-medium text-gray-800 mb-2">No mentors found</p>
                            <p className="text-sm text-muted-foreground text-center mb-4">
                              Add mentors to manage your mentees
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Mentees Tab */}
                <TabsContent value="mentees">
                  <div className="space-y-8">
                    {/* Class Filter */}
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Mentees</h2>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        {/* <Select value={selectedClassId || "all"} onValueChange={setSelectedClassId}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Filter by class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classes.map((classInfo) => (
                              <SelectItem key={classInfo.id} value={classInfo.id}>
                                {classInfo.name} - {classInfo.year} ({classInfo.section})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select> */}
                      </div>
                    </div>

                    {/* <div>
                      {selectedClassId && selectedClassId !== "all" && (
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                          <p className="text-amber-800 font-medium flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            Showing mentees from: {getSelectedClassName()}
                          </p>
                        </div>
                      )}
                    </div> */}
                    {/* Unassigned Mentees */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Unassigned Mentees</h3>
                      {mentees.length === 0 ? (
                        <div className="text-center p-4 border rounded-lg">
                          <p>No unassigned mentees found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mentees.map((mentee) => (
                            <div key={mentee.uid} className="border rounded-lg overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-red-500 to-red-700 p-4 flex justify-between items-center cursor-pointer"
                                onClick={() => toggleMenteeCardExpansion(mentee.uid)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 rounded-full bg-red-300 flex items-center justify-center text-red-800 font-semibold relative">
                                    {mentee.profileImage || mentee.photoURL ? (
                                      <Image 
                                        src={mentee.profileImage || mentee.photoURL || ''} 
                                        alt={mentee.name} 
                                        width={40}
                                        height={40}
                                        className="object-cover rounded-full"
                                      />
                                    ) : (
                                      mentee.name.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-white">{mentee.name}</h3>
                                    <p className="text-red-100 text-sm">{mentee.email}</p>
                                  </div>
                                </div>
                                <motion.div
                                  animate={{ rotate: expandedMenteeCards[mentee.uid] ? 180 : 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <ChevronDown className="h-5 w-5 text-white" />
                                </motion.div>
                              </div>
                              <AnimatePresence>
                                {expandedMenteeCards[mentee.uid] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-4 bg-white">
                                      <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="bg-red-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Enrollment Number</p>
                                          <p className="font-medium">{mentee.enrollmentNo || "N/A"}</p>
                                        </div>
                                        <div className="bg-red-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Class</p>
                                          <p className="font-medium">{getClassName(mentee.classId)}</p>
                                        </div>
                                        <div className="bg-red-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Year</p>
                                          <p className="font-medium">{mentee.year || "N/A"}</p>
                                        </div>
                                        <div className="bg-red-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Section</p>
                                          <p className="font-medium">{mentee.section || "N/A"}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex justify-end space-x-2">
                                        <Select 
                                          value={selectedMentorIds[mentee.uid] || "none"}
                                          onValueChange={(value) => handleSelectMentor(mentee.uid, value)}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Assign mentor" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {mentors.map((mentor) => (
                                              <SelectItem key={mentor.uid} value={mentor.uid}>
                                                {mentor.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleDeleteUser(mentee.uid)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                          {mentees.length === 0 && (
                            <div className="col-span-3 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                              <Users className="h-16 w-16 text-red-300 mb-4" />
                              <p className="text-xl font-medium text-gray-800 mb-2">No unassigned mentees found</p>
                              <p className="text-sm text-muted-foreground text-center mb-4">
                                All mentees have been assigned to mentors
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Assigned Mentees */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Assigned Mentees</h3>
                      {mentees.length === 0 ? (
                        <div className="text-center p-4 border rounded-lg">
                          <p>No assigned mentees found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mentees.map((mentee) => (
                            <div key={mentee.uid} className="border rounded-lg overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-green-700 p-4 flex justify-between items-center cursor-pointer"
                                onClick={() => toggleMenteeCardExpansion(mentee.uid)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-semibold relative">
                                    {mentee.profileImage || mentee.photoURL ? (
                                      <Image 
                                        src={mentee.profileImage || mentee.photoURL || ''} 
                                        alt={mentee.name} 
                                        width={40}
                                        height={40}
                                        className="object-cover rounded-full"
                                      />
                                    ) : (
                                      mentee.name.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-white">{mentee.name}</h3>
                                    <p className="text-green-100 text-sm">{mentee.email}</p>
                                  </div>
                                </div>
                                <motion.div
                                  animate={{ rotate: expandedMenteeCards[mentee.uid] ? 180 : 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <ChevronDown className="h-5 w-5 text-white" />
                                </motion.div>
                              </div>
                              <AnimatePresence>
                                {expandedMenteeCards[mentee.uid] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-4 bg-white">
                                      <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="bg-green-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Enrollment Number</p>
                                          <p className="font-medium">{mentee.enrollmentNo || "N/A"}</p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Class</p>
                                          <p className="font-medium">{getClassName(mentee.classId)}</p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Year</p>
                                          <p className="font-medium">{mentee.year || "N/A"}</p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-md">
                                          <p className="text-sm text-gray-500">Section</p>
                                          <p className="font-medium">{mentee.section || "N/A"}</p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-md col-span-2">
                                          <p className="text-sm text-gray-500">Assigned Mentor</p>
                                          <p className="font-medium">{getMentorName(mentee.assignedMentorId)}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex justify-end space-x-2">
                                        <Select 
                                          value={selectedMentorIds[mentee.uid] || mentee.assignedMentorId || "none"}
                                          onValueChange={(value) => handleSelectMentor(mentee.uid, value)}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Change mentor" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {mentors.map((mentor) => (
                                              <SelectItem key={mentor.uid} value={mentor.uid}>
                                                {mentor.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleDeleteUser(mentee.uid)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
