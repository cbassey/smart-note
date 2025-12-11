import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { question, conversationHistory = [] } = await request.json()
  
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: notes } = await supabase
    .from('notes')
    .select('date, content')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (!notes || notes.length === 0) {
    return NextResponse.json({ 
      answer: "You don't have any notes yet. Start taking notes and I'll be able to help you search through them!" 
    })
  }

  const notesContext = notes.map(note => 
    `Date: ${note.date}\nContent:\n${note.content}`
  ).join('\n\n---\n\n')

  // Build messages array with conversation context
  const messages = [
    // System context - provide notes once at the start
    {
      role: 'user',
      content: `You are a helpful AI assistant that helps users search through and understand their notes. Here are all the user's notes:

${notesContext}

Use these notes to answer questions. If you reference specific information, mention which date it came from. If the answer isn't in the notes, let them know politely.`
    },
    {
      role: 'assistant',
      content: 'I understand. I have access to your notes and will use them to answer your questions, referencing specific dates when relevant.'
    },
    // Add conversation history (previous messages)
    ...conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content
    })),
    // Current question
    {
      role: 'user',
      content: question
    }
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages
    })
  })

  const data = await response.json()
  return NextResponse.json({ answer: data.content[0].text })
}