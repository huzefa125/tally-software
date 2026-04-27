'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authService.login({ email, password });
      setAuth(data.user, data.token, data.organization);
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F0EE] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-12 bg-[#FCFBFA] p-10 rounded-[40px] shadow-[rgba(0,0,0,0.08)_0px_24px_48px_0px] border border-[#141413]/5">
        <div className="flex flex-col items-center">
          <div className="w-16 h-10 flex gap-1 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#EB001B] opacity-90" />
            <div className="w-8 h-8 rounded-full bg-[#F79E1B] -ml-4 opacity-90" />
          </div>
          <h2 className="text-center text-[36px] font-medium tracking-[-0.02em] text-[#141413]">
            Welcome back
          </h2>
          <p className="mt-2 text-[#696969] text-base font-[450]">
            Sign in to manage your business orbits
          </p>
        </div>
        <form className="space-y-8" onSubmit={handleSubmit}>
          {error && (
            <div className="text-[#CF4500] text-sm text-center bg-[#CF4500]/5 p-3 rounded-[12px] border border-[#CF4500]/10">
              {error}
            </div>
          )}
          <div className="space-y-6">
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <Button
              type="submit"
              className="w-full h-12"
              isLoading={loading}
              size="lg"
            >
              Access Dashboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
