'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  onClear: () => void
  isLoading?: boolean
}

export default function SearchBar({ onSearch, onClear, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        onSearch(query)
      } else {
        onClear()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch, onClear])

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  return (
    <div className="relative">
      {isLoading ? (
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#F97315] animate-spin" />
      ) : (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
      )}
      <Input
        type="text"
        placeholder="Search notes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9 pr-9"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}