import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FolderOpen, Plus, Settings, CloudLightning } from 'lucide-react';
import { useProjectsStore } from '@/lib/projects';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, loading, fetchProjects } = useProjectsStore();

  useEffect(() => {
    fetchProjects().catch(() => undefined);
  }, [fetchProjects]);

  const totalChats = projects.reduce((sum, project) => sum + project.chats.length, 0);
  const recentChats = projects
    .flatMap(project => project.chats.map(chat => ({ ...chat, projectName: project.name, projectId: project.id })))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-full p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-lg text-muted-foreground">Welcome back! Here's an overview of your AI outreach projects.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-card hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">Active outreach campaigns</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalChats}</div>
              <p className="text-xs text-muted-foreground">Conversations generated</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" className="w-full" onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                API Settings
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => window.open('https://vercel.com/new', '_blank')}>
                <CloudLightning className="h-4 w-4 mr-2" />
                Deploy workspace
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Projects</h2>
            <p className="text-sm text-muted-foreground">Use the sidebar to create new projects</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate(`/projects/${project.id}/settings`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {project.name}
                      <Badge variant="secondary">{project.chats.length} chats</Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">{project.systemPrompt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/chats/new`); }}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        New Chat
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/settings`); }}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">Create your first project to start generating AI-powered outreach content.</p>
                <Button onClick={() => window.location.reload()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Recent Chats</h2>
            <div className="space-y-4">
              {recentChats.map((chat) => (
                <Card key={chat.id} className="shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate(`/projects/${chat.projectId}/chats/${chat.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{chat.title}</h3>
                        <p className="text-sm text-muted-foreground">{chat.projectName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{new Date(chat.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
