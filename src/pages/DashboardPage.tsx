import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, LogOut, BookOpen, BarChart3, Users, FileText } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-neo-yellow flex items-center justify-center">
        <div className="text-4xl font-bold uppercase">LOADING...</div>
      </div>
    );
  }

  const stats = userRole === 'teacher' 
    ? [
        { label: 'TOTAL STUDENTS', value: '156', icon: <Users size={32} strokeWidth={3} /> },
        { label: 'ASSIGNMENTS', value: '24', icon: <BookOpen size={32} strokeWidth={3} /> },
        { label: 'AVG GRADE', value: '87%', icon: <BarChart3 size={32} strokeWidth={3} /> },
        { label: 'PENDING REVIEWS', value: '12', icon: <FileText size={32} strokeWidth={3} /> },
      ]
    : [
        { label: 'COURSES', value: '6', icon: <BookOpen size={32} strokeWidth={3} /> },
        { label: 'ASSIGNMENTS', value: '18', icon: <FileText size={32} strokeWidth={3} /> },
        { label: 'AVG GRADE', value: '92%', icon: <BarChart3 size={32} strokeWidth={3} /> },
        { label: 'COMPLETED', value: '15', icon: <Users size={32} strokeWidth={3} /> },
      ];

  return (
    <div className="min-h-screen bg-neo-white">
      {/* Header */}
      <header className="border-b-4 border-neo-black bg-neo-yellow">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GraduationCap size={40} className="text-neo-black" strokeWidth={3} />
            <h1 className="text-3xl font-bold uppercase">EDUGRADE</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold uppercase">{profile.full_name}</p>
              <p className="text-sm uppercase">{profile.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-brutal-primary">
              <LogOut size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-5xl font-bold uppercase mb-4">
            WELCOME BACK, {profile.full_name.split(' ')[0]}!
          </h2>
          <p className="text-xl">
            {userRole === 'teacher' 
              ? 'MANAGE YOUR CLASSES AND TRACK STUDENT PROGRESS.' 
              : 'VIEW YOUR ASSIGNMENTS AND TRACK YOUR PROGRESS.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="card-brutal p-6 bg-neo-cyan">
              <div className="text-neo-black mb-4">{stat.icon}</div>
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-sm font-bold uppercase">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold uppercase mb-6">QUICK ACTIONS</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {userRole === 'teacher' ? (
              <>
                <button className="card-brutal p-8 bg-neo-pink text-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                  <BookOpen size={48} strokeWidth={3} className="mb-4" />
                  <h4 className="text-2xl font-bold uppercase">CREATE ASSIGNMENT</h4>
                </button>
                <button className="card-brutal p-8 bg-neo-yellow hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                  <Users size={48} strokeWidth={3} className="mb-4" />
                  <h4 className="text-2xl font-bold uppercase">MANAGE STUDENTS</h4>
                </button>
                <button 
                  onClick={() => navigate('/analytics')}
                  className="card-brutal p-8 bg-neo-cyan hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
                >
                  <BarChart3 size={48} strokeWidth={3} className="mb-4" />
                  <h4 className="text-2xl font-bold uppercase">VIEW ANALYTICS</h4>
                </button>
              </>
            ) : (
              <>
                <button className="card-brutal p-8 bg-neo-pink text-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                  <FileText size={48} strokeWidth={3} className="mb-4" />
                  <h4 className="text-2xl font-bold uppercase">VIEW ASSIGNMENTS</h4>
                </button>
                <button className="card-brutal p-8 bg-neo-yellow hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                  <BookOpen size={48} strokeWidth={3} className="mb-4" />
                  <h4 className="text-2xl font-bold uppercase">MY COURSES</h4>
                </button>
                <button className="card-brutal p-8 bg-neo-cyan hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
                  <BarChart3 size={48} strokeWidth={3} className="mb-4" />
                  <h4 className="text-2xl font-bold uppercase">MY PROGRESS</h4>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-3xl font-bold uppercase mb-6">RECENT ACTIVITY</h3>
          <div className="card-brutal p-8 bg-neo-white">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center justify-between border-b-4 border-neo-black pb-4 last:border-b-0">
                  <div>
                    <p className="font-bold uppercase">
                      {userRole === 'teacher' 
                        ? `STUDENT SUBMITTED ASSIGNMENT #${item}` 
                        : `COMPLETED ASSIGNMENT #${item}`}
                    </p>
                    <p className="text-sm">{item} HOURS AGO</p>
                  </div>
                  <button className="btn-brutal-secondary text-sm px-4 py-2">
                    VIEW
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
