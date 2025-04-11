"use client"

import { useState, useEffect } from "react"
import { ref, get, update } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileText, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  BookOpen,
  Shield,
  User
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import toast from "@/lib/toast"

interface Report {
  id: string
  title: string
  description: string
  fileUrl: string
  timestamp: number
  status: "pending" | "approved" | "rejected"
  menteeId: string
  recipients: {
    id: string
    role: "mentor" | "guide" | "co-guide"
  }[]
  feedback?: string
}

interface Mentee {
  uid: string
  name: string
  email: string
  enrollmentNo?: string
  class?: string
  year?: string
  section?: string
}

export default function GuidedReports() {
  const { userData } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [mentees, setMentees] = useState<Record<string, Mentee>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        setLoading(true)
        
        // Fetch all mentees first
        const menteesRef = ref(db, "users")
        const menteesSnapshot = await get(menteesRef)
        
        const menteesData: Record<string, Mentee> = {}
        
        if (menteesSnapshot.exists()) {
          const allUsers = menteesSnapshot.val()
          
          // Filter out mentees
          Object.entries(allUsers).forEach(([uid, data]: [string, any]) => {
            if (data.role === "mentee") {
              menteesData[uid] = {
                uid,
                name: data.name || "Unknown",
                email: data.email || "Unknown",
                enrollmentNo: data.enrollmentNo,
                class: data.class,
                year: data.year,
                section: data.section
              }
            }
          })
        }
        
        setMentees(menteesData)
        
        // Fetch all reports
        const reportsRef = ref(db, "reports")
        const reportsSnapshot = await get(reportsRef)
        
        const reportsData: Report[] = []
        
        if (reportsSnapshot.exists()) {
          const allReports = reportsSnapshot.val()
          
          // Filter reports where current user is a recipient as guide or co-guide
          Object.entries(allReports).forEach(([id, data]: [string, any]) => {
            if (data.recipients && Array.isArray(data.recipients)) {
              // Check if current user is in recipients as guide or co-guide
              const isRecipient = data.recipients.some((recipient: any) => 
                recipient.id === userData.uid && 
                (recipient.role === "guide" || recipient.role === "co-guide")
              )
              
              if (isRecipient) {
                reportsData.push({
                  id,
                  ...data
                })
              }
            }
          })
        }
        
        // Sort reports by timestamp (newest first)
        reportsData.sort((a, b) => b.timestamp - a.timestamp)
        
        setReports(reportsData)
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

  const getMenteeRole = (report: Report) => {
    const recipient = report.recipients.find(r => r.id === userData?.uid);
    return recipient ? recipient.role : "unknown";
  }

  const updateReportStatus = async (reportId: string, status: "approved" | "rejected", feedback: string = "") => {
    try {
      const reportRef = ref(db, `reports/${reportId}`)
      await update(reportRef, { status, feedback })
      
      // Update local state
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, status, feedback } 
            : report
        )
      )
      
      toast({
        title: "Success",
        description: `Report ${status === "approved" ? "approved" : "rejected"} successfully`,
        variant: "success"
      })
    } catch (error) {
      console.error("Error updating report status:", error)
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive"
      })
    }
  }

  const filteredReports = reports.filter(report => {
    const mentee = mentees[report.menteeId]
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      report.title.toLowerCase().includes(searchLower) ||
      report.description.toLowerCase().includes(searchLower) ||
      mentee?.name.toLowerCase().includes(searchLower) ||
      mentee?.enrollmentNo?.toLowerCase().includes(searchLower)
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    
    const role = getMenteeRole(report)
    const matchesRole = roleFilter === "all" || role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Pending</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "guide":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Guide</Badge>
      case "co-guide":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Co-Guide</Badge>
      default:
        return null
    }
  }

  if (!userData || (userData.role !== "mentor" && userData.role !== "admin+mentor")) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Guided Project Reports</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Review project reports from mentees where you are a guide or co-guide
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-auto md:flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10 pr-4 py-2 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
              placeholder="Search by title, mentee name or enrollment number..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="co-guide">Co-Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredReports.map((report) => {
              const mentee = mentees[report.menteeId]
              const role = getMenteeRole(report)
              
              return (
                <Card key={report.id} className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <FileText className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Submitted by {mentee?.name || "Unknown"} 
                            {mentee?.enrollmentNo ? ` (${mentee.enrollmentNo})` : ""}
                            {mentee?.class ? ` • ${mentee.class} ${mentee.year} (${mentee.section})` : ""}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(report.status)}
                        {getRoleBadge(role)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                        <p className="text-gray-600">{report.description}</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-1">Submitted On</h3>
                          <p className="text-gray-600">{formatDate(report.timestamp)}</p>
                        </div>
                        
                        {report.status !== "pending" && report.feedback && (
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Feedback</h3>
                            <p className="text-gray-600">{report.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-6 py-4 flex flex-wrap gap-3 justify-between">
                    <Button 
                      variant="outline" 
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => window.open(report.fileUrl, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                    
                    {report.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            const feedback = prompt("Enter feedback for rejection (optional):")
                            if (feedback !== null) {
                              updateReportStatus(report.id, "rejected", feedback)
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            const feedback = prompt("Enter feedback for approval (optional):")
                            if (feedback !== null) {
                              updateReportStatus(report.id, "approved", feedback)
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-amber-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Guided Reports Found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== "all" || roleFilter !== "all"
                  ? "No reports match your current filters. Try changing your search criteria."
                  : "You don't have any project reports from mentees where you are a guide or co-guide."}
              </p>
              {(searchQuery || statusFilter !== "all" || roleFilter !== "all") && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                    setRoleFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
