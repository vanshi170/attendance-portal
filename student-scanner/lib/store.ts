import { create } from 'zustand';

export interface StudentProfile {
  id: string;
  name: string;
  rollNo: string;
  section: string;
  email: string;
  photoUrl?: string | null;
  timetableUrl?: string | null;
}

export interface DemoSettings {
  enabled: boolean;
  selectedWifi: string;
  lat: number;
  lng: number;
  useCampusLocation: boolean;
}

interface StudentState {
  student: StudentProfile | null;
  token: string | null;
  demoSettings: DemoSettings;
  setAuth: (student: StudentProfile, token: string) => void;
  updateStudent: (data: Partial<StudentProfile>) => void;
  setDemoSettings: (settings: Partial<DemoSettings>) => void;
  logout: () => void;
  initialize: () => void;
}

export const useStudentStore = create<StudentState>((set) => ({
  student: null,
  token: null,
  demoSettings: {
    enabled: true, // Enabled by default for easy local & mobile testing
    selectedWifi: 'SYMBI_NGP_STUDENT',
    lat: 21.1258,
    lng: 79.1585,
    useCampusLocation: true,
  },
  setAuth: (student, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_token', token);
      localStorage.setItem('student_profile', JSON.stringify(student));
    }
    set({ student, token });
  },
  updateStudent: (data) => {
    set((state) => {
      if (!state.student) return state;
      const updated = { ...state.student, ...data };
      if (typeof window !== 'undefined') {
        localStorage.setItem('student_profile', JSON.stringify(updated));
      }
      return { student: updated };
    });
  },
  setDemoSettings: (settings) => {
    set((state) => ({
      demoSettings: { ...state.demoSettings, ...settings },
    }));
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_profile');
    }
    set({ student: null, token: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('student_token');
      const profileStr = localStorage.getItem('student_profile');
      if (token && profileStr) {
        try {
          const student = JSON.parse(profileStr);
          set({ token, student });
        } catch (e) {
          localStorage.removeItem('student_profile');
        }
      }
    }
  },
}));
