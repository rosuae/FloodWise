import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';

const Register: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Registration failed');
      }

      // Auto-login after registration
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        const token = loginData.access_token;

        const userResponse = await fetch(`${API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const userData = await userResponse.json();

        login(token, userData);
        navigate('/map');
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-fw-bg px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-fw-bg border border-fw-neutral/30 p-8 shadow-xl shadow-fw-primary/20">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fw-secondary/20">
            <UserPlus className="h-6 w-6 text-fw-primary" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-fw-text">
            Create an Account
          </h2>
          <p className="mt-2 text-sm text-fw-text opacity-80">
            Join the FloodWise community
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fw-text mb-1">Full Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fw-text opacity-50">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full rounded-lg border border-fw-neutral/30 bg-fw-bg py-2.5 pl-10 pr-3 text-fw-text placeholder-fw-text/50 transition-all focus:border-fw-primary focus:bg-fw-bg focus:outline-none focus:ring-2 focus:ring-fw-primary/20 sm:text-sm"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fw-text mb-1">Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fw-text opacity-50">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-lg border border-fw-neutral/30 bg-fw-bg py-2.5 pl-10 pr-3 text-fw-text placeholder-fw-text/50 transition-all focus:border-fw-primary focus:bg-fw-bg focus:outline-none focus:ring-2 focus:ring-fw-primary/20 sm:text-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fw-text mb-1">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fw-text opacity-50">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-lg border border-fw-neutral/30 bg-fw-bg py-2.5 pl-10 pr-3 text-fw-text placeholder-fw-text/50 transition-all focus:border-fw-primary focus:bg-fw-bg focus:outline-none focus:ring-2 focus:ring-fw-primary/20 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fw-text mb-1">Confirm Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fw-text opacity-50">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-lg border border-fw-neutral/30 bg-fw-bg py-2.5 pl-10 pr-3 text-fw-text placeholder-fw-text/50 transition-all focus:border-fw-primary focus:bg-fw-bg focus:outline-none focus:ring-2 focus:ring-fw-primary/20 sm:text-sm"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-lg bg-fw-primary py-3 px-4 text-sm font-semibold text-fw-bg transition-all hover:bg-fw-primary-hover focus:outline-none focus:ring-2 focus:ring-fw-primary/50 disabled:opacity-70"
          >
            {isLoading ? 'Creating account...' : 'Register'}
          </button>

          <div className="text-center text-sm">
            <span className="text-fw-text opacity-80">Already have an account? </span>
            <Link to="/login" className="font-semibold text-fw-primary hover:text-fw-primary-hover">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
