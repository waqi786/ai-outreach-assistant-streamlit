import { type FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, CloudLightning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const providerOptions = [
  { value: 'claude', label: 'Claude' },
  { value: 'perplexity', label: 'Perplexity' },
] as const;

const modelOptions = {
  claude: [
    { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3.5', label: 'Claude 3.5' },
    { value: 'claude-4', label: 'Claude 4' },
  ],
  perplexity: [
    { value: 'perplexity-1', label: 'Perplexity 1' },
    { value: 'perplexity-2', label: 'Perplexity 2' },
    { value: 'perplexity-3', label: 'Perplexity 3' },
  ],
};

export default function UserSettings() {
  const { user, setUser, refreshUser } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'claude' | 'perplexity'>(user?.apiProvider ?? 'claude');
  const [apiModel, setApiModel] = useState(user?.apiModel ?? modelOptions.claude[0].value);
  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setApiProvider(user.apiProvider ?? 'claude');
      setApiModel(user.apiModel ?? modelOptions.claude[0].value);
    }
  }, [user]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (apiKey.trim() && !/^[\x20-\x7E]*$/.test(apiKey.trim())) {
      setError('API key contains unsupported non-ASCII characters. Please paste the exact key again.');
      return;
    }

    try {
      setSaving(true);
      setStatus('');
      setError('');
      await api.post('/users/api-key', {
        apiKey: apiKey.trim() || undefined,
        apiProvider,
        apiModel,
      });
      const nextUser = await refreshUser();
      setUser(nextUser);
      setApiKey('');
      setStatus('API provider and model saved successfully.');
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your API key? You won\'t be able to send messages until you add a new one.')) {
      return;
    }

    try {
      setSaving(true);
      setStatus('');
      setError('');
      await api.delete('/users/api-key');
      const nextUser = await refreshUser();
      setUser(nextUser);
      setStatus('API key removed. Provider and model settings remain saved.');
    } catch (deleteError) {
      setError(getApiError(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Card className="shadow-card animate-fade-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">User settings</CardTitle>
          <CardDescription className="text-base mt-2">Choose your provider, model and securely store your API key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-4 rounded-3xl bg-muted/60 p-6 shadow-sm border border-border">
              <div className="mt-1">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Current workspace status</p>
                <p className="text-sm text-muted-foreground">
                  {user?.hasApiKey
                    ? `Ready to generate with ${user.apiProvider ?? 'Claude'} and ${user.apiModel ?? 'default model'}.`
                    : 'Add an API key to start sending requests.'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-3xl bg-muted/60 p-6 shadow-sm border border-border">
              <div className="mt-1">
                <CloudLightning className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Deployment ready</p>
                <p className="text-sm text-muted-foreground">Use the deploy panel on the dashboard to publish your workspace quickly.</p>
              </div>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSave}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Label htmlFor="api-key" className="text-lg font-semibold">API key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={user?.hasApiKey ? 'Enter a new key to update it.' : 'Paste your Claude or Perplexity key'}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    className="h-12 text-base pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the key for the selected provider. For Perplexity, generate it from{' '}
                  <a href="https://perplexity.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Perplexity
                  </a>.
                </p>
              </div>
              <div className="space-y-4">
                <Label htmlFor="provider" className="text-lg font-semibold">Provider</Label>
                <select
                  id="provider"
                  value={apiProvider}
                  onChange={(event) => setApiProvider(event.target.value as 'claude' | 'perplexity')}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <Label htmlFor="model" className="text-lg font-semibold">Model</Label>
                <select
                  id="model"
                  value={apiModel}
                  onChange={(event) => setApiModel(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {modelOptions[apiProvider].map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {status ? (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl p-4">
                <CheckCircle className="h-4 w-4" />
                {status}
              </div>
            ) : null}
            {error ? (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4">
              <Button type="submit" disabled={saving || (!apiKey.trim() && !user?.hasApiKey)} size="lg" className="px-8 transition-all duration-200 hover:scale-[1.02]">
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
              <Button type="button" variant="destructive" disabled={saving || !user?.hasApiKey} onClick={handleDelete} size="lg" className="px-8 transition-all duration-200 hover:scale-[1.02]">
                Delete API key
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
