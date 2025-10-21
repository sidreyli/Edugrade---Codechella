import { create } from 'zustand';

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
}

export interface ClassroomStudent {
  id: string;
  classroom_id: string;
  student_id: string;
  joined_at: string;
  student_name?: string;
  student_email?: string;
}

export interface StudentGrade {
  student_id: string;
  student_name: string;
  student_email: string;
  average_score: number;
  total_submissions: number;
  graded_submissions: number;
  latest_grade?: {
    score: number;
    feedback: string;
    created_at: string;
  };
}

interface ClassroomState {
  classrooms: Classroom[];
  selectedClassroom: Classroom | null;
  classroomStudents: ClassroomStudent[];
  studentGrades: StudentGrade[];
  loading: boolean;
  error: string | null;
  
  setClassrooms: (classrooms: Classroom[]) => void;
  addClassroom: (classroom: Classroom) => void;
  updateClassroom: (id: string, updates: Partial<Classroom>) => void;
  deleteClassroom: (id: string) => void;
  
  setSelectedClassroom: (classroom: Classroom | null) => void;
  setClassroomStudents: (students: ClassroomStudent[]) => void;
  addClassroomStudent: (student: ClassroomStudent) => void;
  removeClassroomStudent: (id: string) => void;
  
  setStudentGrades: (grades: StudentGrade[]) => void;
  updateStudentGrade: (studentId: string, grade: Partial<StudentGrade>) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useClassroomStore = create<ClassroomState>((set) => ({
  classrooms: [],
  selectedClassroom: null,
  classroomStudents: [],
  studentGrades: [],
  loading: false,
  error: null,
  
  setClassrooms: (classrooms) => set({ classrooms }),
  addClassroom: (classroom) => set((state) => ({ 
    classrooms: [...state.classrooms, classroom] 
  })),
  updateClassroom: (id, updates) => set((state) => ({
    classrooms: state.classrooms.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteClassroom: (id) => set((state) => ({
    classrooms: state.classrooms.filter(c => c.id !== id)
  })),
  
  setSelectedClassroom: (classroom) => set({ selectedClassroom: classroom }),
  setClassroomStudents: (students) => set({ classroomStudents: students }),
  addClassroomStudent: (student) => set((state) => ({
    classroomStudents: [...state.classroomStudents, student]
  })),
  removeClassroomStudent: (id) => set((state) => ({
    classroomStudents: state.classroomStudents.filter(s => s.id !== id)
  })),
  
  setStudentGrades: (grades) => set({ studentGrades: grades }),
  updateStudentGrade: (studentId, grade) => set((state) => ({
    studentGrades: state.studentGrades.map(g => 
      g.student_id === studentId ? { ...g, ...grade } : g
    )
  })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    classrooms: [],
    selectedClassroom: null,
    classroomStudents: [],
    studentGrades: [],
    loading: false,
    error: null
  })
}));
