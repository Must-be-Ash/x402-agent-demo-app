import { useState } from "react"
import { isValidEmail } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface EmailInputProps {
  onSubmit: (email: string) => void
  disabled?: boolean
}

export function EmailInput({ onSubmit, disabled }: EmailInputProps) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    onSubmit(email.toLowerCase().trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-3">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          disabled={disabled}
          className={error ? "border-destructive" : ""}
          autoComplete="email"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <Button type="submit" disabled={disabled} className="w-full">
        {disabled ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Sending code...
          </div>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  )
}
