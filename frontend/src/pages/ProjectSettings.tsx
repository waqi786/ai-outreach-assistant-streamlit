import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, getApiError } from '@/lib/api';
import { useProjectsStore } from '@/lib/projects';
import type { Project } from '@/types';

export default function ProjectSettings() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { replaceProject, removeProject, fetchProjects } = useProjectsStore();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Project>(`/projects/${projectId}`);
        setProject(data);
        setName(data.name);
        setSystemPrompt(data.systemPrompt);
      } catch (loadError) {
        setError(getApiError(loadError));
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatus('');
      setError('');
      const { data } = await api.put<Project>(`/projects/${projectId}`, {
        name,
        systemPrompt,
      });
      setProject(data);
      replaceProject(data);
      setStatus('Project updated successfully.');
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId || !window.confirm('Delete this project and all of its chats?')) {
      return;
    }

    try {
      await api.delete(`/projects/${projectId}`);
      removeProject(projectId);
      await fetchProjects();
      navigate('/dashboard');
    } catch (deleteError) {
      setError(getApiError(deleteError));
    }
  };

  const handleCreateChat = async () => {
    try {
      const { data } = await api.post(`/chats/project/${projectId}`, {});
      await fetchProjects();
      navigate(`/projects/${projectId}/chats/${data.id}`);
    } catch (createError) {
      setError(getApiError(createError));
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    </div>;
  }

  if (!project) {
    return <div className="flex h-screen items-center justify-center p-8">
      <Card className="max-w-md shadow-card">
        <CardContent className="p-8 text-center">
          <p className="text-destructive mb-4">{error || 'Project not found.'}</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </CardContent>
      </Card>
    </div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Card className="shadow-card animate-fade-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Project settings</CardTitle>
          <CardDescription className="text-base mt-2">Shape the assistant's behavior for this project using a focused system prompt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="space-y-4">
              <Label htmlFor="project-name" className="text-lg font-semibold">Project name</Label>
              <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required className="h-12 text-base" />
            </div>
            <div className="space-y-4">
              <Label htmlFor="system-prompt" className="text-lg font-semibold">System prompt</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                className="min-h-[280px] text-base"
                required
              />
            </div>
            {status ? <p className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl p-4">{status}</p> : null}
            {error ? <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-4">{error}</p> : null}
            <div className="flex flex-wrap gap-4">
              <Button type="submit" disabled={saving} size="lg" className="px-8">
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={handleCreateChat} size="lg" className="px-8">
                Start new chat
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} size="lg" className="px-8">
                Delete project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
