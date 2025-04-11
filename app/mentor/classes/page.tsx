"use client"

import { useEffect, useState } from "react"
import { ref, get, set, push, remove } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, PenSquare } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  mentorId: string
  createdAt: number
}

export default function MentorClasses() {
  const { userData } = useAuth()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [newClass, setNewClass] = useState({
    name: "",
    year: "",
    section: "",
  })
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const fetchClasses = async () => {
      if (!userData) return

      try {
        // Fetch classes from Realtime Database
        const classesRef = ref(db, "classes")
        const classesSnapshot = await get(classesRef)

        const classesData: ClassInfo[] = []
        if (classesSnapshot.exists()) {
          const allClasses = classesSnapshot.val()

          // Filter classes created by this mentor
          Object.entries(allClasses).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid) {
              classesData.push({
                id,
                ...data,
              })
            }
          })
        }

        // Sort classes by creation date (newest first)
        classesData.sort((a, b) => b.createdAt - a.createdAt)
        setClasses(classesData)
      } catch (error) {
        console.error("Error fetching classes:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchClasses()
    }
  }, [userData])

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.year || !newClass.section) {
      setError("Please fill all required fields")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      // Create a new class in Realtime Database
      const classesRef = ref(db, "classes")
      const newClassRef = push(classesRef)
      
      const classData = {
        name: newClass.name,
        year: newClass.year,
        section: newClass.section,
        mentorId: userData?.uid || "",
        createdAt: Date.now(),
      }

      await set(newClassRef, classData)

      // Update local state
      const newClassInfo: ClassInfo = {
        id: newClassRef.key as string,
        ...classData,
      }

      setClasses([newClassInfo, ...classes])

      // Reset form and close dialog
      setNewClass({
        name: "",
        year: "",
        section: "",
      })
      setIsDialogOpen(false)
    } catch (error: any) {
      setError(error.message || "Failed to create class")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateClass = async () => {
    if (!selectedClass || !selectedClass.name || !selectedClass.year || !selectedClass.section) {
      setError("Please fill all required fields")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      // Update class in Realtime Database
      const classRef = ref(db, `classes/${selectedClass.id}`)
      
      const classData = {
        name: selectedClass.name,
        year: selectedClass.year,
        section: selectedClass.section,
        mentorId: userData?.uid,
        createdAt: selectedClass.createdAt,
      }

      await set(classRef, classData)

      // Update local state
      setClasses(classes.map(c => c.id === selectedClass.id ? { ...selectedClass } : c))

      // Close dialog
      setIsEditDialogOpen(false)
    } catch (error: any) {
      setError(error.message || "Failed to update class")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? This will not delete the mentees in this class.")) return

    try {
      // Delete class from Realtime Database
      await remove(ref(db, `classes/${classId}`))

      // Update local state
      setClasses(classes.filter(c => c.id !== classId))
    } catch (error) {
      console.error("Error deleting class:", error)
    }
  }

  const handleEditClass = (classInfo: ClassInfo) => {
    const { id, name, year, section, mentorId, createdAt } = classInfo
    setSelectedClass({ id, name, year, section, mentorId, createdAt })
    setIsEditDialogOpen(true)
  }

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">My Classes</h1>
          <p className="text-muted-foreground text-lg mt-2">Create and manage your classes</p>
        </div>

        <div className="flex justify-end mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Create a new class to organize your mentees.
                </DialogDescription>
              </DialogHeader>
              {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Class Name</Label>
                  <Input
                    id="name"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="Enter class name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    value={newClass.year}
                    onChange={(e) => setNewClass({ ...newClass, year: e.target.value })}
                    placeholder="Enter year"
                  />
                </div>

                <div>
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                    placeholder="Enter section"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateClass} disabled={isCreating}>
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Creating...
                    </span>
                  ) : (
                    "Create Class"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Class Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class information.
              </DialogDescription>
            </DialogHeader>
            {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Class Name</Label>
                <Input
                  id="edit-name"
                  value={selectedClass?.name || ""}
                  onChange={(e) => setSelectedClass(selectedClass ? { ...selectedClass, name: e.target.value } : null)}
                  placeholder="Enter class name"
                />
              </div>

              <div>
                <Label htmlFor="edit-year">Year</Label>
                <Input
                  id="edit-year"
                  value={selectedClass?.year || ""}
                  onChange={(e) => setSelectedClass(selectedClass ? { ...selectedClass, year: e.target.value } : null)}
                  placeholder="Enter year"
                />
              </div>

              <div>
                <Label htmlFor="edit-section">Section</Label>
                <Input
                  id="edit-section"
                  value={selectedClass?.section || ""}
                  onChange={(e) => setSelectedClass(selectedClass ? { ...selectedClass, section: e.target.value } : null)}
                  placeholder="Enter section"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleUpdateClass} disabled={isCreating}>
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Updating...
                  </span>
                ) : (
                  "Update Class"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : classes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classInfo) => (
              <Card key={classInfo.id} className="border-0 shadow-lg rounded-xl overflow-hidden card-hover">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-amber-600" />
                    </div>
                    {classInfo.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Year</p>
                      <p className="text-sm text-gray-800">{classInfo.year}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Section</p>
                      <p className="text-sm text-gray-800">{classInfo.section}</p>
                    </div>
                  </div>
                  


                  <div className="flex justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClass(classInfo)}
                      className="border-amber-200 hover:bg-amber-50 text-amber-700"
                    >
                      <PenSquare className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClass(classInfo.id)}
                      className="border-red-200 hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-amber-500 hover:bg-amber-600 mt-2"
                    asChild
                  >
                    <a href={`/mentor/mentees?classId=${classInfo.id}`} className="flex items-center justify-center">
                      <Users className="h-4 w-4 mr-2" />
                      View Mentees
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Users className="h-16 w-16 text-amber-300 mb-4" />
              <p className="text-xl font-medium text-gray-800 mb-2">No classes created yet</p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first class to organize your mentees
              </p>
              <Button 
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
