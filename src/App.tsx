import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Key, Globe, FileText, PlusCircle, Zap } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { DashboardPage } from './pages/Dashboard';
import { KeywordsPage } from './pages/Keywords';
import { APIsPage } from './pages/APIs';
import { WebsitesPage } from './pages/Websites';
import { HistoryPage } from './pages/History';

// Pages
const Dashboard = DashboardPage;
const Keywords = KeywordsPage;
const APIs = APIsPage;
const Websites = WebsitesPage;
const History = HistoryPage;

const Navbar = () => {
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
      </div>
    </aside>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-dark-bg">
        <Navbar />
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
