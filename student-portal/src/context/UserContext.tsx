import React, { createContext, useContext, useState, useEffect } from 'react';
import { PortalUser } from '../types';
import { erpService } from '../services/erpService';

export interface UserContextType {
  user: PortalUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  erpnextUrl: string;
  studentId: string | null;       // legacy — abhi bhi rakha hai taake dusri jagah break na ho
  role: 'student' | 'guardian' | null;           // ← naya
  activeStudentId: string | null;                // ← naya (guardian ke liye linked child ID)
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                     = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [studentId, setStudentId]           = useState<string | null>(null);
  const [role, setRole]                     = useState<'student' | 'guardian' | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const erpnextUrl = import.meta.env.VITE_ERP_BASE_URL || '';

  const resolveUser = async (
    userId: string
  ): Promise<{ user: PortalUser; studentId: string | null; role: 'student' | 'guardian' } | null> => {

    // Student try
    const studentData = await erpService.getStudentDetails(userId);
    if (studentData) {
      return {
        user: { ...studentData, role: 'student' } as PortalUser,
        studentId: studentData.name,
        role: 'student',
      };
    }

    // Guardian try
    const guardianData = await erpService.getGuardianDetails(userId);
    if (guardianData) {
      const linkedStudentId = guardianData?.students?.[0]?.student ?? null;
      console.log('[resolveUser] Guardian linkedStudentId:', linkedStudentId);
      return {
        user: { ...guardianData, role: 'guardian' } as PortalUser,
        studentId: linkedStudentId,
        role: 'guardian',
      };
    }

    return null;
  };

  // State ek saath set karo taake sync rahe
  const applyResult = (result: {
    user: PortalUser;
    studentId: string | null;
    role: 'student' | 'guardian';
  }) => {
    setUser(result.user);
    setStudentId(result.studentId);
    setRole(result.role);
    // Guardian ke liye activeStudentId = linked child, student ke liye = apna ID
    setActiveStudentId(result.studentId);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedUserResponse: any = await erpService.getLoggedUser();
        if (loggedUserResponse && loggedUserResponse.message !== 'Guest') {
          const result = await resolveUser(loggedUserResponse.message);
          if (result) {
            applyResult(result);
          }
        } else {
          const savedUser         = localStorage.getItem('portal_user');
          const savedStudentId    = localStorage.getItem('portal_student_id');
          const savedRole         = localStorage.getItem('portal_role') as 'student' | 'guardian' | null;
          const savedActiveId     = localStorage.getItem('portal_active_student_id');
          if (savedUser)      setUser(JSON.parse(savedUser));
          if (savedStudentId) setStudentId(savedStudentId);
          if (savedRole)      setRole(savedRole);
          if (savedActiveId)  setActiveStudentId(savedActiveId);
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
      const serverUserId    = loggedUser.message;
      const result          = await resolveUser(serverUserId || email);

      if (!result) {
        await erpService.logout();
        throw new Error(`No Student or Guardian record found for ${serverUserId || email}.`);
      }

      applyResult(result);

      // localStorage mein save karo
      localStorage.setItem('portal_user',              JSON.stringify(result.user));
      localStorage.setItem('portal_student_id',        result.studentId ?? '');
      localStorage.setItem('portal_role',              result.role);
      localStorage.setItem('portal_active_student_id', result.studentId ?? '');

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
    localStorage.removeItem('portal_user');
    localStorage.removeItem('portal_student_id');
    localStorage.removeItem('portal_role');
    localStorage.removeItem('portal_active_student_id');
    erpService.logout();
  };

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      erpnextUrl,
      studentId,
      role,
      activeStudentId,
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