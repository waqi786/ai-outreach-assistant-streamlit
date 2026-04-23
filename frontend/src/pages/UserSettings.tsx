import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function UserSettings() {
  const { user, setUser, refreshUser } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!/^[\x20-\x7E]*$/.test(apiKey.trim())) {
      setError('API key contains unsupported non-ASCII characters. Please paste the exact Anthropic key again.');
      return;
    }

    try {
      setSaving(true);
      setStatus('');
      setError('');
      await api.post('/users/api-key', { apiKey: apiKey.trim() });
      const nextUser = await refreshUser();
      setUser(nextUser);
      setApiKey('');
      setStatus('API key saved securely.');
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      setStatus('');
      setError('');
      await api.delete('/users/api-key');
      const nextUser = await refreshUser();
      setUser(nextUser);
      setStatus('API key removed.');
    } catch (deleteError) {
      setError(getApiError(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>User settings</CardTitle>
          <CardDescription>Your Anthropic API key is encrypted on the backend and never sent back to the browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="api-key">Anthropic API key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder={user?.hasApiKey ? 'A key is already stored. Enter a new one to replace it.' : 'sk-ant-api03-...'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </div>
            {status ? <p className="text-sm text-primary">{status}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving || !apiKey.trim()}>
                Save API key
              </Button>
              <Button type="button" variant="destructive" disabled={saving || !user?.hasApiKey} onClick={handleDelete}>
                Delete API key
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
