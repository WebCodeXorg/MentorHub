"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"
import { ref, set, onValue } from "firebase/database"
import { auth, db } from "@/lib/firebase"

type UserRole = "admin" | "mentor" | "mentee" | "admin+mentor"

interface UserData {
  uid: string
  email: string | null
  name: string
  role: UserRole
  assignedMentorId?: string
  profileImage?: string
  photoURL?: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signUp: (email: string, password: string, name: string, role: UserRole, mentorId?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Fetch user data from Realtime Database
        const userRef = ref(db, `users/${user.uid}`)

        // Set up a listener for real-time updates
        const userListener = onValue(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setUserData(snapshot.val() as UserData)
            }
            setLoading(false)
          },
          (error) => {
            console.error("Error fetching user data:", error)
            setLoading(false)
          },
        )

        return () => {
          // Clean up the listener when component unmounts or user changes
          userListener()
        }
      } else {
        setUserData(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string, role: UserRole, mentorId?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user document in Realtime Database
      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        name,
        role,
        ...(role === "mentee" && mentorId ? { assignedMentorId: mentorId } : {}),
      }

      await set(ref(db, `users/${user.uid}`), userData)
      setUserData(userData)
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signUp, signIn, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
