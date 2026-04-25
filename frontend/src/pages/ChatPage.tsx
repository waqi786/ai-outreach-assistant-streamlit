import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreVertical, Edit3, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useProjectsStore } from '@/lib/projects';
import type { ChatDetail, Message } from '@/types';

export default function ChatPage() {
  const { projectId, chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchProjects, projects } = useProjectsStore();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          navigateToChat('prev');
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          navigateToChat('next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projects, projectId, chatId]);

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

  const handleRenameChat = async () => {
    if (!chatId || !newTitle.trim()) {
      return;
    }

    try {
      await api.put(`/chats/${chatId}`, { title: newTitle.trim() });
      setChat(prev => prev ? { ...prev, title: newTitle.trim() } : null);
      setIsRenaming(false);
      await fetchProjects();
    } catch (renameError) {
      setError(getApiError(renameError));
    }
  };

  const handleStartRename = () => {
    setNewTitle(chat?.title || '');
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewTitle('');
  };

  const navigateToChat = (direction: 'prev' | 'next') => {
    if (!projectId || !chatId) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const currentIndex = project.chats.findIndex(c => c.id === chatId);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'prev') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : project.chats.length - 1;
    } else {
      nextIndex = currentIndex < project.chats.length - 1 ? currentIndex + 1 : 0;
    }

    const nextChat = project.chats[nextIndex];
    if (nextChat) {
      navigate(`/projects/${projectId}/chats/${nextChat.id}`);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    </div>;
  }

  if (!chat) {
    return <div className="flex h-screen items-center justify-center p-8">
      <Card className="max-w-md shadow-card">
        <CardContent className="p-8 text-center">
          <p className="text-destructive mb-4">{error || 'Chat not found.'}</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </CardContent>
      </Card>
    </div>;
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-muted/10">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm p-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex-1">
              {isRenaming ? (
                <div className="flex gap-2">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameChat();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    className="text-2xl font-bold"
                    autoFocus
                  />
                  <Button onClick={handleRenameChat} size="sm">Save</Button>
                  <Button onClick={handleCancelRename} variant="outline" size="sm">Cancel</Button>
                </div>
              ) : (
                <CardTitle className="text-2xl">{chat.title}</CardTitle>
              )}
              <CardDescription className="text-base">{chat.project.name}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateToChat('prev')}
                  title="Previous chat (Ctrl+↑)"
                  className="transition-all duration-200 hover:scale-105"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateToChat('next')}
                  title="Next chat (Ctrl+↓)"
                  className="transition-all duration-200 hover:scale-105"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="transition-all duration-200 hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleStartRename} className="cursor-pointer">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Rename Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteChat} className="cursor-pointer text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {messages.length ? (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          ) : (
            <Card className="shadow-card animate-fade-up">
              <CardContent className="p-8 text-center text-muted-foreground">
                <p className="text-lg mb-2">No messages yet</p>
                <p>Start the conversation below.</p>
              </CardContent>
            </Card>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {error ? <div className="px-6 pb-4"><p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-4">{error}</p></div> : null}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
        <div className="mx-auto w-full max-w-4xl">
          <ChatInput onSend={handleSend} disabled={sending} />
        </div>
      </div>
    </div>
  );
}
