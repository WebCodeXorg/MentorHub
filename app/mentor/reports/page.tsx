"use client"

import { useEffect, useState } from "react"
import { ref, get, update } from "firebase/database"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { FileText, ChevronRight, ChevronDown, Eye, Download, Filter, Check, X } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface Mentee {
  uid: string
  name: string
  enrollmentNo?: string
}

interface Report {
  id: string
  menteeId: string
  title: string
  description: string
  fileUrl: string
  timestamp: number
  status: "pending" | "approved" | "rejected"
  viewed?: boolean
  feedback?: string
  recipients?: {
    id: string
    role: "mentor" | "guide" | "co-guide"
  }[]
  mentorId?: string // For backward compatibility
}

export default function MentorReports() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Record<string, Mentee>>({})
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMentee, setExpandedMentee] = useState<string | null>(null)
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [filterViewed, setFilterViewed] = useState(false)
  const [filterUnviewed, setFilterUnviewed] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch mentees from Realtime Database
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        const menteesData: Record<string, Mentee> = {}
        if (usersSnapshot.exists()) {
          const allUsers = usersSnapshot.val()

          // Filter mentees assigned to this mentor
          Object.entries(allUsers).forEach(([uid, data]: [string, any]) => {
            if (data.role === "mentee" && data.assignedMentorId === userData.uid) {
              menteesData[uid] = {
                uid,
                name: data.name,
                enrollmentNo: data.enrollmentNo || "",
              }
            }
          })
        }
        setMentees(menteesData)

        // Fetch reports from Realtime Database
        const reportsRef = ref(db, "reports")
        const reportsSnapshot = await get(reportsRef)

        const reportsData: Report[] = []
        if (reportsSnapshot.exists()) {
          const allReports = reportsSnapshot.val()

          // Filter reports for this mentor
          Object.entries(allReports).forEach(([id, data]: [string, any]) => {
            // Check if report uses new recipients array structure
            if (data.recipients && Array.isArray(data.recipients)) {
              // Check if current user is in recipients as mentor
              const isMentorRecipient = data.recipients.some((recipient: any) => 
                recipient.id === userData.uid && recipient.role === "mentor"
              );
              
              if (isMentorRecipient) {
                reportsData.push({
                  id,
                  ...data,
                  // Add viewed property if it doesn't exist
                  viewed: data.viewed || false
                });
              }
            } 
            // Backward compatibility for old reports with mentorId
            else if (data.mentorId === userData.uid) {
              reportsData.push({
                id,
                ...data,
                // Add viewed property if it doesn't exist
                viewed: data.viewed || false
              });
            }
          });

          // Sort by timestamp (newest first)
          reportsData.sort((a, b) => b.timestamp - a.timestamp);
        }

        setReports(reportsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchData()
    }
  }, [userData])

  if (!userData || userData.role !== "mentor") {
    return null
  }

  // Group reports by mentee
  const reportsByMentee = reports.reduce((acc, report) => {
    if (!acc[report.menteeId]) {
      acc[report.menteeId] = [];
    }
    acc[report.menteeId].push(report);
    return acc;
  }, {} as Record<string, Report[]>);

  // Toggle mentee expansion
  const toggleMenteeExpansion = (menteeId: string) => {
    setExpandedMentee(expandedMentee === menteeId ? null : menteeId);
    setExpandedReport(null); // Close any open report when toggling mentee
  };

  // Toggle report expansion
  const toggleReportExpansion = (reportId: string) => {
    // If report is being opened and wasn't viewed before
    if (expandedReport !== reportId) {
      const report = reports.find(r => r.id === reportId);
      if (report && !report.viewed) {
        // Mark as viewed in database
        update(ref(db, `reports/${reportId}`), { viewed: true });
        
        // Update local state
        setReports(reports.map(r => 
          r.id === reportId ? { ...r, viewed: true } : r
        ));
      }
    }
    
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  // Filter reports based on current filter settings
  const getFilteredMentees = () => {
    const filteredReports = reports.filter(report => {
      // Filter by viewed status
      if (filterViewed && !filterUnviewed && !report.viewed) return false;
      if (!filterViewed && filterUnviewed && report.viewed) return false;
      
      // Filter by review status
      if (filterStatus === "pending" && report.status !== "pending") return false;
      if (filterStatus === "approved" && report.status !== "approved") return false;
      if (filterStatus === "rejected" && report.status !== "rejected") return false;
      
      return true;
    });
    
    // Get unique mentee IDs from filtered reports
    const menteeIds = [...new Set(filteredReports.map(r => r.menteeId))];
    
    // Apply search filter if there's a search query
    const searchFilteredMentees = Object.entries(reportsByMentee)
      .filter(([menteeId]) => {
        // First filter by reports
        if (!menteeIds.includes(menteeId)) return false;
        
        // Then filter by search query if present
        if (searchQuery.trim() !== "") {
          const mentee = mentees[menteeId];
          const query = searchQuery.toLowerCase();
          const nameMatch = mentee?.name?.toLowerCase().includes(query);
          const enrollmentMatch = mentee?.enrollmentNo?.toLowerCase().includes(query);
          return nameMatch || enrollmentMatch;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by mentee name
        const nameA = mentees[a[0]]?.name || "";
        const nameB = mentees[b[0]]?.name || "";
        return nameA.localeCompare(nameB);
      });
      
    return searchFilteredMentees;
  };

  // Open PDF in a new tab
  const openPdf = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Project Reports</h1>
          <p className="text-muted-foreground text-lg mt-2">View and provide feedback on mentee project reports</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-6">
            {/* Search */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden mb-6">
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-4">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <CardTitle>Search Mentees</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Search by name or enrollment number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            {/* Filters */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 pb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-amber-600" />
                  <CardTitle>Filter Reports</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">By Viewed Status</h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="filter-viewed" 
                          checked={filterViewed} 
                          onCheckedChange={(checked) => setFilterViewed(checked === true)}
                        />
                        <Label htmlFor="filter-viewed" className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-amber-600" />
                          <span>Viewed Reports</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="filter-unviewed" 
                          checked={filterUnviewed} 
                          onCheckedChange={(checked) => setFilterUnviewed(checked === true)}
                        />
                        <Label htmlFor="filter-unviewed" className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span>Unviewed Reports</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">By Review Status</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant={filterStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("all")}
                        className={filterStatus === "all" ? "bg-amber-500" : ""}
                      >
                        All
                      </Button>
                      <Button 
                        variant={filterStatus === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("pending")}
                        className={filterStatus === "pending" ? "bg-amber-500" : ""}
                      >
                        Pending
                      </Button>
                      <Button 
                        variant={filterStatus === "approved" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("approved")}
                        className={filterStatus === "approved" ? "bg-amber-500" : ""}
                      >
                        Approved
                      </Button>
                      <Button 
                        variant={filterStatus === "rejected" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("rejected")}
                        className={filterStatus === "rejected" ? "bg-amber-500" : ""}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Reports by Mentee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getFilteredMentees().length > 0 ? (
                getFilteredMentees().map(([menteeId, menteeReports]) => (
                  <Card 
                    key={menteeId} 
                    className={`border-0 shadow-lg rounded-xl overflow-hidden transition-all duration-200 ${expandedMentee === menteeId ? 'ring-2 ring-amber-300' : ''}`}
                  >
                    <CardHeader 
                      className={`${expandedMentee === menteeId ? 'bg-amber-500 text-white' : 'bg-gradient-to-r from-amber-500/20 to-amber-500/5'} cursor-pointer`}
                      onClick={() => toggleMenteeExpansion(menteeId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            {mentees[menteeId]?.name.charAt(0).toUpperCase() || 'M'}
                          </div>
                          <div>
                            <CardTitle className={expandedMentee === menteeId ? 'text-white' : ''}>
                              {mentees[menteeId]?.name || "Unknown Mentee"}
                            </CardTitle>
                            <CardDescription className={expandedMentee === menteeId ? 'text-white/80' : ''}>
                              {mentees[menteeId]?.enrollmentNo ? `${mentees[menteeId].enrollmentNo} • ` : ""}
                              {menteeReports.length} report{menteeReports.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 transition-transform duration-200 ${expandedMentee === menteeId ? 'rotate-180' : ''}`} 
                        />
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {expandedMentee === menteeId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="p-0">
                            <div className="divide-y">
                              {menteeReports
                                .filter(report => {
                                  // Apply the same filters to individual reports
                                  if (filterViewed && !filterUnviewed && !report.viewed) return false;
                                  if (!filterViewed && filterUnviewed && report.viewed) return false;
                                  if (filterStatus === "pending" && report.status !== "pending") return false;
                                  if (filterStatus === "approved" && report.status !== "approved") return false;
                                  if (filterStatus === "rejected" && report.status !== "rejected") return false;
                                  return true;
                                })
                                .map(report => (
                                <div key={report.id}>
                                  {/* Report Header - Always visible */}
                                  <div 
                                    className={`p-4 cursor-pointer hover:bg-amber-50 ${report.viewed ? '' : 'bg-blue-50'} ${expandedReport === report.id ? 'bg-amber-100' : ''}`}
                                    onClick={() => toggleReportExpansion(report.id)}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <FileText className={`h-4 w-4 ${report.viewed ? 'text-amber-600' : 'text-blue-600'}`} />
                                          <h3 className="font-medium">{report.title}</h3>
                                          {!report.viewed && (
                                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">New</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{formatDate(report.timestamp)}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`px-2 py-1 text-xs rounded-full ${report.status === "approved" ? "bg-green-100 text-green-800" : report.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                                        >
                                          {report.status === "approved" ? "Approved" : report.status === "rejected" ? "Rejected" : "Pending"}
                                        </span>
                                        <ChevronDown 
                                          className={`h-4 w-4 transition-transform duration-200 ${expandedReport === report.id ? 'rotate-180' : ''}`} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Expanded Report Content */}
                                  <AnimatePresence>
                                    {expandedReport === report.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-t border-amber-100"
                                      >
                                        <div className="p-4 bg-amber-50/50">
                                          <div className="space-y-4">
                                            <div>
                                              <h4 className="text-sm font-medium text-gray-700">Description</h4>
                                              <p className="text-sm mt-1">{report.description}</p>
                                            </div>
                                            
                                            <div className="pt-2">
                                              <Button 
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                                asChild
                                              >
                                                <Link href={`/mentor/reports/${menteeId}?reportId=${report.id}`}>
                                                  Review Report
                                                  <ChevronRight className="h-4 w-4 ml-1" />
                                                </Link>
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))
              ) : (
                <div className="md:col-span-2">
                  <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                      <FileText className="h-16 w-16 text-amber-300 mb-4" />
                      <p className="text-xl font-medium text-gray-800 mb-2">No matching reports found</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Try adjusting your filters to see more reports
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <FileText className="h-16 w-16 text-amber-300 mb-4" />
              <p className="text-xl font-medium text-gray-800 mb-2">No reports submitted yet</p>
              <p className="text-sm text-muted-foreground text-center">
                Your mentees haven't submitted any reports yet
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
