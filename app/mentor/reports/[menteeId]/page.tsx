"use client"

import { useEffect, useState, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ref, get, update } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Download, FileText, Eye, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Mentee {
  uid: string
  name: string
  email: string
}

interface Report {
  reportId: string
  title: string
  description: string
  fileUrl: string
  timestamp: any
  feedback?: string
  status: "pending" | "approved" | "rejected"
  viewed?: boolean
  recipients?: {
    id: string
    role: "mentor" | "guide" | "co-guide"
  }[]
  mentorId?: string // For backward compatibility
}

export default function MenteeReports({ params }: { params: Promise<{ menteeId: string }> }) {
  const { menteeId } = use(params)
  const searchParams = useSearchParams()
  const reportId = searchParams.get("reportId")
  const router = useRouter()
  const { userData } = useAuth()
  const [mentee, setMentee] = useState<Mentee | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch mentee info
        const menteeRef = ref(db, `users/${menteeId}`)
        const menteeSnapshot = await get(menteeRef)
        if (menteeSnapshot.exists()) {
          setMentee({ 
            uid: menteeId, 
            ...menteeSnapshot.val() 
          } as Mentee)
        }

        // Fetch reports
        const reportsRef = ref(db, "reports")
        const reportsSnapshot = await get(reportsRef)
        
        const reportsData: Report[] = []
        if (reportsSnapshot.exists()) {
          const allReports = reportsSnapshot.val()
          
          // Filter reports for this mentee and mentor
          Object.entries(allReports).forEach(([id, data]: [string, any]) => {
            // Check if report uses new recipients array structure
            if (data.menteeId === menteeId && data.recipients && Array.isArray(data.recipients)) {
              // Check if current user is in recipients as mentor
              const isMentorRecipient = data.recipients.some((recipient: any) => 
                recipient.id === userData.uid && recipient.role === "mentor"
              );
              
              if (isMentorRecipient) {
                reportsData.push({
                  reportId: id,
                  ...data,
                });
              }
            } 
            // Backward compatibility for old reports with mentorId
            else if (data.menteeId === menteeId && data.mentorId === userData.uid) {
              reportsData.push({
                reportId: id,
                ...data,
              });
            }
          });
        }
        
        // Sort by timestamp (newest first)
        reportsData.sort((a, b) => b.timestamp - a.timestamp)

        setReports(reportsData)

        // Set selected report if reportId is provided
        if (reportId) {
          const report = reportsData.find((r) => r.reportId === reportId) || null
          setSelectedReport(report)
          if (report?.feedback) {
            setFeedback(report.feedback)
          }
        } else if (reportsData.length > 0) {
          setSelectedReport(reportsData[0])
          if (reportsData[0].feedback) {
            setFeedback(reportsData[0].feedback)
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchData()
    }
  }, [userData, menteeId, reportId])

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report)
    setFeedback(report.feedback || "")
  }

  const handleSubmitFeedback = async () => {
    if (!selectedReport || !userData) return

    setIsSubmitting(true)

    try {
      const reportRef = ref(db, `reports/${selectedReport.reportId}`)
      await update(reportRef, {
        feedback,
        status: "approved", // Change status to approved when feedback is provided
        viewed: true
      })

      // Update local state
      setSelectedReport({
        ...selectedReport,
        feedback,
        status: "approved",
        viewed: true
      })

      setReports(
        reports.map((report) =>
          report.reportId === selectedReport.reportId
            ? {
                ...report,
                feedback,
                status: "approved",
                viewed: true
              }
            : report
        )
      )
    } catch (error) {
      console.error("Error submitting feedback:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectReport = async () => {
    if (!selectedReport || !userData) return
    
    const rejectReason = prompt("Please provide a reason for rejection (optional):")
    if (rejectReason === null) return // User cancelled
    
    setIsSubmitting(true)

    try {
      const reportRef = ref(db, `reports/${selectedReport.reportId}`)
      await update(reportRef, {
        feedback: rejectReason || "Report rejected",
        status: "rejected", // Change status to rejected
        viewed: true
      })

      // Update local state
      setSelectedReport({
        ...selectedReport,
        feedback: rejectReason || "Report rejected",
        status: "rejected",
        viewed: true
      })

      setReports(
        reports.map((report) =>
          report.reportId === selectedReport.reportId
            ? {
                ...report,
                feedback: rejectReason || "Report rejected",
                status: "rejected",
                viewed: true
              }
            : report
        )
      )
    } catch (error) {
      console.error("Error rejecting report:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mentee Reports</h1>
            {mentee && (
              <p className="text-muted-foreground">
                Reports from {mentee.name} ({mentee.email})
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : reports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Reports</CardTitle>
                  <CardDescription>Select a report to review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {reports.map((report) => (
                      <div
                        key={report.reportId}
                        className={`p-3 rounded-md cursor-pointer ${
                          selectedReport?.reportId === report.reportId
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => handleSelectReport(report)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-xs">
                              {formatDate(report.timestamp?.toDate ? report.timestamp.toDate() : new Date())}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              report.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : report.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {report.status === "approved"
                              ? "Approved"
                              : report.status === "rejected"
                                ? "Rejected"
                                : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              {selectedReport ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedReport.title}</CardTitle>
                    <CardDescription>
                      Submitted on{" "}
                      {formatDate(selectedReport.timestamp?.toDate ? selectedReport.timestamp.toDate() : new Date())}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">Description</h3>
                      <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Report Document</h3>
                      <Tabs defaultValue="view" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="view">View PDF</TabsTrigger>
                          <TabsTrigger value="download">Download</TabsTrigger>
                        </TabsList>
                        <TabsContent value="view" className="p-0 border rounded-md mt-2">
                          <div className="p-2 bg-muted rounded-t-md flex justify-between items-center">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm font-medium">PDF Preview</span>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={selectedReport.fileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open in new tab
                              </a>
                            </Button>
                          </div>
                          <div className="w-full h-[500px] border-t">
                            <iframe 
                              src={`${selectedReport.fileUrl}#toolbar=0&navpanes=0`} 
                              className="w-full h-full" 
                              title="PDF Viewer"
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="download" className="p-4 border rounded-md mt-2 bg-muted">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <FileText className="h-16 w-16 text-amber-500" />
                            <div className="text-center">
                              <p className="font-medium mb-1">Download Report PDF</p>
                              <p className="text-sm text-muted-foreground mb-4">Save the report to your device</p>
                            </div>
                            <Button className="bg-amber-500 hover:bg-amber-600" asChild>
                              <a href={selectedReport.fileUrl} download>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </a>
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Feedback</h3>
                      <Textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Provide your feedback on this report..."
                        rows={6}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center gap-4 mt-4">
                      <Button 
                        onClick={handleSubmitFeedback} 
                        disabled={isSubmitting || !feedback.trim()}
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        {isSubmitting ? "Submitting..." : selectedReport?.status === "approved" ? "Update Feedback" : "Approve & Submit Feedback"}
                      </Button>
                      
                      {selectedReport?.status !== "rejected" && (
                        <Button 
                          variant="outline" 
                          onClick={handleRejectReport}
                          disabled={isSubmitting}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Reject Report
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No report selected</p>
                    <p className="text-sm text-muted-foreground">
                      Select a report from the list to view and provide feedback
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No reports submitted yet</p>
              <p className="text-sm text-muted-foreground">This mentee hasn't submitted any reports yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
