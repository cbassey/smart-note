# Smart Notes

A daily note-taking app with AI-powered search and Q&A. Write notes each day, search through your history, and ask an AI companion questions about your notes.

## Features

| Feature | Description |
|---------|-------------|
| **Daily Notes** | One note per day, auto-saved as you type |
| **Note History** | Browse and view past notes (read-only) |
| **Hybrid Search** | Instant client-side search + PostgreSQL full-text search |
| **AI Companion** | Ask questions about your notes using natural language |
| **Auth** | Supabase authentication (email/password, OAuth) |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd smart-notes
npm install
```

### 2. Set Up Supabase

Create a project at [supabase.com](https://supabase.com) and run this SQL:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Notes table
create table notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  date date not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(content, '')), 'A')
  ) stored,
  unique(user_id, date)
);

-- Search function
create or replace function search_notes(search_query text, user_uuid uuid)
returns table (
  id uuid,
  user_id uuid,
  date date,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
) language plpgsql as $$
begin
  return query
  select 
    notes.id,
    notes.user_id,
    notes.date,
    notes.content,
    notes.created_at,
    notes.updated_at,
    ts_rank(search_vector, websearch_to_tsquery('english', search_query)) as rank
  from notes
  where 
    notes.user_id = user_uuid
    and search_vector @@ websearch_to_tsquery('english', search_query)
  order by rank desc, date desc;
end;
$$;

-- Enable RLS
alter table notes enable row level security;

-- RLS policies
create policy "Users can read own notes"
  on notes for select using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on notes for insert with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on notes for update using (auth.uid() = user_id);
```

### 3. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key  # For AI companion (Claude)
```

Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com)

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Auto-Save
Notes auto-save 500ms after you stop typing. The save indicator shows status.

### Search
- **Short queries (<5 chars)**: Instant client-side filtering
- **Longer queries**: PostgreSQL full-text search with relevance ranking

### AI Companion
Click the chat button to ask questions like:
- "What did I discuss in last week's meeting?"
- "Why did we decide to use Redis?"

The AI reads all your notes and answers based on their content.

## Project Structure

```
smart-notes/
├── app/
│   ├── actions/
│   │   └── notes.ts        # Server actions (save, get, search)
│   ├── api/
│   │   └── ai/route.ts     # AI companion endpoint
│   ├── components/
│   │   ├── NotesApp.tsx    # Main app component
│   │   ├── SearchBar.tsx   # Search input
│   │   └── AICompanion.tsx # AI chat dialog
│   ├── login/
│   │   └── page.tsx        # Auth page
│   └── page.tsx            # Home (redirects or shows app)
├── components/ui/          # shadcn/ui components
├── utils/supabase/         # Supabase client setup
└── middleware.ts           # Auth middleware
```

## Docs

- [React Native Migration Guide](docs/react-native-migration-guide.md)
