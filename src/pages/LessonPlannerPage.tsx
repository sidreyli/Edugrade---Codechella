import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { 
  GraduationCap, 
  ArrowLeft, 
  Sparkles, 
  Loader2,
  BookOpen,
  Clock,
  Users,
  Brain,
  History,
  Eye,
  Trash2,
  AlertCircle,
  Presentation
} from 'lucide-react';
import LessonPlanModal from '../components/LessonPlanModal';
import SlideGenerator from '../components/SlideGenerator';
import LessonPlanAnimation from '../components/LessonPlanAnimation';

interface LessonPlan {
  id: string;
  subject: string;
  topic: string;
  plan_content: string;
  performance_summary: any;
  created_at: string;
  classroom_id: string | null;
}

interface Classroom {
  id: string;
  name: string;
  student_count?: number;
}

const LessonPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planGenerationStage, setPlanGenerationStage] = useState<'analyzing' | 'researching' | 'structuring' | 'generating' | 'complete' | null>(null);
  const [planGenerationProgress, setPlanGenerationProgress] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    grade: '',
    duration: '45',
    priorKnowledge: '',
    useClassData: false,
    selectedClassroom: ''
  });
  
  // Data state
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [studentPerformance, setStudentPerformance] = useState<any>(null);
  const [showSlideGenerator, setShowSlideGenerator] = useState(false);
  const [selectedLessonForSlides, setSelectedLessonForSlides] = useState<LessonPlan | null>(null);

  const classroomLookup = useMemo(() => {
    return classrooms.reduce((acc, classroom) => {
      acc[classroom.id] = classroom.name;
      return acc;
    }, {} as Record<string, string>);
  }, [classrooms]);

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '—';
    const target = new Date(isoString);
    if (Number.isNaN(target.getTime())) return '—';

    const diffMs = Date.now() - target.getTime();
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return target.toLocaleDateString();
  };

  const totalPlans = lessonPlans.length;
  const latestPlan = lessonPlans[0] || null;
  const plansThisWeek = lessonPlans.filter(plan => {
    const created = new Date(plan.created_at);
    if (Number.isNaN(created.getTime())) return false;
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;
  const linkedClassrooms = new Set(
    lessonPlans
      .map(plan => plan.classroom_id)
      .filter((id): id is string => Boolean(id))
  ).size;
  const subjectCounts = lessonPlans.reduce((acc, plan) => {
    const key = plan.subject?.trim() || 'General';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topSubject = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject)[0] || '—';

  const quickStats = [
    {
      label: 'Total Plans',
      value: totalPlans.toString(),
      meta: plansThisWeek > 0 ? `${plansThisWeek} this week` : 'Start creating',
      icon: <Sparkles size={20} strokeWidth={3} />
    },
    {
      label: 'Linked Classrooms',
      value: linkedClassrooms.toString(),
      meta: linkedClassrooms > 0 ? 'Personalized insights ready' : 'Connect class data',
      icon: <Users size={20} strokeWidth={3} />
    },
    {
      label: 'Top Subject',
      value: topSubject,
      meta: topSubject !== '—' ? 'Most requested focus' : 'Awaiting first plan',
      icon: <BookOpen size={20} strokeWidth={3} />
    },
    {
      label: 'Last Generated',
      value: latestPlan ? formatRelativeTime(latestPlan.created_at) : '—',
      meta: latestPlan ? new Date(latestPlan.created_at).toLocaleDateString() : 'Create a plan to see history',
      icon: <Clock size={20} strokeWidth={3} />
    }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'teacher') {
      navigate('/student-dashboard');
      return;
    }

    fetchClassrooms();
    fetchLessonPlans();
  }, [user, userRole, navigate]);

  const fetchClassrooms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('teacher_id', user.id);

      if (error) throw error;
      setClassrooms(data || []);
    } catch (err: any) {
      console.error('Error fetching classrooms:', err);
    }
  };

  const fetchLessonPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessonPlans(data || []);
    } catch (err: any) {
      console.error('Error fetching lesson plans:', err);
    }
  };

  const fetchClassPerformance = async (classroomId: string) => {
    if (!classroomId) {
      setStudentPerformance(null);
      return;
    }

    try {
      // Get students in classroom
      const { data: classroomStudents, error: csError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId);

      if (csError) throw csError;

      const studentIds = classroomStudents?.map(cs => cs.student_id) || [];

      if (studentIds.length === 0) {
        setStudentPerformance({ message: 'No students enrolled in this classroom' });
        return;
      }

      // Fetch student profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      if (profileError) throw profileError;

      // Fetch grades
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('student_id, score, created_at')
        .in('student_id', studentIds);

      if (gradesError) throw gradesError;

      // Calculate performance metrics
      const studentStats = profiles?.map(profile => {
        const studentGrades = grades?.filter(g => g.student_id === profile.id) || [];
        const avgScore = studentGrades.length > 0
          ? Math.round(studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
          : 0;
        
        return {
          name: profile.full_name,
          avg_score: avgScore,
          total_submissions: studentGrades.length
        };
      }) || [];

      const classAvg = studentStats.length > 0
        ? Math.round(studentStats.reduce((sum, s) => sum + s.avg_score, 0) / studentStats.length)
        : 0;

      const struggling = studentStats.filter(s => s.avg_score < 70);
      const excelling = studentStats.filter(s => s.avg_score >= 90);

      setStudentPerformance({
        totalStudents: studentStats.length,
        averageScore: classAvg,
        strugglingStudents: struggling.length,
        excellingStudents: excelling.length,
        strugglingNames: struggling.map(s => s.name),
        excellingNames: excelling.map(s => s.name),
        gradeDistribution: {
          A: studentStats.filter(s => s.avg_score >= 90).length,
          B: studentStats.filter(s => s.avg_score >= 80 && s.avg_score < 90).length,
          C: studentStats.filter(s => s.avg_score >= 70 && s.avg_score < 80).length,
          D: studentStats.filter(s => s.avg_score >= 60 && s.avg_score < 70).length,
          F: studentStats.filter(s => s.avg_score < 60).length,
        }
      });
    } catch (err: any) {
      console.error('Error fetching class performance:', err);
      setStudentPerformance(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      
      if (name === 'useClassData' && checked && formData.selectedClassroom) {
        fetchClassPerformance(formData.selectedClassroom);
      } else if (name === 'useClassData' && !checked) {
        setStudentPerformance(null);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      if (name === 'selectedClassroom' && formData.useClassData) {
        fetchClassPerformance(value);
      }
    }
  };

  const handleGeneratePlan = async () => {
    // Validation
    if (!formData.subject.trim() || !formData.topic.trim()) {
      setError('Subject and topic are required');
      return;
    }

    if (formData.useClassData && !formData.selectedClassroom) {
      setError('Please select a classroom to use class performance data');
      return;
    }

    setGeneratingPlan(true);
    setPlanGenerationStage('analyzing');
    setPlanGenerationProgress(0);
    setError('');

    // Progress animation
    const progressAnimation = async () => {
      // Stage 1: Analyzing (0-20%)
      await new Promise(resolve => setTimeout(resolve, 600));
      setPlanGenerationProgress(10);

      await new Promise(resolve => setTimeout(resolve, 600));
      setPlanGenerationProgress(20);
      setPlanGenerationStage('researching');

      // Stage 2: Researching (21-40%)
      await new Promise(resolve => setTimeout(resolve, 800));
      setPlanGenerationProgress(30);

      await new Promise(resolve => setTimeout(resolve, 800));
      setPlanGenerationProgress(40);
      setPlanGenerationStage('structuring');

      // Stage 3: Structuring (41-65%)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPlanGenerationProgress(50);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setPlanGenerationProgress(65);
      setPlanGenerationStage('generating');

      // Stage 4: Generating (66-85%)
      await new Promise(resolve => setTimeout(resolve, 1200));
      setPlanGenerationProgress(75);

      await new Promise(resolve => setTimeout(resolve, 1200));
      setPlanGenerationProgress(85);
    };

    // Start animation
    progressAnimation();

    try {
      const requestBody: any = {
        subject: formData.subject.trim(),
        topic: formData.topic.trim(),
        grade: formData.grade.trim() || null,
        duration: formData.duration.trim() || null,
        priorKnowledge: formData.priorKnowledge.trim() || null,
        useClassData: formData.useClassData,
        teacherId: user?.id,
        classroomId: formData.selectedClassroom || null,
      };

      // Add performance data if using class data
      if (formData.useClassData && studentPerformance) {
        requestBody.performanceSummary = studentPerformance;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('generate_lesson_plan', {
        body: requestBody
      });

      if (invokeError) throw invokeError;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate lesson plan');
      }

      // Complete animation
      setPlanGenerationProgress(100);
      setPlanGenerationStage('complete');

      // Wait for completion animation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success - refresh lesson plans and show the new one
      await fetchLessonPlans();
      
      // Reset form
      setFormData({
        subject: '',
        topic: '',
        grade: '',
        duration: '45',
        priorKnowledge: '',
        useClassData: false,
        selectedClassroom: ''
      });
      setStudentPerformance(null);

      // Show success message
      alert('✨ Lesson plan generated successfully! Check your history below.');
    } catch (err: any) {
      console.error('Error generating lesson plan:', err);
      setError(err.message || 'Failed to generate lesson plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
      setPlanGenerationStage(null);
      setPlanGenerationProgress(0);
    }
  };

  const handleViewPlan = (plan: LessonPlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;

    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      await fetchLessonPlans();
    } catch (err: any) {
      console.error('Error deleting lesson plan:', err);
      setError('Failed to delete lesson plan');
    }
  };

  const handleScrollToForm = () => {
    const formSection = document.getElementById('lesson-plan-form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-neo-white">
      {/* Header */}
      <header className="border-b-4 border-neo-black bg-neo-cyan text-neo-black">
        <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/teacher-dashboard')}
                className="btn-brutal bg-neo-white px-3 py-2 flex items-center gap-2 text-xs sm:text-sm"
              >
                <ArrowLeft size={20} strokeWidth={3} />
                <span className="hidden sm:inline font-bold uppercase">Back</span>
              </button>
              <div className="flex items-center gap-3">
                <Sparkles size={36} strokeWidth={3} className="hidden sm:block" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold uppercase leading-tight">AI LESSON PLANNER</h1>
                  <p className="text-xs sm:text-sm uppercase font-bold opacity-80">Generate comprehensive, personalized lesson plans</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm uppercase font-bold bg-neo-white px-3 py-2 border-4 border-neo-black shadow-brutal">
              <Sparkles size={16} strokeWidth={3} className="text-neo-pink" />
              <span>Powered by AI insights</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="space-y-10">
          <section className="card-brutal relative overflow-hidden border-4 border-neo-black bg-gradient-to-br from-neo-white via-neo-cyan/15 to-neo-yellow/20 p-6 sm:p-8 rounded-3xl">
            <div className="absolute -top-16 -right-12 h-32 w-32 border-4 border-neo-pink bg-neo-pink/20 rotate-12 hidden sm:block"></div>
            <div className="absolute -bottom-16 -left-10 h-28 w-28 border-4 border-neo-green bg-neo-green/20 -rotate-12 hidden sm:block"></div>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-2 border-4 border-neo-black bg-neo-white px-3 py-1 text-xs sm:text-sm font-bold uppercase shadow-brutal-sm">
                  <Sparkles size={16} strokeWidth={3} />
                  AI tuned to your classroom
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold uppercase leading-tight">
                  Craft impactful lessons in minutes
                </h2>
                <p className="text-sm sm:text-base font-bold opacity-70">
                  Blend AI efficiency with your expertise. Personalize each plan using real classroom performance data and keep every session on track.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleScrollToForm}
                    className="btn-brutal bg-neo-black text-neo-white flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Sparkles size={18} strokeWidth={3} />
                    Start a new plan
                  </button>
                  <button
                    onClick={() => navigate('/analytics')}
                    className="btn-brutal bg-neo-white text-neo-black flex items-center gap-2 text-sm sm:text-base"
                  >
                    <History size={18} strokeWidth={3} />
                    View analytics
                  </button>
                </div>
              </div>
              <div className="w-full lg:max-w-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickStats.map(stat => (
                    <div key={stat.label} className="border-4 border-neo-black bg-neo-white/80 p-4 shadow-brutal-sm space-y-2 rounded-2xl">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-70">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className="text-2xl font-bold uppercase break-words">{stat.value}</div>
                      <div className="text-xs font-bold uppercase opacity-60">{stat.meta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold flex items-center gap-2">
              <AlertCircle size={24} strokeWidth={3} />
              {error}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <div id="lesson-plan-form" className="card-brutal p-6 sm:p-8 bg-neo-yellow rounded-3xl mb-8">
                <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
                <BookOpen size={28} strokeWidth={3} />
                CREATE NEW LESSON PLAN
              </h2>

              <div className="space-y-6">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">
                    SUBJECT *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g., Mathematics, Science, English"
                    className="input-brutal w-full"
                    disabled={generatingPlan}
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">
                    TOPIC *
                  </label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleInputChange}
                    placeholder="e.g., Quadratic Equations, Photosynthesis, Persuasive Writing"
                    className="input-brutal w-full"
                    disabled={generatingPlan}
                  />
                </div>

                {/* Grade Level & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2">
                      GRADE LEVEL
                    </label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="input-brutal w-full"
                      disabled={generatingPlan}
                    >
                      <option value="">Select grade level...</option>
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                      <option value="College/University">College/University</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase mb-2">
                      CLASS DURATION (MINUTES)
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="45"
                      min="15"
                      max="180"
                      className="input-brutal w-full"
                      disabled={generatingPlan}
                    />
                  </div>
                </div>

                {/* Prior Knowledge */}
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">
                    PRIOR KNOWLEDGE / PREREQUISITES
                  </label>
                  <textarea
                    name="priorKnowledge"
                    value={formData.priorKnowledge}
                    onChange={handleInputChange}
                    placeholder="What should students already know before this lesson? e.g., 'Students should understand basic algebra and be familiar with solving linear equations.'"
                    rows={3}
                    className="input-brutal w-full resize-none"
                    disabled={generatingPlan}
                  />
                </div>

                {/* Use Class Data Toggle */}
                <div className="border-4 border-neo-black p-6 bg-neo-pink text-neo-white rounded-3xl">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="useClassData"
                      checked={formData.useClassData}
                      onChange={handleInputChange}
                      className="mt-1 w-5 h-5 cursor-pointer"
                      disabled={generatingPlan}
                      id="useClassData"
                    />
                    <div className="flex-1">
                      <label htmlFor="useClassData" className="font-bold uppercase cursor-pointer flex items-center gap-2">
                        <Brain size={20} strokeWidth={3} />
                        PERSONALIZE WITH CLASS PERFORMANCE DATA
                      </label>
                      <p className="text-sm mt-1 opacity-90">
                        AI will analyze your class's strengths and weaknesses to create a tailored lesson plan
                      </p>
                    </div>
                  </div>

                  {/* Classroom Selector (shown when useClassData is checked) */}
                  {formData.useClassData && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold uppercase mb-2">
                        SELECT CLASSROOM
                      </label>
                      <select
                        name="selectedClassroom"
                        value={formData.selectedClassroom}
                        onChange={handleInputChange}
                        className="input-brutal w-full bg-neo-white text-neo-black"
                        disabled={generatingPlan}
                      >
                        <option value="">Choose a classroom...</option>
                        {classrooms.map(classroom => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>

                      {/* Performance Preview */}
                      {studentPerformance && !studentPerformance.message && (
                        <div className="mt-4 p-4 bg-neo-white text-neo-black border-2 border-neo-black">
                          <p className="font-bold text-xs uppercase mb-2">CLASS PERFORMANCE SNAPSHOT:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>📊 Avg Score: <strong>{studentPerformance.averageScore}%</strong></div>
                            <div>👥 Students: <strong>{studentPerformance.totalStudents}</strong></div>
                            <div>🔴 Struggling: <strong>{studentPerformance.strugglingStudents}</strong></div>
                            <div>🟢 Excelling: <strong>{studentPerformance.excellingStudents}</strong></div>
                          </div>
                        </div>
                      )}

                      {studentPerformance?.message && (
                        <div className="mt-4 p-3 bg-neo-yellow text-neo-black border-2 border-neo-black text-sm font-bold">
                          ⚠️ {studentPerformance.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Show Animation if Generating */}
                {generatingPlan && planGenerationStage && (
                  <div className="mb-6">
                    <LessonPlanAnimation stage={planGenerationStage} progress={planGenerationProgress} />
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan || !formData.subject || !formData.topic}
                  className="btn-brutal bg-neo-black text-neo-white w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingPlan ? (
                    <>
                      <Loader2 size={24} strokeWidth={3} className="animate-spin" />
                      GENERATING LESSON PLAN...
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} strokeWidth={3} />
                      GENERATE LESSON PLAN
                    </>
                  )}
                </button>
              </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start lg:max-w-sm">
              <div className="card-brutal p-6 bg-neo-green rounded-3xl">
                <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                  <Brain size={24} strokeWidth={3} />
                  TIPS FOR BEST RESULTS
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-xl">💡</span>
                    <span><strong>Be specific:</strong> "Solving systems of equations using substitution method" is better than just "algebra"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xl">🎯</span>
                    <span><strong>Set accurate duration:</strong> This helps AI pace the activities appropriately</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xl">📚</span>
                    <span><strong>Include prerequisites:</strong> Helps AI build on existing knowledge effectively</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xl">🔍</span>
                    <span><strong>Use class data:</strong> For personalized plans that address your students' specific needs</span>
                  </li>
                </ul>
              </div>

              <div className="card-brutal p-6 bg-neo-white rounded-3xl">
                <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                  <Clock size={24} strokeWidth={3} />
                  WHAT YOU'LL GET
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Lesson overview & objectives
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Materials needed list
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Step-by-step activities with timing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Differentiation strategies
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Assessment methods
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Homework suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Teacher tips & notes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Plan History */}
        <div className="mt-12">
          <div className="card-brutal p-6 sm:p-8 bg-neo-white rounded-3xl">
            <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
              <History size={28} strokeWidth={3} />
              LESSON PLAN HISTORY ({lessonPlans.length})
            </h2>

            {lessonPlans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen size={48} strokeWidth={3} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold uppercase">NO LESSON PLANS YET</p>
                <p className="text-sm mt-2">Generate your first AI-powered lesson plan above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {lessonPlans.map(plan => (
                  <div key={plan.id} className="card-brutal relative overflow-hidden p-5 sm:p-6 bg-neo-white group border-4 border-neo-black hover:-translate-y-1 hover:-translate-x-1 transition-transform rounded-3xl">
                    <div className="absolute inset-0 bg-neo-yellow/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 border-4 border-neo-black bg-neo-yellow text-[11px] font-bold uppercase">
                            {plan.subject || 'General'}
                          </div>
                          <p className="mt-3 text-sm font-bold uppercase leading-snug">{plan.topic}</p>
                        </div>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="btn-brutal bg-neo-pink text-neo-white p-2"
                          title="Delete"
                        >
                          <Trash2 size={16} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase opacity-70">
                        <span>{formatRelativeTime(plan.created_at)}</span>
                        <span>•</span>
                        <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                        {plan.classroom_id && (
                          <span className="flex items-center gap-1">
                            <Users size={12} strokeWidth={3} />
                            {classroomLookup[plan.classroom_id] || 'Classroom'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewPlan(plan)}
                          className="btn-brutal bg-neo-cyan flex-1 text-sm py-2 flex items-center justify-center gap-2"
                        >
                          <Eye size={16} strokeWidth={3} />
                          VIEW
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLessonForSlides(plan);
                            setShowSlideGenerator(true);
                          }}
                          className="btn-brutal bg-neo-purple text-neo-white flex-1 text-sm py-2 flex items-center justify-center gap-2"
                        >
                          <Presentation size={16} strokeWidth={3} />
                          SLIDES
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Plan Modal */}
      {showPlanModal && selectedPlan && (
        <LessonPlanModal
          isOpen={showPlanModal}
          onClose={() => {
            setShowPlanModal(false);
            setSelectedPlan(null);
          }}
          lessonPlan={selectedPlan}
        />
      )}

      {/* Slide Generator Modal */}
      {showSlideGenerator && selectedLessonForSlides && (
        <SlideGenerator
          lessonPlanId={selectedLessonForSlides.id}
          lessonPlanContent={selectedLessonForSlides.plan_content}
          lessonTitle={`${selectedLessonForSlides.subject}: ${selectedLessonForSlides.topic}`}
          onClose={() => {
            setShowSlideGenerator(false);
            setSelectedLessonForSlides(null);
          }}
        />
      )}
    </div>
  );
};

export default LessonPlannerPage;
