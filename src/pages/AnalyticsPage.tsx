import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { 
  GraduationCap, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Users, 
  FileText,
  Award,
  Calendar,
  Download,
  Loader2,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface ClassroomData {
  id: string;
  name: string;
  student_count: number;
  avg_score: number;
  grading_scale?: Record<string, number>;
}

interface StudentPerformance {
  id: string;
  name: string;
  email: string;
  grades: Array<{
    score: number;
    created_at: string;
    assignment_title?: string;
  }>;
  avg_score: number;
  total_submissions: number;
  trend: 'up' | 'down' | 'stable';
}

interface AssignmentAnalytics {
  id: string;
  title: string;
  avg_score: number;
  submission_count: number;
  max_score: number;
  completion_rate: number;
}

interface InsightCard {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: JSX.Element;
  accentCircle: string;
  accentText: string;
}

const COLORS = ['#FF6B9D', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'];

const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [assignmentAnalytics, setAssignmentAnalytics] = useState<AssignmentAnalytics[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalSubmissions: 0,
    avgClassScore: 0,
    gradedSubmissions: 0,
    pendingSubmissions: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'teacher') {
      navigate('/student-dashboard');
      return;
    }

    fetchAllAnalytics();
  }, [user, userRole, navigate, selectedClassroom, timeRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30d':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90d':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return null;
    }
  };

  const fetchAllAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      console.log('=== ANALYTICS DEBUG START ===');
      console.log('Current user ID:', user.id);
      
      // Fetch teacher's classrooms
      const { data: classroomsData, error: classroomError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id);

      console.log('Classrooms query result:', { classroomsData, classroomError });

      if (classroomError) throw classroomError;

      const allClassrooms = classroomsData || [];
      const classroomIds = allClassrooms.map(c => c.id);
      
      console.log('Classroom IDs found:', classroomIds);

      // Build query based on selected classroom
      const targetClassroomIds = selectedClassroom === 'all' 
        ? classroomIds 
        : [selectedClassroom];

      console.log('Target classroom IDs:', targetClassroomIds);

      if (targetClassroomIds.length === 0) {
        console.log('No classrooms found - stopping');
        setLoading(false);
        return;
      }

      // Fetch all students in these classrooms
      const { data: classroomStudents, error: csError } = await supabase
        .from('classroom_students')
        .select('student_id, classroom_id')
        .in('classroom_id', targetClassroomIds);

      console.log('Classroom students query result:', { classroomStudents, csError });

      if (csError) throw csError;

      const studentIds = [...new Set(classroomStudents?.map(cs => cs.student_id) || [])];
      
      console.log('Unique student IDs:', studentIds);

      if (studentIds.length === 0) {
        console.log('No students found in classrooms');
        // Still set classrooms even if no students
        setClassrooms(allClassrooms.map(c => ({
          id: c.id,
          name: c.name,
          student_count: 0,
          avg_score: 0
        })));
        setLoading(false);
        return;
      }

      // Fetch student profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      console.log('Profiles query result:', { profiles, profileError });

      if (profileError) throw profileError;

      // Fetch all submissions
      const dateFilter = getDateFilter();
      let submissionsQuery = supabase
        .from('submissions')
        .select('id, student_id, created_at, assignment_id')
        .in('student_id', studentIds);
      
      if (dateFilter) {
        submissionsQuery = submissionsQuery.gte('created_at', dateFilter);
      }

      const { data: submissions, error: submissionError } = await submissionsQuery;
      
      console.log('Submissions query result:', { submissions, submissionError });
      
      if (submissionError) throw submissionError;

      // Fetch all grades (WITHOUT assignment join since there's no FK)
      let gradesQuery = supabase
        .from('grades')
        .select('*')
        .in('student_id', studentIds);
      
      if (dateFilter) {
        gradesQuery = gradesQuery.gte('created_at', dateFilter);
      }

      const { data: allGrades, error: gradesError } = await gradesQuery;
      
      console.log('Grades query result:', { allGrades, gradesError });
      
      if (gradesError) throw gradesError;

      // Fetch assignments for analytics
      const { data: assignments, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .in('classroom_id', targetClassroomIds);

      console.log('Assignments query result:', { assignments, assignmentError });

      if (assignmentError) throw assignmentError;

      console.log('=== ANALYTICS DEBUG END ===');

      // Manually join grades → submissions → assignments
      const gradesWithAssignments = allGrades?.map(grade => {
        // Find the submission for this grade
        const submission = submissions?.find(s => s.id === grade.submission_id);
        // Find the assignment from the submission
        const assignment = submission ? assignments?.find(a => a.id === submission.assignment_id) : null;

        return {
          ...grade,
          assignment_id: submission?.assignment_id || null, // Add assignment_id to grade
          assignments: assignment ? {
            title: assignment.title,
            classroom_id: assignment.classroom_id,
            max_score: assignment.max_score
          } : null
        };
      }) || [];

      console.log('Grades with assignments:', gradesWithAssignments);

      // Process data
      processAnalytics(
        allClassrooms,
        profiles || [],
        submissions || [],
        gradesWithAssignments,
        assignments || [],
        classroomStudents || [],
        selectedClassroom,
        targetClassroomIds
      );

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (
    classrooms: any[],
    profiles: any[],
    submissions: any[],
    grades: any[],
    assignments: any[],
    classroomStudents: any[],
    selectedClassroomId: string,
    targetClassroomIds: string[]
  ) => {
      const assignmentIds = assignments.map((assignment) => assignment.id);

      const scopedSubmissions = submissions.filter((submission) =>
        !submission.assignment_id || assignmentIds.includes(submission.assignment_id)
      );

      const scopedGrades = grades.filter((grade) =>
        !grade.assignment_id || assignmentIds.includes(grade.assignment_id)
      );

      const getSafeMaxScore = (value?: number | null) => {
        if (value && value > 0) {
          return value;
        }
        return 100;
      };

    // Helper function to calculate percentage from score
    const calculatePercentage = (grade: any) => {
        const maxScore = getSafeMaxScore(grade.assignments?.max_score ?? grade.max_score);
        const rawPercentage = (grade.score / maxScore) * 100;
        const percentage = Number.isFinite(rawPercentage) ? rawPercentage : 0;

        console.log(`Grade calculation: ${grade.score}/${maxScore} = ${percentage.toFixed(2)}%`);

        return percentage;
    };

    // Overall stats
    const totalStudents = profiles.length;

    // Only count unique submissions (avoid duplicates)
      const uniqueSubmissions = [...new Set(scopedSubmissions.map(s => s.id))];
    const totalSubmissions = uniqueSubmissions.length;

    // Only count unique graded submissions
    const uniqueGradedSubmissions = [...new Set(scopedGrades.map(g => g.submission_id).filter(Boolean))];
    const gradedSubmissions = uniqueGradedSubmissions.length;

    const pendingSubmissions = Math.max(0, totalSubmissions - gradedSubmissions);

    console.log('Overall stats debug:', {
      totalStudents,
      totalSubmissions,
      gradedSubmissions,
      pendingSubmissions,
      uniqueSubmissions: uniqueSubmissions.length,
        gradesCount: scopedGrades.length
    });

      const gradePercentages = scopedGrades.map(calculatePercentage);

      const avgClassScore = gradePercentages.length > 0
        ? Math.round(gradePercentages.reduce((sum, value) => sum + value, 0) / gradePercentages.length)
        : 0;

    setOverallStats({
      totalStudents,
      totalSubmissions,
      avgClassScore,
      gradedSubmissions,
      pendingSubmissions
    });

    // Classroom analytics
    const classroomData = classrooms.map(classroom => {
      const studentsInClassroom = classroomStudents.filter(cs => cs.classroom_id === classroom.id);
      const studentIdsInClassroom = studentsInClassroom.map(s => s.student_id);

      // Get assignments for this classroom
      const classroomAssignmentIds = assignments
        .filter(a => a.classroom_id === classroom.id)
        .map(a => a.id);

      // Filter grades: student must be in classroom AND grade must be for assignment in this classroom
      const classroomGrades = scopedGrades.filter(g =>
        studentIdsInClassroom.includes(g.student_id) &&
        (!g.assignment_id || classroomAssignmentIds.includes(g.assignment_id))
      );

      console.log(`Classroom "${classroom.name}" grades:`, {
        studentsInClassroom: studentIdsInClassroom.length,
        assignmentsInClassroom: classroomAssignmentIds.length,
        gradesInClassroom: classroomGrades.length,
        totalGradesConsidered: scopedGrades.length
      });

      return {
        id: classroom.id,
        name: classroom.name,
        student_count: studentIdsInClassroom.length,
        avg_score: classroomGrades.length > 0
          ? Math.round(classroomGrades.reduce((sum, g) => sum + calculatePercentage(g), 0) / classroomGrades.length)
          : 0,
        grading_scale: classroom.grading_scale
      };
    });

    setClassrooms(classroomData);

    // Student performance with trends
    const studentPerformanceData = profiles.map(profile => {
      // Get all grades for this student
      let studentGradesRaw = scopedGrades.filter(g => g.student_id === profile.id);

      // Filter by classroom if viewing specific classroom (not "all")
      if (selectedClassroomId !== 'all') {
        // Get assignment IDs for the selected classroom(s)
        const classroomAssignmentIds = assignments.map(a => a.id);

        // Only include grades for assignments in the target classroom(s)
        studentGradesRaw = studentGradesRaw.filter(g =>
          !g.assignment_id || classroomAssignmentIds.includes(g.assignment_id)
        );

        console.log(`Filtering student ${profile.full_name} grades for classroom ${selectedClassroomId}:`, {
          totalGrades: scopedGrades.filter(g => g.student_id === profile.id).length,
          filteredGrades: studentGradesRaw.length,
          classroomAssignments: classroomAssignmentIds.length
        });
      }

      // Sort by date
      studentGradesRaw.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Calculate percentage for each grade
      const studentGrades = studentGradesRaw.map(g => {
        const percentage = calculatePercentage(g);
        console.log(`Student ${profile.full_name} - Assignment: ${g.assignments?.title}, Score: ${g.score}/${g.assignments?.max_score || 100} = ${percentage.toFixed(2)}%`);
        return {
          score: Math.round(percentage), // Store as percentage
          created_at: g.created_at,
          assignment_title: g.assignments?.title || 'Untitled'
        };
      });

      const avgScore = studentGrades.length > 0
        ? Math.round(studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
        : 0;

      console.log(`Student ${profile.full_name} - Total grades: ${studentGrades.length}, Avg: ${avgScore}%`);

      // Calculate trend (compare first half vs second half using percentages)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (studentGrades.length >= 4) {
        const midpoint = Math.floor(studentGrades.length / 2);
        const firstHalfAvg = studentGrades.slice(0, midpoint).reduce((sum, g) => sum + g.score, 0) / midpoint;
        const secondHalfAvg = studentGrades.slice(midpoint).reduce((sum, g) => sum + g.score, 0) / (studentGrades.length - midpoint);

        if (secondHalfAvg > firstHalfAvg + 5) trend = 'up';
        else if (secondHalfAvg < firstHalfAvg - 5) trend = 'down';
      }

      return {
        id: profile.id,
        name: profile.full_name || 'Unknown',
        email: profile.email || '',
        grades: studentGrades,
        avg_score: avgScore,
        total_submissions: studentGrades.length,
        trend
      };
    }).sort((a, b) => b.avg_score - a.avg_score);

    setStudentPerformance(studentPerformanceData);

    // Assignment analytics
    const assignmentData = assignments.map(assignment => {
      // Get submissions for this specific assignment
      const assignmentSubmissions = scopedSubmissions.filter(s => s.assignment_id === assignment.id);

      // Get grades for this specific assignment
      const assignmentGrades = scopedGrades.filter(g => g.assignment_id === assignment.id);

      const studentsInClassroom = classroomStudents.filter(cs => cs.classroom_id === assignment.classroom_id);
      const totalStudentsInClassroom = studentsInClassroom.length;

      // Count unique submissions (not duplicate grades)
      const uniqueSubmissionIds = [...new Set(assignmentSubmissions.map(s => s.id))];
      const submissionCount = uniqueSubmissionIds.length;

      const maxScore = getSafeMaxScore(assignment.max_score);

      // Calculate average as percentage using the assignment's max_score
      const assignmentPercentages = assignmentGrades.map(g => {
        const safeMax = getSafeMaxScore(g.assignments?.max_score ?? maxScore);
        const ratio = safeMax > 0 ? (g.score / safeMax) * 100 : 0;
        const percentage = Number.isFinite(ratio) ? ratio : 0;
        console.log(`Assignment "${assignment.title}": ${g.score}/${safeMax} = ${percentage.toFixed(2)}%`);
        return percentage;
      }).filter(value => Number.isFinite(value));

      const avgScore = assignmentPercentages.length > 0
        ? Math.round(assignmentPercentages.reduce((sum, value) => sum + value, 0) / assignmentPercentages.length)
        : 0;

      // Cap completion rate at 100%
      const completionRate = totalStudentsInClassroom > 0
        ? Math.min(100, Math.round((submissionCount / totalStudentsInClassroom) * 100))
        : 0;

      console.log(`Assignment "${assignment.title}" analytics:`, {
        avgScore: `${avgScore}%`,
        submissionCount,
        totalGrades: assignmentGrades.length,
        totalStudents: totalStudentsInClassroom,
        completionRate: `${completionRate}%`,
        maxScore
      });

      return {
        id: assignment.id,
        title: assignment.title,
        avg_score: avgScore,
        submission_count: submissionCount,
        max_score: maxScore,
        completion_rate: completionRate
      };
    }).sort((a, b) => b.submission_count - a.submission_count);

    setAssignmentAnalytics(assignmentData);
    console.log('=== ANALYTICS PROCESSING COMPLETE ===');
    console.log('Overall avg score:', avgClassScore + '%');
    console.log('Student performance data:', studentPerformanceData);
    console.log('Assignment analytics:', assignmentData);
  };

  const exportToCSV = () => {
    // Create CSV content
    let csvContent = "Student Name,Email,Average Score,Total Submissions,Trend\n";
    
    studentPerformance.forEach(student => {
      csvContent += `"${student.name}","${student.email}",${student.avg_score},${student.total_submissions},${student.trend}\n`;
    });

    // Add assignment data
    csvContent += "\n\nAssignment Analytics\n";
    csvContent += "Assignment Title,Average Score,Submissions,Completion Rate\n";
    
    assignmentAnalytics.forEach(assignment => {
      csvContent += `"${assignment.title}",${assignment.avg_score},${assignment.submission_count},${assignment.completion_rate}%\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare chart data using classroom grading scale
  // Get grading scale from selected classroom or use first available grading scale
  const getGradingScale = () => {
    if (selectedClassroom !== 'all') {
      const classroom = classrooms.find(c => c.id === selectedClassroom);
      if (classroom?.grading_scale) {
        return classroom.grading_scale;
      }
    } else {
      // When viewing "ALL CLASSROOMS", use the first available grading scale
      // or the most common grading scale if multiple exist
      const classroomsWithScales = classrooms.filter(c => c.grading_scale);
      if (classroomsWithScales.length > 0) {
        // Use the first classroom's grading scale
        return classroomsWithScales[0].grading_scale;
      }
    }
    // Fallback to default grading scale if no classrooms have custom scales
    return {
      "A": 90,
      "B": 80,
      "C": 70,
      "D": 60,
      "F": 0
    };
  };

  const gradingScale = useMemo(() => getGradingScale(), [classrooms, selectedClassroom]);

  const gradeDistributionData = useMemo(() => {
    const sortedGrades = Object.entries(gradingScale)
      .map(([letter, threshold]) => ({ letter, threshold: Number(threshold) }))
      .sort((a, b) => b.threshold - a.threshold);

    return sortedGrades.map((grade, idx) => {
      const upperBound = idx === 0 ? 100 : sortedGrades[idx - 1].threshold;
      const lowerBound = grade.threshold;

      const count = studentPerformance.filter(s => {
        if (idx === 0) {
          return s.avg_score >= lowerBound;
        }
        return s.avg_score >= lowerBound && s.avg_score < upperBound;
      }).length;

      const rangeText = idx === 0
        ? `${grade.letter} (${lowerBound}+)`
        : `${grade.letter} (${lowerBound}-${upperBound - 1})`;

      return {
        name: rangeText,
        count,
        fill: COLORS[idx % COLORS.length]
      };
    });
  }, [gradingScale, studentPerformance]);

  const classroomComparisonData = useMemo(() => classrooms.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    'Avg Score': c.avg_score,
    'Students': c.student_count
  })), [classrooms]);

  const quickInsights = useMemo<InsightCard[]>(() => {
    const topStudent = studentPerformance[0];

    const atRiskPool = studentPerformance
      .filter(s => s.avg_score > 0)
      .sort((a, b) => a.avg_score - b.avg_score);
    const needsAttention = atRiskPool.find(s => s.trend === 'down') || atRiskPool[0];

    const challengingAssignment = assignmentAnalytics.length > 0
      ? [...assignmentAnalytics].sort((a, b) => a.avg_score - b.avg_score)[0]
      : undefined;

    const pendingCard = overallStats.pendingSubmissions > 0
      ? {
          id: 'pending-grades',
          label: 'Awaiting Review',
          value: `${overallStats.pendingSubmissions}`,
          description: overallStats.pendingSubmissions === 1 ? 'Submission ungraded' : 'Submissions ungraded',
          icon: <Sparkles size={16} strokeWidth={3} />
        }
      : undefined;

    const cards = [
      topStudent && {
        id: 'top-performer',
        label: 'Top Performer',
        value: `${topStudent.avg_score}%`,
        description: topStudent.name,
        icon: <GraduationCap size={16} strokeWidth={3} />,
        accentCircle: 'bg-gradient-to-br from-neo-green to-[#bbf7d0] text-neo-black',
        accentText: 'text-neo-green'
      },
      pendingCard && {
        ...pendingCard,
        accentCircle: 'bg-gradient-to-br from-neo-cyan to-[#bae6fd] text-neo-black',
        accentText: 'text-neo-cyan'
      },
      needsAttention && {
        id: 'needs-support',
        label: 'Needs Support',
        value: `${needsAttention.avg_score}%`,
        description: needsAttention.name,
        icon: <AlertCircle size={16} strokeWidth={3} />,
        accentCircle: 'bg-gradient-to-br from-neo-pink to-[#fda4af] text-neo-white',
        accentText: 'text-neo-pink'
      },
      challengingAssignment && {
        id: 'tough-assignment',
        label: 'Toughest Assignment',
        value: `${challengingAssignment.avg_score}% avg`,
        description: challengingAssignment.title,
        icon: <Target size={16} strokeWidth={3} />,
        accentCircle: 'bg-gradient-to-br from-neo-yellow to-[#fef08a] text-neo-black',
        accentText: 'text-neo-yellow'
      }
    ].filter(Boolean) as InsightCard[];

    if (cards.length === 0) {
      return [{
        id: 'no-data',
        label: 'Insights Pending',
        value: '—',
        description: 'Data will appear once activity begins.',
        icon: <Activity size={16} strokeWidth={3} />,
        accentCircle: 'bg-gradient-to-br from-[#e5e7eb] to-neo-white text-neo-black',
        accentText: 'text-gray-500'
      }];
    }

    return cards.slice(0, 3);
  }, [studentPerformance, assignmentAnalytics, overallStats]);

  const timeRangeLabel = ({
    '7d': 'last 7 days',
    '30d': 'last 30 days',
    '90d': 'last 90 days',
    'all': 'all time'
  } as const)[timeRange];

  const classroomCountDisplay = selectedClassroom === 'all' ? classrooms.length : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} strokeWidth={3} className="animate-spin mx-auto mb-4" />
          <div className="text-2xl font-bold uppercase">LOADING ANALYTICS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-white">
      {/* Header */}
      <header className="border-b-4 border-neo-black bg-neo-cyan text-neo-black">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button
                onClick={() => navigate('/teacher-dashboard')}
                className="btn-brutal bg-neo-white p-3 sm:p-4"
              >
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="flex items-center gap-3">
                <BarChart3 size={40} strokeWidth={3} />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold uppercase">Learning Analytics</h1>
                  <p className="text-xs sm:text-sm uppercase font-bold">Performance insights dashboard</p>
                </div>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="btn-brutal bg-neo-pink text-neo-white flex items-center justify-center gap-2 text-xs sm:text-sm self-start"
            >
              <Download size={20} strokeWidth={3} />
              <span className="font-bold uppercase">Export report</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="card-brutal p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-neo-yellow via-[#FFF7AE] to-neo-white text-neo-black">
            <div className="space-y-4">
              <p className="text-xs uppercase font-bold tracking-[0.2em]">Analytics overview</p>
              <h2 className="text-3xl sm:text-4xl font-bold uppercase leading-tight max-w-2xl">
                Translate classroom data into confident next steps
              </h2>
              <p className="text-sm sm:text-base font-bold opacity-80 max-w-2xl">
                Monitoring {overallStats.totalStudents} student{overallStats.totalStudents === 1 ? '' : 's'} across {classroomCountDisplay} classroom{classroomCountDisplay === 1 ? '' : 's'} over {timeRangeLabel}.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t-4 border-neo-black">
                <div className="px-3 py-2 border-2 border-neo-black bg-neo-white rounded-2xl">
                  <p className="text-[11px] uppercase font-bold opacity-60">Avg Score</p>
                  <p className="text-xl font-bold">{overallStats.avgClassScore}%</p>
                </div>
                <div className="px-3 py-2 border-2 border-neo-black bg-neo-white rounded-2xl">
                  <p className="text-[11px] uppercase font-bold opacity-60">Submissions</p>
                  <p className="text-xl font-bold">{overallStats.totalSubmissions}</p>
                </div>
                <div className="px-3 py-2 border-2 border-neo-black bg-neo-white rounded-2xl">
                  <p className="text-[11px] uppercase font-bold opacity-60">Graded</p>
                  <p className="text-xl font-bold">{overallStats.gradedSubmissions}</p>
                </div>
                <div className="px-3 py-2 border-2 border-neo-black bg-neo-white rounded-2xl">
                  <p className="text-[11px] uppercase font-bold opacity-60">Time Window</p>
                  <p className="text-sm font-bold uppercase">{timeRangeLabel}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card-brutal p-5 sm:p-6 rounded-3xl h-full bg-gradient-to-br from-neo-white via-[#F8FAFC] to-[#E0F2FE]">
            <p className="text-xs uppercase font-bold opacity-60 mb-3">Quick insights</p>
            <div className="space-y-3">
              {quickInsights.map(card => (
                <div
                  key={card.id}
                  className="relative flex items-center justify-between gap-3 px-3 py-3 border-2 border-neo-black rounded-2xl bg-neo-white shadow-brutal-sm overflow-hidden"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-neo-black" />
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-9 w-9 items-center justify-center border-2 border-neo-black rounded-full ${card.accentCircle}`}>
                      {card.icon}
                    </span>
                    <div>
                      <p className={`text-[11px] uppercase font-bold ${card.accentText}`}>{card.label}</p>
                      <p className="text-sm font-bold leading-snug">{card.description}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold uppercase text-right">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

  <div className="card-brutal p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-neo-white via-[#F8FAFC] to-[#E0F2FE]">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-full sm:w-64">
              <label className="block text-xs font-bold uppercase mb-2">Classroom</label>
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                className="input-brutal w-full"
              >
                <option value="all">All classrooms</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-64">
              <label className="block text-xs font-bold uppercase mb-2">Time range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="input-brutal w-full"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-bold uppercase opacity-60">
                Tip: Adjust filters to spot trends within a specific class or reporting window.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-pink via-[#FFB3C1] to-neo-white text-neo-black">
            <Users size={32} strokeWidth={3} className="mb-3" />
            <p className="text-3xl font-bold">{overallStats.totalStudents}</p>
            <p className="text-xs font-bold uppercase tracking-wide">Total students</p>
          </div>
          <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-cyan via-[#BAE6FD] to-neo-white text-neo-black">
            <FileText size={32} strokeWidth={3} className="mb-3" />
            <p className="text-3xl font-bold">{overallStats.totalSubmissions}</p>
            <p className="text-xs font-bold uppercase tracking-wide">Total submissions</p>
          </div>
          <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-yellow via-[#FEF08A] to-neo-white text-neo-black">
            <Award size={32} strokeWidth={3} className="mb-3" />
            <p className="text-3xl font-bold">{overallStats.avgClassScore}%</p>
            <p className="text-xs font-bold uppercase tracking-wide">Average score</p>
          </div>
          <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-green via-[#BBF7D0] to-neo-white text-neo-black">
            <Activity size={32} strokeWidth={3} className="mb-3" />
            <p className="text-3xl font-bold">{overallStats.gradedSubmissions}</p>
            <p className="text-xs font-bold uppercase tracking-wide">Graded submissions</p>
          </div>
          {overallStats.pendingSubmissions > 0 && (
            <div className="card-brutal p-6 rounded-3xl sm:col-span-2 xl:col-span-4 bg-gradient-to-r from-neo-purple via-[#C4B5FD] to-[#E9D5FF] text-neo-black">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle size={32} strokeWidth={3} />
                  <div>
                    <p className="text-sm font-bold uppercase">Pending review</p>
                    <p className="text-xs font-bold uppercase opacity-80">
                      Grade these submissions to keep analytics current.
                    </p>
                  </div>
                </div>
                <p className="text-3xl font-bold">{overallStats.pendingSubmissions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Grade Distribution */}
          <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-white via-[#F8FAFC] to-[#E2E8F0]">
            <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
              <Target size={24} strokeWidth={3} />
              GRADE DISTRIBUTION
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistributionData}>
                <CartesianGrid strokeWidth={2} stroke="#000" />
                <XAxis 
                  dataKey="name" 
                  stroke="#000" 
                  strokeWidth={2}
                  style={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#000" 
                  strokeWidth={2}
                  style={{ fontWeight: 'bold' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    border: '3px solid #000', 
                    borderRadius: '0',
                    fontWeight: 'bold',
                    boxShadow: '4px 4px 0 #000'
                  }}
                />
                <Bar dataKey="count" fill="#FF6B9D" stroke="#000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Classroom Comparison */}
          <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-white via-[#F1F5F9] to-[#DBEAFE]">
            <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
              <Users size={24} strokeWidth={3} />
              CLASSROOM COMPARISON
            </h3>
            {classroomComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classroomComparisonData}>
                  <CartesianGrid strokeWidth={2} stroke="#000" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#000" 
                    strokeWidth={2}
                    style={{ fontWeight: 'bold', fontSize: '10px' }}
                  />
                  <YAxis 
                    stroke="#000" 
                    strokeWidth={2}
                    style={{ fontWeight: 'bold' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      border: '3px solid #000', 
                      borderRadius: '0',
                      fontWeight: 'bold',
                      boxShadow: '4px 4px 0 #000'
                    }}
                  />
                  <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                  <Bar dataKey="Avg Score" fill="#4ECDC4" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p className="font-bold uppercase">NO CLASSROOM DATA AVAILABLE</p>
              </div>
            )}
          </div>
        </div>

        {/* Student Performance Table with Trends */}
  <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-white via-[#FBCFE8] to-[#E0F2FE]">
          <h3 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={28} strokeWidth={3} />
            STUDENT PERFORMANCE TRENDS
          </h3>
          
          {studentPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-4 border-neo-black bg-neo-yellow">
                    <th className="p-4 text-left font-bold uppercase">RANK</th>
                    <th className="p-4 text-left font-bold uppercase">STUDENT NAME</th>
                    <th className="p-4 text-left font-bold uppercase">EMAIL</th>
                    <th className="p-4 text-center font-bold uppercase">AVG SCORE</th>
                    <th className="p-4 text-center font-bold uppercase">SUBMISSIONS</th>
                    <th className="p-4 text-center font-bold uppercase">TREND</th>
                    <th className="p-4 text-center font-bold uppercase">PERFORMANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {studentPerformance.map((student, idx) => (
                    <tr key={student.id} className="border-b-2 border-neo-black hover:bg-neo-cyan transition-colors">
                      <td className="p-4 font-bold">#{idx + 1}</td>
                      <td className="p-4 font-bold">{student.name}</td>
                      <td className="p-4 text-sm">{student.email}</td>
                      <td className="p-4 text-center">
                        <span className={`font-bold text-lg ${
                          student.avg_score >= 90 ? 'text-green-600' :
                          student.avg_score >= 80 ? 'text-blue-600' :
                          student.avg_score >= 70 ? 'text-yellow-600' :
                          student.avg_score >= 60 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {student.avg_score}%
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">{student.total_submissions}</td>
                      <td className="p-4 text-center">
                        {student.trend === 'up' && (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <TrendingUp size={20} strokeWidth={3} />
                            <span className="font-bold text-xs">IMPROVING</span>
                          </div>
                        )}
                        {student.trend === 'down' && (
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <TrendingDown size={20} strokeWidth={3} />
                            <span className="font-bold text-xs">DECLINING</span>
                          </div>
                        )}
                        {student.trend === 'stable' && (
                          <div className="flex items-center justify-center gap-1 text-gray-600">
                            <Activity size={20} strokeWidth={3} />
                            <span className="font-bold text-xs">STABLE</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {student.grades.length >= 2 && (
                          <div className="h-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={student.grades.slice(-5)}>
                                <Area 
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke="#FF6B9D" 
                                  strokeWidth={2}
                                  fill="#FFE66D" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="font-bold uppercase">NO STUDENT PERFORMANCE DATA AVAILABLE</p>
            </div>
          )}
        </div>

        {/* Assignment Analytics */}
  <div className="card-brutal p-6 rounded-3xl bg-gradient-to-br from-neo-white via-[#E0F2FE] to-[#FEF3C7]">
          <h3 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
            <FileText size={28} strokeWidth={3} />
            ASSIGNMENT ANALYTICS
          </h3>
          
          {assignmentAnalytics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-4 border-neo-black bg-neo-pink text-neo-white">
                    <th className="p-4 text-left font-bold uppercase">ASSIGNMENT TITLE</th>
                    <th className="p-4 text-center font-bold uppercase">AVG SCORE</th>
                    <th className="p-4 text-center font-bold uppercase">SUBMISSIONS</th>
                    <th className="p-4 text-center font-bold uppercase">COMPLETION</th>
                    <th className="p-4 text-center font-bold uppercase">DIFFICULTY</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentAnalytics.map((assignment) => {
                    const difficulty = 
                      assignment.avg_score >= 80 ? 'EASY' :
                      assignment.avg_score >= 65 ? 'MEDIUM' :
                      'HARD';
                    
                    const difficultyColor = 
                      difficulty === 'EASY' ? 'bg-neo-green' :
                      difficulty === 'MEDIUM' ? 'bg-neo-yellow' :
                      'bg-neo-pink text-neo-white';

                    return (
                      <tr key={assignment.id} className="border-b-2 border-neo-black hover:bg-neo-cyan transition-colors">
                        <td className="p-4 font-bold">{assignment.title}</td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-lg">
                            {assignment.avg_score}%
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold">{assignment.submission_count}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-4 border-2 border-neo-black bg-white">
                              <div 
                                className="h-full bg-neo-cyan"
                                style={{ width: `${assignment.completion_rate}%` }}
                              />
                            </div>
                            <span className="font-bold text-sm">{assignment.completion_rate}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 font-bold text-xs ${difficultyColor} border-2 border-neo-black`}>
                            {difficulty}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="font-bold uppercase">NO ASSIGNMENT DATA AVAILABLE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
