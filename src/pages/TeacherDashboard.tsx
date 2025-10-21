import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, LogOut, BookOpen, BarChart3, Users, FileText, Zap, Target, Award, TrendingUp, Clock, CheckCircle, AlertCircle, Sparkles, ArrowRight, CalendarClock, NotebookPen } from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeClassrooms: 0,
    totalSubmissions: 0,
    pendingReviews: 0,
    studentsTrend: 0,
    classroomsTrend: 0,
    submissionsTrend: 0,
    reviewsTrend: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'teacher') {
      navigate('/student-dashboard');
      return;
    }

    fetchProfile();
    fetchDashboardData();

    // Scroll listener for parallax effects
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, userRole, navigate]);

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

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch teacher's classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*, classroom_students(count)')
        .eq('teacher_id', user.id);

      setClassrooms(classroomsData || []);

      // Count total students across all classrooms
      const { count: studentCount } = await supabase
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', (classroomsData || []).map(c => c.id));

      // Fetch all submissions
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles!inner(full_name),
          assignments(max_score),
          grades(id, score, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Count graded vs ungraded submissions
      const submissionIds = (submissionsData || []).map(s => s.id);
      
      // Map submissions with grade status
      const submissionsWithStatus = (submissionsData || []).map(submission => ({
        ...submission,
        isGraded: (submission as any).grades && (submission as any).grades.length > 0,
        grade: (submission as any).grades && (submission as any).grades.length > 0 
          ? (submission as any).grades[0] 
          : null
      }));

      const pending = submissionsWithStatus.filter(s => !s.isGraded);
      const graded = submissionsWithStatus.filter(s => s.isGraded);

      // Calculate trends (last 30 days vs previous 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

      // Students trend
      const { count: recentStudents } = await supabase
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', (classroomsData || []).map(c => c.id))
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousStudents } = await supabase
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', (classroomsData || []).map(c => c.id))
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Submissions trend
      const { count: recentSubmissions } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousSubmissionsCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setRecentSubmissions(submissionsWithStatus);
      setStats({
        totalStudents: studentCount || 0,
        activeClassrooms: classroomsData?.length || 0,
        totalSubmissions: submissionsWithStatus.length,
        pendingReviews: pending.length,
        studentsTrend: calculateTrend(recentStudents || 0, previousStudents || 0),
        classroomsTrend: 0, // Classrooms typically don't change frequently
        submissionsTrend: calculateTrend(recentSubmissions || 0, previousSubmissionsCount || 0),
        reviewsTrend: 0 // Can calculate if needed
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  if (!profile || loading) {
    return (
      <div className="min-h-screen bg-neo-cyan flex items-center justify-center relative overflow-hidden">
        {/* Animated Loading Shapes - Hidden on mobile */}
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          <div className="absolute top-20 left-10 w-32 h-32 border-4 border-neo-pink bg-neo-pink opacity-20 rotate-12 animate-float"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-neo-yellow bg-neo-yellow opacity-20 -rotate-12 animate-float-delayed"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-6 sm:border-8 border-neo-black border-t-neo-white rounded-full animate-spin mx-auto mb-4 sm:mb-6"></div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase">LOADING...</div>
        </div>
      </div>
    );
  }

  const statsDisplay = [
    { 
      label: 'TOTAL STUDENTS', 
      value: stats.totalStudents.toString(), 
      icon: <Users size={32} strokeWidth={3} />, 
      color: 'bg-neo-pink',
      trend: stats.studentsTrend !== 0 ? `${stats.studentsTrend > 0 ? '+' : ''}${stats.studentsTrend}%` : null,
      trendUp: stats.studentsTrend > 0
    },
    { 
      label: 'ACTIVE CLASSROOMS', 
      value: stats.activeClassrooms.toString(), 
      icon: <BookOpen size={32} strokeWidth={3} />, 
      color: 'bg-neo-cyan',
      trend: null, // Classrooms don't change often
      trendUp: true
    },
    { 
      label: 'SUBMISSIONS', 
      value: stats.totalSubmissions.toString(), 
      icon: <FileText size={32} strokeWidth={3} />, 
      color: 'bg-neo-yellow',
      trend: stats.submissionsTrend !== 0 ? `${stats.submissionsTrend > 0 ? '+' : ''}${stats.submissionsTrend}%` : null,
      trendUp: stats.submissionsTrend > 0
    },
    { 
      label: 'PENDING REVIEWS', 
      value: stats.pendingReviews.toString(), 
      icon: <Clock size={32} strokeWidth={3} />, 
      color: 'bg-neo-green',
      trend: null, // Reviews fluctuate constantly
      trendUp: false
    },
  ];

  const gradedSubmissionsList = recentSubmissions.filter(
    submission => submission.isGraded && submission.grade?.score !== undefined
  );

  const averageScore = gradedSubmissionsList.length > 0
    ? Math.round(
        gradedSubmissionsList.reduce((total, submission) => {
          const rawScore = Number(submission.grade?.score ?? 0);
          const maxScore = Number((submission as any).assignments?.max_score ?? 100);
          const normalizedMax = maxScore > 0 ? maxScore : 100;
          return total + (rawScore / normalizedMax) * 100;
        }, 0) /
          gradedSubmissionsList.length
      )
    : null;

  const averageScoreStrokeOffset = averageScore !== null
    ? 440 - Math.min(100, averageScore) / 100 * 440
    : 440;

  const topClassroom = classrooms
    .slice()
    .sort(
      (a, b) => ((b.classroom_students?.[0]?.count ?? 0) - (a.classroom_students?.[0]?.count ?? 0))
    )[0];

  const focusHighlights = [
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews,
      accent: 'bg-neo-pink',
      caption: stats.pendingReviews > 0 ? 'Grading queue ready' : 'All caught up',
      icon: <AlertCircle size={18} strokeWidth={3} className="w-4 h-4" />
    },
    {
      label: 'Average Score',
      value: averageScore !== null ? `${averageScore}%` : '—',
      accent: 'bg-neo-cyan',
      caption: averageScore !== null ? 'Across graded work' : 'Awaiting first grades',
      icon: <TrendingUp size={18} strokeWidth={3} className="w-4 h-4" />
    },
    {
      label: 'Spotlight Classroom',
      value: topClassroom?.name ?? 'Create your first!',
      accent: 'bg-neo-yellow',
      caption: topClassroom ? `${topClassroom.classroom_students?.[0]?.count ?? 0} students engaged` : 'Launch a new class',
      icon: <Award size={18} strokeWidth={3} className="w-4 h-4" />
    }
  ];

  const momentumInsights = [
    {
      title: 'Student Growth',
      value: stats.studentsTrend !== 0 ? `${stats.studentsTrend > 0 ? '+' : ''}${stats.studentsTrend}%` : 'Steady',
      caption: 'Last 30 days vs previous',
      tone: stats.studentsTrend >= 0 ? 'bg-neo-green' : 'bg-neo-pink text-neo-white'
    },
    {
      title: 'Submission Velocity',
      value: stats.submissionsTrend !== 0 ? `${stats.submissionsTrend > 0 ? '+' : ''}${stats.submissionsTrend}%` : 'Stable',
      caption: `${recentSubmissions.length} submissions in review`,
      tone: stats.submissionsTrend >= 0 ? 'bg-neo-cyan' : 'bg-neo-pink text-neo-white'
    },
    {
      title: 'Pending Workload',
      value: `${stats.pendingReviews}`,
      caption: 'Needs review to complete',
      tone: stats.pendingReviews > 0 ? 'bg-neo-yellow' : 'bg-neo-green'
    }
  ];

  const actionShortcuts = [
    {
      title: 'Review Pending Work',
      description: stats.pendingReviews > 0 ? `${stats.pendingReviews} submissions waiting` : 'You are all caught up',
      route: '/grade',
      accent: 'bg-neo-pink text-neo-white',
      icon: <AlertCircle size={18} strokeWidth={3} className="w-4 h-4" />
    },
    {
      title: 'Draft A Lesson Plan',
      description: 'Spin up a fresh outline with AI in minutes',
      route: '/lesson-planner',
      accent: 'bg-neo-cyan',
      icon: <NotebookPen size={18} strokeWidth={3} className="w-4 h-4" />
    },
    {
      title: 'Explore Analytics',
      description: 'Track classroom performance and mastery trends',
      route: '/analytics',
      accent: 'bg-neo-yellow',
      icon: <BarChart3 size={18} strokeWidth={3} className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-neo-white relative overflow-hidden">
      {/* Animated Background Shapes - Hidden on mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div
          className="absolute top-20 right-10 w-40 h-40 border-4 border-neo-cyan bg-neo-cyan opacity-10 rotate-12"
          style={{ transform: `translateY(${scrollY * 0.3}px) rotate(${12 + scrollY * 0.1}deg)` }}
        ></div>
        <div
          className="absolute top-1/3 left-10 w-32 h-32 border-4 border-neo-pink bg-neo-pink opacity-10 -rotate-12"
          style={{ transform: `translateY(${scrollY * 0.2}px) rotate(${-12 - scrollY * 0.1}deg)` }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-24 h-24 border-4 border-neo-yellow bg-neo-yellow opacity-10 rotate-45"
          style={{ transform: `translateY(${scrollY * 0.15}px) rotate(${45 + scrollY * 0.05}deg)` }}
        ></div>
        <div
          className="absolute bottom-40 left-1/3 w-36 h-36 border-4 border-neo-green bg-neo-green opacity-10 -rotate-6"
          style={{ transform: `translateY(${scrollY * 0.25}px) rotate(${-6 - scrollY * 0.08}deg)` }}
        ></div>
      </div>

      {/* Header */}
      <header className="border-b-4 border-neo-black bg-neo-cyan text-neo-black sticky top-0 z-50 shadow-brutal">
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative group">
              <GraduationCap size={32} strokeWidth={3} className="sm:w-10 sm:h-10 transition-transform group-hover:rotate-12" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-neo-pink border-2 border-neo-black rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase">TEACHER PORTAL</h1>
              <p className="text-xs sm:text-sm uppercase font-bold opacity-80">EDUGRADE</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold uppercase">{profile.full_name}</p>
              <p className="text-sm uppercase opacity-80">TEACHER</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="btn-brutal bg-neo-white text-neo-black group"
            >
              <LogOut size={20} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12 relative z-10">
        {/* Hero Section */}
        <div className="mb-10 sm:mb-14 relative">
          <div className="relative card-brutal bg-gradient-to-br from-neo-white via-neo-cyan/10 to-neo-yellow/20 border-4 border-neo-black p-6 sm:p-8 md:p-10 overflow-hidden">
            <div className="absolute -top-12 -right-6 w-28 sm:w-40 h-28 sm:h-40 border-4 border-neo-pink bg-neo-pink/20 rotate-12 animate-float"></div>
            <div className="absolute -bottom-12 -left-6 w-24 sm:w-32 h-24 sm:h-32 border-4 border-neo-green bg-neo-green/20 -rotate-6 animate-float-delayed"></div>
            <Sparkles className="absolute top-6 right-1/3 w-10 h-10 text-neo-yellow opacity-60 animate-pulse" />

            <div className="grid gap-6 md:grid-cols-5 relative z-10">
              <div className="md:col-span-3 space-y-5">
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-black bg-neo-pink text-neo-white font-bold uppercase text-xs sm:text-sm shadow-brutal-sm">
                    <Sparkles size={16} strokeWidth={3} />
                    AI ASSIST
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-black bg-neo-white font-bold uppercase text-xs sm:text-sm shadow-brutal-sm">
                    <Zap size={16} strokeWidth={3} />
                    INSTANT GRADING
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-black bg-neo-yellow font-bold uppercase text-xs sm:text-sm shadow-brutal-sm">
                    <Users size={16} strokeWidth={3} />
                    CLASS OVERSIGHT
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase leading-tight">
                  WELCOME BACK, {profile.full_name?.split(' ')[0] || 'TEACHER'}!
                </h2>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl uppercase font-bold opacity-70 max-w-2xl">
                  Keep momentum high with AI-powered workflows, lightning-fast grading, and real-time classroom insights.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 border-4 border-neo-black bg-neo-white/80 p-3 shadow-brutal-sm hover:-translate-y-1 transition-transform">
                    <div className="p-2 border-4 border-neo-black bg-neo-cyan">
                      <CalendarClock size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold opacity-60">Today&apos;s Agenda</p>
                      <p className="text-sm sm:text-base font-bold">Review pending submissions and plan next lesson.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-4 border-neo-black bg-neo-white/80 p-3 shadow-brutal-sm hover:-translate-y-1 transition-transform">
                    <div className="p-2 border-4 border-neo-black bg-neo-pink text-neo-white">
                      <TrendingUp size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold opacity-60">Progress Pulse</p>
                      <p className="text-sm sm:text-base font-bold">{stats.totalSubmissions} total submissions monitored.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/grade')}
                    className="btn-brutal-primary flex items-center gap-2 text-sm sm:text-base md:text-lg hover:scale-105 transition-transform"
                  >
                    START GRADING
                    <ArrowRight size={18} strokeWidth={3} className="sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => navigate('/lesson-planner')}
                    className="btn-brutal bg-neo-white text-neo-black flex items-center gap-2 text-sm sm:text-base md:text-lg hover:-translate-y-1 transition-transform"
                  >
                    <NotebookPen size={18} strokeWidth={3} className="sm:w-5 sm:h-5" />
                    PLAN A LESSON
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="border-4 border-neo-black bg-neo-white/80 backdrop-blur-sm p-4 sm:p-6 shadow-brutal h-full flex flex-col gap-4">
                  <div>
                    <p className="text-xs sm:text-sm uppercase font-bold opacity-70">Today&apos;s Focus</p>
                    <h3 className="text-lg sm:text-xl font-bold uppercase">Stay Ahead Of The Curve</h3>
                  </div>

                  <div className="space-y-4">
                    {focusHighlights.map((highlight) => (
                      <div key={highlight.label} className="flex items-start gap-3">
                        <div className={`w-10 h-10 border-4 border-neo-black ${highlight.accent} flex items-center justify-center shrink-0 shadow-brutal-sm`}>
                          {highlight.icon}
                        </div>
                        <div>
                          <p className="text-xs uppercase font-bold opacity-60">{highlight.label}</p>
                          <p className="text-base sm:text-lg font-bold uppercase">{highlight.value}</p>
                          <p className="text-xs opacity-60">{highlight.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto border-t-4 border-neo-black pt-3 text-xs uppercase font-bold opacity-60">
                    Sync completed {gradedSubmissionsList.length} graded submissions.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid with Hover Effects */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          {statsDisplay.map((stat, idx) => (
            <div
              key={idx}
              className={`card-brutal relative overflow-hidden p-3 sm:p-4 md:p-6 ${stat.color} group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all cursor-pointer animate-fadeInUp`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-neo-white/10 group-hover:bg-neo-white/20 transition-opacity"></div>
              <div className="absolute -top-10 -right-6 w-24 h-24 border-4 border-neo-black/20 bg-neo-white/20 rotate-12 opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative">
                <div className="flex justify-between items-start mb-2 sm:mb-4">
                <div className="text-neo-black group-hover:scale-110 transition-transform">
                  {React.cloneElement(stat.icon as React.ReactElement, { size: 24, className: 'sm:w-6 sm:h-6 md:w-8 md:h-8' })}
                </div>
                {stat.trend && (
                  <div className={`px-1 sm:px-2 py-1 border-2 border-neo-black text-[10px] sm:text-xs font-bold ${stat.trendUp ? 'bg-neo-green' : 'bg-neo-pink text-neo-white'}`}>
                    {stat.trend}
                  </div>
                )}
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 group-hover:scale-110 transition-transform">{stat.value}</div>
                <div className="text-[10px] sm:text-xs md:text-sm font-bold uppercase">{stat.label}</div>
                
                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-neo-black opacity-20 overflow-hidden">
                  <div 
                    className="h-full bg-neo-black transition-all duration-1000 group-hover:w-full"
                    style={{ width: idx % 2 === 0 ? '80%' : '65%' }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Insights */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 mb-8 sm:mb-12">
          <div className="card-brutal bg-neo-white p-4 sm:p-6 flex flex-col">
            <p className="text-xs uppercase font-bold opacity-60">AI PERFORMANCE</p>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-4">Average Grade Snapshot</h3>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-neo-black bg-neo-white rounded-full"></div>
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#0f172a" strokeWidth="10" className="opacity-20" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="10"
                  strokeDasharray="440"
                  strokeDashoffset={averageScoreStrokeOffset}
                  className="transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">
                  {averageScore !== null ? averageScore : '—'}
                </span>
                <span className="text-xs uppercase font-bold opacity-60">AVG SCORE</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm uppercase font-bold opacity-60 mb-4 text-center">
              Based on {gradedSubmissionsList.length} graded submissions.
            </p>
            <button
              onClick={() => navigate('/analytics')}
              className="btn-brutal bg-neo-cyan text-neo-black mt-auto flex items-center justify-center gap-2 hover:gap-3 transition-all"
            >
              Open Detailed Analytics
              <ArrowRight size={16} strokeWidth={3} />
            </button>
          </div>

          <div className="card-brutal bg-neo-white p-4 sm:p-6">
            <p className="text-xs uppercase font-bold opacity-60">TREND WATCH</p>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-4">Momentum Monitor</h3>
            <div className="space-y-3">
              {momentumInsights.map((insight) => (
                <div key={insight.title} className="border-4 border-neo-black bg-neo-white p-3 flex items-center gap-3 shadow-brutal-sm">
                  <div className={`w-10 h-10 border-4 border-neo-black ${insight.tone} flex items-center justify-center shrink-0`}>
                    <TrendingUp size={18} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold opacity-60">{insight.title}</p>
                    <p className="text-base font-bold uppercase">{insight.value}</p>
                    <p className="text-xs opacity-60">{insight.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-brutal bg-neo-white p-4 sm:p-6 flex flex-col">
            <p className="text-xs uppercase font-bold opacity-60">ACTION CENTER</p>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-4">Next Best Steps</h3>
            <div className="space-y-3 mb-4">
              {actionShortcuts.map((action) => (
                <div key={action.title} className="border-4 border-neo-black bg-neo-white/90 p-3 flex items-start gap-3 shadow-brutal-sm">
                  <div className={`w-10 h-10 border-4 border-neo-black ${action.accent} flex items-center justify-center shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase font-bold opacity-60">{action.title}</p>
                    <p className="text-sm font-bold">{action.description}</p>
                  </div>
                  <button
                    onClick={() => navigate(action.route)}
                    className="btn-brutal bg-neo-cyan text-neo-black text-xs px-3 py-2 flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    GO
                    <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-auto border-t-4 border-neo-black pt-3 text-xs uppercase font-bold opacity-60">
              Pro tip: revisit analytics weekly to spot emerging trends.
            </div>
          </div>
        </div>

        {/* Quick Actions with Staggered Animation */}
        <div className="mb-8 sm:mb-12">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Target size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-neo-pink" />
            QUICK ACTIONS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                title: 'AI GRADING',
                desc: 'GRADE SUBMISSIONS WITH AI',
                icon: <GraduationCap size={48} strokeWidth={3} />,
                color: 'bg-neo-pink text-neo-white',
                route: '/grade'
              },
              {
                title: 'LESSON PLANNER',
                desc: 'GENERATE AI LESSON PLANS',
                icon: <BookOpen size={48} strokeWidth={3} />,
                color: 'bg-neo-green',
                route: '/lesson-planner'
              },
              {
                title: 'MANAGE CLASSROOMS',
                desc: 'VIEW & ORGANIZE CLASSES',
                icon: <Users size={48} strokeWidth={3} />,
                color: 'bg-neo-cyan',
                route: '/teacher-classrooms'
              },
              {
                title: 'VIEW ANALYTICS',
                desc: 'PERFORMANCE INSIGHTS',
                icon: <BarChart3 size={48} strokeWidth={3} />,
                color: 'bg-neo-yellow',
                route: '/analytics'
              }
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.route)}
                className={`card-brutal p-4 sm:p-6 md:p-8 ${action.color} group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all text-left animate-fadeInUp`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="mb-3 sm:mb-4 group-hover:rotate-12 group-hover:scale-110 transition-transform inline-block">
                  {React.cloneElement(action.icon as React.ReactElement, { size: 32, className: 'sm:w-10 sm:h-10 md:w-12 md:h-12' })}
                </div>
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-1 sm:mb-2">{action.title}</h4>
                <p className="text-xs sm:text-sm opacity-80">{action.desc}</p>
                
                {/* Animated Arrow */}
                <div className="mt-4 flex items-center gap-2 font-bold text-sm group-hover:gap-4 transition-all">
                  <span>GO</span>
                  <div className="w-8 h-0.5 bg-current group-hover:w-12 transition-all"></div>
                  <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-current"></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Submissions with Interactive Cards */}
        <div className="mb-8 sm:mb-12">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <FileText size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-neo-cyan" />
            RECENT SUBMISSIONS
          </h3>
          <div className="card-brutal p-4 sm:p-6 md:p-8 bg-neo-white">
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex p-6 border-4 border-neo-black bg-neo-cyan opacity-30 mb-4">
                  <FileText size={64} strokeWidth={3} />
                </div>
                <p className="font-bold uppercase opacity-60 text-xl">NO SUBMISSIONS YET</p>
                <p className="text-sm opacity-40 mt-2">SUBMISSIONS WILL APPEAR HERE</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSubmissions.map((submission, idx) => {
                  const timeAgo = new Date(submission.created_at).toLocaleString();
                  
                  return (
                    <div
                      key={submission.id}
                      className="group flex flex-col sm:flex-row items-start sm:items-center justify-between border-4 border-neo-black p-3 sm:p-4 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all bg-neo-white shadow-brutal cursor-pointer animate-fadeInUp gap-3 sm:gap-0"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                        {/* Avatar Circle */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-neo-black bg-neo-pink flex items-center justify-center font-bold text-neo-white group-hover:rotate-12 transition-transform flex-shrink-0">
                          {submission.profiles?.full_name?.charAt(0) || '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold uppercase text-sm sm:text-base truncate">{submission.profiles?.full_name || 'Unknown Student'}</p>
                          <p className="text-xs sm:text-sm opacity-60 truncate">{submission.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={12} strokeWidth={3} className="opacity-40 flex-shrink-0" />
                            <p className="text-xs opacity-60">{timeAgo}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <span className={`px-2 sm:px-4 py-2 border-4 border-neo-black font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 ${
                          submission.isGraded ? 'bg-neo-green' : 'bg-neo-yellow'
                        }`}>
                          {submission.isGraded ? (
                            <>
                              <CheckCircle size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
                              GRADED
                            </>
                          ) : (
                            <>
                              <AlertCircle size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
                              PENDING
                            </>
                          )}
                        </span>
                        <button
                          onClick={() => navigate('/grade')}
                          className="btn-brutal bg-neo-cyan text-neo-black text-xs sm:text-sm px-3 sm:px-4 py-2 group-hover:translate-x-1 group-hover:translate-y-1"
                        >
                          {submission.isGraded ? 'VIEW' : 'GRADE'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Classrooms with Parallax Cards */}
        <div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Users size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-neo-green" />
            ACTIVE CLASSROOMS
          </h3>
          {classrooms.length === 0 ? (
            <div className="card-brutal p-12 bg-neo-white text-center group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
              <div className="inline-flex p-6 border-4 border-neo-black bg-neo-green opacity-30 mb-4 group-hover:rotate-12 transition-transform">
                <Users size={64} strokeWidth={3} />
              </div>
              <p className="font-bold uppercase mb-4 opacity-60 text-xl">NO CLASSROOMS YET</p>
              <button 
                onClick={() => navigate('/teacher-classrooms')}
                className="btn-brutal-primary inline-flex items-center gap-2"
              >
                <span>CREATE YOUR FIRST CLASSROOM</span>
                <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-neo-white"></div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {classrooms.map((classroom, idx) => {
                const colors = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-green'];
                const color = colors[idx % colors.length];
                const studentCount = classroom.classroom_students?.[0]?.count || 0;

                return (
                  <div
                    key={classroom.id}
                    className={`card-brutal p-4 sm:p-6 ${color} group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all cursor-pointer animate-fadeInUp`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {/* Classroom Icon */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 border-4 border-neo-black bg-neo-white group-hover:rotate-12 transition-transform">
                        <BookOpen size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
                      </div>
                      <div className="px-2 sm:px-3 py-1 border-4 border-neo-black bg-neo-white font-bold text-[10px] sm:text-xs">
                        {studentCount} STUDENTS
                      </div>
                    </div>

                    <h4 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-3 sm:mb-4 group-hover:translate-x-1 transition-transform">
                      {classroom.name}
                    </h4>
                    
                    {classroom.description && (
                      <p className="text-sm mb-4 opacity-80">{classroom.description}</p>
                    )}
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 sm:pt-4 border-t-4 border-neo-black gap-2 sm:gap-0">
                      <div className="text-xs sm:text-sm">
                        <p className="font-bold">Created {new Date(classroom.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => navigate('/teacher-classrooms')}
                        className="btn-brutal bg-neo-white text-neo-black text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-2 group-hover:gap-3 transition-all"
                      >
                        MANAGE
                        <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-neo-black"></div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => navigate('/grade')}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 border-4 border-neo-black bg-neo-pink text-neo-white shadow-brutal hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all group z-50"
          title="Quick Grade"
        >
          <Zap size={24} strokeWidth={3} className="sm:w-8 sm:h-8 mx-auto group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;
