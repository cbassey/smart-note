'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HelpCircle, X, Trash2, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import MarkdownPreview from './MarkdownPreview'

interface AICompanionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  lastActiveAt: string
}

interface DailyChats {
  date: string
  currentSessionId: string | null  // Can be null (no active session)
  sessions: Record<string, ChatSession>
}

const STORAGE_KEY = 'smart-notes-ai-chat'
const SESSION_IDLE_HOURS = 2

export default function AICompanion({ open, onOpenChange }: AICompanionProps) {
  const [dailyChats, setDailyChats] = useState<DailyChats>(() => {
    if (typeof window === 'undefined') return getEmptyDailyChats()
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return getEmptyDailyChats()
      
      const data: DailyChats = JSON.parse(saved)
      const today = getTodayDate()
      
      // Check if we've crossed into a new day
      if (data.date !== today) {
        console.log('New day detected, clearing chat history')
        return getEmptyDailyChats()
      }
      
      return data
    } catch (error) {
      console.error('Failed to load chat history:', error)
      return getEmptyDailyChats()
    }
  })
  
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const currentSession = dailyChats.currentSessionId 
    ? dailyChats.sessions[dailyChats.currentSessionId] 
    : null
    
  const sessionList = Object.values(dailyChats.sessions).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Save to localStorage whenever dailyChats changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyChats))
    } catch (error) {
      console.error('Failed to save chat history:', error)
    }
  }, [dailyChats])

  // Check if session is stale when dialog opens
  useEffect(() => {
    if (!open) return
    
    // If no current session, stay in null state
    if (!dailyChats.currentSessionId) return
    
    // If current session doesn't exist (deleted?), go to null
    const session = dailyChats.sessions[dailyChats.currentSessionId]
    if (!session) {
      setDailyChats(prev => ({ ...prev, currentSessionId: null }))
      return
    }
    
    // If current session is stale, go to null state
    if (shouldCreateNewSession(session)) {
      setDailyChats(prev => ({ ...prev, currentSessionId: null }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dailyChats.currentSessionId]) // Only re-run on dialog open or session switch

  // Helper functions
  function getTodayDate() {
    return new Date().toLocaleDateString('en-CA')
  }

  function getEmptyDailyChats(): DailyChats {
    return {
      date: getTodayDate(),
      currentSessionId: null,  // Start with no session
      sessions: {}
    }
  }

  function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function createNewSession(id: string): ChatSession {
    const now = new Date().toISOString()
    return {
      id,
      title: 'New conversation',
      messages: [],
      createdAt: now,
      lastActiveAt: now
    }
  }

  function generateTitle(messages: Message[]) {
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (!firstUserMessage) return 'New conversation'
    
    const title = firstUserMessage.content.substring(0, 40)
    return title.length < firstUserMessage.content.length ? title + '...' : title
  }

  function shouldCreateNewSession(session: ChatSession | null): boolean {
    if (!session || session.messages.length === 0) return false
    
    const hoursSinceActive = 
      (Date.now() - new Date(session.lastActiveAt).getTime()) / (1000 * 60 * 60)
    
    return hoursSinceActive >= SESSION_IDLE_HOURS
  }

  // Session management
  function startNewChat() {
    // Simply go to null state - session will be created on first message
    setDailyChats(prev => ({
      ...prev,
      currentSessionId: null
    }))
  }

  function switchSession(sessionId: string) {
    setDailyChats(prev => ({
      ...prev,
      currentSessionId: sessionId
    }))
  }

  function handleDeleteSession(sessionId: string) {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    
    const updatedSessions = { ...dailyChats.sessions }
    delete updatedSessions[sessionId]
    
    // If deleting current session, go to null state
    const newCurrentId = dailyChats.currentSessionId === sessionId 
      ? null 
      : dailyChats.currentSessionId
    
    setDailyChats({
      date: getTodayDate(),
      currentSessionId: newCurrentId,
      sessions: updatedSessions
    })
    
    toast.success('Conversation deleted', {
      style: {
        background: '#F0FDF4',
        border: '1px solid #86EFAC',
        color: '#166534',
      },
    })
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const question = input.trim()
    setInput('')
    setLoading(true)

    // If no current session, create one
    let activeSessionId: string
    let conversationHistory: Message[] = []
    
    if (!dailyChats.currentSessionId) {
      activeSessionId = generateSessionId()
      const newSession = createNewSession(activeSessionId)
      conversationHistory = [] // New session has no history
      
      setDailyChats(prev => ({
        ...prev,
        currentSessionId: activeSessionId,
        sessions: {
          ...prev.sessions,
          [activeSessionId]: newSession
        }
      }))
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 0))
    } else {
      activeSessionId = dailyChats.currentSessionId
      // Get history from current session
      conversationHistory = dailyChats.sessions[activeSessionId].messages
    }

    // Add user message
    const userMessage: Message = { role: 'user', content: question }
    const placeholderMessage: Message = { role: 'assistant', content: 'Searching through your notes...' }

    setDailyChats(prev => {
      const session = prev.sessions[activeSessionId]
      const updatedMessages = [...session.messages, userMessage, placeholderMessage]
      
      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [activeSessionId]: {
            ...session,
            messages: updatedMessages,
            title: session.messages.length === 0 ? generateTitle([userMessage]) : session.title,
            lastActiveAt: new Date().toISOString()
          }
        }
      }
    })

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question,
          conversationHistory // Use the history we captured earlier
        })
      })

      if (!response.ok) {  // Check status code
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Replace placeholder with actual response
      setDailyChats(prev => {
        const session = prev.sessions[activeSessionId]
        const updatedMessages = [...session.messages]
        updatedMessages[updatedMessages.length - 1] = { 
          role: 'assistant', 
          content: data.answer 
        }
        
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [activeSessionId]: {
              ...session,
              messages: updatedMessages,
              lastActiveAt: new Date().toISOString()
            }
          }
        }
      })
    } catch (error) {
      console.error('AI error:', error)
      toast.error('Could not reach AI', {
        description: 'Please try again',
        style: {
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          color: '#991B1B',
        },
      })
      
      // Replace placeholder with error message
      setDailyChats(prev => {
        const session = prev.sessions[activeSessionId]
        const updatedMessages = [...session.messages]
        updatedMessages[updatedMessages.length - 1] = { 
          role: 'assistant', 
          content: 'Sorry, there was an error processing your question.' 
        }
        
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [activeSessionId]: {
              ...session,
              messages: updatedMessages
            }
          }
        }
      })
    } finally {
      setLoading(false)
    }
  }

  function formatTime(isoString: string) {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-medium text-[#101827]">
              AI Companion
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {/* Session Selector - only show if sessions exist */}
              {sessionList.length > 0 && (
                <Select 
                  value={dailyChats.currentSessionId || 'none'} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      startNewChat()
                    } else {
                      switchSession(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="New conversation" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show "New conversation" option if in null state */}
                    {!dailyChats.currentSessionId && (
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">New conversation</span>
                        </div>
                      </SelectItem>
                    )}
                    {sessionList.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#6B7280]">
                            {formatTime(session.createdAt)}
                          </span>
                          <span className="text-xs truncate max-w-[120px]">
                            {session.title}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* New Chat Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={startNewChat}
                className="h-8 w-8 text-[#6B7280] hover:text-[#F97315]"
                title="New chat"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
              
              {/* Delete Current Session - only show if session selected and multiple sessions exist */}
              {currentSession && sessionList.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSession(currentSession.id)}
                  className="h-8 w-8 text-[#6B7280] hover:text-[#F97315]"
                  title="Delete this conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!currentSession || currentSession.messages.length === 0 ? (
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
            currentSession.messages.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  {msg.role === 'user' ? 'You' : 'AI Companion'}
                </div>
                <div className={`
                  rounded-lg text-[13px] leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-[#F9FAFB] border border-[#E5E7EB] p-3' 
                    : 'bg-white border border-[#F97315] p-4'
                  }
                `}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <MarkdownPreview content={msg.content} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[#E5E7EB] space-y-3">
          <div className="flex gap-2">
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
          
          {/* Privacy notice */}
          <div className="flex items-center justify-between text-[10px] text-[#6B7280] px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Chat history saved locally • Resets at midnight</span>
            </div>
            {sessionList.length > 0 && (
              <span className="text-[#6B7280]">
                {sessionList.length} conversation{sessionList.length !== 1 ? 's' : ''} today
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}