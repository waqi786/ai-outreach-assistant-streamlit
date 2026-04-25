import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { getApiError } from '@/lib/api';

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await register({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(getApiError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-br from-background via-accent/5 to-primary/10">
      <Card className="w-full max-w-md shadow-card animate-fade-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Create account</CardTitle>
          <CardDescription className="text-base mt-2">Set up a secure workspace for your projects and Anthropic API key.</CardDescription>
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
            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="h-12"
              />
            </div>
            {error ? <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">{error}</p> : null}
            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
              Register
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="font-semibold text-primary hover:text-primary/80 transition-colors" to="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
