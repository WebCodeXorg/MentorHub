"use client"

import { useEffect, useState, useRef } from "react"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { ref as dbRef, get, update } from "firebase/database"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Check, User, X, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface Mentee {
  uid: string
  name: string
  email: string
  role: string
  photoURL?: string
  enrollmentNo?: string
  class?: string
  year?: string
  section?: string
  classId?: string
  assignedMentorId?: string
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  description: string
  mentorId: string
}

export default function EditMenteePage() {
  const { userData } = useAuth()
  const [mentee, setMentee] = useState<Mentee | null>(null)
  const [editedMentee, setEditedMentee] = useState<Partial<Mentee>>({})
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const params = useParams()
  const router = useRouter()
  const menteeId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      if (!userData || !menteeId) return

      try {
        // Fetch mentee data
        const menteeRef = dbRef(db, `users/${menteeId}`)
        const menteeSnapshot = await get(menteeRef)

        if (!menteeSnapshot.exists()) {
          setError("Mentee not found")
          setLoading(false)
          return
        }

        const menteeData = {
          uid: menteeId,
          ...menteeSnapshot.val()
        }

        // Check if the current user is the mentor of this mentee
        if (userData.role !== "admin" && menteeData.assignedMentorId !== userData.uid) {
          setError("You don't have permission to edit this mentee")
          setLoading(false)
          return
        }

        setMentee(menteeData)
        setEditedMentee(menteeData)

        // Fetch classes created by this mentor
        const classesRef = dbRef(db, "classes")
        const classesSnapshot = await get(classesRef)

        if (classesSnapshot.exists()) {
          const classesData = classesSnapshot.val()
          const classesArray: ClassInfo[] = []

          Object.keys(classesData).forEach((key) => {
            if (classesData[key].mentorId === userData.uid) {
              classesArray.push({
                id: key,
                ...classesData[key]
              })
            }
          })

          setClasses(classesArray)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load mentee data")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchData()
    }
  }, [userData, menteeId])

  const handleSave = async () => {
    if (!mentee || !editedMentee) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Update mentee data in Realtime Database
      const menteeRef = dbRef(db, `users/${mentee.uid}`)
      
      // Only update fields that have changed
      const updates: Partial<Mentee> = {}
      
      if (editedMentee.name !== mentee.name) updates.name = editedMentee.name
      if (editedMentee.enrollmentNo !== mentee.enrollmentNo) updates.enrollmentNo = editedMentee.enrollmentNo
      if (editedMentee.class !== mentee.class) updates.class = editedMentee.class
      if (editedMentee.year !== mentee.year) updates.year = editedMentee.year
      if (editedMentee.section !== mentee.section) updates.section = editedMentee.section
      if (editedMentee.classId !== mentee.classId) updates.classId = editedMentee.classId
      if (editedMentee.photoURL !== mentee.photoURL) updates.photoURL = editedMentee.photoURL

      if (Object.keys(updates).length > 0) {
        await update(menteeRef, updates)
        
        // Update local state
        setMentee({
          ...mentee,
          ...updates
        })
        
        setSuccess("Mentee profile updated successfully")
      } else {
        setSuccess("No changes to save")
      }
    } catch (error) {
      console.error("Error updating mentee:", error)
      setError("Failed to update mentee profile")
    } finally {
      setSaving(false)
    }
  }

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mentee) return
    
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError("")
    setSuccess("")

    try {
      // Upload image to Firebase Storage
      const imageRef = storageRef(storage, `profile-images/${mentee.uid}`)
      await uploadBytes(imageRef, file)
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef)
      
      // Update mentee data in Realtime Database
      const menteeRef = dbRef(db, `users/${mentee.uid}`)
      await update(menteeRef, { photoURL: downloadURL })
      
      // Update local state
      setMentee({
        ...mentee,
        photoURL: downloadURL
      })
      
      setEditedMentee({
        ...editedMentee,
        photoURL: downloadURL
      })
      
      setSuccess("Profile image updated successfully")
    } catch (error) {
      console.error("Error uploading image:", error)
      setError("Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  if (!userData) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration flex items-center">
          <Button 
            variant="ghost" 
            className="mr-4 p-2"
            asChild
          >
            <Link href={`/mentee/${menteeId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Edit Mentee Profile</h1>
            <p className="text-muted-foreground text-lg mt-2">Update your mentee's information</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : mentee ? (
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-1 border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                <CardTitle className="text-center">Profile Image</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center p-6 space-y-4">
                <div 
                  className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-amber-200 cursor-pointer group"
                  onClick={handleImageClick}
                >
                  {mentee.photoURL ? (
                    <Image 
                      src={mentee.photoURL} 
                      alt={mentee.name} 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                      <User className="h-24 w-24 text-amber-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-12 w-12 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange}
                />
                {uploadingImage && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-600"></div>
                    <span>Uploading...</span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{mentee.name}</h3>
                  <p className="text-sm text-muted-foreground">{mentee.email}</p>
                  <div className="mt-2 inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    Mentee
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                <CardTitle>Mentee Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-md">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-800 rounded-md flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    {success}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={editedMentee.name || ""}
                        onChange={(e) => setEditedMentee({ ...editedMentee, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-md">{mentee.email}</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="enrollmentNo">Enrollment Number</Label>
                      <Input
                        id="enrollmentNo"
                        value={editedMentee.enrollmentNo || ""}
                        onChange={(e) => setEditedMentee({ ...editedMentee, enrollmentNo: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="class">Class</Label>
                      <Input
                        id="class"
                        value={editedMentee.class || ""}
                        onChange={(e) => setEditedMentee({ ...editedMentee, class: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        value={editedMentee.year || ""}
                        onChange={(e) => setEditedMentee({ ...editedMentee, year: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="section">Section</Label>
                      <Input
                        id="section"
                        value={editedMentee.section || ""}
                        onChange={(e) => setEditedMentee({ ...editedMentee, section: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="classId">Assign to Class</Label>
                    <Select
                      value={editedMentee.classId || ""}
                      onValueChange={(value) => setEditedMentee({ ...editedMentee, classId: value || undefined })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id}>
                            {`${classItem.name} - ${classItem.year} (${classItem.section})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/mentee/${menteeId}`)}
                      className="flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-gray-600">Mentee not found or you don't have permission to edit this mentee</p>
              <Button 
                className="mt-4 bg-amber-500 hover:bg-amber-600"
                onClick={() => router.push("/mentor/mentees")}
              >
                Back to Mentees
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
