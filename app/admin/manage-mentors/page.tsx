"use client"

import { useEffect, useState } from "react"
import { ref, get, update } from "firebase/database"
import { db } from "@/lib/firebase"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Image } from "@/components/ui/image"

interface Mentor {
  uid: string
  name: string
  email: string
  profileImage?: string
  photoURL?: string
  hasAdminAccess?: boolean
}

export default function ManageMentors() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch all mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const usersRef = ref(db, 'users')
        const snapshot = await get(usersRef)
        const users = snapshot.val()

        if (users) {
          const mentorsList = Object.values(users)
            .filter((user: any) => user.role === "mentor")
            .map((mentor: any) => ({
              uid: mentor.uid,
              name: mentor.name,
              email: mentor.email,
              profileImage: mentor.profileImage,
              photoURL: mentor.photoURL,
              hasAdminAccess: mentor.hasAdminAccess || false
            }))
          setMentors(mentorsList)
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching mentors:", error)
        setLoading(false)
      }
    }

    fetchMentors()
  }, [])

  // Toggle admin access for a mentor
  const toggleAdminAccess = async (mentorId: string, currentValue: boolean) => {
    try {
      const mentorRef = ref(db, `users/${mentorId}`)
      await update(mentorRef, {
        hasAdminAccess: !currentValue
      })

      // Update local state
      setMentors(mentors.map(mentor => 
        mentor.uid === mentorId 
          ? { ...mentor, hasAdminAccess: !currentValue }
          : mentor
      ))

      toast({
        title: "Access Updated",
        description: `Admin access ${!currentValue ? "enabled" : "disabled"} for ${mentors.find(m => m.uid === mentorId)?.name}`,
      })
    } catch (error) {
      console.error("Error updating mentor access:", error)
      toast({
        title: "Error",
        description: "Failed to update mentor access",
        variant: "destructive",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Manage Mentors Access</h1>
        
        {loading ? (
          <div className="text-center">Loading mentors...</div>
        ) : (
          <div className="grid gap-4">
            {mentors.map((mentor) => (
              <Card key={mentor.uid}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-semibold relative overflow-hidden">
                        {mentor.profileImage || mentor.photoURL ? (
                          <Image 
                            src={mentor.profileImage || mentor.photoURL || ''} 
                            alt={mentor.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          mentor.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{mentor.name}</h3>
                        <p className="text-sm text-gray-500">{mentor.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {mentor.hasAdminAccess ? "Admin Access Enabled" : "Admin Access Disabled"}
                      </span>
                      <Switch
                        checked={mentor.hasAdminAccess}
                        onCheckedChange={() => toggleAdminAccess(mentor.uid, mentor.hasAdminAccess || false)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
