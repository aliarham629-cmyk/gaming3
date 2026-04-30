import { useState, useEffect } from 'react';
import { Zap, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { dbService } from '../lib/db';

export const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalKeywords: 0,
    articlesPublished: 0,
    connectedSites: 0,
    activeApiKeys: 0,
  });
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [hasSystemKey, setHasSystemKey] = useState(false);

  useEffect(() => {
    // Check AI Core status
    window.fetch('/api/config')
      .then(res => res.json())
      .then(data => setHasSystemKey(data.hasSystemKey))
      .catch(() => setHasSystemKey(false));

    // Separate subscriptions for better reliability
    const unsubArticles = dbService.subscribe('articles', (articles) => {
      setRecentArticles(articles.slice(0, 5));
      setStats(prev => ({
        ...prev,
        totalKeywords: articles.length,
        articlesPublished: articles.filter((a: any) => a.status === 'published').length
      }));
    });

    const unsubWebsites = dbService.subscribe('websites', (sites) => {
      setStats(prev => ({
        ...prev,
        connectedSites: sites.length
      }));
    });

    const unsubKeys = dbService.subscribe('apiKeys', (keys) => {
      setStats(prev => ({
        ...prev,
        activeApiKeys: keys.filter((k: any) => k.status === 'active').length
      }));
    });

    return () => {
      unsubArticles();
      unsubWebsites();
      unsubKeys();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-10">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary tracking-widest uppercase">System Status</span>
            <span className="text-sm font-bold uppercase">Operational</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">Active Node</span>
            <span className="text-sm font-bold uppercase">Region: LOCALHOST</span>
          </div>
        </div>
        <Link 
          to="/keywords" 
          className="bg-primary text-black px-6 py-2 rounded font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
        >
          + NEW KEYWORD BATCH
        </Link>
      </header>

      {/* DASHBOARD VIEW */}
      <div className="p-10 flex-1 flex flex-col gap-8">
        
        {/* OVERSIZED STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Articles" value={stats.totalKeywords} subtext="Lifetime Generated" />
          <StatCard title="Published" value={stats.articlesPublished} subtext="Live on WP" />
          <StatCard title="WP Sites" value={stats.connectedSites} subtext="Active Integrations" />
          <StatCard title="API Keys" value={stats.activeApiKeys + (hasSystemKey ? 1 : 0)} subtext={hasSystemKey ? "System Core Active" : "Rotation Ready"} highlight={hasSystemKey} />
        </div>

        {/* CENTER LAYOUT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ACTIVE PIPELINE / RECENT ACTIVITY */}
          <div className="lg:col-span-2 bg-dark-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-black italic tracking-tighter">RECENT ACTIVITY</h3>
              <span className="px-3 py-1 bg-primary text-black text-[10px] font-black rounded uppercase">Live Feed</span>
            </div>
            
            <div className="space-y-4">
              {recentArticles.length === 0 ? (
                <div className="py-12 text-center text-white/20 uppercase font-black italic tracking-widest">No activity found</div>
              ) : (
                recentArticles.map((article, i) => (
                  <div key={article.id || i} className="flex items-center gap-4 group">
                    <span className="text-xs font-mono text-white/40">[{String(i + 1).padStart(2, '0')}]</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1">{article.title || article.keyword}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                          article.status === 'published' ? "bg-primary/20 text-primary" : "bg-white/10 text-white/60"
                        )}>
                          {article.status}
                        </span>
                        <span className="text-[9px] text-white/20 uppercase font-bold">
                          {new Date(article.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {article.status === 'published' && <ArrowUpRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                ))
              )}
            </div>

            {/* WATERMARK DECORATION */}
            <div className="absolute -bottom-10 -right-10 text-[120px] font-black text-white/[0.03] pointer-events-none select-none italic">
              DATA
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 px-2">System Footprint</h3>
            <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Storage</p>
                <p className="text-sm font-bold text-primary italic">LOCAL_BROWSER_READY</p>
              </div>
              <div className="w-full h-[1px] bg-white/10"></div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Engine</p>
                <p className={cn(
                  "text-sm font-bold uppercase italic",
                  hasSystemKey ? "text-primary" : "text-white/60"
                )}>
                  {hasSystemKey ? "AI_CORE_READY" : "GEMINI_1.5_FLASH"}
                </p>
              </div>
              <div className="w-full h-[1px] bg-white/10"></div>
              <p className="text-[9px] text-white/20 leading-relaxed font-bold italic tracking-tighter">
                GAMING AI V2.04B System Running Local Deployment. High Performance SEO Extraction Module Active.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER DATA */}
        <div className="mt-auto flex justify-between items-center text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <div>GAMING AI SYSTEM V.2.04B</div>
          <div>DATABASE CONNECTION: CLOUD_FIRESTORE</div>
          <div>LOCAL TIME: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, highlight }: any) => (
  <div className={cn(
    "p-6 rounded-2xl border transition-all hover:-translate-y-1",
    highlight 
      ? "bg-primary/10 border-primary/20 text-primary" 
      : "bg-white/5 border-white/5 text-white"
  )}>
    <p className={cn(
      "text-[11px] font-black uppercase tracking-widest",
      highlight ? "text-primary" : "text-white/40"
    )}>{title}</p>
    <h2 className="text-5xl font-black mt-2 tracking-tighter">{value}</h2>
    <p className={cn(
      "text-[10px] mt-1 italic tracking-tight font-bold uppercase",
      highlight ? "text-primary underline" : "text-white/40"
    )}>{subtext}</p>
  </div>
);
