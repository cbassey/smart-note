'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HelpCircle, X } from 'lucide-react'

interface AICompanionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AICompanion({ open, onOpenChange }: AICompanionProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const question = input.trim()
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: question }])
    setMessages(prev => [...prev, { role: 'assistant', content: 'Searching through your notes...' }])

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })

      const data = await response.json()
      
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.answer }
        return updated
      })
    } catch (error) {
      console.error('AI error:', error)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { 
          role: 'assistant', 
          content: 'Sorry, there was an error processing your question.' 
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium text-[#101827]">
              AI Companion
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-[#6B7280]">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-[#F97315]" />
              <div className="text-sm font-medium text-[#101827] mb-2">
                Ask me anything about your notes
              </div>
              <div className="text-xs leading-relaxed">
                I can search through all your notes to answer questions like:<br />
                "Why did we decide to use Redis?"<br />
                "What was discussed in last week's meeting?"
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  {msg.role === 'user' ? 'You' : 'AI Companion'}
                </div>
                <div className={`
                  p-3 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user' 
                    ? 'bg-[#F9FAFB] border border-[#E5E7EB]' 
                    : 'bg-white border border-[#F97315]'
                  }
                `}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[#E5E7EB] flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder="Ask about your notes..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={loading || !input.trim()}
            className="bg-[#F97315] hover:bg-[#EA580C]"
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}