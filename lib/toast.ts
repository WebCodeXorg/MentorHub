import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "success" | "destructive" | "warning"

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

const toast = ({ title, description, variant = "default", duration = 5000 }: ToastOptions) => {
  switch (variant) {
    case "success":
      return sonnerToast.success(title, {
        description,
        duration,
      })
    case "destructive":
      return sonnerToast.error(title, {
        description,
        duration,
      })
    case "warning":
      return sonnerToast.warning(title, {
        description,
        duration,
      })
    default:
      return sonnerToast(title, {
        description,
        duration,
      })
  }
}

export default toast
