import { useState, useEffect, type FormEvent } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Key, Globe, FileText, PlusCircle, Zap, LogOut } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { DashboardPage } from './pages/Dashboard';
import { KeywordsPage } from './pages/Keywords';
import { APIsPage } from './pages/APIs';
import { WebsitesPage } from './pages/Websites';
import { HistoryPage } from './pages/History';
import { auth } from './lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Pages
const Dashboard = DashboardPage;
const Keywords = KeywordsPage;
const APIs = APIsPage;
const Websites = WebsitesPage;
const History = HistoryPage;

const Navbar = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();
  const navItems = [
    { name: 'DASHBOARD', path: '/', icon: LayoutDashboard },
    { name: 'KEYWORDS', path: '/keywords', icon: PlusCircle },
    { name: 'API MANAGEMENT', path: '/apis', icon: Key },
    { name: 'WP INTEGRATION', path: '/websites', icon: Globe },
    { name: 'HISTORY', path: '/history', icon: FileText },
  ];

  return (
    <aside className="w-64 border-r border-white/10 flex flex-col p-6 h-screen sticky top-0 bg-dark-bg">
      <div className="mb-12">
        <h1 className="text-2xl font-black italic tracking-tighter">
          GAMING<span className="text-primary"> AI</span>
        </h1>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
          Publisher Command Center
        </p>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 py-3 px-4 font-bold text-sm transition-all",
              location.pathname === item.path 
                ? "bg-white/5 rounded-lg border-l-4 border-primary text-white" 
                : "text-white/40 hover:text-white"
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="bg-gradient-to-br from-dark-card to-black p-4 rounded-xl border border-white/10">
          <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">System Status</p>
          <p className="text-sm font-bold truncate">LOCAL NODE_01</p>
          <p className="text-[10px] text-primary mt-1 font-bold">MASTER COMMAND</p>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-500 hover:border-red-500/20 transition-all"
        >
          <LogOut className="w-3 h-3" />
          Terminate Session
        </button>
      </div>
    </aside>
  );
};

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const localAuth = localStorage.getItem('app_authorized');
    if (localAuth === 'true') {
      setIsAuthorized(true);
      // Attempt to restore session
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsFirebaseReady(true);
        } else {
          // If no user but "authorized" globally, try anonymous
          signInAnonymously(auth).catch(err => {
            console.error("Firebase Auth Error:", err);
            setAuthError(err.message || "Failed to establish secure node connection.");
          });
        }
      });
      return () => unsubscribe();
    } else {
      // Not authorized globally, wait for login
      setIsFirebaseReady(false);
    }
  }, []);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (password === 'gaming2026') {
      setAuthError(null);
      localStorage.setItem('app_authorized', 'true');
      setIsAuthorized(true);
      
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        console.error("Firebase Auth Error:", err);
        setAuthError("CRITICAL: Anonymous Authentication is disabled in your Firebase Console. Please enable it in 'Build > Authentication > Sign-in method'.");
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_authorized');
    auth.signOut();
    setIsAuthorized(false);
    setIsFirebaseReady(false);
    setAuthError(null);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-10 text-center shadow-2xl relative overflow-hidden">
          {/* BACKGROUND DECOR */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
          
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group transition-all duration-500 hover:scale-110">
            <Zap className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(192,255,0,0.5)]" />
          </div>
          
          <h1 className="text-4xl font-black italic tracking-tighter mb-2 text-white">GAMING<span className="text-primary italic"> AI</span></h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black mb-10 text-center">Command Center Access</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative group">
              <input 
                type="password" 
                placeholder="AUTHORIZATION CODE"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-center font-mono text-xs tracking-[0.2em] focus:border-primary/50 outline-none transition-all placeholder:text-white/10 text-white",
                  error && "border-red-500 shake"
                )}
              />
            </div>
            {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-2 animate-pulse">Access Denied</p>}
            
            <button className="w-full bg-primary text-black h-14 rounded-2xl font-black uppercase tracking-widest mt-6 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(192,255,0,0.15)] hover:shadow-[0_0_40px_rgba(192,255,0,0.25)] flex items-center justify-center gap-2">
              <Key className="w-4 h-4" />
              Initialize Portal
            </button>
          </form>

          {authError && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-2">Sync protocol Warning</p>
              <p className="text-[9px] text-red-400 leading-relaxed font-mono opacity-80">Cloud database connection failed. Some features may be restricted until Anonymous Auth is enabled in Firebase Console.</p>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-white/5">
            <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">
              Secured Node Connection Active
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-dark-bg text-white">
        <Navbar onLogout={handleLogout} />
        <main className="flex-1 overflow-auto bg-dark-bg">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/keywords" element={<Keywords />} />
              <Route path="/apis" element={<APIs />} />
              <Route path="/websites" element={<Websites />} />
              <Route path="/history" element={<History />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </BrowserRouter>
  );
}
