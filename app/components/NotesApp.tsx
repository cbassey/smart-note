'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { saveNote, searchNotes } from '@/app/actions/notes'
import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar'
import AICompanion from './AICompanion'

interface Note {
  id: string
  date: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
}

interface NotesAppProps {
  initialNotes: Note[]
  user: {
    email: string
    id: string
  }
}

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA')
}

function formatDateDisplay(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function NotesApp({ initialNotes, user }: NotesAppProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(initialNotes)
  const [currentDate, setCurrentDate] = useState(getTodayDate())
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>(
    'saved'
  )
  const [showAI, setShowAI] = useState(false)
  const [saveTimeout, setSaveTimeoutState] = useState<NodeJS.Timeout | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'none' | 'client' | 'server'>(
    'none'
  )

  const previousDate = useRef<string | null>(null)
  const isToday = currentDate === getTodayDate()

  // Load note content when switching dates (not on notes refresh)
  useEffect(() => {
    if (previousDate.current !== currentDate) {
      const note = notes.find((n) => n.date === currentDate)
      setContent(note?.content || '')
      previousDate.current = currentDate
    }
  }, [currentDate, notes])

  // Client-side instant filtering
  const filterNotesLocally = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase()
      return notes.filter(
        (note) =>
          note.content.toLowerCase().includes(lowerQuery) ||
          note.date.includes(lowerQuery)
      )
    },
    [notes]
  )

  // Handle search with hybrid approach
  const handleSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim()

      if (!trimmedQuery) {
        handleClearSearch()
        return
      }

      // For queries less than 5 characters, use instant client-side filtering
      if (trimmedQuery.length < 5) {
        setSearchMode('client')
        setFilteredNotes(filterNotesLocally(trimmedQuery))
        return
      }

      // For longer queries, use server search with full-text search
      setSearchMode('server')
      setIsSearching(true)

      try {
        const results = await searchNotes(trimmedQuery)
        setFilteredNotes(results)
      } catch (error) {
        console.error('Search error:', error)
        // Fallback to client-side search on error
        setFilteredNotes(filterNotesLocally(trimmedQuery))
      } finally {
        setIsSearching(false)
      }
    },
    [filterNotesLocally]
  )

  const handleClearSearch = useCallback(() => {
    setSearchMode('none')
    setIsSearching(false)
    setFilteredNotes(notes)
  }, [notes])

  // Auto-save with debouncing
  const handleContentChange = (value: string) => {
    setContent(value)

    if (!isToday) return

    if (saveTimeout) clearTimeout(saveTimeout)

    setSaveStatus('saving')
    const timeout = setTimeout(async () => {
      try {
        await saveNote(currentDate, value)
        setSaveStatus('saved')

        // Update notes state locally (avoid refetch to prevent content reset)
        setNotes((prev) => {
          const index = prev.findIndex((n) => n.date === currentDate)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              content: value,
              updated_at: new Date().toISOString(),
            }
            return updated
          } else {
            return [
              {
                id: crypto.randomUUID(),
                user_id: user.id,
                date: currentDate,
                content: value,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ]
          }
        })

        // Update filtered notes only if not actively searching
        if (searchMode === 'none') {
          setFilteredNotes((prev) => {
            const index = prev.findIndex((n) => n.date === currentDate)
            if (index >= 0) {
              const updated = [...prev]
              updated[index] = {
                ...updated[index],
                content: value,
                updated_at: new Date().toISOString(),
              }
              return updated
            } else {
              return [
                {
                  id: crypto.randomUUID(),
                  user_id: user.id,
                  date: currentDate,
                  content: value,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                ...prev,
              ]
            }
          })
        }
      } catch (error) {
        console.error('Save error:', error)
        setSaveStatus('error')
        toast.error('Failed to save note', {
          description: 'Check your connection and try again',
          style: {
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
          },
        })
      }
    }, 500)

    setSaveTimeoutState(timeout)
  }

  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  return (
    <SidebarProvider>
      <AppSidebar
        notes={filteredNotes}
        currentDate={currentDate}
        onDateSelect={setCurrentDate}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        isSearching={isSearching}
        searchMode={searchMode}
        user={user}
      />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <div className="text-sm font-medium text-[#101827]">
              {formatDateDisplay(currentDate)}
            </div>
            {isToday && (
              <div className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#6B7280]">
                <div
                  className={`
                  h-1.5 w-1.5 rounded-full transition-all
                  ${
                    saveStatus === 'saving'
                      ? 'bg-[#F97315] shadow-[0_0_8px_#F97315]'
                      : 'bg-[#6B7280]'
                  }
                `}
                />
                <span>
                  {saveStatus === 'saving'
                    ? 'Saving...'
                    : saveStatus === 'error'
                    ? 'Error'
                    : 'Saved'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            disabled={!isToday}
            placeholder={
              isToday
                ? 'Start typing your notes for today...'
                : 'This is a past note (read-only)'
            }
            className="min-h-[calc(100vh-12rem)] resize-none border-[#E5E7EB] font-mono text-sm leading-relaxed focus:border-[#F97315] focus:ring-[3px] focus:ring-[#F9731526] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:opacity-70"
          />

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
            <div className="text-[11px] uppercase tracking-wide text-[#6B7280]">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </div>
            {!isToday && (
              <div className="text-[11px] font-medium uppercase tracking-wide text-[#F97315]">
                Viewing past note (read-only)
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* AI Companion Button */}
      <Button
        onClick={() => setShowAI(true)}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#F97315] shadow-lg transition-all hover:scale-105 hover:bg-[#EA580C]"
        title="Ask AI about your notes"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* AI Companion Dialog */}
      <AICompanion open={showAI} onOpenChange={setShowAI} />
    </SidebarProvider>
  )
}