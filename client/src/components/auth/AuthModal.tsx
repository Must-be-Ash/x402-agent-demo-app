import { useState, useEffect } from "react"
import { useSignInWithEmail, useVerifyEmailOTP, useIsSignedIn } from "@coinbase/cdp-hooks"
import { X } from "lucide-react"
import { EmailInput } from "./EmailInput"
import { OTPInput } from "./OTPInput"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type AuthStep = "email" | "otp"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [flowId, setFlowId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isSignedIn } = useIsSignedIn()
  const { signInWithEmail } = useSignInWithEmail()
  const { verifyEmailOTP } = useVerifyEmailOTP()

  const handleEmailSubmit = async (emailValue: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await signInWithEmail({ email: emailValue })
      setEmail(emailValue)
      setFlowId(result.flowId)
      setStep("otp")
    } catch (error) {
      console.error("Email sign-in failed:", error)
      setError(error instanceof Error ? error.message : "Failed to send verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPSubmit = async (otp: string) => {
    if (!flowId) return

    setIsLoading(true)
    setError(null)
    try {
      await verifyEmailOTP({
        flowId,
        otp,
      })
      // Success - user is now authenticated
      // The parent component will detect the auth state change
      onClose()
    } catch (error) {
      console.error("OTP verification failed:", error)
      setError(error instanceof Error ? error.message : "Invalid verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep("email")
    setError(null)
  }

  const handleClose = () => {
    setStep("email")
    setEmail("")
    setFlowId(null)
    setError(null)
    setIsLoading(false)
    onClose()
  }

  // Close modal if user becomes signed in or is already signed in when it opens
  useEffect(() => {
    if (isOpen && isSignedIn) {
      handleClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSignedIn])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md shadow-2xl">
        <CardContent className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>


          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Auth steps */}
          {step === "email" && <EmailInput onSubmit={handleEmailSubmit} disabled={isLoading} />}
          {step === "otp" && (
            <OTPInput email={email} onSubmit={handleOTPSubmit} onBack={handleBack} disabled={isLoading} />
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Secured by Coinbase</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
