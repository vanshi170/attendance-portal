import { create } from 'zustand';

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects?: string[];
  profilePic?: string;
}

interface AuthState {
  teacher: Teacher | null;
  token: string | null;
  setAuth: (teacher: Teacher, token: string) => void;
  updateTeacher: (data: Partial<Teacher>) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  teacher: null,
  token: null,
  setAuth: (teacher, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('teacher', JSON.stringify(teacher));
    set({ teacher, token });
  },
  updateTeacher: (data) => {
    set((state) => {
      if (!state.teacher) return state;
      const updatedTeacher = { ...state.teacher, ...data };
      localStorage.setItem('teacher', JSON.stringify(updatedTeacher));
      return { teacher: updatedTeacher };
    });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('teacher');
    set({ teacher: null, token: null });
    window.location.href = '/login';
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const teacherStr = localStorage.getItem('teacher');
      if (token && teacherStr) {
        set({ token, teacher: JSON.parse(teacherStr) });
      }
    }
  }
}));
