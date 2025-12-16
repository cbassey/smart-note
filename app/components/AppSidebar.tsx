'use client'

import { Calendar } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { NavUser } from './NavUser'
import SearchBar from './SearchBar'

interface Note {
  id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}

interface AppSidebarProps {
  notes: Note[]
  currentDate: string
  onDateSelect: (date: string) => void
  onSearch: (query: string) => void
  onClearSearch: () => void
  isSearching: boolean
  searchMode: 'none' | 'client' | 'server'
  user: {
    email: string
    id: string
  }
}

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA')
}

export default function AppSidebar({
  notes,
  currentDate,
  onDateSelect,
  onSearch,
  onClearSearch,
  isSearching,
  searchMode,
  user,
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="border-b-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97315]">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-light tracking-tight text-[#101827]">
              SMART NOTES
            </span>
            <span className="text-[9px] font-normal uppercase tracking-widest text-[#6B7280]">
              AI-Powered
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* Search Bar */}
            <div className="px-4 py-3">
              <SearchBar
                onSearch={onSearch}
                onClear={onClearSearch}
                isLoading={isSearching}
              />
            </div>

            {/* Results Count */}
            {searchMode !== 'none' && (
              <div className="px-4 pb-2 text-xs text-[#6B7280]">
                {notes.length} result{notes.length !== 1 ? 's' : ''}
              </div>
            )}

            {/* Notes List */}
            <SidebarMenu className="px-2">
              {notes.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-[#6B7280]">
                  {searchMode !== 'none' ? 'No notes found' : 'No notes yet'}
                </div>
              ) : (
                notes.map((note) => {
                  const noteDate = new Date(note.date + 'T00:00:00')
                  const isNoteToday = note.date === getTodayDate()
                  const isActive = note.date === currentDate

                  return (
                    <SidebarMenuItem key={note.id}>
                      <SidebarMenuButton
                        onClick={() => onDateSelect(note.date)}
                        isActive={isActive}
                        className={`
                          h-auto py-3 transition-all rounded-lg
                          ${
                            isActive
                              ? 'bg-[#FFF4ED] text-[#101827] hover:bg-[#FFEDD5] shadow-sm'
                              : 'bg-card hover:bg-[#F9FAFB] shadow-sm'
                          }
                        `}
                      >
                        <div className="flex w-full flex-col items-start gap-1">
                          <div className="flex w-full items-center justify-between">
                            <span className="text-[13px] font-medium text-[#101827]">
                              {noteDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {isNoteToday && (
                              <span className="rounded-full bg-[#F97315] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                Today
                              </span>
                            )}
                          </div>
                          <span className="line-clamp-1 text-left text-[11px] text-[#6B7280]">
                            {note.content.substring(0, 50) || 'Empty note'}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}