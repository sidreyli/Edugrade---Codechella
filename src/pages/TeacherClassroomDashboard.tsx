import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useClassroomStore } from '../store/classroomStore';
import SubmissionModal from '../components/SubmissionModal';
import LessonPlanModal from '../components/LessonPlanModal';
import { 
  GraduationCap, 
  ArrowLeft, 
  Plus, 
  Users, 
  Trash2, 
  Eye,
  Loader2,
  BookOpen,
  TrendingUp,
  FileText,
  Sparkles,
  History
} from 'lucide-react';

const TeacherClassroomDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  const {
    classrooms,
    selectedClassroom,
    studentGrades,
    loading,
    error,
    setClassrooms,
    addClassroom,
    deleteClassroom,
    setSelectedClassroom,
    setStudentGrades,
    setLoading,
    setError
  } = useClassroomStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ 
    name: '', 
    description: '',
    grading_scale: {
      'A': 90,
      'B': 80,
      'C': 70,
      'D': 60,
      'F': 0
    }
  });
  const [submissionModal, setSubmissionModal] = useState<{
    isOpen: boolean;
    submission: any;
    grade: any;
  }>({
    isOpen: false,
    submission: null,
    grade: null
  });

  const [lessonPlanModal, setLessonPlanModal] = useState<{
    isOpen: boolean;
    lessonPlan: any;
  }>({
    isOpen: false,
    lessonPlan: null
  });

  const [showLessonPlanForm, setShowLessonPlanForm] = useState(false);
  const [lessonPlanForm, setLessonPlanForm] = useState({ subject: '', topic: '' });
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: '',
    max_score: 100
  });
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClassrooms = useMemo(() => {
    if (!searchTerm.trim()) return classrooms;
    const query = searchTerm.toLowerCase();
    return classrooms.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query)
    );
  }, [classrooms, searchTerm]);

  const totalStudents = studentGrades.length;
  const totalSubmissions = studentGrades.reduce((sum, s) => sum + s.total_submissions, 0);
  const gradedSubmissions = studentGrades.reduce((sum, s) => sum + s.graded_submissions, 0);
  const averageScore = studentGrades.length > 0
    ? Math.round(studentGrades.reduce((sum, s) => sum + s.average_score, 0) / studentGrades.length)
    : 0;
  const engagementRate = totalSubmissions > 0
    ? Math.round((gradedSubmissions / totalSubmissions) * 100)
    : 0;
  const latestActivity = useMemo(() => {
    const timestamps = [
      ...assignments.map(a => a.created_at),
      ...lessonPlans.map(lp => lp.created_at)
    ].filter(Boolean);
    if (timestamps.length === 0) return null;
    const mostRecent = timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    return mostRecent ? new Date(mostRecent) : null;
  }, [assignments, lessonPlans]);

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
    const cleanup = setupRealtimeSubscriptions();
    
    // Cleanup subscriptions on unmount
    return () => {
      cleanup();
    };
  }, [user, userRole, navigate]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchClassroomStudents();
      fetchLessonPlans();
      fetchAssignments();
    }
  }, [selectedClassroom]);

  const setupRealtimeSubscriptions = () => {
    // Subscribe to classrooms changes
    const classroomsSubscription = supabase
      .channel('classrooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classrooms',
          filter: `teacher_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addClassroom(payload.new as any);
          } else if (payload.eventType === 'DELETE') {
            deleteClassroom(payload.old.id);
          }
        }
      )
      .subscribe();

    // Subscribe to grades changes
    const gradesSubscription = supabase
      .channel('grades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grades',
          filter: `teacher_id=eq.${user?.id}`
        },
        () => {
          if (selectedClassroom) {
            fetchClassroomStudents();
          }
        }
      )
      .subscribe();

    // Subscribe to lesson plans changes
    const lessonPlansSubscription = supabase
      .channel('lesson-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_plans',
          filter: `teacher_id=eq.${user?.id}`
        },
        () => {
          if (selectedClassroom) {
            fetchLessonPlans();
          }
        }
      )
      .subscribe();

    return () => {
      classroomsSubscription.unsubscribe();
      gradesSubscription.unsubscribe();
      lessonPlansSubscription.unsubscribe();
    };
  };

  const fetchClassrooms = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched classrooms for teacher:', user.id, data);
      setClassrooms(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassroomStudents = async () => {
    if (!selectedClassroom) return;

    setLoading(true);
    try {
      // Get students in classroom
      const { data: classroomStudents, error: studentsError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', selectedClassroom.id);

      if (studentsError) throw studentsError;

      const studentIds = classroomStudents?.map(cs => cs.student_id) || [];

      if (studentIds.length === 0) {
        setStudentGrades([]);
        return;
      }

      // Get student profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Get all submissions for these students
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, student_id')
        .in('student_id', studentIds);

      if (submissionsError) throw submissionsError;

      // Get all grades for these students with assignment max_score
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          submissions!inner(assignment_id),
          assignments:submissions(assignments(max_score))
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (gradesError) throw gradesError;

      // Aggregate data per student
      const studentGradesData = profiles?.map(profile => {
        const studentSubmissions = submissions?.filter(s => s.student_id === profile.id) || [];
        const studentGrades = grades?.filter(g => g.student_id === profile.id) || [];
        
        const totalSubmissions = studentSubmissions.length;
        const gradedSubmissions = studentGrades.length;
        
        // Calculate average percentage instead of raw score
        const averageScore = gradedSubmissions > 0
          ? Math.round(
              studentGrades.reduce((sum, g) => {
                // Get max_score from assignment, default to 100 if not found
                const maxScore = (g as any).assignments?.max_score || 100;
                const percentage = (g.score / maxScore) * 100;
                return sum + percentage;
              }, 0) / gradedSubmissions
            )
          : 0;

        return {
          student_id: profile.id,
          student_name: profile.full_name || 'Unknown',
          student_email: profile.email || '',
          average_score: averageScore,
          total_submissions: totalSubmissions,
          graded_submissions: gradedSubmissions,
          latest_grade: studentGrades[0] || undefined
        };
      }) || [];

      setStudentGrades(studentGradesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonPlans = async () => {
    if (!selectedClassroom) return;

    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('classroom_id', selectedClassroom.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessonPlans(data || []);
    } catch (err: any) {
      console.error('Error fetching lesson plans:', err);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedClassroom) return;

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroom_id', selectedClassroom.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim() || !selectedClassroom) {
      setError('Assignment title is required');
      return;
    }

    setCreatingAssignment(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          classroom_id: selectedClassroom.id,
          teacher_id: user?.id,
          title: newAssignment.title,
          description: newAssignment.description,
          due_date: newAssignment.due_date || null,
          max_score: newAssignment.max_score
        });

      if (error) throw error;

      setShowAssignmentModal(false);
      setNewAssignment({ title: '', description: '', due_date: '', max_score: 100 });
      await fetchAssignments();
      alert('Assignment created successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchAssignments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateClassroom = async () => {
    if (!newClassroom.name.trim()) {
      setError('Classroom name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: user?.id,
          name: newClassroom.name,
          description: newClassroom.description,
          grading_scale: newClassroom.grading_scale
        })
        .select()
        .single();

      if (error) throw error;

      setShowCreateModal(false);
      setNewClassroom({ 
        name: '', 
        description: '',
        grading_scale: {
          'A': 90,
          'B': 80,
          'C': 70,
          'D': 60,
          'F': 0
        }
      });
      
      // Refresh classrooms list
      fetchClassrooms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;

    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId);

      if (error) throw error;

      if (selectedClassroom?.id === classroomId) {
        setSelectedClassroom(null);
      }
      
      // Refresh classrooms list
      fetchClassrooms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewSubmission = async (studentId: string) => {
    try {
      // Get latest submission for student
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .select('*, profiles!inner(full_name)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (submissionError) throw submissionError;

      // Get latest grade for this submission
      const { data: grade } = await supabase
        .from('grades')
        .select('*')
        .eq('submission_id', submission.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setSubmissionModal({
        isOpen: true,
        submission: {
          ...submission,
          student_name: submission.profiles.full_name
        },
        grade: grade || null
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateLessonPlan = async () => {
    if (!lessonPlanForm.subject.trim() || !lessonPlanForm.topic.trim()) {
      setError('Subject and topic are required');
      return;
    }

    if (!selectedClassroom) {
      setError('No classroom selected');
      return;
    }

    setGeneratingPlan(true);
    setError(null);

    try {
      // Compile performance summary
      const performanceSummary = {
        totalStudents: studentGrades.length,
        averageScore: studentGrades.length > 0
          ? Math.round(
              studentGrades.reduce((sum, s) => sum + s.average_score, 0) / studentGrades.length
            )
          : 0,
        gradedSubmissions: studentGrades.reduce((sum, s) => sum + s.graded_submissions, 0),
        totalSubmissions: studentGrades.reduce((sum, s) => sum + s.total_submissions, 0),
        weakAreas: studentGrades
          .filter(s => s.average_score < 70)
          .map(s => s.student_name)
      };

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('generate_lesson_plan', {
        body: {
          subject: lessonPlanForm.subject,
          topic: lessonPlanForm.topic,
          performanceSummary,
          teacherId: user?.id,
          classroomId: selectedClassroom.id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate lesson plan');
      }

      // Show success message
      setShowLessonPlanForm(false);
      setLessonPlanForm({ subject: '', topic: '' });
      
      // Fetch updated lesson plans
      await fetchLessonPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading && classrooms.length === 0) {
    return (
      <div className="min-h-screen bg-neo-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} strokeWidth={3} className="animate-spin mx-auto mb-4" />
          <div className="text-2xl font-bold uppercase">LOADING CLASSROOMS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-white">
      {/* Header */}
      <header className="border-b-4 border-neo-black bg-neo-pink text-neo-white">
        <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap size={36} strokeWidth={3} className="hidden sm:block" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold uppercase">CLASSROOM MANAGEMENT</h1>
              <p className="text-xs sm:text-sm uppercase">Keep classes organized and insights flowing</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => navigate('/teacher-dashboard')} 
              className="btn-brutal bg-neo-white text-neo-black flex items-center gap-2 text-xs sm:text-sm"
            >
              <ArrowLeft size={18} strokeWidth={3} />
              <span className="font-bold uppercase">Back to dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-10">
        <section className="card-brutal border-4 border-neo-black bg-gradient-to-br from-neo-white via-neo-pink/10 to-neo-yellow/20 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <span className="inline-flex items-center gap-2 border-4 border-neo-black bg-neo-white px-3 py-1 text-xs sm:text-sm font-bold uppercase shadow-brutal-sm">
                <Sparkles size={16} strokeWidth={3} />
                Real-time classroom pulse
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold uppercase leading-tight">
                Monitor classroom momentum at a glance
              </h2>
              <p className="text-sm sm:text-base font-bold opacity-70">
                Track student engagement, assignments, and AI-generated lesson plans from one command center. Stay adaptive with insights tailored to each class.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="btn-brutal bg-neo-black text-neo-white flex items-center gap-2 text-sm sm:text-base"
                >
                  <Plus size={18} strokeWidth={3} />
                  New assignment
                </button>
                <button
                  onClick={() => setShowLessonPlanForm(true)}
                  className="btn-brutal bg-neo-white text-neo-black flex items-center gap-2 text-sm sm:text-base"
                >
                  <Sparkles size={18} strokeWidth={3} />
                  Generate lesson plan
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:max-w-md">
              {[{
                label: 'Students',
                value: totalStudents.toString(),
                meta: selectedClassroom ? selectedClassroom.name : 'Select a classroom',
                icon: <Users size={20} strokeWidth={3} />
              }, {
                label: 'Avg Score',
                value: `${averageScore}%`,
                meta: studentGrades.length > 0 ? 'Across graded work' : 'No grades yet',
                icon: <TrendingUp size={20} strokeWidth={3} />
              }, {
                label: 'Engagement',
                value: `${engagementRate || 0}%`,
                meta: totalSubmissions > 0 ? `${gradedSubmissions}/${totalSubmissions} graded` : 'No submissions yet',
                icon: <FileText size={20} strokeWidth={3} />
              }, {
                label: 'Latest Activity',
                value: latestActivity ? latestActivity.toLocaleDateString() : '—',
                meta: latestActivity ? 'Recently updated content' : 'Start with an assignment',
                icon: <History size={20} strokeWidth={3} />
              }].map(stat => (
                <div key={stat.label} className="border-4 border-neo-black bg-neo-white/80 p-4 shadow-brutal-sm space-y-2 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-70">
                    {stat.icon}
                    {stat.label}
                  </div>
                  <div className="text-2xl font-bold uppercase">{stat.value}</div>
                  <div className="text-xs font-bold uppercase opacity-60">{stat.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold rounded-2xl">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* Classrooms List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <h2 className="text-2xl font-bold uppercase">MY CLASSROOMS</h2>
                <p className="text-xs font-bold uppercase opacity-60">Manage rosters, insights, and invites</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-brutal bg-neo-cyan text-neo-white p-2"
                title="Create classroom"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search classrooms..."
                className="input-brutal w-full pr-12"
              />
              <Sparkles size={18} strokeWidth={3} className="absolute right-3 top-1/2 -translate-y-1/2 text-neo-black opacity-60" />
            </div>

            <div className="flex flex-wrap gap-3 text-xs uppercase font-bold opacity-60">
              <span>{filteredClassrooms.length} results</span>
              {searchTerm && <span>Filtered by “{searchTerm}”</span>}
            </div>

            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {filteredClassrooms.map((classroom) => (
                <div
                  key={classroom.id}
                  className={`card-brutal p-4 cursor-pointer transition-all ${
                    selectedClassroom?.id === classroom.id
                      ? 'bg-neo-cyan text-neo-white'
                      : 'bg-neo-white hover:translate-x-1 hover:translate-y-1'
                  }`}
                  onClick={() => setSelectedClassroom(classroom)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold uppercase">{classroom.name}</h3>
                      {classroom.description && (
                        <p className="text-sm mt-1 opacity-80">{classroom.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClassroom(classroom.id);
                      }}
                      className="p-1 hover:bg-neo-pink hover:text-neo-white transition-colors"
                    >
                      <Trash2 size={16} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={14} strokeWidth={3} />
                    <span className="font-bold">
                      {studentGrades.length} STUDENTS
                    </span>
                  </div>
                </div>
              ))}

              {filteredClassrooms.length === 0 && (
                <div className="card-brutal p-8 bg-neo-yellow text-center">
                  <BookOpen size={48} strokeWidth={3} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold uppercase">NO CLASSROOMS FOUND</p>
                  <p className="text-sm mt-2">Try adjusting search or create a new classroom</p>
                </div>
              )}
            </div>
          </div>

          {/* Student List & Lesson Plans */}
          <div className="lg:col-span-2">
            {selectedClassroom ? (
              <div className="space-y-8">
                <div className="card-brutal p-6 sm:p-8 bg-neo-white rounded-3xl">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 border-4 border-neo-black bg-neo-cyan text-xs font-bold uppercase">
                        Active Classroom
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold uppercase">
                          {selectedClassroom.name}
                        </h2>
                        {selectedClassroom.description && (
                          <p className="mt-2 text-sm sm:text-base font-bold opacity-70 max-w-xl">
                            {selectedClassroom.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="border-4 border-neo-black bg-neo-yellow px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-2 shadow-brutal-sm">
                      <p className="text-xs uppercase font-bold opacity-70">Classroom Invite Code</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-bold tracking-widest">
                          {selectedClassroom.invite_code || 'N/A'}
                        </span>
                        <button
                          onClick={() => {
                            if (selectedClassroom.invite_code) {
                              navigator.clipboard.writeText(selectedClassroom.invite_code);
                              alert('Invite code copied to clipboard!');
                            }
                          }}
                          className="btn-brutal bg-neo-white text-neo-black text-xs sm:text-sm"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-[10px] uppercase font-bold opacity-70">
                        Share with students to join instantly
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[{
                    label: 'Total Students',
                    value: totalStudents.toString(),
                    color: 'bg-neo-cyan',
                    icon: <Users size={20} strokeWidth={3} />
                  }, {
                    label: 'Submissions',
                    value: totalSubmissions.toString(),
                    color: 'bg-neo-yellow',
                    icon: <FileText size={20} strokeWidth={3} />
                  }, {
                    label: 'Avg Score',
                    value: `${averageScore}%`,
                    color: 'bg-neo-green',
                    icon: <TrendingUp size={20} strokeWidth={3} />
                  }, {
                    label: 'Graded Rate',
                    value: `${engagementRate || 0}%`,
                    color: 'bg-neo-pink text-neo-white',
                    icon: <Sparkles size={20} strokeWidth={3} />
                  }].map((stat) => (
                    <div key={stat.label} className={`card-brutal p-4 sm:p-5 rounded-3xl ${stat.color}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-80">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className="mt-3 text-2xl font-bold uppercase">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold uppercase flex items-center gap-2">
                      <FileText size={22} strokeWidth={3} />
                      Assignments ({assignments.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAssignmentModal(true)}
                        className="btn-brutal bg-neo-green text-neo-black flex items-center gap-2 text-xs sm:text-sm"
                      >
                        <Plus size={18} strokeWidth={3} />
                        New Assignment
                      </button>
                    </div>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="card-brutal p-10 bg-neo-white text-center rounded-3xl">
                      <FileText size={56} strokeWidth={3} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold uppercase mb-2">No assignments yet</p>
                      <p className="text-sm mb-4">Launch your first assignment to kickstart activity.</p>
                      <button
                        onClick={() => setShowAssignmentModal(true)}
                        className="btn-brutal-primary text-sm"
                      >
                        Create assignment
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="card-brutal p-5 bg-neo-white rounded-3xl h-full flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-bold uppercase leading-snug">{assignment.title}</h4>
                                {assignment.description && (
                                  <p className="text-sm opacity-70 mt-1">{assignment.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="p-1 hover:bg-neo-pink hover:text-neo-white transition-colors"
                              >
                                <Trash2 size={16} strokeWidth={3} />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t-4 border-neo-black pt-3">
                              <div>
                                <p className="opacity-60 font-bold uppercase">Max Score</p>
                                <p className="text-xl font-bold">{assignment.max_score}</p>
                              </div>
                              <div>
                                <p className="opacity-60 font-bold uppercase">Due Date</p>
                                <p className="font-bold">
                                  {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <History size={20} strokeWidth={3} />
                    <h3 className="text-xl font-bold uppercase">Recent lesson plans</h3>
                    <span className="text-xs font-bold uppercase opacity-60">{lessonPlans.length}</span>
                  </div>
                  {lessonPlans.length === 0 ? (
                    <div className="card-brutal p-8 bg-neo-white rounded-3xl text-center">
                      <Sparkles size={40} strokeWidth={3} className="mx-auto mb-3 opacity-30" />
                      <p className="font-bold uppercase">No plans yet</p>
                      <p className="text-sm mt-1">Generate an AI lesson plan to populate this history.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lessonPlans.slice(0, 4).map((plan) => (
                        <button
                          key={plan.id}
                          className="card-brutal p-4 bg-neo-yellow text-left rounded-3xl hover:-translate-y-1 transition-transform"
                          onClick={() => setLessonPlanModal({ isOpen: true, lessonPlan: plan })}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold uppercase text-sm">{plan.subject || 'Subject'}</p>
                              <p className="text-xs mt-1 opacity-70 leading-tight">{plan.topic}</p>
                            </div>
                            <ArrowLeft size={16} strokeWidth={3} className="rotate-180" />
                          </div>
                          <p className="mt-3 text-xs uppercase font-bold opacity-60">
                            {new Date(plan.created_at).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-brutal p-6 sm:p-8 bg-neo-white rounded-3xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-xl font-bold uppercase">Student performance</h3>
                    <p className="text-xs font-bold uppercase opacity-60">
                      {studentGrades.length} students tracked
                    </p>
                  </div>
                  {studentGrades.length === 0 ? (
                    <div className="text-center py-12">
                      <Users size={48} strokeWidth={3} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold uppercase">No students enrolled</p>
                      <p className="text-sm mt-2">Invite students with the code above to populate this section.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {studentGrades.map((student) => (
                        <div
                          key={student.student_id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border-4 border-neo-black rounded-3xl hover:bg-neo-yellow transition-colors"
                        >
                          <div className="space-y-1">
                            <p className="font-bold uppercase text-sm">{student.student_name}</p>
                            <p className="text-xs uppercase font-bold opacity-60 break-words">{student.student_email}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase opacity-70">
                              <span>{student.graded_submissions}/{student.total_submissions} graded</span>
                              {student.graded_submissions > 0 && <span>Avg {student.average_score}%</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {student.graded_submissions > 0 && (
                              <div className="text-right">
                                <div className="text-3xl font-bold">{student.average_score}%</div>
                                <div className="text-[10px] font-bold uppercase opacity-70">Average</div>
                              </div>
                            )}
                            {student.total_submissions > 0 && (
                              <button
                                onClick={() => handleViewSubmission(student.student_id)}
                                className="btn-brutal-secondary text-xs sm:text-sm px-4 py-2 flex items-center gap-2"
                              >
                                <Eye size={16} strokeWidth={3} />
                                View work
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-brutal p-12 bg-neo-white text-center rounded-3xl">
                <BookOpen size={64} strokeWidth={3} className="mx-auto mb-4 opacity-30" />
                <h3 className="text-2xl font-bold uppercase mb-2">Select a classroom</h3>
                <p className="font-bold opacity-60">
                  Choose a classroom from the list to see assignments, lesson plans, and student insights.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50 overflow-y-auto">
          <div className="card-brutal bg-neo-white max-w-md w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold uppercase mb-6">CREATE CLASSROOM</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  CLASSROOM NAME *
                </label>
                <input
                  type="text"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  className="w-full p-3 border-4 border-neo-black bg-neo-white font-bold"
                  placeholder="e.g., MATHEMATICS 101"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  className="w-full p-3 border-4 border-neo-black bg-neo-white font-bold h-24 resize-none"
                  placeholder="Brief description of the classroom..."
                />
              </div>

              {/* Grading Scale Editor */}
              <div>
                <label className="block text-sm font-bold uppercase mb-3">
                  GRADING SCALE (SET MINIMUM SCORE FOR EACH GRADE)
                </label>
                <div className="space-y-3 p-4 border-4 border-neo-black bg-neo-yellow">
                  {Object.entries(newClassroom.grading_scale)
                    .sort((a, b) => b[1] - a[1]) // Sort by score descending
                    .map(([grade, minScore]) => (
                      <div key={grade} className="flex items-center gap-3">
                        <div className="w-12 h-12 border-4 border-neo-black bg-neo-white flex items-center justify-center font-bold text-xl">
                          {grade}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-bold text-sm">MIN:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={minScore}
                            onChange={(e) => {
                              const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setNewClassroom({
                                ...newClassroom,
                                grading_scale: {
                                  ...newClassroom.grading_scale,
                                  [grade]: value
                                }
                              });
                            }}
                            className="w-20 p-2 border-4 border-neo-black bg-neo-white font-bold text-center text-lg"
                          />
                          <span className="font-bold text-sm">%</span>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs mt-2 opacity-60 font-bold">
                  Students scoring above these thresholds will receive the corresponding grade
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCreateClassroom}
                className="btn-brutal-primary flex-1"
              >
                CREATE
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewClassroom({ 
                    name: '', 
                    description: '',
                    grading_scale: {
                      'A': 90,
                      'B': 80,
                      'C': 70,
                      'D': 60,
                      'F': 0
                    }
                  });
                }}
                className="btn-brutal-secondary flex-1"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Lesson Plan Modal */}
      {showLessonPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50">
          <div className="card-brutal bg-neo-white max-w-md w-full p-8">
            <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
              <Sparkles size={24} strokeWidth={3} />
              GENERATE AI LESSON PLAN
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  SUBJECT *
                </label>
                <input
                  type="text"
                  value={lessonPlanForm.subject}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, subject: e.target.value })}
                  className="w-full p-3 border-4 border-neo-black bg-neo-white font-bold"
                  placeholder="e.g., MATHEMATICS"
                  disabled={generatingPlan}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  TOPIC *
                </label>
                <input
                  type="text"
                  value={lessonPlanForm.topic}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, topic: e.target.value })}
                  className="w-full p-3 border-4 border-neo-black bg-neo-white font-bold"
                  placeholder="e.g., QUADRATIC EQUATIONS"
                  disabled={generatingPlan}
                />
              </div>

              <div className="card-brutal p-4 bg-neo-yellow">
                <p className="text-sm font-bold">
                  AI will analyze student performance data and create a personalized lesson plan.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleGenerateLessonPlan}
                disabled={generatingPlan}
                className="btn-brutal-primary flex-1 flex items-center justify-center gap-2"
              >
                {generatingPlan ? (
                  <>
                    <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                    GENERATING...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} strokeWidth={3} />
                    GENERATE
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowLessonPlanForm(false);
                  setLessonPlanForm({ subject: '', topic: '' });
                }}
                disabled={generatingPlan}
                className="btn-brutal-secondary flex-1"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      <SubmissionModal
        isOpen={submissionModal.isOpen}
        onClose={() => setSubmissionModal({ isOpen: false, submission: null, grade: null })}
        submission={submissionModal.submission}
        grade={submissionModal.grade}
      />

      {/* Lesson Plan Modal */}
      <LessonPlanModal
        isOpen={lessonPlanModal.isOpen}
        onClose={() => setLessonPlanModal({ isOpen: false, lessonPlan: null })}
        lessonPlan={lessonPlanModal.lessonPlan}
      />

      {/* Create Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50">
          <div className="card-brutal bg-neo-white max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-green">
              <h2 className="text-2xl font-bold uppercase">CREATE ASSIGNMENT</h2>
              <button 
                onClick={() => {
                  setShowAssignmentModal(false);
                  setNewAssignment({ title: '', description: '', due_date: '', max_score: 100 });
                }}
                className="btn-brutal bg-neo-white text-neo-black p-2"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-bold uppercase mb-2">TITLE *</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="e.g., Math Homework #5"
                  className="input-brutal w-full"
                  disabled={creatingAssignment}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold uppercase mb-2">DESCRIPTION</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  placeholder="Describe the assignment..."
                  className="input-brutal w-full h-32 resize-none"
                  disabled={creatingAssignment}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">DUE DATE</label>
                  <input
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    className="input-brutal w-full"
                    disabled={creatingAssignment}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase mb-2">MAX SCORE</label>
                  <input
                    type="number"
                    value={newAssignment.max_score}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty field for editing, or parse the number
                      setNewAssignment({
                        ...newAssignment,
                        max_score: value === '' ? '' as any : parseInt(value) || 0
                      });
                    }}
                    onBlur={(e) => {
                      // Set default value of 100 if field is empty when user leaves
                      if (e.target.value === '') {
                        setNewAssignment({ ...newAssignment, max_score: 100 });
                      }
                    }}
                    min="1"
                    max="1000"
                    className="input-brutal w-full"
                    disabled={creatingAssignment}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCreateAssignment}
                  disabled={!newAssignment.title.trim() || creatingAssignment}
                  className="btn-brutal-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creatingAssignment ? (
                    <>
                      <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                      CREATING...
                    </>
                  ) : (
                    <>
                      <Plus size={20} strokeWidth={3} />
                      CREATE ASSIGNMENT
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setNewAssignment({ title: '', description: '', due_date: '', max_score: 100 });
                  }}
                  disabled={creatingAssignment}
                  className="btn-brutal-secondary flex-1"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherClassroomDashboard;
