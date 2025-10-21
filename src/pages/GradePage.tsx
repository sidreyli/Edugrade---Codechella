import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, ArrowLeft, Loader2, CheckCircle, AlertCircle, FileText, Upload, X, Sparkles, Award, Target, Zap, BookOpen, Edit2 } from 'lucide-react';
import GradingAnimation from '../components/GradingAnimation';

interface Submission {
  id: string;
  student_id: string;
  file_name: string;
  extracted_text: string;
  created_at: string;
  student_name?: string;
  assignment_id?: string;
  grade?: {
    id: string;
    score: number;
    feedback: string;
    created_at: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  max_score: number;
  rubric: string | null;
  classroom_id: string;
  description?: string;
}

interface GradeResult {
  feedback: string;
  score: number;
  gradeId: string;
  maxScore?: number;
  percentage?: number;
  letterGrade?: string;
}

const GradePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'marked'>('pending');
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Assignment rubric management
  const [rubricEditModal, setRubricEditModal] = useState<{ isOpen: boolean; assignmentId: string; currentRubric: string }>({
    isOpen: false,
    assignmentId: '',
    currentRubric: ''
  });
  const [savingRubric, setSavingRubric] = useState(false);

  const [viewTextModal, setViewTextModal] = useState<{ isOpen: boolean; text: string; title: string }>({
    isOpen: false,
    text: '',
    title: ''
  });

