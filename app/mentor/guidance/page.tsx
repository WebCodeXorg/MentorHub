"use client"

import { useState, useEffect } from "react"
import { ref, get, update, set } from "firebase/database"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  UserPlus, 
  Users, 
  Search, 
  CheckCircle, 
  X, 
  BookOpen, 
  FileText, 
  GraduationCap,
  Shield,
  AlertCircle
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import toast from "@/lib/toast"

interface Mentee {
  uid: string
  name: string
  email: string
  enrollmentNo?: string
  assignedMentorId?: string
  guideId?: string
  coGuideId?: string
  [key: string]: any
}

interface Mentor {
  uid: string
  name: string
  email: string
  [key: string]: any
}

export default function MentorGuidance() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [allMentees, setAllMentees] = useState<Mentee[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false)
  const [menteeEmail, setMenteeEmail] = useState("")
  const [menteeVerificationError, setMenteeVerificationError] = useState("")
  const [verifiedMentee, setVerifiedMentee] = useState<Mentee | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [guidanceType, setGuidanceType] = useState<"guide" | "co-guide">("guide")
  const [activeTab, setActiveTab] = useState("assigned")

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch all users from Realtime Database
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        const menteesData: Mentee[] = []
        const guidedMenteesData: Mentee[] = []
        const mentorsData: Mentor[] = []

        if (usersSnapshot.exists()) {
          const allUsers = usersSnapshot.val()

          // Filter mentees and mentors
          Object.entries(allUsers).forEach(([uid, data]: [string, any]) => {
            if (data.role === "mentee") {
              const menteeData = {
                uid,
                ...data
              }
              
              // Check if current mentor is a guide or co-guide for this mentee
              if (data.guideId === userData.uid || data.coGuideId === userData.uid) {
                guidedMenteesData.push(menteeData)
              }
              
              menteesData.push(menteeData)
            } else if (data.role === "mentor" || data.role === "admin+mentor") {
              mentorsData.push({
                uid,
                ...data
              })
            }
          })
        }

        setAllMentees(menteesData)
        setMentees(guidedMenteesData)
        setMentors(mentorsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && (userData.role === "mentor" || userData.role === "admin+mentor")) {
      fetchData()
    }
  }, [userData])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const filteredMentees = activeTab === "assigned" 
    ? mentees.filter(mentee => {
        const searchLower = searchQuery.toLowerCase()
        return (
          mentee.name?.toLowerCase().includes(searchLower) ||
          mentee.email?.toLowerCase().includes(searchLower) ||
          mentee.enrollmentNo?.toLowerCase().includes(searchLower)
        )
      })
    : allMentees.filter(mentee => {
        const searchLower = searchQuery.toLowerCase()
        return (
          mentee.name?.toLowerCase().includes(searchLower) ||
          mentee.email?.toLowerCase().includes(searchLower) ||
          mentee.enrollmentNo?.toLowerCase().includes(searchLower)
        )
      })

  const verifyMentee = async () => {
    if (!menteeEmail) {
      setMenteeVerificationError("Please enter a mentee email")
      return
    }

    setIsVerifying(true)
    setMenteeVerificationError("")

    try {
      // Find mentee by email
      const mentee = allMentees.find(m => m.email.toLowerCase() === menteeEmail.toLowerCase())

      if (!mentee) {
        setMenteeVerificationError("No mentee found with this email")
        setVerifiedMentee(null)
        return
      }

      // Check if the mentor is already a guide or co-guide for this mentee
      if (guidanceType === "guide" && mentee.guideId === userData?.uid) {
        setMenteeVerificationError("You are already a guide for this mentee")
        setVerifiedMentee(null)
        return
      }

      if (guidanceType === "co-guide" && mentee.coGuideId === userData?.uid) {
        setMenteeVerificationError("You are already a co-guide for this mentee")
        setVerifiedMentee(null)
        return
      }

      // Check if another mentor is already assigned as guide/co-guide
      if (guidanceType === "guide" && mentee.guideId && mentee.guideId !== userData?.uid) {
        const existingGuide = mentors.find(m => m.uid === mentee.guideId)
        setMenteeVerificationError(`This mentee already has ${existingGuide?.name || 'another mentor'} as guide`)
        setVerifiedMentee(null)
        return
      }

      if (guidanceType === "co-guide" && mentee.coGuideId && mentee.coGuideId !== userData?.uid) {
        const existingCoGuide = mentors.find(m => m.uid === mentee.coGuideId)
        setMenteeVerificationError(`This mentee already has ${existingCoGuide?.name || 'another mentor'} as co-guide`)
        setVerifiedMentee(null)
        return
      }

      setVerifiedMentee(mentee)
    } catch (error) {
      console.error("Error verifying mentee:", error)
      setMenteeVerificationError("An error occurred while verifying the mentee")
      setVerifiedMentee(null)
    } finally {
      setIsVerifying(false)
    }
  }

  const assignGuidance = async () => {
    if (!verifiedMentee || !userData) return

    try {
      const menteeRef = ref(db, `users/${verifiedMentee.uid}`)
      
      // Update the mentee's record with guide or co-guide
      if (guidanceType === "guide") {
        await update(menteeRef, { guideId: userData.uid })
      } else {
        await update(menteeRef, { coGuideId: userData.uid })
      }

      // Update local state
      const updatedMentee = {
        ...verifiedMentee,
        [guidanceType === "guide" ? "guideId" : "coGuideId"]: userData.uid
      }

      // Update the mentees list
      setAllMentees(prev => 
        prev.map(m => m.uid === verifiedMentee.uid ? updatedMentee : m)
      )

      // Add to guided mentees if not already there
      if (!mentees.some(m => m.uid === verifiedMentee.uid)) {
        setMentees(prev => [...prev, updatedMentee])
      } else {
        setMentees(prev => 
          prev.map(m => m.uid === verifiedMentee.uid ? updatedMentee : m)
        )
      }

      // Close dialog and reset state
      setIsVerifyDialogOpen(false)
      setVerifiedMentee(null)
      setMenteeEmail("")
      setGuidanceType("guide")

      toast({
        title: "Success",
        description: `You are now a ${guidanceType} for ${verifiedMentee.name}`,
        variant: "success"
      })
    } catch (error) {
      console.error("Error assigning guidance:", error)
      toast({
        title: "Error",
        description: "Failed to assign guidance. Please try again.",
        variant: "destructive"
      })
    }
  }

  const removeGuidance = async (mentee: Mentee, type: "guide" | "co-guide") => {
    if (!confirm(`Are you sure you want to remove yourself as ${type} for ${mentee.name}?`)) {
      return
    }

    try {
      const menteeRef = ref(db, `users/${mentee.uid}`)
      
      // Update the mentee's record to remove guide or co-guide
      if (type === "guide") {
        await update(menteeRef, { guideId: null })
      } else {
        await update(menteeRef, { coGuideId: null })
      }

      // Update local state
      const updatedMentee = {
        ...mentee,
        [type === "guide" ? "guideId" : "coGuideId"]: null
      }

      // Update all mentees list
      setAllMentees(prev => 
        prev.map(m => m.uid === mentee.uid ? updatedMentee : m)
      )

      // Check if mentor is still a guide or co-guide for this mentee
      if (
        (type === "guide" && !mentee.coGuideId) || 
        (type === "co-guide" && !mentee.guideId)
      ) {
        // Remove from guided mentees if no longer a guide or co-guide
        setMentees(prev => prev.filter(m => m.uid !== mentee.uid))
      } else {
        // Update in guided mentees
        setMentees(prev => 
          prev.map(m => m.uid === mentee.uid ? updatedMentee : m)
        )
      }

      toast({
        title: "Success",
        description: `You are no longer a ${type} for ${mentee.name}`,
        variant: "success"
      })
    } catch (error) {
      console.error("Error removing guidance:", error)
      toast({
        title: "Error",
        description: "Failed to remove guidance. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getGuidanceStatus = (mentee: Mentee) => {
    const isGuide = mentee.guideId === userData?.uid
    const isCoGuide = mentee.coGuideId === userData?.uid
    
    if (isGuide && isCoGuide) {
      return "Guide & Co-Guide"
    } else if (isGuide) {
      return "Guide"
    } else if (isCoGuide) {
      return "Co-Guide"
    } else {
      return "None"
    }
  }

  if (!userData || (userData.role !== "mentor" && userData.role !== "admin+mentor")) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Project Guidance</h1>
          <p className="text-muted-foreground text-lg mt-2">Manage mentees under your guidance</p>
        </div>

        <div className="flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10 pr-4 py-2 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
              placeholder="Search by name, email or enrollment number..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <Button 
            onClick={() => {
              setIsVerifyDialogOpen(true)
              setVerifiedMentee(null)
              setMenteeEmail("")
              setMenteeVerificationError("")
            }}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Guidance
          </Button>
        </div>

        <Tabs defaultValue="assigned" onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="mb-4">
            <TabsTrigger value="assigned">My Guided Mentees</TabsTrigger>
            <TabsTrigger value="all">All Mentees</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assigned" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : mentees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentees.map((mentee) => (
                  <Card key={mentee.uid} className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-semibold">
                            {mentee.name?.charAt(0).toUpperCase() || "M"}
                          </div>
                          <div>
                            <CardTitle className="text-base">{mentee.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {mentee.enrollmentNo && `${mentee.enrollmentNo} • `}
                              {getGuidanceStatus(mentee)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                          {mentee.assignedMentorId === userData.uid ? "My Mentee" : "Other's Mentee"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="text-sm">
                          <span className="text-gray-500">Email:</span> {mentee.email}
                        </div>
                        
                        {mentee.class && (
                          <div className="text-sm">
                            <span className="text-gray-500">Class:</span> {mentee.class} {mentee.year} ({mentee.section})
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-4">
                          {mentee.guideId === userData.uid && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => removeGuidance(mentee, "guide")}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove as Guide
                            </Button>
                          )}
                          
                          {mentee.coGuideId === userData.uid && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => removeGuidance(mentee, "co-guide")}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove as Co-Guide
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Guided Mentees</h3>
                  <p className="text-gray-500 mb-4">You are not currently guiding any mentees.</p>
                  <Button 
                    onClick={() => {
                      setIsVerifyDialogOpen(true)
                      setVerifiedMentee(null)
                      setMenteeEmail("")
                      setMenteeVerificationError("")
                    }}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Guidance
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : allMentees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentees.map((mentee) => (
                  <Card key={mentee.uid} className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-semibold">
                            {mentee.name?.charAt(0).toUpperCase() || "M"}
                          </div>
                          <div>
                            <CardTitle className="text-base">{mentee.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {mentee.enrollmentNo && `${mentee.enrollmentNo} • `}
                              {getGuidanceStatus(mentee)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                          {mentee.assignedMentorId === userData.uid ? "My Mentee" : "Other's Mentee"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="text-sm">
                          <span className="text-gray-500">Email:</span> {mentee.email}
                        </div>
                        
                        {mentee.class && (
                          <div className="text-sm">
                            <span className="text-gray-500">Class:</span> {mentee.class} {mentee.year} ({mentee.section})
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-4">
                          {mentee.guideId === userData.uid ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => removeGuidance(mentee, "guide")}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove as Guide
                            </Button>
                          ) : !mentee.guideId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-amber-200 text-amber-600 hover:bg-amber-50"
                              onClick={() => {
                                setIsVerifyDialogOpen(true)
                                setVerifiedMentee(mentee)
                                setMenteeEmail(mentee.email)
                                setMenteeVerificationError("")
                                setGuidanceType("guide")
                              }}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Add as Guide
                            </Button>
                          )}
                          
                          {mentee.coGuideId === userData.uid ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => removeGuidance(mentee, "co-guide")}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove as Co-Guide
                            </Button>
                          ) : !mentee.coGuideId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-amber-200 text-amber-600 hover:bg-amber-50"
                              onClick={() => {
                                setIsVerifyDialogOpen(true)
                                setVerifiedMentee(mentee)
                                setMenteeEmail(mentee.email)
                                setMenteeVerificationError("")
                                setGuidanceType("co-guide")
                              }}
                            >
                              <BookOpen className="h-3 w-3 mr-1" />
                              Add as Co-Guide
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Mentees Found</h3>
                  <p className="text-gray-500">There are no mentees in the system.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Verify Mentee Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add {guidanceType === "guide" ? "Guide" : "Co-Guide"} Role</DialogTitle>
            <DialogDescription>
              Enter the mentee's email address to verify and add yourself as their {guidanceType === "guide" ? "guide" : "co-guide"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {menteeVerificationError && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>{menteeVerificationError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="guidance-type">Guidance Type</Label>
              <Select
                value={guidanceType}
                onValueChange={(value) => setGuidanceType(value as "guide" | "co-guide")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select guidance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="co-guide">Co-Guide</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {guidanceType === "guide" 
                  ? "As a guide, you will be the primary project advisor for this mentee." 
                  : "As a co-guide, you will assist the primary guide with the mentee's project."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentee-email">Mentee Email</Label>
              <Input
                id="mentee-email"
                type="email"
                value={menteeEmail}
                onChange={(e) => setMenteeEmail(e.target.value)}
                placeholder="Enter mentee email"
                disabled={!!verifiedMentee}
              />
            </div>

            {verifiedMentee && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-800">Mentee Verified</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Name:</span> {verifiedMentee.name}</p>
                  <p><span className="text-gray-500">Email:</span> {verifiedMentee.email}</p>
                  {verifiedMentee.enrollmentNo && (
                    <p><span className="text-gray-500">Enrollment No:</span> {verifiedMentee.enrollmentNo}</p>
                  )}
                  {verifiedMentee.class && (
                    <p><span className="text-gray-500">Class:</span> {verifiedMentee.class} {verifiedMentee.year} ({verifiedMentee.section})</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!verifiedMentee ? (
              <Button 
                type="button" 
                onClick={verifyMentee}
                disabled={isVerifying || !menteeEmail}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Verify Mentee
                  </>
                )}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={assignGuidance}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Shield className="h-4 w-4 mr-2" />
                Confirm as {guidanceType === "guide" ? "Guide" : "Co-Guide"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
