"use client"

import { useEffect, useState } from "react"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Download, FileText, ChevronRight } from "lucide-react"

interface Report {
  id: string
  title: string
  description: string
  fileUrl: string
  timestamp: number
  feedback?: string
  status: "pending" | "reviewed"
}

export default function MenteeReports() {
  const { userData } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      if (!userData) return

      try {
        // Fetch reports from Realtime Database
        const reportsRef = ref(db, "reports")
        const reportsSnapshot = await get(reportsRef)

        const reportsData: Report[] = []
        if (reportsSnapshot.exists()) {
          const allReports = reportsSnapshot.val()

          // Filter reports for this mentee
          Object.entries(allReports).forEach(([id, data]: [string, any]) => {
            if (data.menteeId === userData.uid) {
              reportsData.push({
                id,
                ...data,
              })
            }
          })

          // Sort by timestamp (newest first)
          reportsData.sort((a, b) => b.timestamp - a.timestamp)
        }

        setReports(reportsData)
      } catch (error) {
        console.error("Error fetching reports:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentee") {
      fetchReports()
    }
  }, [userData])

  if (!userData || userData.role !== "mentee") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">My Reports</h1>
          <p className="text-muted-foreground text-lg mt-2">View all your submitted reports and feedback</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : reports.length > 0 ? (
          <div className="grid gap-6">
            {reports.map((report) => (
              <Card key={report.id} className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div>
                    <CardTitle>{report.title || `Report #${report.id.substring(0, 6)}`}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Submitted on {formatDate(report.timestamp)}</p>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium ${
                        report.status === "reviewed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {report.status === "reviewed" ? "Reviewed" : "Pending"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Description</h3>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  </div>

                  {report.feedback && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Feedback</h3>
                      <p className="text-sm p-4 bg-amber-50 rounded-lg mt-1">{report.feedback}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-amber-600" />
                      <span className="text-sm">Report Document</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-200 hover:bg-amber-50 text-amber-700"
                      asChild
                    >
                      <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <FileText className="h-16 w-16 text-amber-300 mb-4" />
              <p className="text-xl font-medium text-gray-800 mb-2">No reports submitted yet</p>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Submit your first report to get feedback from your mentor
              </p>
              <Button className="bg-amber-500 hover:bg-amber-600" asChild>
                <a href="/mentee/submit-report" className="flex items-center">
                  Submit a Report <ChevronRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

