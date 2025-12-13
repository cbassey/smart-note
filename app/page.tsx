import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NotesApp from '@/app/components/NotesApp'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch initial notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  return (
    <NotesApp 
      initialNotes={notes || []} 
      user={{ 
        email: user.email || 'user@example.com',
        id: user.id 
      }} 
    />
  )
}