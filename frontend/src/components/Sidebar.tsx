import { useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { LogOut, MessageSquarePlus, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { useProjectsStore } from '@/lib/projects';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, logout } = useAuth();
  const { projects, createProject } = useProjectsStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI outreach assistant.');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateProject = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      setError('Project name and system prompt are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const project = await createProject({
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
      });
      setName('');
      setSystemPrompt('You are a helpful AI outreach assistant.');
      setShowNewProject(false);
      navigate(`/projects/${project.id}/settings`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeProjectId = params.projectId;
  const activeChatId = params.chatId;

  return (
    <aside className="flex h-auto w-full max-w-none flex-col gap-4 border-b bg-white/60 p-4 backdrop-blur-xl lg:h-screen lg:max-w-sm lg:border-b-0 lg:border-r">
      <div className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground shadow-panel">
        <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/70">Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold">AI Outreach Assistant</h1>
        <p className="mt-3 text-sm text-primary-foreground/80">{user?.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button className="flex-1" onClick={() => setShowNewProject((value) => !value)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
        <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {showNewProject && (
        <Card className="space-y-3 p-4">
          <Input placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} />
          <Textarea
            placeholder="Describe the assistant's tone, style, and rules."
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            className="min-h-[140px]"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={handleCreateProject} disabled={submitting}>
            Create Project
          </Button>
        </Card>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {projects.map((project) => (
          <Card key={project.id} className={cn('p-4', activeProjectId === project.id && 'border-primary')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link className="font-semibold hover:underline" to={`/projects/${project.id}/settings`}>
                  {project.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.systemPrompt}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${project.id}/settings`)}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(`/projects/${project.id}/chats/new`)}
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Chat
              </Button>
              {project.chats.map((chat) => (
                <NavLink
                  key={chat.id}
                  to={`/projects/${project.id}/chats/${chat.id}`}
                  className={cn(
                    'block rounded-2xl px-3 py-2 text-sm transition',
                    activeChatId === chat.id ? 'bg-accent font-medium' : 'hover:bg-muted'
                  )}
                >
                  {chat.title}
                </NavLink>
              ))}
              {!project.chats.length ? <p className="text-sm text-muted-foreground">No chats yet.</p> : null}
            </div>
          </Card>
        ))}
        {!projects.length ? (
          <Card className="p-5 text-sm text-muted-foreground">
            Create your first project from the button above, then start chatting with Claude.
          </Card>
        ) : null}
      </div>

      <Button
        variant="ghost"
        className="justify-start"
        onClick={async () => {
          await logout();
          navigate('/login');
        }}
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </aside>
  );
}