  const [gradingStates, setGradingStates] = useState<Record<string, {
    grading: boolean;
    stage: 'analyzing' | 'thinking' | 'generating' | 'complete' | null;
    progress: number;
    result: GradeResult | null;
    error: string | null;
  }>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'teacher') {
      navigate('/student-dashboard');
      return;
    }

    fetchData();

    // Scroll listener for parallax effects
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    // Mouse move listener for interactive elements
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [user, userRole, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teacher's classrooms first
      const { data: classroomsData, error: classroomsError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('teacher_id', user?.id);

      if (classroomsError) throw classroomsError;

      const classroomIds = classroomsData?.map(c => c.id) || [];

      if (classroomIds.length === 0) {
        setSubmissions([]);
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Fetch assignments from these classrooms
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      setAssignments(assignmentsData || []);

      // Fetch submissions with extracted text and their grades
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          grades (
            id,
            score,
            feedback,
            created_at
          )
        `)
        .not('extracted_text', 'is', null)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch student profiles
      const studentIds = [...new Set(submissionsData?.map(s => s.student_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      // Filter submissions that belong to teacher's assignments
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      const filteredSubmissions = submissionsData?.filter(s =>
        !s.assignment_id || assignmentIds.includes(s.assignment_id)
      );

      // Merge student names with submissions and handle grades
      const submissionsWithNames = filteredSubmissions?.map(submission => {
        const grades = (submission as any).grades || [];
        const latestGrade = grades.length > 0 ? grades[0] : null;

        return {
          ...submission,
          student_name: profilesData?.find(p => p.id === submission.student_id)?.full_name || 'Unknown Student',
          grade: latestGrade
        };
      }) || [];

      setSubmissions(submissionsWithNames);

      // Initialize grading states
      const initialStates: Record<string, any> = {};
      submissionsWithNames.forEach(sub => {
        initialStates[sub.id] = {
          grading: false,
          stage: null,
          progress: 0,
          result: null,
          error: null
        };
      });
      setGradingStates(initialStates);

    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRubric = async () => {
    if (!rubricEditModal.assignmentId || !rubricEditModal.currentRubric.trim()) {
      alert('Please enter a rubric');
      return;
    }

    setSavingRubric(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ rubric: rubricEditModal.currentRubric.trim() })
        .eq('id', rubricEditModal.assignmentId);

      if (error) throw error;

      // Update local state
      setAssignments(prev => prev.map(a =>
        a.id === rubricEditModal.assignmentId
          ? { ...a, rubric: rubricEditModal.currentRubric.trim() }
          : a
      ));

      setRubricEditModal({ isOpen: false, assignmentId: '', currentRubric: '' });
      alert('Rubric saved successfully!');
    } catch (error: any) {
      console.error('Error saving rubric:', error);
      alert(`Failed to save rubric: ${error.message}`);
    } finally {
      setSavingRubric(false);
    }
  };

  const handleRubricUpload = async (assignmentId: string, file: File) => {
    if (!user) return;

    try {
      // Show loading in modal
      setRubricEditModal(prev => ({
        ...prev,
        currentRubric: 'Uploading and extracting text from rubric...'
      }));

      // Upload rubric file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rubrics')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('rubrics')
        .getPublicUrl(fileName);

      // Create rubric record
      const { data: rubricData, error: rubricError } = await supabase
        .from('rubrics')
        .insert({
          teacher_id: user.id,
          title: file.name,
          file_url: publicUrl,
          file_name: file.name,
          status: 'processing'
        })
        .select()
        .single();

      if (rubricError) throw rubricError;

      // Call edge function to extract text
      const { data: extractData, error: extractError } = await supabase.functions.invoke('extract_rubric_text', {
        body: {
          fileUrl: publicUrl,
          rubricId: rubricData.id
        }
      });

      if (extractError) throw extractError;

      if (!extractData || !extractData.success) {
        throw new Error(extractData?.error || 'Failed to extract text from rubric');
      }

      // Update modal with extracted text
      setRubricEditModal(prev => ({
        ...prev,
        currentRubric: extractData.extractedText
      }));

      console.log('Rubric uploaded and text extracted successfully');
    } catch (err: any) {
      console.error('Rubric upload error:', err);
      alert(`Failed to upload rubric: ${err.message}`);
      setRubricEditModal(prev => ({
        ...prev,
        currentRubric: ''
      }));
    }
  };

  const handleGenerateGrade = async (submission: Submission, retryCount = 0) => {
    // Find the assignment
    const assignment = assignments.find(a => a.id === submission.assignment_id);

    // Check if rubric exists
    if (!assignment || !assignment.rubric || !assignment.rubric.trim()) {
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: {
          ...prev[submission.id],
          error: `Please add a rubric for the assignment "${assignment?.title || 'Unknown'}" before grading. Click the "ADD/EDIT RUBRIC" button above.`
        }
      }));
      return;
    }

    // Start animation sequence
    setGradingStates(prev => ({
      ...prev,
      [submission.id]: {
        ...prev[submission.id],
        grading: true,
        stage: 'analyzing',
        progress: 0,
        error: null,
        result: null
      }
    }));

    // Simulate progress through stages
    const progressAnimation = async () => {
      // Stage 1: Analyzing (0-33%)
      await new Promise(resolve => setTimeout(resolve, 500));
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: { ...prev[submission.id], progress: 15 }
      }));

      await new Promise(resolve => setTimeout(resolve, 500));
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: { ...prev[submission.id], progress: 33, stage: 'thinking' }
      }));

      // Stage 2: Thinking (34-66%)
      await new Promise(resolve => setTimeout(resolve, 800));
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: { ...prev[submission.id], progress: 50 }
      }));

      await new Promise(resolve => setTimeout(resolve, 800));
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: { ...prev[submission.id], progress: 66, stage: 'generating' }
      }));

      // Stage 3: Generating (67-90%)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: { ...prev[submission.id], progress: 80 }
      }));
    };

    // Start progress animation
    progressAnimation();

    try {
      const { data, error } = await supabase.functions.invoke('grade_submission', {
        body: {
          submissionText: submission.extracted_text,
          rubric: assignment.rubric,
          submissionId: submission.id,
          teacherId: user?.id,
          studentId: submission.student_id,
          assignmentId: submission.assignment_id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate grade');
      }

      // Complete animation
      setGradingStates(prev => ({
        ...prev,
        [submission.id]: {
          ...prev[submission.id],
          progress: 100,
          stage: 'complete'
        }
      }));

      // Wait for completion animation
      await new Promise(resolve => setTimeout(resolve, 800));

      setGradingStates(prev => ({
        ...prev,
        [submission.id]: {
          ...prev[submission.id],
          grading: false,
          stage: null,
          progress: 0,
          result: {
            feedback: data.feedback,
            score: data.score,
            gradeId: data.gradeId,
            maxScore: data.maxScore,
            percentage: data.percentage,
            letterGrade: data.letterGrade
          }
        }
      }));

      // Refresh submissions to show updated grade status
      fetchData();

    } catch (error: any) {
      console.error('Grading error:', error);

      // Retry logic with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/2)`);

        setGradingStates(prev => ({
          ...prev,
          [submission.id]: {
            ...prev[submission.id],
            stage: 'analyzing',
            progress: 0
          }
        }));

        await new Promise(resolve => setTimeout(resolve, delay));
        return handleGenerateGrade(submission, retryCount + 1);
      }

      // Extract detailed error message if available
      let errorMessage = 'Failed to generate grade after multiple attempts. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }

      setGradingStates(prev => ({
        ...prev,
        [submission.id]: {
          ...prev[submission.id],
          grading: false,
          stage: null,
          progress: 0,
          error: errorMessage
        }
      }));
    }
  };

  // Group submissions by assignment
  const groupedSubmissions: Record<string, { assignment: Assignment | null; submissions: Submission[] }> = {};

  submissions.forEach(sub => {
    const key = sub.assignment_id || 'no-assignment';
    if (!groupedSubmissions[key]) {
      groupedSubmissions[key] = {
        assignment: sub.assignment_id ? assignments.find(a => a.id === sub.assignment_id) || null : null,
        submissions: []
      };
    }
    groupedSubmissions[key].submissions.push(sub);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          <div className="absolute top-20 left-10 w-32 h-32 border-4 border-neo-pink bg-neo-pink opacity-20 rotate-12 animate-float"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-neo-cyan bg-neo-cyan opacity-20 -rotate-12 animate-float-delayed"></div>
          <div className="absolute top-1/2 right-1/4 w-20 h-20 border-4 border-neo-yellow bg-neo-yellow opacity-20 rotate-45 animate-bounce-slow"></div>
        </div>
        <div className="text-center relative z-10 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-6 sm:border-8 border-neo-black border-t-neo-cyan rounded-full animate-spin mx-auto mb-4 sm:mb-6"></div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase animate-pulse">LOADING SUBMISSIONS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-white relative overflow-hidden">
      {/* Background - Hidden on mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div
          className="absolute top-10 right-20 w-48 h-48 border-4 border-neo-cyan bg-neo-cyan opacity-5 rotate-12"
          style={{
            transform: `translateY(${scrollY * 0.15}px) rotate(${12 + scrollY * 0.05}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        ></div>
        <div
          className="absolute bottom-20 left-10 w-40 h-40 border-4 border-neo-pink bg-neo-pink opacity-5 -rotate-12"
          style={{
            transform: `translateY(${scrollY * 0.12}px) rotate(${-12 - scrollY * 0.04}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        ></div>
        <div
          className="absolute w-96 h-96 rounded-full opacity-5 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: 'left 0.3s ease-out, top 0.3s ease-out'
          }}
        ></div>
      </div>

      {/* Header */}
      <header
        className="border-b-4 border-neo-black bg-neo-pink text-neo-white sticky top-0 z-50 transition-all duration-300"
        style={{
          boxShadow: scrollY > 50 ? '8px 8px 0 rgba(0,0,0,1)' : '4px 4px 0 rgba(0,0,0,1)'
        }}
      >
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative">
              <GraduationCap size={32} strokeWidth={3} className="sm:w-10 sm:h-10 transition-transform group-hover:rotate-12 group-hover:scale-110" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-neo-cyan border-2 border-neo-black rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase group-hover:translate-x-1 transition-transform">AI GRADING SYSTEM</h1>
              <p className="text-xs sm:text-sm uppercase flex items-center gap-1 sm:gap-2">
                <Sparkles size={10} strokeWidth={3} className="sm:w-3 sm:h-3 animate-pulse" />
                <span className="hidden sm:inline">ASSIGNMENT-BASED</span> RUBRICS
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/teacher-dashboard')}
            className="btn-brutal bg-neo-white text-neo-black group hover:bg-neo-cyan text-sm sm:text-base px-3 sm:px-4 py-2"
          >
            <ArrowLeft size={16} strokeWidth={3} className="sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="ml-1 sm:ml-2">BACK</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12 max-w-7xl relative z-10">
        {/* Info Banner */}
        <div
          className="card-brutal p-4 sm:p-6 md:p-8 bg-gradient-to-br from-neo-cyan to-neo-green mb-8 sm:mb-12 relative overflow-hidden group"
          style={{
            transform: `translateY(${Math.max(0, 50 - scrollY * 0.5)}px)`,
            opacity: Math.min(1, 0.5 + scrollY * 0.01)
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 border-4 border-neo-black bg-neo-white group-hover:rotate-12 transition-transform">
                <Zap size={24} strokeWidth={3} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-neo-pink" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase">AI-POWERED GRADING</h2>
            </div>
            <p className="font-bold text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
              Submissions are grouped by assignment. Add rubrics to assignments once, then grade all submissions with a single click.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                <span>ONE RUBRIC PER ASSIGNMENT</span>
              </div>
              <div className="flex items-center gap-2">
                <Target size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                <span>CONSISTENT GRADING</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                <span>DETAILED FEEDBACK</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 w-4 h-4 bg-neo-yellow border-2 border-neo-black animate-bounce-slow hidden sm:block"></div>
        </div>

        {/* Tabs */}
        <div className="card-brutal p-1 sm:p-2 bg-neo-white mb-6 sm:mb-8 flex gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 border-4 border-neo-black font-bold text-sm sm:text-base md:text-lg uppercase transition-all ${
              activeTab === 'pending'
                ? 'bg-neo-cyan translate-y-0 shadow-brutal'
                : 'bg-neo-white hover:translate-y-[-2px]'
            }`}
          >
            <span className="hidden sm:inline">⏳ PENDING </span>
            <span className="sm:hidden">⏳ </span>
            ({submissions.filter(s => !s.grade).length})
          </button>
          <button
            onClick={() => setActiveTab('marked')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 border-4 border-neo-black font-bold text-sm sm:text-base md:text-lg uppercase transition-all ${
              activeTab === 'marked'
                ? 'bg-neo-green translate-y-0 shadow-brutal'
                : 'bg-neo-white hover:translate-y-[-2px]'
            }`}
          >
            <span className="hidden sm:inline">✓ MARKED </span>
            <span className="sm:hidden">✓ </span>
            ({submissions.filter(s => s.grade).length})
          </button>
        </div>

        {/* Grouped Submissions */}
        {Object.entries(groupedSubmissions).length === 0 ? (
          <div className="card-brutal p-12 bg-neo-white text-center">
            <BookOpen size={64} strokeWidth={3} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-3xl font-bold uppercase mb-3">NO SUBMISSIONS YET</h3>
            <p className="font-bold opacity-60 text-lg">
              Students haven't submitted any assignments yet
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedSubmissions).map(([key, { assignment, submissions: groupSubs }]) => {
              const filteredSubs = groupSubs.filter(s => activeTab === 'pending' ? !s.grade : s.grade);
              if (filteredSubs.length === 0) return null;

              return (
                <div key={key} className="card-brutal p-4 sm:p-6 md:p-8 bg-neo-white">
                  {/* Assignment Header */}
                  <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b-4 border-neo-black">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3 sm:gap-0">
                      <div className="flex-1 w-full sm:w-auto">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase mb-2">
                          {assignment ? assignment.title : '📝 GENERAL SUBMISSIONS (NO ASSIGNMENT)'}
                        </h3>
                        {assignment?.description && (
                          <p className="text-xs sm:text-sm opacity-80 mb-3">{assignment.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <span className="px-2 sm:px-3 py-1 bg-neo-yellow border-2 border-neo-black font-bold text-xs sm:text-sm">
                            MAX SCORE: {assignment?.max_score || 100}
                          </span>
                          <span className="px-2 sm:px-3 py-1 bg-neo-cyan border-2 border-neo-black font-bold text-xs sm:text-sm">
                            {filteredSubs.length} SUBMISSION{filteredSubs.length !== 1 ? 'S' : ''}
                          </span>
                        </div>
                      </div>

                      {assignment && (
                        <button
                          onClick={() => setRubricEditModal({
                            isOpen: true,
                            assignmentId: assignment.id,
                            currentRubric: assignment.rubric || ''
                          })}
                          className={`btn-brutal ${assignment.rubric ? 'bg-neo-green' : 'bg-neo-pink text-neo-white'} flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 w-full sm:w-auto justify-center`}
                        >
                          <Edit2 size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                          {assignment.rubric ? 'EDIT RUBRIC' : 'ADD RUBRIC'}
                        </button>
                      )}
                    </div>

                    {/* Rubric Status */}
                    {assignment && (
                      <div className={`p-4 border-4 border-neo-black ${assignment.rubric ? 'bg-neo-green/20' : 'bg-neo-pink/20'}`}>
                        <div className="flex items-center gap-3">
                          {assignment.rubric ? (
                            <>
                              <CheckCircle size={20} strokeWidth={3} className="text-neo-green flex-shrink-0" />
                              <span className="font-bold text-sm">✓ RUBRIC ADDED - Ready to grade all submissions</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={20} strokeWidth={3} className="text-neo-pink flex-shrink-0" />
                              <span className="font-bold text-sm">⚠ NO RUBRIC - Please add a rubric to grade submissions for this assignment</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submissions in this group */}
                  <div className="space-y-4 sm:space-y-6">
                    {filteredSubs.map((submission, idx) => {
                      const state = gradingStates[submission.id] || { grading: false, result: null, error: null };
                      const colors = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-green'];
                      const accentColor = colors[idx % colors.length];

                      return (
                        <div key={submission.id} className="border-4 border-neo-black p-4 sm:p-6 hover:translate-x-1 transition-all">
                          {/* Student Header */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
                            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 border-4 border-neo-black ${accentColor} flex items-center justify-center font-bold text-lg sm:text-xl text-neo-white flex-shrink-0`}>
                                {submission.student_name?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-base sm:text-lg font-bold uppercase truncate">{submission.student_name}</h4>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm">
                                  <span className="font-bold truncate">{submission.file_name}</span>
                                  <span className="opacity-60">{new Date(submission.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => setViewTextModal({
                                isOpen: true,
                                text: submission.extracted_text,
                                title: `${submission.student_name} - ${submission.file_name}`
                              })}
                              className="btn-brutal bg-neo-yellow text-neo-black text-xs sm:text-sm px-3 sm:px-4 py-2 w-full sm:w-auto justify-center"
                            >
                              <FileText size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
                              <span className="ml-2">VIEW TEXT</span>
                            </button>
                          </div>

                          {/* Grade Display or Grading Button */}
                          {submission.grade ? (
                            <div className="p-4 border-4 border-neo-black bg-neo-green/10">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-bold uppercase flex items-center gap-2">
                                  <CheckCircle size={20} strokeWidth={3} className="text-neo-green" />
                                  GRADED
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-3xl font-bold">{submission.grade.score}</span>
                                  <span className="text-lg opacity-60">/ {assignment?.max_score || 100}</span>
                                </div>
                              </div>
                              <div className="p-3 bg-neo-white border-2 border-neo-black text-sm">
                                <div className="whitespace-pre-wrap">{submission.grade.feedback}</div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {state.error && (
                                <div className="mb-4 p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold flex items-center gap-3">
                                  <AlertCircle size={20} strokeWidth={3} />
                                  <span>{state.error}</span>
                                </div>
                              )}

                              {/* Show Animation if Grading */}
                              {state.grading && state.stage && (
                                <div className="mb-6">
                                  <GradingAnimation stage={state.stage} progress={state.progress} />
                                </div>
                              )}

                              <button
                                onClick={() => handleGenerateGrade(submission)}
                                disabled={state.grading || (!assignment?.rubric && assignment !== null)}
                                className={`btn-brutal-primary w-full flex items-center justify-center gap-3 ${state.grading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {state.grading ? (
                                  <>
                                    <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                                    <span>GRADING IN PROGRESS...</span>
                                  </>
                                ) : (
                                  <>
                                    <GraduationCap size={20} strokeWidth={3} />
                                    <span>GENERATE AI GRADE</span>
                                    <Sparkles size={20} strokeWidth={3} />
                                  </>
                                )}
                              </button>

                              {state.result && (
                                <div className="mt-6 card-brutal p-6 bg-neo-green animate-slideInUp">
                                  <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle size={24} strokeWidth={3} />
                                    <h4 className="text-2xl font-bold uppercase">GRADE GENERATED</h4>
                                  </div>

                                  <div className="mb-4 p-4 border-4 border-neo-black bg-neo-white">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-bold uppercase">SCORE</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-4xl font-bold">{state.result.score}</span>
                                        <span className="text-2xl opacity-60">/{state.result.maxScore || 100}</span>
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-xl font-bold text-neo-pink">
                                        {state.result.percentage}% - {state.result.letterGrade}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="p-4 border-4 border-neo-black bg-neo-white">
                                    <div className="font-bold uppercase mb-2">FEEDBACK</div>
                                    <div className="whitespace-pre-wrap text-sm">{state.result.feedback}</div>
                                  </div>

                                  <div className="mt-4 p-3 bg-neo-white border-4 border-neo-black font-bold flex items-center gap-2 text-sm">
                                    <CheckCircle size={16} strokeWidth={3} className="text-neo-green" />
                                    <span>GRADE SAVED TO DATABASE</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rubric Edit Modal */}
      {rubricEditModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card-brutal bg-neo-white max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b-4 border-neo-black bg-neo-cyan">
              <h3 className="text-2xl font-bold uppercase flex items-center gap-2">
                <Target size={24} strokeWidth={3} />
                ASSIGNMENT RUBRIC
              </h3>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block font-bold uppercase mb-2 text-sm">
                  RUBRIC (GRADING CRITERIA)
                </label>
                <div className="mb-3">
                  <input
                    id="rubric-file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleRubricUpload(rubricEditModal.assignmentId, file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label
                    htmlFor="rubric-file-upload"
                    className="btn-brutal bg-neo-green cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload size={16} strokeWidth={3} />
                    UPLOAD RUBRIC FILE
                  </label>
                  <span className="ml-3 text-sm opacity-60 font-bold">OR type below</span>
                </div>
                <textarea
                  value={rubricEditModal.currentRubric}
                  onChange={(e) => setRubricEditModal(prev => ({ ...prev, currentRubric: e.target.value }))}
                  placeholder="Enter grading criteria, expectations, scoring guidelines..."
                  className="w-full h-64 p-4 border-4 border-neo-black bg-neo-white font-mono text-sm resize-none"
                  disabled={savingRubric}
                />
              </div>

              <div className="p-4 bg-neo-yellow border-4 border-neo-black">
                <p className="font-bold text-sm">
                  💡 This rubric will be used to grade ALL submissions for this assignment.
                  All students will be graded consistently using the same criteria.
                </p>
              </div>
            </div>

            <div className="p-6 border-t-4 border-neo-black flex gap-4">
              <button
                onClick={handleSaveRubric}
                disabled={savingRubric || !rubricEditModal.currentRubric.trim()}
                className="btn-brutal-primary flex-1 flex items-center justify-center gap-2"
              >
                {savingRubric ? (
                  <>
                    <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} strokeWidth={3} />
                    SAVE RUBRIC
                  </>
                )}
              </button>
              <button
                onClick={() => setRubricEditModal({ isOpen: false, assignmentId: '', currentRubric: '' })}
                disabled={savingRubric}
                className="btn-brutal-secondary flex-1"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Text Modal */}
      {viewTextModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card-brutal bg-neo-white max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b-4 border-neo-black flex items-center justify-between bg-neo-cyan">
              <h3 className="text-2xl font-bold uppercase flex items-center gap-2">
                <FileText size={24} strokeWidth={3} />
                {viewTextModal.title}
              </h3>
              <button
                onClick={() => setViewTextModal({ isOpen: false, text: '', title: '' })}
                className="btn-brutal bg-neo-pink text-neo-white"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {viewTextModal.text}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col gap-4 z-40">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 sm:w-14 sm:h-14 border-4 border-neo-black bg-neo-cyan shadow-brutal hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
          title="Scroll to Top"
        >
          <div className="w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-6 border-b-neo-black sm:border-l-8 sm:border-r-8 sm:border-b-8 mx-auto"></div>
        </button>
      </div>
    </div>
  );
};

export default GradePage;
