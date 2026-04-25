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
    <form className="space-y-4 rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-6 shadow-card" onSubmit={handleSubmit}>
      <Textarea
        placeholder="Type your outreach request, follow-up, or prompt..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        className="min-h-[120px] text-base"
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">The assistant uses this project's system prompt and recent messages.</p>
        <Button type="submit" disabled={disabled || !value.trim()} size="lg" className="px-8">
          <SendHorizonal className="h-5 w-5" />
          Send
        </Button>
      </div>
    </form>
  );
}
