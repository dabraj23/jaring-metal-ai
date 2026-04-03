import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export const Login = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const [rememberMe, setRememberMe] = useState(false);

  const onSubmit = async (data) => {
    try {
      const res = await login(data.email, data.password);
      const token = res.data.token;
      const user = res.data.user;

      authLogin(token, user);

      if (rememberMe) {
        localStorage.setItem('jm_remember_email', data.email);
      } else {
        localStorage.removeItem('jm_remember_email');
      }

      toast.success('Login successful');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-primary-800">JM</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Jaring Metal</h1>
          <p className="text-primary-100">AI Quotation Intelligence Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="form-input"
                placeholder="your@email.com"
                defaultValue={localStorage.getItem('jm_remember_email') || ''}
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-800 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-600 cursor-pointer">
                Remember my email
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-2">Demo Credentials:</p>
            <p className="text-xs text-slate-600">Email: <span className="font-mono">admin@jaringmetal.com</span></p>
            <p className="text-xs text-slate-600">Password: <span className="font-mono">admin123</span></p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-primary-100 text-sm mt-6">
          © 2026 Jaring Metal. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
