'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function saveNote(date: string, content: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('notes')
    .upsert({
      user_id: user.id,
      date,
      content
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single()

  if (error) throw error
  
  revalidatePath('/')
  return data
}

export async function getNotes() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getNote(date: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Simple substring search (Apple Notes style)
export async function searchNotes(query: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (!query.trim()) {
    return await getNotes()
  }

  const { data, error } = await supabase
    .rpc('search_notes', {
      search_query: query,
      user_uuid: user.id
    })

  if (error) throw error
  return data || []
}