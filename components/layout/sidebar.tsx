"use client"

import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Users, FileText, Calendar, MessageSquare, Upload, Home, LogOut, BookOpen, 
  Sparkles, UserCircle, Menu, X, ShieldCheck, GraduationCap, School, 
  BarChart, Settings, BookMarked, UserCog, UserCheck, ScrollText, 
  Building, Presentation, HelpCircle
} from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"

export default function Sidebar() {
  const { userData, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    // Get profile image if available
    if (userData) {
      if (userData.profileImage) {
        setProfileImageUrl(userData.profileImage)
      } else if (userData.photoURL) {
        setProfileImageUrl(userData.photoURL)
      } else {
        setProfileImageUrl(null)
      }
    }
  }, [userData])

  if (!userData) return null

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const linkClass = (path: string) => {
    return `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      isActive(path) ? "bg-amber-500 text-white font-medium shadow-md" : "hover:bg-amber-50 text-gray-700"
    }`
  }

  const renderLinks = () => {
    // Check if we're on an admin page
    const isAdminPage = pathname.startsWith('/admin')
    
    // If we're on an admin page and user has admin access (either admin or admin+mentor), show only admin links
    if (isAdminPage && (userData.role === 'admin' || userData.role === 'admin+mentor')) {
      return (
        <>
          <Link href="/admin/dashboard" className={linkClass("/admin/dashboard")}>
            <BarChart size={20} />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/users" className={linkClass("/admin/users")}>
            <Users size={20} />
            <span>Manage Users</span>
          </Link>
          <Link href="/admin/manage-mentors" className={linkClass("/admin/manage-mentors")}>
            <UserCog size={20} />
            <span>Manage Mentors</span>
          </Link>
          <Link href="/profile" className={linkClass("/profile")}>
            <ShieldCheck size={20} />
            <span>My Profile</span>
          </Link>
        </>
      )
    }
    
    // For non-admin pages, show role-specific links
    switch (userData.role) {
      case "admin":
        return (
          <>
            <Link href="/admin/dashboard" className={linkClass("/admin/dashboard")}>
              <BarChart size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/admin/users" className={linkClass("/admin/users")}>
              <Users size={20} />
              <span>Manage Users</span>
            </Link>
            <Link href="/admin/manage-mentors" className={linkClass("/admin/manage-mentors")}>
              <UserCog size={20} />
              <span>Manage Mentors</span>
            </Link>
            <Link href="/profile" className={linkClass("/profile")}>
              <ShieldCheck size={20} />
              <span>My Profile</span>
            </Link>
          </>
        )
      case "mentor":
      case "admin+mentor":
        return (
          <>
            <Link href="/mentor/dashboard" className={linkClass("/mentor/dashboard")}>
              <Home size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/mentor/mentees" className={linkClass("/mentor/mentees")}>
              <GraduationCap size={20} />
              <span>My Mentees</span>
            </Link>
            <Link href="/mentor/manage-profiles" className={linkClass("/mentor/manage-profiles")}>
              <UserCog size={20} />
              <span>Manage Profiles</span>
            </Link>
            <Link href="/mentor/classes" className={linkClass("/mentor/classes")}>
              <School size={20} />
              <span>My Classes</span>
            </Link>
            <Link href="/mentor/guidance" className={linkClass("/mentor/guidance")}>
              <BookOpen size={20} />
              <span>Project Guidance</span>
            </Link>
            <Link href="/mentor/reports" className={linkClass("/mentor/reports")}>
              <FileText size={20} />
              <span>Project Reports</span>
            </Link>
            <Link href="/mentor/guided-reports" className={linkClass("/mentor/guided-reports")}>
              <BookOpen size={20} />
              <span>Guided Reports</span>
            </Link>
            <Link href="/mentor/sessions" className={linkClass("/mentor/sessions")}>
              <Calendar size={20} />
              <span>Sessions</span>
            </Link>
            <Link href="/mentor/queries" className={linkClass("/mentor/queries")}>
              <MessageSquare size={20} />
              <span>Queries</span>
            </Link>
            {/* Add admin links for admin+mentor role when not on admin pages */}
            {userData.role === 'admin+mentor' && (
              <>
                <div className="mt-4 mb-2 px-4 text-xs font-medium text-gray-500 uppercase">Admin Access</div>
                <Link href="/admin/dashboard" className={linkClass("/admin/dashboard")}>
                  <BarChart size={20} />
                  <span>Admin Dashboard</span>
                </Link>
                <Link href="/admin/users" className={linkClass("/admin/users")}>
                  <Users size={20} />
                  <span>Manage Users</span>
                </Link>
                <Link href="/admin/manage-mentors" className={linkClass("/admin/manage-mentors")}>
                  <UserCog size={20} />
                  <span>Manage Mentors</span>
                </Link>
              </>
            )}
            <Link href="/profile" className={linkClass("/profile")}>
              <UserCog size={20} />
              <span>My Profile</span>
            </Link>
          </>
        )
      case "mentee":
        return (
          <>
            <Link href="/mentee/dashboard" className={linkClass("/mentee/dashboard")}>
              <Home size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/mentee/my-profile" className={linkClass("/mentee/my-profile")}>
              <UserCheck size={20} />
              <span>My Profile</span>
            </Link>
            <Link href="/mentee/submit-report" className={linkClass("/mentee/submit-report")}>
              <Upload size={20} />
              <span>Submit Report</span>
            </Link>
            <Link href="/mentee/reports" className={linkClass("/mentee/reports")}>
              <BookMarked size={20} />
              <span>My Reports</span>
            </Link>
            <Link href="/mentee/sessions" className={linkClass("/mentee/sessions")}>
              <Presentation size={20} />
              <span>Sessions</span>
            </Link>
            <Link href="/mentee/ask-query" className={linkClass("/mentee/ask-query")}>
              <HelpCircle size={20} />
              <span>Ask Query</span>
            </Link>
          </>
        )
      default:
        return null
    }
  }

  // Mobile menu toggle button
  const mobileMenuButton = (
    <button 
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="lg:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow-md border border-amber-200"
    >
      {isMobileMenuOpen ? <X size={24} className="text-amber-500" /> : <Menu size={24} className="text-amber-500" />}
    </button>
  );

  return (
    <>
      {mobileMenuButton}
      
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      <div className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white flex flex-col z-40 shadow-xl lg:shadow-none transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-500 rounded-lg p-2 text-white">
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl font-bold">
              Mentor<span className="text-amber-500">Hub</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 mt-4">
            {profileImageUrl ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-200">
                <Image 
                  src={profileImageUrl} 
                  alt={userData.name} 
                  fill 
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-lg">
                {userData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{userData.name}</p>
              <p className="text-sm text-muted-foreground capitalize flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                {userData.role}
              </p>
            </div>
          </div>
        </div>
        <nav 
          className="flex-1 p-4 space-y-2 overflow-y-auto" 
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          <style jsx>{`
            nav::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {renderLinks()}
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full border-amber-200 hover:bg-amber-50 hover:text-amber-700 text-gray-700"
            onClick={handleLogout}
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </>
  )
}
