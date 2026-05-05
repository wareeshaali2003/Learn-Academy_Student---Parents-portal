import React from 'react';
import { useUser } from '../context/UserContext';
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
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
{ name: 'Results', path: '/results', icon: GraduationCap, allowedRoles: ['student'] },
  { name: 'Quizzes',      path: '/quizzes',      icon: BrainCircuit    },
  { name: 'Schedule',     path: '/schedule',     icon: CalendarDays    },
  { name: 'Report Card',  path: '/report-card',  icon: ClipboardList,  allowedRoles: ['guardian'] },
  { name: 'Fees',         path: '/fees',         icon: Wallet,         allowedRoles: ['guardian'] },
  { name: 'Notice Board', path: '/notice-board', icon: Newspaper,      allowedRoles: ['guardian'] },
  { name: 'Profile',      path: '/profile',      icon: UserCircle }, // ✅ sirf ek baar
];

function getVisibleNav(role: UserRole): NavItem[] {
  return navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  // ─── Derive role & display name ──────────────────────────────────────────
  const role: UserRole = user?.role === 'guardian' ? 'guardian' : 'student';
  const visibleNav = getVisibleNav(role);
  const displayName = role === 'guardian'
    ? (user as any)?.guardian_name
    : (user as any)?.student_name;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row">

      {/* ── Sidebar Desktop ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-green rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-100">
              S
            </div>
            <span className="font-bold text-xl text-gray-900">Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-green-50 text-primary-green font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-green rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-green-50">
            S
          </div>
          <span className="font-bold text-lg">Portal</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* ── Mobile Menu Overlay ─────────────────────────────────────────── */}
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

      {/* ── Main Content ────────────────────────────────────────────────── */}
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
            <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full border border-gray-200 relative">
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