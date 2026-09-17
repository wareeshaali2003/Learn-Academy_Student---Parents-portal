import React, { createContext, useContext, useState, useEffect } from 'react';
import { PortalUser } from '../types';
import { erpService } from '../services/erpService';

export interface LinkedStudent {
  student: string;
  student_name: string;
}

export interface UserContextType {
  user: PortalUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  erpnextUrl: string;
  studentId: string | null;
  role: 'student' | 'guardian' | null;
  activeStudentId: string | null;
  linkedStudents: LinkedStudent[];
  setActiveStudentId: (id: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                       = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [studentId, setStudentId]             = useState<string | null>(null);
  const [role, setRole]                       = useState<'student' | 'guardian' | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [linkedStudents, setLinkedStudents]   = useState<LinkedStudent[]>([]);
  const erpnextUrl = import.meta.env.VITE_ERP_BASE_URL || '';

  const resolveUser = async (userId: string) => {
    // ── 1. Try Student first ──────────────────────────────────────────────
    const studentData = await erpService.getStudentDetails(userId);
    if (studentData) {
      return {
        user: { ...studentData, role: 'student' } as PortalUser,
        studentId: studentData.name,
        role: 'student' as const,
        linkedStudents: [] as LinkedStudent[],
      };
    }

    // ── 2. Try Guardian ───────────────────────────────────────────────────
    const guardianResult: any = await erpService.getGuardianDetails(userId);

    // getGuardianDetails returns { ok, data } OR raw guardian object
    let guardianData: any = null;
    if (guardianResult?.ok && guardianResult?.data) {
      guardianData = guardianResult.data;
    } else if (guardianResult?.students || guardianResult?.guardian_name) {
      guardianData = guardianResult;
    }

    if (guardianData) {
      // Students array nikalne ke liye multiple shapes handle karo
      let studentsList: any[] = [];

      // Case A: { guardian: {...}, student: {...}, students: [...] }
      if (Array.isArray(guardianData.students)) {
        studentsList = guardianData.students;
      }
      // Case B: { guardian: { students: [...] } }
      else if (Array.isArray(guardianData.guardian?.students)) {
        studentsList = guardianData.guardian.students;
      }
      // Case C: { students: { student, student_name } } (single student)
      else if (guardianData.students && typeof guardianData.students === 'object') {
        studentsList = [guardianData.students];
      }

      // Normalize shape: har entry mein { student, student_name } ho
      const allStudents: LinkedStudent[] = studentsList
        .map((s: any) => ({
          student: s.student || s.name || s.student_name,
          student_name: s.student_name || s.student || s.name,
        }))
        .filter((s: LinkedStudent) => !!s.student);

      const firstStudentId = allStudents[0]?.student ?? null;

      console.log('[resolveUser] Guardian raw:', guardianData);
      console.log('[resolveUser] Guardian students (normalized):', allStudents);

      // User object: guardian details merge karo
      const guardianUser = guardianData.guardian || guardianData;
      return {
        user: { ...guardianUser, role: 'guardian' } as PortalUser,
        studentId: firstStudentId,
        role: 'guardian' as const,
        linkedStudents: allStudents,
      };
    }

    return null;
  };

  // applyResult mein linkedStudents bhi set karo
  const applyResult = (result: {
    user: PortalUser;
    studentId: string | null;
    role: 'student' | 'guardian';
    linkedStudents: LinkedStudent[];
  }) => {
    setUser(result.user);
    setStudentId(result.studentId);
    setRole(result.role);
    setActiveStudentId(result.studentId);
    setLinkedStudents(result.linkedStudents);
  };

  // localStorage mein bhi save/restore karo
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedUserResponse: any = await erpService.getLoggedUser();
        if (loggedUserResponse && loggedUserResponse.message !== 'Guest') {
          const result = await resolveUser(loggedUserResponse.message);
          if (result) applyResult(result);
        } else {
          const savedUser      = localStorage.getItem('portal_user');
          const savedStudentId = localStorage.getItem('portal_student_id');
          const savedRole      = localStorage.getItem('portal_role') as 'student' | 'guardian' | null;
          const savedActiveId  = localStorage.getItem('portal_active_student_id');
          const savedLinked    = localStorage.getItem('portal_linked_students');
          if (savedUser)      setUser(JSON.parse(savedUser));
          if (savedStudentId) setStudentId(savedStudentId);
          if (savedRole)      setRole(savedRole);
          if (savedActiveId)  setActiveStudentId(savedActiveId);
          if (savedLinked)    setLinkedStudents(JSON.parse(savedLinked));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await erpService.login(email, password);
      const loggedUser: any = await erpService.getLoggedUser();
      const result = await resolveUser(loggedUser.message || email);
      if (!result) {
        await erpService.logout();
        throw new Error(`No Student or Guardian record found.`);
      }
      applyResult(result);
      localStorage.setItem('portal_user',              JSON.stringify(result.user));
      localStorage.setItem('portal_student_id',        result.studentId ?? '');
      localStorage.setItem('portal_role',              result.role);
      localStorage.setItem('portal_active_student_id', result.studentId ?? '');
      localStorage.setItem('portal_linked_students',   JSON.stringify(result.linkedStudents));
    } catch (error) {
      await erpService.logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setStudentId(null);
    setRole(null);
    setActiveStudentId(null);
    setLinkedStudents([]);
    localStorage.removeItem('portal_user');
    localStorage.removeItem('portal_student_id');
    localStorage.removeItem('portal_role');
    localStorage.removeItem('portal_active_student_id');
    localStorage.removeItem('portal_linked_students');
    erpService.logout();
  };

  const handleSetActiveStudent = (id: string) => {
    setActiveStudentId(id);
    localStorage.setItem('portal_active_student_id', id);
  };

  return (
    <UserContext.Provider value={{
      user, isLoading, login, logout, erpnextUrl,
      studentId, role, activeStudentId,
      linkedStudents,
      setActiveStudentId: handleSetActiveStudent,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};