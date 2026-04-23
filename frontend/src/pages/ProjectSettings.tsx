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
    return <div className="p-6">Loading project...</div>;
  }

  if (!project) {
    return <div className="p-6 text-destructive">{error || 'Project not found.'}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Project settings</CardTitle>
          <CardDescription>Shape the assistant's behavior for this project using a focused system prompt.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System prompt</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                className="min-h-[240px]"
                required
              />
            </div>
            {status ? <p className="text-sm text-primary">{status}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={handleCreateChat}>
                Start new chat
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
