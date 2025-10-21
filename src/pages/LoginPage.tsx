import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, Mail, Lock, ArrowRight, CheckCircle, Zap, TrendingUp } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUserRole } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Fetch user role from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileData) {
        setUserRole(profileData.role);
        
        // Redirect based on role
        if (profileData.role === 'teacher') {
          navigate('/teacher-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-neo-cyan flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 border-4 border-neo-pink bg-neo-pink opacity-10 -rotate-12 animate-float"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border-4 border-neo-yellow bg-neo-yellow opacity-10 rotate-12 animate-float-delayed"></div>
        <div className="absolute top-1/2 left-10 w-40 h-40 border-4 border-neo-white bg-neo-white opacity-10 -rotate-45 animate-float"></div>
        <div className="absolute bottom-20 right-1/4 w-20 h-20 border-4 border-neo-green bg-neo-green opacity-10 animate-float-delayed"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Login Form */}
          <div>
            {/* Mobile Header */}
            <div className="md:hidden text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <GraduationCap size={48} className="text-neo-black" strokeWidth={3} />
                <h1 className="text-4xl font-bold uppercase">EDUGRADE</h1>
              </div>
              <p className="text-xl uppercase font-bold">WELCOME BACK</p>
            </div>

            <form onSubmit={handleLogin} className="card-brutal p-8 bg-neo-white">
              {/* Form Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold uppercase mb-2">LOGIN</h2>
                <p className="text-sm opacity-60 uppercase font-bold">CONTINUE YOUR JOURNEY</p>
              </div>

              {/* Email Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold uppercase mb-2">EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black opacity-40" size={20} strokeWidth={3} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-brutal w-full pl-12 placeholder:normal-case"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold uppercase mb-2">PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black opacity-40" size={20} strokeWidth={3} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-brutal w-full pl-12"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold animate-shake">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-neo-white rounded-full"></div>
                    {error}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-brutal-primary w-full mb-4 text-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-4 border-neo-white border-t-transparent rounded-full animate-spin"></div>
                    LOGGING IN...
                  </>
                ) : (
                  <>
                    LOGIN NOW
                    <ArrowRight size={20} strokeWidth={3} />
                  </>
                )}
              </button>

              {/* Signup Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="font-bold uppercase text-sm hover:underline transition-all"
                >
                  DON'T HAVE AN ACCOUNT? <span className="text-neo-pink">SIGN UP</span>
                </button>
              </div>
            </form>

            {/* Back to Home */}
            <button
              onClick={() => navigate('/')}
              className="btn-brutal-white w-full mt-4"
            >
              BACK TO HOME
            </button>
          </div>

          {/* Right Side - Welcome Message & Stats */}
          <div className="hidden md:block">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <GraduationCap size={56} className="text-neo-black" strokeWidth={3} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-neo-pink border-2 border-neo-black rounded-full animate-pulse"></div>
                </div>
                <h1 className="text-5xl font-bold uppercase">EDUGRADE</h1>
              </div>
              <p className="text-2xl font-bold uppercase mb-4">WELCOME BACK!</p>
              <p className="text-lg opacity-80 font-bold">READY TO CONTINUE YOUR LEARNING JOURNEY?</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="card-brutal p-6 bg-neo-white text-center hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="text-4xl font-bold text-neo-pink mb-2">10K+</div>
                <div className="text-xs font-bold uppercase opacity-60">ACTIVE USERS</div>
              </div>
              <div className="card-brutal p-6 bg-neo-white text-center hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="text-4xl font-bold text-neo-cyan mb-2">50K+</div>
                <div className="text-xs font-bold uppercase opacity-60">ASSIGNMENTS</div>
              </div>
              <div className="card-brutal p-6 bg-neo-white text-center hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="text-4xl font-bold text-neo-green mb-2">99%</div>
                <div className="text-xs font-bold uppercase opacity-60">ACCURACY</div>
              </div>
              <div className="card-brutal p-6 bg-neo-white text-center hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="text-4xl font-bold text-neo-yellow mb-2">24/7</div>
                <div className="text-xs font-bold uppercase opacity-60">AVAILABLE</div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4">
              <div className="card-brutal p-6 bg-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 border-4 border-neo-black bg-neo-cyan">
                    <Zap size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-lg mb-2">INSTANT ACCESS</h3>
                    <p className="text-sm">Jump right back into your assignments and progress.</p>
                  </div>
                </div>
              </div>

              <div className="card-brutal p-6 bg-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 border-4 border-neo-black bg-neo-pink">
                    <TrendingUp size={24} strokeWidth={3} className="text-neo-white" />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-lg mb-2">TRACK GROWTH</h3>
                    <p className="text-sm">See your improvement with detailed analytics.</p>
                  </div>
                </div>
              </div>

              <div className="card-brutal p-6 bg-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 border-4 border-neo-black bg-neo-green">
                    <CheckCircle size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-lg mb-2">STAY ORGANIZED</h3>
                    <p className="text-sm">All your work in one brutally efficient place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
