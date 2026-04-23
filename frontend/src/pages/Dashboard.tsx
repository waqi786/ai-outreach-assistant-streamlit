import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectsStore } from '@/lib/projects';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, loading, fetchProjects } = useProjectsStore();

  useEffect(() => {
    if (!projects.length) {
      fetchProjects().catch(() => undefined);
    }
  }, [fetchProjects, projects.length]);

  useEffect(() => {
    if (!loading && projects.length) {
      const firstProject = projects[0];
      const firstChat = firstProject.chats[0];

      navigate(firstChat ? `/projects/${firstProject.id}/chats/${firstChat.id}` : `/projects/${firstProject.id}/settings`, {
        replace: true,
      });
    }
  }, [loading, navigate, projects]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Your workspace is ready</CardTitle>
          <CardDescription>
            Create a project from the sidebar, define a system prompt, and then start a chat to generate outreach copy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => fetchProjects()}>Refresh projects</Button>
        </CardContent>
      </Card>
    </div>
  );
}
