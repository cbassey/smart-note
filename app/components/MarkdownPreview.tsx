'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownPreviewProps {
  content: string
  compact?: boolean // For AI responses vs full notes
}

export default function MarkdownPreview({ content, compact = false }: MarkdownPreviewProps) {
  return (
    <div className={`
      prose prose-sm max-w-none
      prose-headings:font-medium prose-headings:text-[#101827] prose-headings:mt-4 prose-headings:mb-2
      prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
      prose-p:text-[#101827] prose-p:leading-relaxed prose-p:my-2
      prose-a:text-[#F97315] prose-a:no-underline hover:prose-a:underline
      prose-strong:text-[#101827] prose-strong:font-semibold
      prose-code:text-[#F97315] prose-code:bg-[#FEF3F2] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-code:before:content-[''] prose-code:after:content-['']
      prose-pre:bg-[#1E293B] prose-pre:text-[#E2E8F0] prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-3
      prose-ul:my-2 prose-ul:list-disc prose-ul:pl-4
      prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-4
      prose-li:text-[#101827] prose-li:my-1
      prose-blockquote:border-l-2 prose-blockquote:border-l-[#F97315] prose-blockquote:pl-4 prose-blockquote:text-[#6B7280] prose-blockquote:italic
      ${compact ? 'prose-headings:mt-3 prose-p:my-1' : ''}
    `}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}