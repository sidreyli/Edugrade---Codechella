import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import InsightsModal from '../components/InsightsModal';
import ChatInterface from '../components/ChatInterface';
import { getLetterGrade, getGradeColor } from '../utils/grading';
import { 
  GraduationCap, 
  LogOut, 
  Upload, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  RefreshCw,
  Award,
  Calendar,
  BarChart3,
  Users,
  BookOpen,
  Sparkles,
  Target,
  Zap,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

interface GradeInsights {
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: Array<{
    topic: string;
    resource: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  detailed_feedback?: string;
}

interface SubmissionWithGrade {
  id: string;
  file_name: string;
  file_url: string;
  extracted_text: string | null;
  status: string;
  created_at: string;
  assignment_id?: string | null;
  assignments?: {
    title: string;
    classroom_id: string;
    max_score: number;
  };
  grade?: {
    id: string;
    score: number;
    feedback: string;
    rubric: string;
    insights?: GradeInsights;
    created_at: string;
  };
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithGrade | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedInsightSubmission, setSelectedInsightSubmission] = useState<SubmissionWithGrade | null>(null);
  const [reuploadModal, setReuploadModal] = useState<{
    isOpen: boolean;
    submissionId: string | null;
  }>({
    isOpen: false,
    submissionId: null
  });
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploading, setReuploading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningClassroom, setJoiningClassroom] = useState(false);
  const [myClassrooms, setMyClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomDetails, setClassroomDetails] = useState<any>(null);
  const [loadingClassroom, setLoadingClassroom] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [classroomGradingScales, setClassroomGradingScales] = useState<Record<string, any>>({});
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'student') {
      navigate('/teacher-dashboard');
      return;
    }

    fetchProfile();
    fetchSubmissions();
    fetchMyClassrooms();
    const cleanupSubscriptions = setupRealtimeSubscriptions();

    // Scroll and mouse listeners for dynamic effects
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cleanupSubscriptions();
    };
  }, [user, userRole, navigate]);

  const setupRealtimeSubscriptions = () => {
    const submissionsSubscription = supabase
      .channel('student-submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `student_id=eq.${user?.id}`
        },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    const gradesSubscription = supabase
      .channel('student-grades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grades',
          filter: `student_id=eq.${user?.id}`
        },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      submissionsSubscription.unsubscribe();
      gradesSubscription.unsubscribe();
    };
  };

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

  const fetchMyClassrooms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_student_classrooms', { student_uuid: user.id });

      if (error) throw error;
      
      setMyClassrooms(data || []);
    } catch (err: any) {
      console.error('Error fetching classrooms:', err);
      setError('Failed to load classrooms: ' + err.message);
    }
  };

  const handleViewClassroom = async (classroom: any) => {
    setSelectedClassroom(classroom);
    setShowClassroomModal(true);
    setLoadingClassroom(true);

    try {
      const { data: details, error: detailsError } = await supabase
        .rpc('get_classroom_details', { classroom_uuid: classroom.id });

      const teacher = details && details.length > 0 ? {
        full_name: details[0].teacher_name,
        email: details[0].teacher_email
      } : null;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroom_id', classroom.id)
        .order('created_at', { ascending: false });

      setClassroomDetails({
        teacher,
        assignments: assignments || []
      });
    } catch (err: any) {
      console.error('Error fetching classroom details:', err);
    } finally {
      setLoadingClassroom(false);
    }
  };

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim() || !user) return;

    setJoiningClassroom(true);
    setError('');

    try {
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (classroomError || !classroom) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      const { data: existing } = await supabase
        .from('classroom_students')
        .select('*')
        .eq('classroom_id', classroom.id)
        .eq('student_id', user.id)
        .single();

      if (existing) {
        throw new Error('You are already in this classroom');
      }

      const { error: joinError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: user.id
        });

      if (joinError) throw joinError;

      setShowJoinModal(false);
      setInviteCode('');
      await fetchMyClassrooms();
      alert(`Successfully joined ${classroom.name}!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoiningClassroom(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments(title, classroom_id, max_score)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      const submissionIds = submissionsData?.map(s => s.id) || [];
      
      let gradesData: any[] = [];
      if (submissionIds.length > 0) {
        const { data: grades, error: gradesError } = await supabase
          .from('grades')
          .select('*')
          .in('submission_id', submissionIds)
          .order('created_at', { ascending: false });

        if (gradesError) throw gradesError;
        gradesData = grades || [];
      }

      // Fetch grading scales for all classrooms
      const classroomIds = [...new Set(submissionsData?.map(s => s.assignments?.classroom_id).filter(Boolean) || [])];
      if (classroomIds.length > 0) {
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('classrooms')
          .select('id, grading_scale')
          .in('id', classroomIds);

        if (classroomsError) throw classroomsError;

        const scalesMap: Record<string, any> = {};
        classroomsData?.forEach((classroom: any) => {
          scalesMap[classroom.id] = classroom.grading_scale;
        });
        setClassroomGradingScales(scalesMap);
      }

      const submissionsWithGrades: SubmissionWithGrade[] = submissionsData?.map(submission => {
        const grade = gradesData.find(g => g.submission_id === submission.id);
        
        // Parse insights if it's a string
        if (grade && grade.insights && typeof grade.insights === 'string') {
          try {
            grade.insights = JSON.parse(grade.insights);
          } catch (e) {
            console.error('Error parsing insights:', e);
          }
        }
        
        return {
          ...submission,
          grade: grade || undefined
        };
      }) || [];

      setSubmissions(submissionsWithGrades);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const handleViewDetails = (submission: SubmissionWithGrade) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
  };

  const handleReupload = async () => {
    if (!reuploadFile || !reuploadModal.submissionId || !user) return;

    setReuploading(true);
    setError('');

    try {
      const fileExt = reuploadFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, reuploadFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName);

      const { data: updatedSubmission, error: updateError } = await supabase
        .from('submissions')
        .update({
          file_url: publicUrl,
          file_name: reuploadFile.name,
          status: 'processing',
          extracted_text: null
        })
        .eq('id', reuploadModal.submissionId)
        .select()
        .single();

      if (updateError) throw updateError;

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract_text', {
        body: {
          fileUrl: publicUrl,
          submissionId: updatedSubmission.id
        }
      });

      if (ocrError) throw ocrError;

      await supabase
        .from('grades')
        .delete()
        .eq('submission_id', reuploadModal.submissionId);

      setReuploadModal({ isOpen: false, submissionId: null });
      setReuploadFile(null);
      await fetchSubmissions();

      alert('File re-uploaded successfully! Your teacher will grade it soon.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReuploading(false);
    }
  };

  const calculateStats = () => {
    const gradedSubmissions = submissions.filter(s => s.grade);
    const totalSubmissions = submissions.length;

    // Calculate average score as percentage based on max_score for each assignment
    const averageScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => {
          const maxScore = s.assignments?.max_score || 100;
          const percentage = ((s.grade?.score || 0) / maxScore) * 100;
          return sum + percentage;
        }, 0) / gradedSubmissions.length)
      : 0;

    const pendingGrades = totalSubmissions - gradedSubmissions.length;

    // Calculate average letter grade from all graded submissions with classroom context
    let averageLetterGrade = 'N/A';
    if (gradedSubmissions.length > 0) {
      // Find the most common classroom (or just use first available grading scale)
      const submissionWithGrade = gradedSubmissions.find(s =>
        s.assignments?.classroom_id && classroomGradingScales[s.assignments.classroom_id]
      );
      if (submissionWithGrade?.assignments?.classroom_id) {
        const scale = classroomGradingScales[submissionWithGrade.assignments.classroom_id];
        averageLetterGrade = getLetterGrade(averageScore, scale);
      }
    }

    return {
      totalSubmissions,
      gradedSubmissions: gradedSubmissions.length,
      averageScore,
      averageLetterGrade,
      pendingGrades
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-neo-green';
    if (score >= 80) return 'bg-neo-cyan';
    if (score >= 70) return 'bg-neo-yellow';
    return 'bg-neo-pink text-neo-white';
  };

  const getStatusBadge = (submission: SubmissionWithGrade) => {
    if (submission.grade) {
      return (
        <span className="px-3 py-1 border-4 border-neo-black font-bold text-sm bg-neo-green flex items-center gap-1">
          <CheckCircle size={14} strokeWidth={3} />
          GRADED
        </span>
      );
    }
    if (submission.status === 'failed') {
      return (
        <span className="px-3 py-1 border-4 border-neo-black font-bold text-sm bg-neo-pink text-neo-white flex items-center gap-1">
          <AlertCircle size={14} strokeWidth={3} />
          FAILED
        </span>
      );
    }
    if (submission.status === 'processing') {
      return (
        <span className="px-3 py-1 border-4 border-neo-black font-bold text-sm bg-neo-yellow flex items-center gap-1">
          <Loader2 size={14} strokeWidth={3} className="animate-spin" />
          PROCESSING
        </span>
      );
    }
    return (
      <span className="px-3 py-1 border-4 border-neo-black font-bold text-sm bg-neo-cyan flex items-center gap-1">
        <Clock size={14} strokeWidth={3} />
        PENDING
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-pink flex items-center justify-center relative overflow-hidden">
        {/* Animated Loading Shapes - Hidden on mobile */}
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          <div className="absolute top-20 left-10 w-32 h-32 border-4 border-neo-cyan bg-neo-cyan opacity-20 rotate-12 animate-float"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-neo-yellow bg-neo-yellow opacity-20 -rotate-12 animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/4 w-40 h-40 border-4 border-neo-green bg-neo-green opacity-20 rotate-45 animate-float"></div>
        </div>
        <div className="text-center relative z-10 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-6 sm:border-8 border-neo-black border-t-neo-white rounded-full animate-spin mx-auto mb-4 sm:mb-6"></div>
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase text-neo-white">LOADING YOUR DASHBOARD...</div>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  // Calculate parallax offsets
  const parallaxOffset1 = scrollY * 0.3;
  const parallaxOffset2 = scrollY * 0.2;
  const parallaxOffset3 = scrollY * 0.15;
  const mouseParallaxX = (mousePosition.x - window.innerWidth / 2) * 0.02;
  const mouseParallaxY = (mousePosition.y - window.innerHeight / 2) * 0.02;

  const gradedSubmissionsList = submissions.filter(s => s.grade);
  const pendingSubmissionsList = submissions.filter(s => !s.grade);
  const completionRate = stats.totalSubmissions > 0
    ? Math.round((stats.gradedSubmissions / stats.totalSubmissions) * 100)
    : 0;
  const insightsAvailable = gradedSubmissionsList.filter(s => {
    const insights = s.grade?.insights;
    return Boolean(insights && (
      (insights.strengths && insights.strengths.length > 0) ||
      (insights.weaknesses && insights.weaknesses.length > 0) ||
      (insights.recommendations && insights.recommendations.length > 0) ||
      insights.detailed_feedback
    ));
  }).length;
  const latestSubmission = submissions[0];
  const latestGradedSubmission = gradedSubmissionsList[0];
  const topScoreSubmission = gradedSubmissionsList
    .slice()
    .sort((a, b) => (b.grade?.score ?? 0) - (a.grade?.score ?? 0))[0];
  const averageScoreStrokeOffset = 440 - Math.min(100, stats.averageScore) / 100 * 440;
  const latestSubmissionTitle = latestSubmission?.assignments?.title || latestSubmission?.file_name || 'No submissions yet';
  const latestSubmissionDate = latestSubmission ? new Date(latestSubmission.created_at).toLocaleDateString() : null;
  const topScoreValue = topScoreSubmission
    ? `${topScoreSubmission.grade?.score}/${topScoreSubmission.assignments?.max_score || 100}`
    : '—';
  const topScoreTitle = topScoreSubmission?.assignments?.title || 'Awaiting first grade';

  const focusHighlights = [
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      caption: stats.totalSubmissions
        ? `${stats.gradedSubmissions} of ${stats.totalSubmissions} submissions graded`
        : 'Upload work to start tracking progress',
      accent: 'bg-neo-green',
      icon: <CheckCircle size={16} strokeWidth={3} className="w-4 h-4" />
    },
    {
      label: 'Insights Ready',
      value: `${insightsAvailable}`,
      caption: insightsAvailable > 0 ? 'AI feedback waiting for you' : 'Insights unlock after grading',
      accent: 'bg-neo-pink text-neo-white',
      icon: <Sparkles size={16} strokeWidth={3} className="w-4 h-4" />
    },
    {
      label: 'Pending Reviews',
      value: `${stats.pendingGrades}`,
      caption: stats.pendingGrades > 0 ? 'Teacher is grading in the background' : 'No work pending',
      accent: 'bg-neo-yellow',
      icon: <Clock size={16} strokeWidth={3} className="w-4 h-4" />
    }
  ];

  const statCards = [
    {
      icon: <FileText size={32} strokeWidth={3} />,
      value: stats.totalSubmissions,
      label: 'TOTAL SUBMISSIONS',
      color: 'bg-neo-cyan',
      meta: latestSubmission
        ? `Latest: ${new Date(latestSubmission.created_at).toLocaleDateString()}`
        : 'Start by uploading your first assignment'
    },
    {
      icon: <CheckCircle size={32} strokeWidth={3} />,
      value: stats.gradedSubmissions,
      label: 'GRADED WORK',
      color: 'bg-neo-green',
      meta: `${completionRate}% complete`
    },
    {
      icon: <Clock size={32} strokeWidth={3} />,
      value: stats.pendingGrades,
      label: 'PENDING GRADES',
      color: 'bg-neo-yellow',
      meta: pendingSubmissionsList.length > 0 ? 'Awaiting teacher review' : 'Nothing waiting'
    },
    {
      icon: <Award size={32} strokeWidth={3} />,
      value: stats.averageLetterGrade !== 'N/A'
        ? `${stats.averageScore}% (${stats.averageLetterGrade})`
        : `${stats.averageScore}%`,
      label: 'AVERAGE SCORE',
      color: getScoreColor(stats.averageScore),
      meta: gradedSubmissionsList.length > 0
        ? `Best: ${topScoreSubmission?.grade?.score ?? 0}/${topScoreSubmission?.assignments?.max_score || 100}`
        : 'Feedback will appear here'
    }
  ];

  const nextActions = [
    {
      title: 'Upload New Work',
      description: 'Submit homework, quizzes, or notes for instant AI help.',
      action: () => navigate('/upload'),
      accent: 'bg-neo-cyan',
      icon: <Upload size={18} strokeWidth={3} className="w-4 h-4" />
    },
    {
      title: 'Review Latest Feedback',
      description: latestGradedSubmission
        ? `${latestGradedSubmission.assignments?.title || 'Latest assignment'} scored ${latestGradedSubmission.grade?.score}/${latestGradedSubmission.assignments?.max_score || 100}.`
        : 'Feedback will appear once your work is graded.',
      action: latestGradedSubmission
        ? () => {
            setSelectedSubmission(latestGradedSubmission);
            setShowDetailModal(true);
          }
        : () => navigate('/upload'),
      accent: 'bg-neo-pink text-neo-white',
      icon: <TrendingUp size={18} strokeWidth={3} className="w-4 h-4" />
    },
    {
      title: 'Ask Study Buddy',
      description: 'Chat with AI to prep for upcoming lessons and quizzes.',
      action: () => setShowChat(true),
      accent: 'bg-neo-yellow',
      icon: <MessageCircle size={18} strokeWidth={3} className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-neo-white relative overflow-hidden">
      {/* Animated Background Shapes with Parallax - Hidden on mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div 
          className="absolute top-20 right-10 w-40 h-40 border-4 border-neo-pink bg-neo-pink opacity-10 rotate-12"
          style={{ 
            transform: `translateY(${parallaxOffset1}px) translateX(${mouseParallaxX}px) rotate(${12 + scrollY * 0.1}deg)` 
          }}
        ></div>
        <div 
          className="absolute top-1/3 left-10 w-32 h-32 border-4 border-neo-cyan bg-neo-cyan opacity-10 -rotate-12"
          style={{ 
            transform: `translateY(${parallaxOffset2}px) translateX(${-mouseParallaxX}px) rotate(${-12 - scrollY * 0.1}deg)` 
          }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-24 h-24 border-4 border-neo-yellow bg-neo-yellow opacity-10 rotate-45"
          style={{ 
            transform: `translateY(${parallaxOffset3}px) translateX(${mouseParallaxY}px) rotate(${45 + scrollY * 0.05}deg)` 
          }}
        ></div>
        <div 
          className="absolute bottom-40 left-1/3 w-36 h-36 border-4 border-neo-green bg-neo-green opacity-10 -rotate-6"
          style={{ 
            transform: `translateY(${parallaxOffset2}px) translateX(${-mouseParallaxY}px) rotate(${-6 - scrollY * 0.08}deg)` 
          }}
        ></div>
        <div 
          className="absolute top-1/2 right-1/3 w-28 h-28 border-4 border-neo-pink bg-neo-pink opacity-10 rotate-30"
          style={{ 
            transform: `translateY(${parallaxOffset1}px) translateX(${mouseParallaxX * 0.5}px) rotate(${30 + scrollY * 0.12}deg)` 
          }}
        ></div>
      </div>

      {/* Header with Sticky Effect */}
      <header className="border-b-4 border-neo-black bg-neo-cyan sticky top-0 z-50 shadow-brutal">
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative group">
              <GraduationCap size={32} className="sm:w-10 sm:h-10 text-neo-black transition-transform group-hover:rotate-12" strokeWidth={3} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-neo-pink border-2 border-neo-black rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase">STUDENT PORTAL</h1>
              <p className="text-xs sm:text-sm uppercase font-bold">EDUGRADE</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold uppercase">{profile?.full_name || 'STUDENT'}</p>
              <p className="text-sm uppercase">STUDENT</p>
            </div>
            <button onClick={handleLogout} className="btn-brutal bg-neo-white text-neo-black group">
              <LogOut size={20} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12 relative z-10">
        {/* Error Display */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold flex items-center gap-2 animate-shake text-sm sm:text-base">
            <AlertCircle size={18} strokeWidth={3} className="sm:w-5 sm:h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-10 sm:mb-14 relative">
          <div className="relative card-brutal bg-gradient-to-br from-neo-white via-neo-cyan/10 to-neo-pink/20 border-4 border-neo-black p-6 sm:p-8 md:p-10 overflow-hidden">
            <div className="absolute -top-12 -right-6 w-28 sm:w-40 h-28 sm:h-40 border-4 border-neo-yellow bg-neo-yellow/30 rotate-12 animate-float"></div>
            <div className="absolute -bottom-12 -left-6 w-24 sm:w-32 h-24 sm:h-32 border-4 border-neo-green bg-neo-green/20 -rotate-6 animate-float-delayed"></div>
            <Sparkles className="absolute top-6 right-1/3 w-10 h-10 text-neo-pink opacity-60 animate-pulse" />

            <div className="grid gap-6 md:grid-cols-5 relative z-10">
              <div className="md:col-span-3 space-y-5">
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-black bg-neo-pink text-neo-white font-bold uppercase text-xs sm:text-sm shadow-brutal-sm">
                    <Sparkles size={16} strokeWidth={3} />
                    AI FEEDBACK
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-black bg-neo-white font-bold uppercase text-xs sm:text-sm shadow-brutal-sm">
                    <Zap size={16} strokeWidth={3} />
                    INSTANT GRADING
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-4 border-neo-black bg-neo-yellow font-bold uppercase text-xs sm:text-sm shadow-brutal-sm">
                    <Target size={16} strokeWidth={3} />
                    GOAL TRACKING
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase leading-tight">
                  READY TO LEVEL UP, {profile?.full_name?.split(' ')[0] || 'STUDENT'}?
                </h2>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl uppercase font-bold opacity-70 max-w-2xl">
                  Keep building momentum with new submissions, fresh insights, and focused practice powered by your AI Study Buddy.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 border-4 border-neo-black bg-neo-white/85 p-3 shadow-brutal-sm hover:-translate-y-1 transition-transform">
                    <div className="p-2 border-4 border-neo-black bg-neo-cyan">
                      <Calendar size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold opacity-60">Latest Submission</p>
                      <p className="text-sm sm:text-base font-bold">{latestSubmissionTitle}</p>
                      <p className="text-xs uppercase font-bold opacity-50">{latestSubmissionDate || 'Upload to get started'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-4 border-neo-black bg-neo-white/85 p-3 shadow-brutal-sm hover:-translate-y-1 transition-transform">
                    <div className="p-2 border-4 border-neo-black bg-neo-pink text-neo-white">
                      <Award size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold opacity-60">Top Score</p>
                      <p className="text-sm sm:text-base font-bold">{topScoreValue}</p>
                      <p className="text-xs uppercase font-bold opacity-50">{topScoreTitle}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/upload')}
                    className="btn-brutal-primary flex items-center gap-2 text-sm sm:text-base md:text-lg hover:scale-105 transition-transform"
                  >
                    UPLOAD ASSIGNMENT
                    <ArrowRight size={18} strokeWidth={3} className="sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setShowChat(true)}
                    className="btn-brutal bg-neo-white text-neo-black flex items-center gap-2 text-sm sm:text-base md:text-lg hover:-translate-y-1 transition-transform"
                  >
                    <MessageCircle size={18} strokeWidth={3} className="sm:w-5 sm:h-5" />
                    ASK STUDY BUDDY
                  </button>
                  {latestGradedSubmission && (
                    <button
                      onClick={() => {
                        setSelectedSubmission(latestGradedSubmission);
                        setShowDetailModal(true);
                      }}
                      className="btn-brutal bg-neo-pink text-neo-white flex items-center gap-2 text-sm sm:text-base md:text-lg hover:-translate-y-1 transition-transform"
                    >
                      REVIEW FEEDBACK
                      <ArrowRight size={18} strokeWidth={3} className="sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="border-4 border-neo-black bg-neo-white/80 backdrop-blur-sm p-4 sm:p-6 shadow-brutal h-full flex flex-col gap-4">
                  <div>
                    <p className="text-xs sm:text-sm uppercase font-bold opacity-70">Today&apos;s Focus</p>
                    <h3 className="text-lg sm:text-xl font-bold uppercase">Stay On Track</h3>
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
                    Pro tip: keep a steady upload rhythm to unlock more AI insights.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid with Hover Effects */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          {statCards.map((stat, idx) => (
            <div
              key={stat.label}
              className={`card-brutal relative overflow-hidden p-3 sm:p-4 md:p-6 ${stat.color} group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all cursor-pointer animate-fadeInUp`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-neo-white/10 group-hover:bg-neo-white/20 transition-opacity"></div>
              <div className="absolute -top-10 -right-6 w-24 h-24 border-4 border-neo-black/20 bg-neo-white/20 rotate-12 opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative">
                <div className="flex justify-between items-start mb-2 sm:mb-4">
                  <div className="group-hover:scale-110 transition-transform">
                    {React.cloneElement(stat.icon as React.ReactElement, { size: 20, className: 'sm:w-6 sm:h-6 md:w-8 md:h-8' })}
                  </div>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 group-hover:scale-110 transition-transform break-words">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm font-bold uppercase">{stat.label}</div>
                <p className="mt-2 text-[10px] sm:text-xs font-bold uppercase opacity-70">
                  {stat.meta}
                </p>
                <div className="mt-4 h-2 bg-neo-black opacity-20 overflow-hidden">
                  <div
                    className="h-full bg-neo-black transition-all duration-1000 group-hover:w-full"
                    style={{ width: idx % 2 === 0 ? '80%' : '60%' }}
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
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-4">Average Score Snapshot</h3>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-neo-black bg-neo-white rounded-full"></div>
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#0f172a" strokeWidth="10" className="opacity-20" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#FF4FED"
                  strokeWidth="10"
                  strokeDasharray="440"
                  strokeDashoffset={averageScoreStrokeOffset}
                  className="transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">
                  {stats.averageScore}
                </span>
                <span className="text-xs uppercase font-bold opacity-60">AVG SCORE</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm uppercase font-bold opacity-60 mb-4 text-center">
              Based on {gradedSubmissionsList.length} graded submissions.
            </p>
            <button
              onClick={() => latestGradedSubmission ? handleViewDetails(latestGradedSubmission) : navigate('/upload')}
              className="btn-brutal bg-neo-cyan text-neo-black mt-auto flex items-center justify-center gap-2 hover:gap-3 transition-all"
            >
              {gradedSubmissionsList.length > 0 ? 'Open Latest Feedback' : 'Upload to See Feedback'}
              <ArrowRight size={16} strokeWidth={3} />
            </button>
          </div>

          <div className="card-brutal bg-neo-white p-4 sm:p-6">
            <p className="text-xs uppercase font-bold opacity-60">MOMENTUM CHECK</p>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-4">Progress Pulse</h3>
            <div className="space-y-3">
              <div className="border-4 border-neo-black bg-neo-white/90 p-3 flex items-center gap-3 shadow-brutal-sm">
                <div className="w-10 h-10 border-4 border-neo-black bg-neo-green flex items-center justify-center shrink-0">
                  <CheckCircle size={18} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-xs uppercase font-bold opacity-60">Completion Rate</p>
                  <p className="text-base font-bold uppercase">{completionRate}%</p>
                  <p className="text-xs opacity-60">{stats.gradedSubmissions} of {stats.totalSubmissions || 0} submissions graded</p>
                </div>
              </div>
              <div className="border-4 border-neo-black bg-neo-white/90 p-3 flex items-center gap-3 shadow-brutal-sm">
                <div className="w-10 h-10 border-4 border-neo-black bg-neo-pink text-neo-white flex items-center justify-center shrink-0">
                  <Sparkles size={18} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-xs uppercase font-bold opacity-60">Insights Available</p>
                  <p className="text-base font-bold uppercase">{insightsAvailable}</p>
                  <p className="text-xs opacity-60">AI recommendations ready to review</p>
                </div>
              </div>
              <div className="border-4 border-neo-black bg-neo-white/90 p-3 flex items-center gap-3 shadow-brutal-sm">
                <div className="w-10 h-10 border-4 border-neo-black bg-neo-yellow flex items-center justify-center shrink-0">
                  <Clock size={18} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-xs uppercase font-bold opacity-60">Pending Reviews</p>
                  <p className="text-base font-bold uppercase">{stats.pendingGrades}</p>
                  <p className="text-xs opacity-60">Teachers are currently reviewing {pendingSubmissionsList.length} submissions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-brutal bg-neo-white p-4 sm:p-6 flex flex-col">
            <p className="text-xs uppercase font-bold opacity-60">ACTION CENTER</p>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-4">Next Best Steps</h3>
            <div className="space-y-3 mb-4">
              {nextActions.map((action) => (
                <div key={action.title} className="border-4 border-neo-black bg-neo-white/90 p-3 flex items-start gap-3 shadow-brutal-sm">
                  <div className={`w-10 h-10 border-4 border-neo-black ${action.accent} flex items-center justify-center shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase font-bold opacity-60">{action.title}</p>
                    <p className="text-sm font-bold">{action.description}</p>
                  </div>
                  <button
                    onClick={action.action}
                    className="btn-brutal bg-neo-cyan text-neo-black text-xs px-3 py-2 flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    GO
                    <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-auto border-t-4 border-neo-black pt-3 text-xs uppercase font-bold opacity-60">
              Tip: Explore feedback after every grade to sharpen your next upload.
            </div>
          </div>
        </div>

        {/* My Classrooms with Interactive Cards */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase flex items-center gap-2 sm:gap-3 animate-slideInLeft">
              <Users size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-neo-green" />
              MY CLASSROOMS
            </h3>
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-brutal-primary group animate-slideInRight text-sm sm:text-base"
            >
              <span className="flex items-center gap-2">
                JOIN CLASSROOM
                <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-neo-white group-hover:translate-x-1 transition-transform"></div>
              </span>
            </button>
          </div>

          {myClassrooms.length === 0 ? (
            <div className="card-brutal p-12 bg-neo-yellow text-center group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all animate-fadeInUp">
              <div className="inline-flex p-6 border-4 border-neo-black bg-neo-white mb-4 group-hover:rotate-12 transition-transform">
                <Users size={64} strokeWidth={3} className="opacity-30" />
              </div>
              <p className="font-bold uppercase mb-2 text-xl">NOT IN ANY CLASSROOMS YET</p>
              <p className="mb-4">Use an invite code from your teacher to join a classroom</p>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="btn-brutal bg-neo-white text-neo-black"
              >
                JOIN NOW
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {myClassrooms.map((classroom, idx) => {
                const colors = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-green'];
                const color = colors[idx % colors.length];

                return (
                  <button
                    key={classroom.id}
                    onClick={() => handleViewClassroom(classroom)}
                    className={`card-brutal p-4 sm:p-6 ${color} hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all text-left w-full group animate-fadeInUp`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="mb-3 sm:mb-4 group-hover:rotate-12 group-hover:scale-110 transition-transform inline-block">
                      <BookOpen size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold uppercase mb-2">{classroom.name}</h4>
                    {classroom.description && (
                      <p className="text-sm opacity-80 mb-4">{classroom.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm font-bold group-hover:gap-4 transition-all">
                      <Eye size={16} strokeWidth={3} />
                      VIEW DETAILS
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-neo-black"></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Upload Button with Pulse Effect */}
        <div className="mb-8 sm:mb-12">
          <button
            onClick={() => navigate('/upload')}
            className="card-brutal p-4 sm:p-6 md:p-8 bg-neo-pink text-neo-white hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all w-full text-left group animate-slideInUp"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="group-hover:rotate-12 group-hover:scale-110 transition-transform flex-shrink-0">
                <Upload size={32} strokeWidth={3} className="sm:w-10 sm:h-10 md:w-12 md:h-12" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase mb-1 sm:mb-2">SUBMIT NEW ASSIGNMENT</h3>
                <p className="text-sm sm:text-base md:text-lg">UPLOAD YOUR WORK FOR GRADING</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 font-bold group-hover:gap-4 transition-all">
                <span>GO</span>
                <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-neo-white"></div>
              </div>
            </div>
          </button>
        </div>

        {/* Submissions List with Staggered Animation */}
        <div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 animate-slideInLeft">
            <FileText size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-neo-cyan" />
            MY SUBMISSIONS
          </h3>
          
          {submissions.length === 0 ? (
            <div className="card-brutal p-12 bg-neo-white text-center group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all animate-fadeInUp">
              <div className="inline-flex p-6 border-4 border-neo-black bg-neo-cyan opacity-30 mb-4 group-hover:rotate-12 transition-transform">
                <FileText size={64} strokeWidth={3} />
              </div>
              <h4 className="text-2xl font-bold uppercase mb-2">NO SUBMISSIONS YET</h4>
              <p className="font-bold opacity-60 mb-6">
                Start by uploading your first assignment
              </p>
              <button 
                onClick={() => navigate('/upload')}
                className="btn-brutal-primary"
              >
                <Upload size={20} strokeWidth={3} className="mr-2 inline" />
                UPLOAD ASSIGNMENT
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {submissions.map((submission, idx) => (
                <div
                  key={submission.id}
                  className="card-brutal p-4 sm:p-6 bg-neo-white group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all animate-fadeInUp"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                    {/* Left: File Info */}
                    <div className="flex-1 w-full sm:w-auto min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="group-hover:rotate-12 transition-transform">
                          <FileText size={20} strokeWidth={3} />
                        </div>
                        <h4 className="font-bold uppercase text-lg">{submission.file_name}</h4>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <div className="flex items-center gap-1 opacity-60">
                          <Calendar size={14} strokeWidth={3} />
                          <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                        </div>
                        {getStatusBadge(submission)}
                      </div>

                      {/* Grade Display */}
                      {submission.grade && (() => {
                        const maxScore = submission.assignments?.max_score || 100;
                        const percentage = Math.round((submission.grade.score / maxScore) * 100);
                        const scale = submission.assignments?.classroom_id
                          ? classroomGradingScales[submission.assignments.classroom_id]
                          : null;

                        return (
                          <div className="mt-4 p-4 border-4 border-neo-black bg-neo-yellow group-hover:translate-x-1 transition-transform">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-sm font-bold uppercase opacity-60 mb-1">YOUR SCORE</p>
                                <div className="flex items-center gap-3">
                                  <div className={`text-4xl font-bold ${
                                    percentage >= 90 ? 'text-neo-green' :
                                    percentage >= 80 ? 'text-neo-cyan' :
                                    percentage >= 70 ? 'text-neo-black' :
                                    'text-neo-pink'
                                  }`}>
                                    {submission.grade.score}/{maxScore}
                                  </div>
                                  <div className="text-2xl font-bold opacity-60">({percentage}%)</div>
                                  {scale && (
                                    <div className={`px-3 py-1 border-4 border-neo-black text-2xl font-bold ${
                                      getGradeColor(getLetterGrade(percentage, scale))
                                    }`}>
                                      {getLetterGrade(percentage, scale)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Score Bar */}
                              <div className="flex-1 max-w-xs">
                                <div className="h-8 border-4 border-neo-black bg-neo-white overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-1000 ${
                                      percentage >= 90 ? 'bg-neo-green' :
                                      percentage >= 80 ? 'bg-neo-cyan' :
                                      percentage >= 70 ? 'bg-neo-yellow' :
                                      'bg-neo-pink'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Feedback Preview */}
                            <div>
                              <p className="text-sm font-bold uppercase opacity-60 mb-2">TEACHER FEEDBACK</p>
                              <p className="text-sm line-clamp-2">
                                {submission.grade.feedback}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Failed Submission Warning */}
                      {submission.status === 'failed' && (
                        <div className="mt-4 p-4 border-4 border-neo-black bg-neo-pink text-neo-white group-hover:translate-x-1 transition-transform">
                          <div className="flex items-start gap-3">
                            <AlertCircle size={24} strokeWidth={3} className="flex-shrink-0" />
                            <div>
                              <p className="font-bold uppercase mb-2">EXTRACTION FAILED</p>
                              <p className="text-sm mb-3">
                                We couldn't process this file. Please try uploading again with a different format (PDF, DOCX, or TXT recommended).
                              </p>
                              {submission.extracted_text && (
                                <p className="text-xs opacity-80 font-mono">
                                  {submission.extracted_text.substring(0, 200)}...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleViewDetails(submission)}
                        className="btn-brutal-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 group/btn flex-1 sm:flex-initial justify-center"
                      >
                        <Eye size={14} strokeWidth={3} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                        VIEW
                      </button>

                      {submission.grade && (
                        <button
                          onClick={() => {
                            setSelectedInsightSubmission(submission);
                            setShowInsightsModal(true);
                          }}
                          className="btn-brutal bg-neo-cyan text-neo-white text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 group/btn flex-1 sm:flex-initial justify-center"
                        >
                          <Sparkles size={14} strokeWidth={3} className="sm:w-4 sm:h-4 group-hover/btn:rotate-12 transition-transform" />
                          INSIGHTS
                        </button>
                      )}

                      {submission.status === 'failed' ? (
                        <button
                          onClick={() => setReuploadModal({ isOpen: true, submissionId: submission.id })}
                          className="btn-brutal bg-neo-pink text-neo-white text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 group/btn animate-pulse flex-1 sm:flex-initial justify-center"
                        >
                          <RefreshCw size={14} strokeWidth={3} className="sm:w-4 sm:h-4 group-hover/btn:rotate-180 transition-transform" />
                          <span className="hidden sm:inline">RETRY UPLOAD</span>
                          <span className="sm:hidden">RETRY</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setReuploadModal({ isOpen: true, submissionId: submission.id })}
                          className="btn-brutal bg-neo-yellow text-neo-black text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 group/btn flex-1 sm:flex-initial justify-center"
                        >
                          <RefreshCw size={14} strokeWidth={3} className="sm:w-4 sm:h-4 group-hover/btn:rotate-180 transition-transform" />
                          <span className="hidden sm:inline">RE-UPLOAD</span>
                          <span className="sm:hidden">RETRY</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Chart with Animation */}
        {stats.gradedSubmissions > 0 && (
          <div className="mt-12 animate-fadeInUp">
            <h3 className="text-3xl font-bold uppercase mb-6 flex items-center gap-3">
              <BarChart3 size={32} strokeWidth={3} className="text-neo-pink" />
              PERFORMANCE OVERVIEW
            </h3>
            <div className="card-brutal p-8 bg-neo-white group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all">
              <div className="flex items-center justify-center gap-4 mb-6">
                <TrendingUp size={32} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                <p className="text-xl font-bold uppercase">YOUR GRADE DISTRIBUTION</p>
              </div>
              
              <div className="space-y-4">
                {submissions
                  .filter(s => s.grade)
                  .slice(0, 5)
                  .map((submission, idx) => {
                    const maxScore = submission.assignments?.max_score || 100;
                    const percentage = Math.round((submission.grade!.score / maxScore) * 100);

                    return (
                      <div key={idx} className="flex items-center gap-4 group/bar animate-slideInLeft" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div className="w-48 font-bold text-sm truncate">
                          {submission.file_name}
                        </div>
                        <div className="flex-1">
                          <div className="h-8 border-4 border-neo-black bg-neo-white overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 group-hover/bar:opacity-80 ${getScoreColor(percentage)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right font-bold text-xl group-hover/bar:scale-110 transition-transform">
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button with Pulse */}
      <button
        onClick={() => navigate('/upload')}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 border-4 border-neo-black bg-neo-pink text-neo-white shadow-brutal hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all group z-50 animate-bounce-slow"
        title="Quick Upload"
      >
        <Upload size={24} strokeWidth={3} className="sm:w-8 sm:h-8 mx-auto group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-neo-yellow border-2 border-neo-black rounded-full animate-pulse"></div>
      </button>

      {/* Detail Modal */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50 animate-fadeInUp">
          <div className="card-brutal bg-neo-white max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideInUp">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-cyan">
              <div className="flex items-center gap-3">
                <FileText size={32} strokeWidth={3} />
                <div>
                  <h2 className="text-2xl font-bold uppercase">SUBMISSION DETAILS</h2>
                  <p className="text-sm font-bold">{selectedSubmission.file_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="btn-brutal bg-neo-white text-neo-black p-2 group"
              >
                <span className="text-2xl group-hover:rotate-90 transition-transform inline-block">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Metadata */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">SUBMITTED ON</p>
                  <p className="font-bold">{new Date(selectedSubmission.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">STATUS</p>
                  <div className="mt-1">{getStatusBadge(selectedSubmission)}</div>
                </div>
              </div>

              {/* Grade Section */}
              {selectedSubmission.grade && (() => {
                const maxScore = selectedSubmission.assignments?.max_score || 100;
                const percentage = Math.round((selectedSubmission.grade.score / maxScore) * 100);
                const scale = selectedSubmission.assignments?.classroom_id
                  ? classroomGradingScales[selectedSubmission.assignments.classroom_id]
                  : null;

                return (
                  <div className="card-brutal p-6 bg-neo-yellow mb-6">
                    <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                      <Award size={24} strokeWidth={3} />
                      YOUR GRADE
                    </h3>

                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-6xl font-bold">{selectedSubmission.grade.score}/{maxScore}</div>
                        <div className="text-3xl font-bold opacity-60">({percentage}%)</div>
                        {scale && (
                          <div className={`px-4 py-2 border-4 border-neo-black text-4xl font-bold ${
                            getGradeColor(getLetterGrade(percentage, scale))
                          }`}>
                            {getLetterGrade(percentage, scale)}
                          </div>
                        )}
                      </div>
                      <div className="h-12 border-4 border-neo-black bg-neo-white overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${getScoreColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-bold uppercase opacity-60 mb-2">TEACHER FEEDBACK</p>
                      <div className="p-4 border-4 border-neo-black bg-neo-white">
                        <p className="whitespace-pre-wrap">{selectedSubmission.grade.feedback}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold uppercase opacity-60 mb-2">GRADING RUBRIC</p>
                      <div className="p-4 border-4 border-neo-black bg-neo-white">
                        <p className="whitespace-pre-wrap text-sm">{selectedSubmission.grade.rubric}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Extracted Text */}
              {selectedSubmission.extracted_text && (
                <div className="card-brutal p-6 bg-neo-white">
                  <h3 className="text-xl font-bold uppercase mb-4">EXTRACTED TEXT</h3>
                  <div className="p-4 border-4 border-neo-black bg-neo-white max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {selectedSubmission.extracted_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t-4 border-neo-black bg-neo-white">
              <button 
                onClick={() => setShowDetailModal(false)}
                className="btn-brutal-primary w-full"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-upload Modal */}
      {reuploadModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50 animate-fadeInUp">
          <div className="card-brutal bg-neo-white max-w-md w-full p-8 animate-slideInUp">
            <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
              <RefreshCw size={24} strokeWidth={3} />
              RE-UPLOAD SUBMISSION
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold uppercase mb-4">SELECT NEW FILE</label>
              <div className="relative">
                <input
                  id="reupload-file-input"
                  type="file"
                  onChange={(e) => setReuploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={reuploading}
                />
                <label
                  htmlFor="reupload-file-input"
                  className="btn-brutal bg-neo-cyan cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={20} strokeWidth={3} />
                  CHOOSE FILE
                </label>
                {reuploadFile && (
                  <span className="ml-4 font-bold">{reuploadFile.name}</span>
                )}
              </div>
              <p className="text-sm mt-2 opacity-60">
                SUPPORTED: PDF, DOC, DOCX, TXT, JPG, PNG (MAX 10MB)
              </p>
            </div>

            <div className="card-brutal p-4 bg-neo-yellow mb-6">
              <p className="text-sm font-bold">
                ⚠️ RE-UPLOADING WILL DELETE YOUR CURRENT GRADE AND TRIGGER NEW GRADING
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReupload}
                disabled={!reuploadFile || reuploading}
                className="btn-brutal-primary flex-1 flex items-center justify-center gap-2"
              >
                {reuploading ? (
                  <>
                    <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                    UPLOADING...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} strokeWidth={3} />
                    RE-UPLOAD
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setReuploadModal({ isOpen: false, submissionId: null });
                  setReuploadFile(null);
                }}
                disabled={reuploading}
                className="btn-brutal-secondary flex-1"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50 animate-fadeInUp">
          <div className="card-brutal bg-neo-white max-w-md w-full animate-slideInUp">
            <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-cyan">
              <h2 className="text-2xl font-bold uppercase">JOIN CLASSROOM</h2>
              <button 
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                  setError('');
                }}
                className="btn-brutal bg-neo-white text-neo-black p-2 group"
              >
                <span className="text-2xl group-hover:rotate-90 transition-transform inline-block">×</span>
              </button>
            </div>

            <div className="p-6">
              <p className="mb-6 font-bold">
                Enter the invite code provided by your teacher to join their classroom.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle size={20} strokeWidth={3} />
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-bold uppercase mb-2">INVITE CODE</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="input-brutal w-full text-2xl text-center tracking-wider uppercase"
                  disabled={joiningClassroom}
                />
                <p className="text-xs mt-2 opacity-60">6-character code from your teacher</p>
              </div>

              <button
                onClick={handleJoinClassroom}
                disabled={!inviteCode.trim() || joiningClassroom}
                className="btn-brutal-primary w-full flex items-center justify-center gap-2"
              >
                {joiningClassroom ? (
                  <>
                    <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                    JOINING...
                  </>
                ) : (
                  <>
                    <Users size={20} strokeWidth={3} />
                    JOIN CLASSROOM
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Details Modal */}
      {showClassroomModal && selectedClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50 animate-fadeInUp">
          <div className="card-brutal bg-neo-white max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideInUp">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-cyan">
              <div className="flex items-center gap-3">
                <BookOpen size={32} strokeWidth={3} />
                <div>
                  <h2 className="text-2xl font-bold uppercase">{selectedClassroom.name}</h2>
                  {selectedClassroom.description && (
                    <p className="text-sm">{selectedClassroom.description}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowClassroomModal(false);
                  setSelectedClassroom(null);
                  setClassroomDetails(null);
                }}
                className="btn-brutal bg-neo-white text-neo-black p-2 group"
              >
                <span className="text-2xl group-hover:rotate-90 transition-transform inline-block">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingClassroom ? (
                <div className="text-center py-12">
                  <Loader2 size={48} strokeWidth={3} className="animate-spin mx-auto mb-4" />
                  <p className="font-bold uppercase">LOADING DETAILS...</p>
                </div>
              ) : classroomDetails ? (
                <>
                  {/* Teacher Info */}
                  <div className="card-brutal p-6 bg-neo-yellow mb-6">
                    <h3 className="text-lg font-bold uppercase mb-3 flex items-center gap-2">
                      <Users size={20} strokeWidth={3} />
                      TEACHER
                    </h3>
                    <p className="font-bold text-xl">{classroomDetails.teacher?.full_name || 'Unknown'}</p>
                    <p className="text-sm opacity-80">{classroomDetails.teacher?.email}</p>
                  </div>

                  {/* Assignments */}
                  <div>
                    <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                      <FileText size={24} strokeWidth={3} />
                      ASSIGNMENTS ({classroomDetails.assignments.length})
                    </h3>

                    {classroomDetails.assignments.length === 0 ? (
                      <div className="card-brutal p-12 bg-neo-white text-center border-dashed">
                        <FileText size={64} strokeWidth={3} className="mx-auto mb-4 opacity-30" />
                        <p className="font-bold uppercase opacity-60">NO ASSIGNMENTS YET</p>
                        <p className="text-sm mt-2">Your teacher hasn't created any assignments</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {classroomDetails.assignments.map((assignment: any, idx: number) => (
                          <div key={assignment.id} className="card-brutal p-6 bg-neo-white group hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all animate-fadeInUp" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-lg font-bold uppercase">{assignment.title}</h4>
                                {assignment.description && (
                                  <p className="text-sm mt-2 opacity-80">{assignment.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold opacity-60">MAX SCORE</p>
                                <p className="text-2xl font-bold">{assignment.max_score}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm">
                              {assignment.due_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar size={16} strokeWidth={3} />
                                  <span className="font-bold">
                                    DUE: {new Date(assignment.due_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Clock size={16} strokeWidth={3} />
                                <span>Created {new Date(assignment.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setShowClassroomModal(false);
                                navigate('/upload');
                              }}
                              className="btn-brutal-primary w-full mt-4 group/btn"
                            >
                              <span className="flex items-center justify-center gap-2">
                                SUBMIT WORK
                                <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-neo-white group-hover/btn:translate-x-1 transition-transform"></div>
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Insights Modal */}
      {selectedInsightSubmission && selectedInsightSubmission.grade && (
        <InsightsModal
          isOpen={showInsightsModal}
          onClose={() => {
            setShowInsightsModal(false);
            setSelectedInsightSubmission(null);
          }}
          submission={selectedInsightSubmission}
          grade={selectedInsightSubmission.grade}
          gradingScale={
            selectedInsightSubmission.assignments?.classroom_id
              ? classroomGradingScales[selectedInsightSubmission.assignments.classroom_id]
              : null
          }
        />
      )}

      {/* AI Tutor Chat Button - Floating */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-4 left-4 sm:bottom-8 sm:left-8 bg-neo-purple text-white px-3 py-3 sm:px-6 sm:py-4 border-4 border-black font-display font-bold text-sm sm:text-base md:text-lg shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-brutalHover transition-all duration-200 flex items-center gap-2 sm:gap-3 z-40 group animate-bounce"
        style={{ animationDuration: '2s' }}
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline">AI TUTOR</span>
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-neo-yellow animate-pulse" />
      </button>

      {/* Chat Interface Modal */}
      {showChat && (
        <ChatInterface
          onClose={() => setShowChat(false)}
          studentId={user?.id || ''}
          studentName={profile?.full_name || 'Student'}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
