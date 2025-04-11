"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ref, push, get } from "firebase/database"
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Users } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface UserData {
  uid: string;
  role: string;
  assignedMentorId?: string;
  guideId?: string;
  coGuideId?: string;
  [key: string]: any;
}

interface Mentor {
  uid: string;
  name: string;
  email: string;
}

export default function SubmitReport() {
  const { userData } = useAuth() as { userData: UserData | null }
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [sendToMentor, setSendToMentor] = useState(true)
  const [sendToGuide, setSendToGuide] = useState(false)
  const [sendToCoGuide, setSendToCoGuide] = useState(false)
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [guide, setGuide] = useState<Mentor | null>(null)
  const [coGuide, setCoGuide] = useState<Mentor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMentors = async () => {
      if (!userData) return;

      try {
        setLoading(true);
        
        // Fetch mentor data
        if (userData.assignedMentorId) {
          const mentorRef = ref(db, `users/${userData.assignedMentorId}`);
          const mentorSnapshot = await get(mentorRef);
          
          if (mentorSnapshot.exists()) {
            const mentorData = mentorSnapshot.val();
            setMentor({
              uid: userData.assignedMentorId,
              name: mentorData.name || 'Unknown',
              email: mentorData.email || 'Unknown'
            });
          }
        }
        
        // Fetch guide data
        if (userData.guideId) {
          const guideRef = ref(db, `users/${userData.guideId}`);
          const guideSnapshot = await get(guideRef);
          
          if (guideSnapshot.exists()) {
            const guideData = guideSnapshot.val();
            setGuide({
              uid: userData.guideId,
              name: guideData.name || 'Unknown',
              email: guideData.email || 'Unknown'
            });
          }
        }
        
        // Fetch co-guide data
        if (userData.coGuideId) {
          const coGuideRef = ref(db, `users/${userData.coGuideId}`);
          const coGuideSnapshot = await get(coGuideRef);
          
          if (coGuideSnapshot.exists()) {
            const coGuideData = coGuideSnapshot.val();
            setCoGuide({
              uid: userData.coGuideId,
              name: coGuideData.name || 'Unknown',
              email: coGuideData.email || 'Unknown'
            });
          }
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, [userData]);

  const uploadFile = async (selectedFile: File) => {
    if (!userData) return null;
    
    try {
      // Reset states
      setFileUrl(null);
      setIsUploading(true);
      setUploadProgress(0);
      setError("");
      
      // Upload file to Firebase Storage with progress tracking
      const fileStorageRef = storageRef(storage, `reports/${userData.uid}/${Date.now()}_${selectedFile.name}`);
      
      // Create upload task with progress monitoring
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);
      
      // Return a promise that resolves when the upload is complete
      return new Promise<string>((resolve, reject) => {
        // Monitor upload progress
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Calculate and update progress percentage
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => {
            // Handle upload errors
            setIsUploading(false);
            setError(error.message || "Failed to upload file");
            reject(error);
          },
          async () => {
            // Upload completed successfully
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setFileUrl(url);
            setIsUploading(false);
            resolve(url);
          }
        );
      });
    } catch (error: any) {
      setIsUploading(false);
      setError(error.message || "Failed to upload file");
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file is PDF
      if (selectedFile.type !== 'application/pdf') {
        setError("Only PDF files are accepted");
        return;
      }
      
      // Check file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File size exceeds 50MB limit");
        return;
      }
      
      setFile(selectedFile);
      
      // Start uploading immediately
      await uploadFile(selectedFile);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a file to upload")
      return
    }

    if (!sendToMentor && !sendToGuide && !sendToCoGuide) {
      setError("Please select at least one recipient for your report")
      return
    }

    if (!fileUrl) {
      setError("Please wait for the file to finish uploading")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Create an array of recipients
      const recipients = [];
      
      if (sendToMentor && userData?.assignedMentorId) {
        recipients.push({
          id: userData.assignedMentorId,
          role: "mentor"
        });
      }
      
      if (sendToGuide && userData?.guideId) {
        recipients.push({
          id: userData.guideId,
          role: "guide"
        });
      }
      
      if (sendToCoGuide && userData?.coGuideId) {
        recipients.push({
          id: userData.coGuideId,
          role: "co-guide"
        });
      }

      // Add report to Realtime Database using the already uploaded file URL
      const reportsRef = ref(db, "reports")
      await push(reportsRef, {
        menteeId: userData?.uid,
        recipients: recipients,
        title,
        description,
        fileUrl,
        timestamp: Date.now(),
        status: "pending",
      })

      // Redirect to reports page
      router.push("/mentee/reports")
    } catch (error: any) {
      setError(error.message || "Failed to submit report")
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  if (!userData || userData.role !== "mentee") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="curved-decoration">
          <h1 className="text-4xl font-bold text-gray-800">Submit Report</h1>
          <p className="text-muted-foreground text-lg mt-2">Upload your report for mentor review</p>
        </div>

        <Card className="border-0 shadow-lg rounded-xl overflow-hidden max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                <CardTitle>New Report</CardTitle>
              </div>
              <CardDescription>
                Fill in the details and upload your report file (PDF format only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {error && <div className="p-3 text-sm text-white bg-red-500 rounded-lg">{error}</div>}
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Report Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your report"
                  className="border-amber-200 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what this report is about"
                  className="border-amber-200 focus:ring-amber-500"
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-3 mt-6">
                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Send Report To:
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-amber-50 p-4 rounded-lg">
                    {mentor && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="send-to-mentor" 
                          checked={sendToMentor} 
                          onCheckedChange={(checked) => setSendToMentor(checked as boolean)}
                        />
                        <Label htmlFor="send-to-mentor" className="flex items-center gap-2">
                          <span className="font-medium">Mentor:</span> {mentor.name} ({mentor.email})
                        </Label>
                      </div>
                    )}
                    
                    {guide && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="send-to-guide" 
                          checked={sendToGuide} 
                          onCheckedChange={(checked) => setSendToGuide(checked as boolean)}
                        />
                        <Label htmlFor="send-to-guide" className="flex items-center gap-2">
                          <span className="font-medium">Guide:</span> {guide.name} ({guide.email})
                        </Label>
                      </div>
                    )}
                    
                    {coGuide && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="send-to-co-guide" 
                          checked={sendToCoGuide} 
                          onCheckedChange={(checked) => setSendToCoGuide(checked as boolean)}
                        />
                        <Label htmlFor="send-to-co-guide" className="flex items-center gap-2">
                          <span className="font-medium">Co-Guide:</span> {coGuide.name} ({coGuide.email})
                        </Label>
                      </div>
                    )}
                    
                    {!mentor && !guide && !coGuide && (
                      <div className="text-amber-600 text-sm">
                        You don't have any mentors, guides, or co-guides assigned. Please contact your administrator.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-6">
                <label className="text-sm font-medium text-gray-700">
                  Upload Report (PDF only)
                </label>
                <div className="border border-dashed border-amber-300 rounded-xl p-8 bg-amber-50/50">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Upload className="h-10 w-10 text-amber-500" />
                    {file ? (
                      <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-amber-700">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">
                        Click to upload a PDF file
                      </p>
                    )}
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300 hover:bg-amber-100 text-amber-700"
                      onClick={() => document.getElementById("file")?.click()}
                    >
                      Select PDF File
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Only PDF files are accepted. Maximum file size: 50MB</p>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 px-6 py-4">
              <div className="w-full">
                {isUploading ? (
                  <div className="w-full">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Uploading PDF...</span>
                      <span className="text-sm font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-amber-500 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Please wait while your file is uploading. Don't close this page.
                    </p>
                  </div>
                ) : fileUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">PDF uploaded successfully!</span>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 w-full">
                      {isSubmitting ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" disabled={true} className="bg-amber-300 w-full cursor-not-allowed">
                    Please select and upload a PDF first
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
