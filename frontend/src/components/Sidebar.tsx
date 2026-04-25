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
    <aside className="flex h-auto w-full max-w-none flex-col gap-6 border-b border-border bg-card/50 p-6 backdrop-blur-xl lg:h-screen lg:max-w-sm lg:border-b-0 lg:border-r lg:bg-card/80">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">Workspace</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">AI Outreach Assistant</h1>
        <p className="mt-4 text-sm text-primary-foreground/90">{user?.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-button" onClick={() => setShowNewProject((value) => !value)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
        <Button variant="outline" size="icon" onClick={() => navigate('/settings')} className="transition-all duration-200 hover:scale-105">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {showNewProject && (
        <Card className="space-y-4 p-6 shadow-card transition-all duration-300 hover:shadow-lg">
          <Input placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} className="transition-all duration-200 focus:ring-2 focus:ring-primary/50" />
          <Textarea
            placeholder="Describe the assistant's tone, style, and rules."
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            className="min-h-[140px] transition-all duration-200 focus:ring-2 focus:ring-primary/50"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={handleCreateProject} disabled={submitting} className="w-full transition-all duration-200 hover:scale-[1.02]">
            Create Project
          </Button>
        </Card>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {projects.map((project) => (
          <Card key={project.id} className={cn('p-5 shadow-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-l-4', activeProjectId === project.id ? 'border-l-primary bg-primary/5' : 'border-l-transparent')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link className="text-lg font-semibold hover:text-primary transition-colors duration-200 block truncate" to={`/projects/${project.id}/settings`}>
                  {project.name}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{project.systemPrompt}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{project.chats.length} chats</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); navigate(`/projects/${project.id}/settings`); }} className="transition-all duration-200 hover:bg-primary/10 flex-shrink-0">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
            <Separator className="my-5" />
            <div className="space-y-3">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start transition-all duration-200 hover:scale-[1.02] hover:shadow-button"
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
                    'block rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:shadow-sm truncate',
                    activeChatId === chat.id ? 'bg-primary text-primary-foreground shadow-button' : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {chat.title}
                </NavLink>
              ))}
              {!project.chats.length ? <p className="text-sm text-muted-foreground italic">No chats yet.</p> : null}
            </div>
          </Card>
        ))}
        {!projects.length ? (
          <Card className="p-6 text-sm text-muted-foreground shadow-card">
            Create your first project from the button above, then start chatting with your selected AI provider.
          </Card>
        ) : null}
      </div>

      <Button
        variant="ghost"
        className="justify-start transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
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
