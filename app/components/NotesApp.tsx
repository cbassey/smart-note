'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { saveNote, getNotes, searchNotes } from '@/app/actions/notes'
import { MessageCircle } from 'lucide-react'
import AICompanion from './AICompanion'
import SearchBar from './SearchBar'

interface Note {
  id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}

interface NotesAppProps {
  initialNotes: Note[]
}

export default function NotesApp({ initialNotes }: NotesAppProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(initialNotes)
  const [currentDate, setCurrentDate] = useState(getTodayDate())
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [showAI, setShowAI] = useState(false)
  const [saveTimeout, setSaveTimeoutState] = useState<NodeJS.Timeout | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'none' | 'client' | 'server'>('none')
  
  const previousDate = useRef<string | null>(null)
  const isToday = currentDate === getTodayDate()

  // Load note content when switching dates (not on notes refresh)
  useEffect(() => {
    if (previousDate.current !== currentDate) {
      const note = notes.find(n => n.date === currentDate)
      setContent(note?.content || '')
      previousDate.current = currentDate
    }
  }, [currentDate, notes])

  // Client-side instant filtering
  const filterNotesLocally = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()
    return notes.filter(note => 
      note.content.toLowerCase().includes(lowerQuery) ||
      note.date.includes(lowerQuery)
    )
  }, [notes])

  // Handle search with hybrid approach
  const handleSearch = useCallback(async (query: string) => {
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
  }, [filterNotesLocally])

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
        setNotes(prev => {
          const index = prev.findIndex(n => n.date === currentDate)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = { 
              ...updated[index], 
              content: value, 
              updated_at: new Date().toISOString() 
            }
            return updated
          } else {
            return [...prev, {
              id: crypto.randomUUID(),
              user_id: '',
              date: currentDate,
              content: value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          }
        })
        
        // Update filtered notes only if not actively searching
        if (searchMode === 'none') {
          setFilteredNotes(prev => {
            const index = prev.findIndex(n => n.date === currentDate)
            if (index >= 0) {
              const updated = [...prev]
              updated[index] = { 
                ...updated[index], 
                content: value, 
                updated_at: new Date().toISOString() 
              }
              return updated
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Save error:', error)
        setSaveStatus('error')
      }
    }, 500)
    
    setSaveTimeoutState(timeout)
  }

  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-5">
      <div className="flex gap-5 w-full max-w-[1200px]">
        {/* Sidebar */}
        <Card className="w-[280px] p-6 flex-shrink-0">
          <div className="text-xs font-medium tracking-wider text-[#6B7280] uppercase mb-4 pb-3 border-b border-[#E5E7EB]">
            Your Notes
          </div>
          
          {/* Search Bar */}
          <div className="mb-4">
            <SearchBar 
              onSearch={handleSearch} 
              onClear={handleClearSearch}
              isLoading={isSearching}
            />
          </div>

          {searchMode !== 'none' && (
            <div className="text-xs text-[#6B7280] mb-2">
              {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''}
            </div>
          )}
          
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-5 text-xs text-[#6B7280]">
                {searchMode !== 'none' ? 'No notes found' : 'No notes yet'}
              </div>
            ) : (
              filteredNotes.map(note => {
                const noteDate = new Date(note.date + 'T00:00:00')
                const isNoteToday = note.date === getTodayDate()
                const isActive = note.date === currentDate
                
                return (
                  <div
                    key={note.id}
                    onClick={() => setCurrentDate(note.date)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      ${isActive 
                        ? 'bg-[#F97315] border-[#F97315] text-white' 
                        : isNoteToday 
                          ? 'bg-white border-[#F97315] hover:bg-[#F9FAFB]'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#F97315]'
                      }
                    `}
                  >
                    <div className={`text-[13px] font-medium ${isActive ? 'text-white' : 'text-[#101827]'}`}>
                      {noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {isNoteToday && !isActive && (
                        <span className="ml-2 inline-block bg-[#F97315] text-white text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] mt-1 truncate ${isActive ? 'text-white' : 'text-[#6B7280]'}`}>
                      {note.content.substring(0, 50) || 'Empty note'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Main Content */}
        <Card className="flex-1 p-8 flex flex-col min-h-[600px]">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="text-2xl font-light tracking-tight text-[#101827]">
                SMART NOTES
              </div>
              <div className="text-xs font-normal tracking-widest text-[#6B7280] uppercase mt-1">
                AI-Powered • Knowledge Base
              </div>
            </div>
            
          </div>

          {/* Date Header */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 mb-6 flex items-center justify-between">
            <div className="text-sm font-medium text-[#101827]">
              {formatDateDisplay(currentDate)}
            </div>
            {isToday && (
              <div className="flex items-center gap-2 text-[11px] text-[#6B7280] uppercase tracking-wide">
                <div className={`
                  w-1.5 h-1.5 rounded-full transition-all
                  ${saveStatus === 'saving' ? 'bg-[#F97315] shadow-[0_0_8px_#F97315]' : 'bg-[#6B7280]'}
                `} />
                <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Error' : 'Saved'}</span>
              </div>
            )}
          </div>

          {/* Note Area */}
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            disabled={!isToday}
            placeholder={
              isToday 
                ? "Start typing your notes for today..."
                : "This is a past note (read-only)"
            }
            className="flex-1 resize-none text-sm leading-relaxed border-[#E5E7EB] rounded-xl focus:border-[#F97315] focus:ring-[3px] focus:ring-[#F9731526] disabled:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70 font-mono"
          />

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex justify-between items-center">
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wide">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </div>
            {!isToday && (
              <div className="text-[11px] text-[#F97315] uppercase tracking-wide font-medium">
                Viewing past note (read-only)
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* AI Companion Button */}
      <Button
        onClick={() => setShowAI(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#F97315] hover:bg-[#EA580C] shadow-lg hover:scale-105 transition-all"
        title="Ask AI about your notes"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* AI Companion Dialog */}
      <AICompanion open={showAI} onOpenChange={setShowAI} />
    </div>
  )
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
    day: 'numeric' 
  })
}