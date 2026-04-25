import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { Message } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex animate-fade-up group', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-2xl rounded-2xl px-6 py-4 shadow-card transition-all duration-300 hover:shadow-lg relative',
          isUser ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground' : 'border border-border bg-card/95 backdrop-blur-sm'
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        <div className="flex items-center justify-between mt-4">
          <p className={cn('text-xs font-medium', isUser ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
            {formatDate(message.createdAt)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0',
              isUser ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
