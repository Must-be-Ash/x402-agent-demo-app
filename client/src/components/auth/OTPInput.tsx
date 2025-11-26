import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface OTPInputProps {
  email: string
  onSubmit: (otp: string) => void
  onBack: () => void
  disabled?: boolean
}

export function OTPInput({ email, onSubmit, onBack, disabled }: OTPInputProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value !== "" && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    // Auto-focus next input
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all fields are filled
    if (value !== "" && index === 5 && newOtp.every((digit) => digit !== "")) {
      const otpCode = newOtp.join("")
      onSubmit(otpCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus()
    }

    if (e.key === "Enter") {
      const otpCode = otp.join("")
      if (otpCode.length === 6) {
        onSubmit(otpCode)
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")

    // Extract 6 digits from pasted content
    const digits = pastedData
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("")

    if (digits.length === 6) {
      setOtp(digits)
      onSubmit(digits.join(""))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join("")

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    onSubmit(otpCode)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
        <p className="text-muted-foreground mb-4">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Verification code</label>
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={disabled}
              className={`w-11 h-11 text-center text-lg font-semibold rounded-lg bg-background border ${
                error ? "border-destructive focus:border-destructive" : "border-input focus:border-primary"
              } text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
      </div>

      <div className="space-y-3">
        <Button type="submit" disabled={disabled} className="w-full">
          {disabled ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Verifying...
            </div>
          ) : (
            "Verify"
          )}
        </Button>

        <Button type="button" onClick={onBack} disabled={disabled} variant="outline" className="w-full">
          Back
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={onBack}
            disabled={disabled}
            className="text-primary hover:underline font-medium transition-colors"
          >
            Try a different email
          </button>
        </p>
      </div>
    </form>
  )
}
