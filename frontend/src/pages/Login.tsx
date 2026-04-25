import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { getApiError } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      await login({ email, password });
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || '/dashboard', { replace: true });
    } catch (submitError) {
      setError(getApiError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <Card className="w-full max-w-md shadow-card animate-fade-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome back</CardTitle>
          <CardDescription className="text-base mt-2">Log in to manage outreach projects, prompts, and conversations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-12" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-12"
              />
            </div>
            {error ? <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">{error}</p> : null}
            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
              Log In
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Need an account?{' '}
            <Link className="font-semibold text-primary hover:text-primary/80 transition-colors" to="/register">
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
