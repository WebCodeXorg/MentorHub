"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Download, FileText } from "lucide-react"

interface User {
  uid: string
  name: string
  email: string
  role: string
}

interface Report {
  reportId: string
  menteeId: string
  mentorId: string
  title: string
  description: string
  fileUrl: string
  timestamp: any
  feedback?: string
  status: "pending" | "reviewed"
}

export default function AdminReports() {
  const { userData } = useAuth()
  const [users, setUsers] = useState<Record<string, User>>({})
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.reduce(
          (acc, doc) => {
            acc[doc.id] = { uid: doc.id, ...doc.data() } as User
            return acc
          },
          {} as Record<string, User>,
        )
        setUsers(usersData)

        // Fetch all reports
        const reportsSnapshot = await getDocs(collection(db, "reports"))
        const reportsData = reportsSnapshot.docs.map((doc) => ({
          reportId: doc.id,
          ...doc.data(),
        })) as Report[]

        // Sort by timestamp (newest first)
        reportsData.sort((a, b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0
          return timeB - timeA
        })

        setReports(reportsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "admin") {
      fetchData()
    }
  }, [userData])

  if (!userData || userData.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">All Reports</h1>
          <p className="text-muted-foreground">View all reports submitted in the system</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : reports.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">Mentee</th>
                      <th className="text-left py-3 px-4">Mentor</th>
                      <th className="text-left py-3 px-4">Submitted</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.reportId} className="border-b">
                        <td className="py-3 px-4">{report.title}</td>
                        <td className="py-3 px-4">{users[report.menteeId]?.name || "Unknown"}</td>
                        <td className="py-3 px-4">{users[report.mentorId]?.name || "Unknown"}</td>
                        <td className="py-3 px-4">
                          {formatDate(report.timestamp?.toDate ? report.timestamp.toDate() : new Date())}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              report.status === "reviewed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {report.status === "reviewed" ? "Reviewed" : "Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="outline" size="sm" asChild>
                            <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No reports submitted yet</p>
              <p className="text-sm text-muted-foreground">There are no reports in the system</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

