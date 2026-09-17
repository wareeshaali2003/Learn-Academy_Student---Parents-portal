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
  linkedStudents: LinkedStudent[];           // ← NAYA
  setActiveStudentId: (id: string) => void; // ← NAYA
}

const UserContext = createContext<UserContextType | undefined>(undefined);
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                       = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [studentId, setStudentId]             = useState<string | null>(null);
  const [role, setRole]                       = useState<'student' | 'guardian' | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [linkedStudents, setLinkedStudents]   = useState<LinkedStudent[]>([]); // ← NAYA
  const erpnextUrl = import.meta.env.VITE_ERP_BASE_URL || '';

  const resolveUser = async (userId: string) => {
    const studentData = await erpService.getStudentDetails(userId);
    if (studentData) {
      return {
        user: { ...studentData, role: 'student' } as PortalUser,
        studentId: studentData.name,
        role: 'student' as const,
        linkedStudents: [] as LinkedStudent[],
      };
    }

    const guardianData = await erpService.getGuardianDetails(userId);
    if (guardianData) {
      // SAARE linked students array mein lo
      const allStudents: LinkedStudent[] = (guardianData?.students || []).map((s: any) => ({
        student: s.student,
        student_name: s.student_name,
      }));
      const firstStudentId = allStudents[0]?.student ?? null;
      
      console.log('[resolveUser] Guardian students:', allStudents);
      return {
        user: { ...guardianData, role: 'guardian' } as PortalUser,
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
    setLinkedStudents(result.linkedStudents); // ← NAYA
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
          const savedLinked    = localStorage.getItem('portal_linked_students'); // ← NAYA
          if (savedUser)      setUser(JSON.parse(savedUser));
          if (savedStudentId) setStudentId(savedStudentId);
          if (savedRole)      setRole(savedRole);
          if (savedActiveId)  setActiveStudentId(savedActiveId);
          if (savedLinked)    setLinkedStudents(JSON.parse(savedLinked));        // ← NAYA
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
      localStorage.setItem('portal_linked_students',   JSON.stringify(result.linkedStudents)); // ← NAYA
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
    localStorage.removeItem('portal_linked_students'); // ← NAYA
    erpService.logout();
  };

  // setActiveStudentId ko expose karo — switcher isko call karega
  const handleSetActiveStudent = (id: string) => {
    setActiveStudentId(id);
    localStorage.setItem('portal_active_student_id', id);
  };

  return (
    <UserContext.Provider value={{
      user, isLoading, login, logout, erpnextUrl,
      studentId, role, activeStudentId,
      linkedStudents,                    // ← NAYA
      setActiveStudentId: handleSetActiveStudent, // ← NAYA
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