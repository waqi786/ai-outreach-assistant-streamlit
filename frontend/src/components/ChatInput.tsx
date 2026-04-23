import { FormEvent, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextValue = value.trim();
    if (!nextValue || disabled) {
      return;
    }

    setValue('');
    await onSend(nextValue);
  };

  return (
    <form className="sticky bottom-0 mt-auto space-y-3 rounded-3xl border bg-card/90 p-4 shadow-panel" onSubmit={handleSubmit}>
      <Textarea
        placeholder="Type your outreach request, follow-up, or prompt..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        className="min-h-[96px] resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">The assistant uses this project's system prompt and recent messages.</p>
        <Button type="submit" disabled={disabled || !value.trim()}>
          <SendHorizonal className="h-4 w-4" />
          Send
        </Button>
      </div>
    </form>
  );
}
