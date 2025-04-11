"use client"

import { useEffect, useState, useRef } from "react"
import { ref as dbRef, get, update } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  School,
  BookOpen,
  Calendar,
  MapPin,
  Shield,
  Pencil,
  X,
  Check
} from "lucide-react"
import Image from "next/image"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface MenteeProfile {
  uid: string
  name: string
  email: string
  role: string
  enrollmentNo?: string
  parentMobile?: string
  address?: string
  dateOfBirth?: string
  joinDate?: string
  classId?: string
  assignedMentorId?: string
  hasEdited?: boolean
  [key: string]: any
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
}

// Helper function to format dates nicely with time
const formatDate = (timestamp: number | string) => {
  try {
    const date = new Date(timestamp);
    return format(date, "MMMM d, yyyy 'at' h:mm a");
  } catch (error) {
    return String(timestamp);
  }
}

export default function MenteeProfile() {
  const { userData } = useAuth()
  const [menteeData, setMenteeData] = useState<MenteeProfile | null>(null)
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState({
    parentMobile: "",
    photoURL: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showEditWarning, setShowEditWarning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch complete mentee data
        const menteeRef = dbRef(db, `users/${userData.uid}`)
        const menteeSnapshot = await get(menteeRef)
        
        if (menteeSnapshot.exists()) {
          const completeData = {
            uid: userData.uid,
            ...menteeSnapshot.val()
          }
          setMenteeData(completeData)
          
          // Fetch class info if assigned
          if (completeData.classId) {
            const classRef = dbRef(db, `classes/${completeData.classId}`)
            const classSnapshot = await get(classRef)

            if (classSnapshot.exists()) {
              setClassInfo({
                id: completeData.classId,
                ...classSnapshot.val()
              })
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userData])

  if (!userData || userData.role !== "mentee") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Profile</h1>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Profile Section */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Mentee Details Card */}
              <div className="w-full md:w-2/3">
                <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center pb-8 relative">
                    <div className="absolute inset-0 opacity-10">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="relative">
                      <div className="relative group">
                        <div className="h-24 w-24 rounded-full bg-white p-1 mx-auto mb-4 relative">
                          {uploadProgress > 0 && uploadProgress < 100 ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full z-10">
                              <div className="text-center">
                                <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin mb-2"></div>
                                <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                              </div>
                            </div>
                          ) : null}
                          {menteeData?.photoURL ? (
                            <img 
                              src={menteeData.photoURL} 
                              alt="Profile" 
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full rounded-full bg-amber-100 flex items-center justify-center">
                              <User className="h-12 w-12 text-amber-600" />
                            </div>
                          )}
                          {isEditing && !menteeData?.hasEdited && uploadProgress === 0 && (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60">
                              <Pencil className="h-6 w-6 text-white" />
                            </button>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file || !menteeData?.uid) return

                            setUploadProgress(1) // Start progress
                            try {
                              const imageRef = storageRef(storage, `profile-photos/${menteeData.uid}`)
                              
                              // Create upload task
                              const uploadTask = uploadBytes(imageRef, file)
                              
                              // Monitor upload progress
                              const progressInterval = setInterval(() => {
                                setUploadProgress(prev => {
                                  if (prev >= 90) return prev // Hold at 90% until complete
                                  return prev + Math.floor(Math.random() * 10) + 1
                                })
                              }, 200)

                              // Wait for upload to complete
                              await uploadTask
                              clearInterval(progressInterval)
                              setUploadProgress(100)

                              // Get download URL and update profile
                              const photoURL = await getDownloadURL(imageRef)
                              await update(dbRef(db, `users/${menteeData.uid}`), { 
                                photoURL,
                                hasEdited: true
                              })
                              setMenteeData(prev => ({ ...prev!, photoURL }))
                              
                              toast({
                                title: "Profile photo updated",
                                description: "Your profile photo has been updated successfully."
                              })

                              // Reset progress after a delay
                              setTimeout(() => setUploadProgress(0), 500)
                            } catch (error) {
                              console.error("Error uploading photo:", error)
                              toast({
                                title: "Error",
                                description: "Failed to update profile photo. Please try again.",
                                variant: "destructive"
                              })
                              setUploadProgress(0)
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold">{menteeData?.name}</h2>
                        {!menteeData?.hasEdited ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full bg-amber-400/20 hover:bg-amber-400/30 hover:text-amber-100 transition-colors"
                            onClick={() => setShowEditWarning(true)}
                          >
                            <Pencil className="h-4 w-4 text-white" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-amber-100">{menteeData?.email}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-md">
                          <GraduationCap className="h-5 w-5 min-w-5 text-amber-600 mt-0.5" />
                          <div className="w-full">
                            <p className="text-xs text-gray-500 mb-1">Enrollment No.</p>
                            <p className="font-medium">{menteeData?.enrollmentNo || "Not available"}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-md">
                          <Phone className="h-5 w-5 min-w-5 text-amber-600 mt-0.5" />
                          <div className="w-full">
                            <p className="text-xs text-gray-500 mb-1">Parent Mobile</p>
                            {isEditing ? (
                              <Input
                                value={editedData.parentMobile}
                                onChange={(e) => setEditedData(prev => ({ ...prev, parentMobile: e.target.value }))}
                                className="h-8 text-sm"
                                placeholder="Enter parent mobile"
                              />
                            ) : (
                              <p className="font-medium">{menteeData?.parentMobile || "Not available"}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditing(false)
                              setEditedData({
                                parentMobile: menteeData?.parentMobile || "",
                                photoURL: menteeData?.photoURL || ""
                              })
                            }}
                            className="bg-white"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!menteeData?.uid) return
                              setIsSaving(true)
                              try {
                                await update(dbRef(db, `users/${menteeData.uid}`), {
                                  parentMobile: editedData.parentMobile,
                                  hasEdited: true
                                })
                                setMenteeData(prev => ({
                                  ...prev!,
                                  parentMobile: editedData.parentMobile
                                }))
                                setIsEditing(false)
                                toast({
                                  title: "Profile updated",
                                  description: "Your profile has been updated successfully."
                                })
                              } catch (error) {
                                console.error("Error updating profile:", error)
                                toast({
                                  title: "Error",
                                  description: "Failed to update profile. Please try again.",
                                  variant: "destructive"
                                })
                              } finally {
                                setIsSaving(false)
                              }
                            }}
                            disabled={isSaving}
                            className="bg-amber-500 hover:bg-amber-600"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Class Information Card */}
              <div className="w-full md:w-1/3">
                <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-300 flex items-center justify-center text-blue-800 font-semibold">
                        <BookOpen className="h-6 w-6 text-blue-800" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Class Information</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {classInfo ? (
                      <div>
                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold">{classInfo.name}</h3>
                          <p className="text-gray-500">Year: {classInfo.year} | Section: {classInfo.section}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center p-4 bg-blue-50 rounded-md">
                            <p className="text-xs text-gray-500 mb-1">Year</p>
                            <p className="font-medium text-lg">{classInfo.year}</p>
                          </div>
                          
                          <div className="flex flex-col items-center p-4 bg-blue-50 rounded-md">
                            <p className="text-xs text-gray-500 mb-1">Section</p>
                            <p className="font-medium text-lg">{classInfo.section}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <School className="h-16 w-16 text-blue-200 mx-auto mb-4" />
                        <p className="text-gray-500">No class information available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Account Information Card */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-semibold">
                    <Shield className="h-6 w-6 text-purple-800" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Account Information</CardTitle>
                    <CardDescription className="text-purple-100">Security & System Details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-md">
                    <User className="h-5 w-5 min-w-5 text-purple-600 mt-0.5" />
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">User ID</p>
                      <p className="font-medium text-sm break-all">{menteeData?.uid}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-md">
                    <Shield className="h-5 w-5 min-w-5 text-purple-600 mt-0.5" />
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">Account Type</p>
                      <p className="font-medium">Mentee</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-md">
                    <Calendar className="h-5 w-5 min-w-5 text-purple-600 mt-0.5" />
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">Account Created</p>
                      <p className="font-medium">
                        {menteeData?.createdAt ? formatDate(menteeData.createdAt) : "Not available"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {/* Edit Warning Dialog */}
      <AlertDialog open={showEditWarning} onOpenChange={setShowEditWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Important Notice</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You can only edit your profile information <span className="font-bold text-amber-600">once</span>. After saving changes, you won't be able to modify it again.</p>
              <p>If you need to make changes after saving, please contact your mentor for assistance.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowEditWarning(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowEditWarning(false)
                setEditedData({
                  parentMobile: menteeData?.parentMobile || "",
                  photoURL: menteeData?.photoURL || ""
                })
                setIsEditing(true)
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
