import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | number | string): string {
  if (typeof date === "number") {
    date = new Date(date)
  } else if (typeof date === "string") {
    date = new Date(date)
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getRoleBasedRedirect(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "mentor":
      return "/mentor/dashboard"
    case "mentee":
      return "/mentee/dashboard"
    default:
      return "/login"
  }
}

