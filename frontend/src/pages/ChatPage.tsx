import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useProjectsStore } from '@/lib/projects';
import type { ChatDetail, Message } from '@/types';

export default function ChatPage() {
  const { projectId, chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchProjects } = useProjectsStore();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const createOrLoadChat = async () => {
      if (!projectId) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        if (chatId === 'new') {
          const { data } = await api.post(`/chats/project/${projectId}`, {});
          await fetchProjects();
          navigate(`/projects/${projectId}/chats/${data.id}`, { replace: true });
          return;
        }

        const { data } = await api.get<ChatDetail>(`/chats/${chatId}`);
        setChat(data);
        setMessages(data.messages);
      } catch (loadError) {
        setError(getApiError(loadError));
      } finally {
        setLoading(false);
      }
    };

    createOrLoadChat();
  }, [chatId, fetchProjects, navigate, projectId]);

  const handleSend = async (content: string) => {
    if (!chatId || chatId === 'new') {
      return;
    }

    if (!user?.hasApiKey) {
      setError('Please add your Anthropic API key in settings before sending messages.');
      return;
    }

    try {
      setSending(true);
      setError('');
      const optimisticUserMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        chatId,
      };
      setMessages((current) => [...current, optimisticUserMessage]);

      const { data } = await api.post<{ userMessage: Message; assistantMessage: Message }>(`/chats/${chatId}/messages`, {
        content,
      });

      setMessages((current) => [...current.slice(0, -1), data.userMessage, data.assistantMessage]);
      await fetchProjects();
    } catch (sendError) {
      setMessages((current) => current.filter((message) => !message.id.startsWith('temp-')));
      setError(getApiError(sendError));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || chatId === 'new' || !window.confirm('Delete this chat?')) {
      return;
    }

    try {
      await api.delete(`/chats/${chatId}`);
      await fetchProjects();
      navigate(projectId ? `/projects/${projectId}/settings` : '/dashboard');
    } catch (deleteError) {
      setError(getApiError(deleteError));
    }
  };

  if (loading) {
    return <div className="p-6">Loading chat...</div>;
  }

  if (!chat) {
    return <div className="p-6 text-destructive">{error || 'Chat not found.'}</div>;
  }

  return (
    <div className="flex h-screen flex-col p-6">
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{chat.title}</CardTitle>
            <CardDescription>{chat.project.name}</CardDescription>
          </div>
          <Button variant="outline" onClick={handleDeleteChat}>
            Delete chat
          </Button>
        </CardHeader>
      </Card>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border bg-white/60 p-4 shadow-panel">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.length ? (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          ) : (
            <Card>
              <CardContent className="p-8 text-sm text-muted-foreground">
                No messages yet. Start the conversation below.
              </CardContent>
            </Card>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mx-auto mt-4 w-full max-w-4xl">
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
