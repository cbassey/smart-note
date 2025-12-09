'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        
        if (error) throw error
        setMessage('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-5">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <div className="text-2xl font-light tracking-tight text-[#101827]">
            SMART NOTES
          </div>
          <div className="text-xs font-normal tracking-widest text-[#6B7280] uppercase mt-1">
            AI-Powered • Knowledge Base
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {message && (
            <div className={`
              text-xs p-3 rounded-lg border
              ${message.includes('Check') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
              }
            `}>
              {message}
            </div>
          )}

          <div className="space-y-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#F97315] hover:bg-[#EA580C]"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage('')
              }}
              className="w-full"
            >
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
          <p className="text-xs text-[#6B7280] text-center leading-relaxed">
            Your personal AI-powered knowledge base.<br />
            Take notes, ask questions, never forget.
          </p>
        </div>
      </Card>
    </div>
  )
}