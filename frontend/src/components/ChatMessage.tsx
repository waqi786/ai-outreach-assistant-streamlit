import type { Message } from '@/types';
import { cn, formatDate } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex animate-fade-up', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-2xl rounded-3xl px-5 py-4 shadow-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'border bg-card/90'
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
        <p className={cn('mt-3 text-xs', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {formatDate(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
