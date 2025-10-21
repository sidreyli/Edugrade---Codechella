import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, Mail, Lock, User, ArrowRight, CheckCircle, Zap } from 'lucide-react';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUserRole } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role: role,
        email: email,
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setUserRole(role);
      
      // Redirect based on role
      if (role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neo-cyan flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 border-4 border-neo-pink bg-neo-pink opacity-10 rotate-12 animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-4 border-neo-yellow bg-neo-yellow opacity-10 -rotate-12 animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-4 border-neo-white bg-neo-white opacity-10 rotate-45 animate-float"></div>
        <div className="absolute top-1/2 right-10 w-20 h-20 border-4 border-neo-green bg-neo-green opacity-10 animate-float-delayed"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding & Benefits */}
          <div className="hidden md:block">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <GraduationCap size={56} className="text-neo-black" strokeWidth={3} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-neo-pink border-2 border-neo-black rounded-full animate-pulse"></div>
                </div>
                <h1 className="text-5xl font-bold uppercase">EDUGRADE</h1>
              </div>
              <p className="text-2xl font-bold uppercase mb-8">JOIN THE REVOLUTION</p>
            </div>

            {/* Benefits Cards */}
            <div className="space-y-4">
              <div className="card-brutal p-6 bg-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 border-4 border-neo-black bg-neo-pink">
                    <Zap size={24} strokeWidth={3} className="text-neo-white" />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-lg mb-2">INSTANT GRADING</h3>
                    <p className="text-sm">AI-powered feedback in seconds, not hours.</p>
                  </div>
                </div>
              </div>

              <div className="card-brutal p-6 bg-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 border-4 border-neo-black bg-neo-yellow">
                    <CheckCircle size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-lg mb-2">TRACK PROGRESS</h3>
                    <p className="text-sm">Real-time analytics and insights for growth.</p>
                  </div>
                </div>
              </div>

              <div className="card-brutal p-6 bg-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 border-4 border-neo-black bg-neo-green">
                    <GraduationCap size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-lg mb-2">LEARN BETTER</h3>
                    <p className="text-sm">Personalized feedback that actually helps.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 border-4 border-neo-black bg-neo-white">
                <CheckCircle size={16} strokeWidth={3} className="text-neo-green" />
                <span className="font-bold text-xs uppercase">FREE FOREVER</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-4 border-neo-black bg-neo-white">
                <CheckCircle size={16} strokeWidth={3} className="text-neo-green" />
                <span className="font-bold text-xs uppercase">NO CREDIT CARD</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-4 border-neo-black bg-neo-white">
                <CheckCircle size={16} strokeWidth={3} className="text-neo-green" />
                <span className="font-bold text-xs uppercase">10K+ USERS</span>
              </div>
            </div>
          </div>

          {/* Right Side - Signup Form */}
          <div>
            {/* Mobile Header */}
            <div className="md:hidden text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <GraduationCap size={48} className="text-neo-black" strokeWidth={3} />
                <h1 className="text-4xl font-bold uppercase">EDUGRADE</h1>
              </div>
              <p className="text-xl uppercase font-bold">CREATE YOUR ACCOUNT</p>
            </div>

            <form onSubmit={handleSignup} className="card-brutal p-8 bg-neo-white">
              {/* Form Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold uppercase mb-2">SIGN UP</h2>
                <p className="text-sm opacity-60 uppercase font-bold">START YOUR JOURNEY TODAY</p>
              </div>

              {/* Role Selection - Prominent */}
              <div className="mb-8">
                <label className="block text-sm font-bold uppercase mb-3">I AM A...</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`relative p-6 border-4 border-neo-black font-bold uppercase transition-all ${
                      role === 'student' 
                        ? 'bg-neo-pink text-neo-white shadow-brutal translate-x-0 translate-y-0' 
                        : 'bg-neo-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-brutal'
                    }`}
                  >
                    <GraduationCap size={32} strokeWidth={3} className="mx-auto mb-2" />
                    STUDENT
                    {role === 'student' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={20} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`relative p-6 border-4 border-neo-black font-bold uppercase transition-all ${
                      role === 'teacher' 
                        ? 'bg-neo-pink text-neo-white shadow-brutal translate-x-0 translate-y-0' 
                        : 'bg-neo-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-brutal'
                    }`}
                  >
                    <User size={32} strokeWidth={3} className="mx-auto mb-2" />
                    TEACHER
                    {role === 'teacher' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={20} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Full Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold uppercase mb-2">FULL NAME</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-black opacity-40" size={20} strokeWidth={3} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-brutal w-full pl-12 uppercase placeholder:normal-case"
                    placeholder="John Doe"
                    required
                  />
                </div>
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
                    minLength={6}
                  />
                </div>
                <p className="text-xs mt-2 opacity-60 font-bold">MINIMUM 6 CHARACTERS</p>
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
                    CREATING ACCOUNT...
                  </>
                ) : (
                  <>
                    CREATE ACCOUNT
                    <ArrowRight size={20} strokeWidth={3} />
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-bold uppercase text-sm hover:underline transition-all"
                >
                  ALREADY HAVE AN ACCOUNT? <span className="text-neo-pink">LOGIN</span>
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
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
