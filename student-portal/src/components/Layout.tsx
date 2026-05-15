import React from 'react';
import { useUser, LinkedStudent } from '../context/UserContext';
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  GraduationCap,
  BrainCircuit,
  LogOut,
  Menu,
  X,
  Bell,
  CalendarDays,
  UserCircle,
  Wallet,
  ClipboardList,
  Newspaper,
  ChevronDown,
  Users,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// ─── Replace this URL with your actual logo image URL ────────────────────────
// Google Drive direct link example:
// const LOGO_URL = 'https://drive.google.com/uc?export=view&id=YOUR_FILE_ID';
// Ya phir apni image ko /public folder mein rakho aur path do:
const LOGO_URL = 'https://share.google/vUsEtSdU87MNHPc2R/logo.png'; // <-- apni image ka path yahan likho

type UserRole = 'student' | 'guardian';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  allowedRoles?: UserRole[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard',    path: '/',             icon: LayoutDashboard },
  { name: 'Attendance',   path: '/attendance',   icon: CalendarCheck   },
  { name: 'Assignments',  path: '/assignments',  icon: FileText        },
  { name: 'Results',      path: '/results',      icon: GraduationCap,  allowedRoles: ['student'] },
  { name: 'Quizzes',      path: '/quizzes',      icon: BrainCircuit    },
  { name: 'Schedule',     path: '/schedule',     icon: CalendarDays    },
  { name: 'Report Card',  path: '/report-card',  icon: ClipboardList,  allowedRoles: ['guardian'] },
  { name: 'Fees',         path: '/fees',         icon: Wallet,         allowedRoles: ['guardian'] },
  { name: 'Notice Board', path: '/notice-board', icon: Newspaper,      allowedRoles: ['guardian'] },
  { name: 'Profile',      path: '/profile',      icon: UserCircle },
];

function getVisibleNav(role: UserRole): NavItem[] {
  return navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, linkedStudents, setActiveStudentId, activeStudentId } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [childMenuOpen, setChildMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  // ─── Derive role & display name ───────────────────────────────────────────
  const role: UserRole = user?.role === 'guardian' ? 'guardian' : 'student';
  const visibleNav = getVisibleNav(role);

  const displayName = role === 'guardian'
    ? (user as any)?.guardian_name
    : (user as any)?.student_name;

  // ─── Portal label based on role ───────────────────────────────────────────
  const portalLabel = role === 'guardian' ? 'Parents Portal' : 'Student Portal';

  const activeChild = linkedStudents.find(s => s.student === activeStudentId);
  const showSwitcher = role === 'guardian' && linkedStudents.length > 1;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ─── Logo component (reused in sidebar & mobile header) ───────────────────
  const LogoMark = ({ size = 40 }: { size?: number }) => (
    <div
      className="rounded-xl overflow-hidden flex items-center justify-center bg-primary-green text-white font-bold shadow-lg shadow-green-100 flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {LOGO_URL ? (
        <img
          src={LOGO_URL}
          alt="Logo"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Agar image load na ho toh fallback "S" dikhao
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerText = 'S';
          }}
        />
      ) : (
        'S'
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row">

      {/* ── Sidebar Desktop ────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">

        {/* Logo + Portal label */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div className="leading-tight">
              <span className="font-bold text-lg text-gray-900 block">Portal</span>
              {/* Role-based portal label */}
              <span className="text-xs font-medium text-primary-green">{portalLabel}</span>
            </div>
          </div>
        </div>

        {/* Child Switcher */}
        {showSwitcher && (
          <div className="px-4 pb-4 pt-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs text-gray-400 font-medium mb-2 px-2">Viewing child</p>
            <div className="space-y-1">
              {linkedStudents.map((child) => (
                <button
                  key={child.student}
                  onClick={() => setActiveStudentId(child.student)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                    activeStudentId === child.student
                      ? "bg-green-50 text-primary-green font-semibold"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    activeStudentId === child.student
                      ? "bg-primary-green text-white"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {child.student_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm truncate">{child.student_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Scrollable Nav ─────────────────────────────────────────────── */}
        {/* flex-1 + overflow-y-auto = scroll hoga, logout neeche fixed rahega */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-green-50 text-primary-green font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* ── Logout — always visible at bottom ─────────────────────────── */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ────────────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={32} />
          <div className="leading-tight">
            <span className="font-bold text-base block">Portal</span>
            <span className="text-[10px] font-medium text-primary-green leading-none">{portalLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile child switcher */}
          {showSwitcher && (
            <div className="relative">
              <button
                onClick={() => setChildMenuOpen(!childMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-xs font-semibold text-primary-green"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="max-w-[80px] truncate">{activeChild?.student_name}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", childMenuOpen && "rotate-180")} />
              </button>

              {childMenuOpen && (
                <div className="absolute right-0 top-10 z-50 bg-white border border-gray-100 rounded-2xl shadow-lg p-2 min-w-[180px]">
                  {linkedStudents.map((child) => (
                    <button
                      key={child.student}
                      onClick={() => {
                        setActiveStudentId(child.student);
                        setChildMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                        activeStudentId === child.student
                          ? "bg-green-50 text-primary-green font-semibold"
                          : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        activeStudentId === child.student
                          ? "bg-primary-green text-white"
                          : "bg-gray-100 text-gray-500"
                      )}>
                        {child.student_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{child.student_name}</p>
                        <p className="text-xs text-gray-400">{child.student}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* ── Mobile Menu Overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 bg-white md:hidden pt-20"
          >
            <nav className="px-6 space-y-4">
              {visibleNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 text-xl py-4 border-b border-gray-50",
                      isActive ? "text-primary-green font-bold" : "text-gray-600"
                    )
                  }
                >
                  <item.icon className="w-6 h-6" />
                  {item.name}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-4 text-xl py-4 text-red-600 w-full"
              >
                <LogOut className="w-6 h-6" />
                Logout
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {displayName}
            </h1>
            <p className="text-gray-500">
              {role === 'guardian'
                ? "Here's your child's academic overview."
                : "Here's what's happening with your studies today."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
                onClick={() => navigate('/notice-board')}
                className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full border border-gray-200 relative"
              >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-green-50 border-2 border-white overflow-hidden
                hover:ring-2 hover:ring-primary-green hover:ring-offset-1 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-1"
              title="View Profile"
            >
              {(user as any)?.image ? (
                <img src={(user as any).image} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-green font-bold">
                  {displayName?.charAt(0)}
                </div>
              )}
            </button>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};