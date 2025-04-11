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
import { 
  Camera, Check, Edit, User, X, ShieldCheck, GraduationCap, 
  Mail, Phone, BookOpen, School, UserCog, UserCheck, Calendar, 
  Building, MapPin, Briefcase, Users
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface UserProfile {
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
  parentName?: string
  parentMobile?: string
}

export default function ProfilePage() {
  const { userData } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userData) return

      try {
        // Fetch user data from Realtime Database
        const userRef = dbRef(db, `users/${userData.uid}`)
        const snapshot = await get(userRef)

        if (snapshot.exists()) {
          const profileData = {
            uid: userData.uid,
            ...snapshot.val()
          }
          setProfile(profileData)
          setEditedProfile(profileData)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        setError("Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchProfile()
    }
  }, [userData])

  const handleEdit = () => {
    setIsEditing(true)
    setEditedProfile(profile || {})
    setError("")
    setSuccess("")
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedProfile(profile || {})
    setError("")
    setSuccess("")
  }

  const handleSave = async () => {
    if (!profile || !editedProfile) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Update user data in Realtime Database
      const userRef = dbRef(db, `users/${profile.uid}`)
      
      // Only update fields that have changed
      const updates: Partial<UserProfile> = {}
      
      if (editedProfile.name !== profile.name) updates.name = editedProfile.name
      
      // For mentees, update additional fields
      if (profile.role === "mentee") {
        if (editedProfile.enrollmentNo !== profile.enrollmentNo) 
          updates.enrollmentNo = editedProfile.enrollmentNo
        if (editedProfile.class !== profile.class) 
          updates.class = editedProfile.class
        if (editedProfile.year !== profile.year) 
          updates.year = editedProfile.year
        if (editedProfile.section !== profile.section) 
          updates.section = editedProfile.section
      }

      if (Object.keys(updates).length > 0) {
        await update(userRef, updates)
        
        // Update local state
        setProfile({
          ...profile,
          ...updates
        })
        
        setSuccess("Profile updated successfully")
      } else {
        setSuccess("No changes to save")
      }
      
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile")
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
    if (!profile) return
    
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError("")
    setSuccess("")

    try {
      // Upload image to Firebase Storage
      const imageRef = storageRef(storage, `profile-images/${profile.uid}`)
      await uploadBytes(imageRef, file)
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef)
      
      // Update user data in Realtime Database
      const userRef = dbRef(db, `users/${profile.uid}`)
      await update(userRef, { photoURL: downloadURL })
      
      // Update local state
      setProfile({
        ...profile,
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
      <div className="space-y-6">
        {loading ? (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </CardContent>
          </Card>
        ) : profile ? (
          <div className="grid gap-6">
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-400 text-white pb-8">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    {profile.role === "admin" && <ShieldCheck className="h-6 w-6" />}
                    {profile.role === "mentor" && <UserCog className="h-6 w-6" />}
                    {profile.role === "mentee" && <UserCheck className="h-6 w-6" />}
                    {profile.name}
                  </CardTitle>
                  {!isEditing && (
                    <Button 
                      onClick={handleEdit} 
                      variant="ghost" 
                      className="text-white hover:bg-white/20"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
                <div className="text-white/80 capitalize flex items-center gap-1 mt-1">
                  {profile.role === "admin" && <ShieldCheck className="h-4 w-4" />}
                  {profile.role === "mentor" && <UserCog className="h-4 w-4" />}
                  {profile.role === "mentee" && <GraduationCap className="h-4 w-4" />}
                  {profile.role}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative -mt-12 px-6">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md mx-auto bg-white">
                    {profile.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt={profile.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-100 text-amber-800">
                        <User className="h-12 w-12" />
                      </div>
                    )}
                    <button
                      onClick={handleImageClick}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  {uploadingImage && (
                    <div className="mt-2 text-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-1">Uploading image...</p>
                    </div>
                  )}
                </div>

                <div className="p-6 pt-4">
                  {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
                  {success && <div className="p-3 mb-4 text-sm text-white bg-green-500 rounded-md">{success}</div>}

                  <div className="grid gap-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-amber-500" />
                          Full Name
                        </Label>
                        {isEditing ? (
                          <Input
                            id="name"
                            value={editedProfile.name || ""}
                            onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.name}</div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-amber-500" />
                          Email Address
                        </Label>
                        <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.email}</div>
                      </div>
                    </div>

                    {profile.role === "mentee" && (
                      <>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="enrollmentNo" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-500" />
                              Enrollment No.
                            </Label>
                            {isEditing ? (
                              <Input
                                id="enrollmentNo"
                                value={editedProfile.enrollmentNo || ""}
                                onChange={(e) => setEditedProfile({ ...editedProfile, enrollmentNo: e.target.value })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.enrollmentNo || "-"}</div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="class" className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-amber-500" />
                              Class
                            </Label>
                            {isEditing ? (
                              <Input
                                id="class"
                                value={editedProfile.class || ""}
                                onChange={(e) => setEditedProfile({ ...editedProfile, class: e.target.value })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.class || "-"}</div>
                            )}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="year" className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-amber-500" />
                              Year
                            </Label>
                            {isEditing ? (
                              <Input
                                id="year"
                                value={editedProfile.year || ""}
                                onChange={(e) => setEditedProfile({ ...editedProfile, year: e.target.value })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.year || "-"}</div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="section" className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-amber-500" />
                              Section
                            </Label>
                            {isEditing ? (
                              <Input
                                id="section"
                                value={editedProfile.section || ""}
                                onChange={(e) => setEditedProfile({ ...editedProfile, section: e.target.value })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.section || "-"}</div>
                            )}
                          </div>
                        </div>
                        
                        {profile.parentName && profile.parentMobile && (
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <Label htmlFor="parentName" className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-amber-500" />
                                Parent Name
                              </Label>
                              <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.parentName || "-"}</div>
                            </div>
                            <div>
                              <Label htmlFor="parentMobile" className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-amber-500" />
                                Parent Mobile
                              </Label>
                              <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">{profile.parentMobile || "-"}</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {profile.role === "mentor" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-amber-500" />
                            Role
                          </Label>
                          <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium capitalize">Mentor</div>
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-amber-500" />
                            Mentees
                          </Label>
                          <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-amber-600 hover:text-amber-800"
                              onClick={() => router.push('/mentor/mentees')}
                            >
                              View My Mentees
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {profile.role === "admin" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-amber-500" />
                            Role
                          </Label>
                          <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium capitalize">Administrator</div>
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-500" />
                            System Users
                          </Label>
                          <div className="mt-1 p-3 bg-amber-50 rounded-md font-medium">
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-amber-600 hover:text-amber-800"
                              onClick={() => router.push('/admin/users')}
                            >
                              Manage Users
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isEditing && (
                      <div className="flex justify-end gap-2 mt-6">
                        <Button 
                          variant="outline" 
                          onClick={handleCancel}
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-gray-600">Profile not found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
