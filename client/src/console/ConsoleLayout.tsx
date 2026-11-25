import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  MessageSquareText,
  Star,
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Menu,
  X,
  LogOut,
  Copy,
  Check,
  Bot,
  Mic,
  Webhook,
  FolderKanban,
  ArrowLeft,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  loadProjects,
  saveNewProject,
  MOCK_TICKETS,
  MOCK_THREADS,
  MOCK_REVIEWS,
  MOCK_TECHS,
  type ProjectItem,
} from './mockConsoleData';
import {
  fetchMyProjects,
  fetchProjectSummaryApi,
} from './consoleApi';
import { TicketsTab } from './tabs/TicketsTab';
import { ConversationsTab } from './tabs/ConversationsTab';
import { SatisfactionTab } from './tabs/SatisfactionTab';
import { TechniciansTab } from './tabs/TechniciansTab';
import { belongsToProject, averageRating, avatarInitial } from './tabs/tabUtils';
import { AuroraBackground, GlowingCard, ShimmerLink } from '../components/ui/twenty-first';

type TabKey = 'tickets' | 'conversations' | 'satisfaction' | 'technicians';

interface NavMenuItem {
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badge?: string | number;
}

export function ConsoleLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('tickets');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [projects, setProjects] = useState<ProjectItem[]>(() =>
    user?.id ? loadProjects(user.id) : []
  );
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [liveCounts, setLiveCounts] = useState<{
    projectId: string;
    tickets: number;
    threads: number;
    techs: number;
    avgCsat?: string;
  } | null>(null);
  const [badgeErrorProjectId, setBadgeErrorProjectId] = useState<string | null>(null);

  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function syncProjects() {
      if (!user?.id) {
        setProjects([]);
        setLoadingProjects(false);
        return;
      }
      setLoadingProjects(true);
      try {
        const dbList = await fetchMyProjects();
        if (!cancelled && dbList.length > 0) {
          setProjects(dbList);
          dbList.forEach((p) => saveNewProject(p, user.id));
        } else if (!cancelled) {
          setProjects(loadProjects(user.id));
        }
      } catch {
        if (!cancelled) {
          setProjects(loadProjects(user.id));
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }
    syncProjects();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentProject = projects.find((p) => p.id === projectId) || projects[0];

  useEffect(() => {
    let cancelled = false;
    async function loadBadges() {
      if (!currentProject?.id || currentProject.id.startsWith('proj-')) {
        setLiveCounts(null);
        setBadgeErrorProjectId(null);
        return;
      }
      setLiveCounts(null);
      setBadgeErrorProjectId(null);
      try {
        const summary = await fetchProjectSummaryApi(currentProject.id);
        if (!cancelled) {
          setLiveCounts({ ...summary, projectId: currentProject.id });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load project summary badges', error);
          setBadgeErrorProjectId(currentProject.id);
        }
      }
    }
    loadBadges();
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id]);


  if (loadingProjects && projects.length === 0) {
    return (
      <AuroraBackground
        intensity="medium"
        className="min-h-screen p-4 sm:p-6 text-slate-100 font-sans"
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[18rem_1fr] gap-5" aria-busy="true" aria-label="กำลังโหลดข้อมูลร้านค้า">
          <div className="hidden lg:block h-[calc(100vh-3rem)] rounded-2xl bg-slate-950/70 border border-slate-800/80 p-5 space-y-5 shadow-2xl shadow-black/20">
            <div className="h-10 w-3/4 rounded-xl skeleton-shimmer" />
            <div className="h-16 rounded-xl skeleton-shimmer" />
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-10 rounded-xl skeleton-shimmer" />
            ))}
          </div>
          <div className="space-y-5">
            <div className="h-16 rounded-2xl skeleton-shimmer" />
            <div className="h-[68vh] rounded-2xl bg-slate-950/70 border border-slate-800/80 p-6 shadow-2xl shadow-black/20">
              <div className="h-8 w-1/3 rounded skeleton-shimmer" />
              <div className="h-4 w-2/3 rounded skeleton-shimmer mt-4" />
              <div className="grid grid-cols-2 gap-4 mt-8">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-24 rounded-xl skeleton-shimmer" />
                ))}
              </div>
              <div className="h-40 rounded-xl skeleton-shimmer mt-6" />
            </div>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  if (!currentProject) {
    return (
      <AuroraBackground
        intensity="medium"
        className="min-h-screen flex items-center justify-center p-6 text-slate-100 font-sans"
      >
        <GlowingCard className="max-w-md w-full" innerClassName="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">ยังไม่มีโปรเจกต์ที่เลือกใช้งาน</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            กรุณาสร้างโปรเจกต์ร้านค้าใหม่ หรือโหลดโปรเจกต์ตัวอย่างจากหน้ารวมโปรเจกต์ก่อนเข้าใช้งาน
          </p>
          <div className="pt-2 flex justify-center">
            <ShimmerLink to="/projects" className="px-5 py-2.5 text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปหน้ารวมโปรเจกต์</span>
            </ShimmerLink>
          </div>
        </GlowingCard>
      </AuroraBackground>
    );
  }

  const mockTicketsCount = MOCK_TICKETS.filter((t) =>
    belongsToProject(t.projectId, currentProject.id)
  ).length;
  const mockThreadsCount = MOCK_THREADS.filter((t) =>
    belongsToProject(t.projectId, currentProject.id)
  ).length;
  const mockProjectReviews = MOCK_REVIEWS.filter((r) =>
    belongsToProject(r.projectId, currentProject.id)
  );
  const mockAvgCsat = mockProjectReviews.length > 0 ? averageRating(mockProjectReviews) : undefined;
  const mockTechsCount = MOCK_TECHS.filter((t) =>
    belongsToProject(t.projectId, currentProject.id)
  ).length;

  const isLiveProject = !currentProject.id.startsWith('proj-');
  const hasCurrentProjectCounts = liveCounts?.projectId === currentProject.id;
  const isBadgeLoading =
    isLiveProject && !hasCurrentProjectCounts && badgeErrorProjectId !== currentProject.id;
  const badgeFailure = isLiveProject && badgeErrorProjectId === currentProject.id;
  const ticketsCount = hasCurrentProjectCounts
    ? liveCounts.tickets
    : isLiveProject
    ? '—'
    : mockTicketsCount;
  const threadsCount = hasCurrentProjectCounts
    ? liveCounts.threads
    : isLiveProject
    ? '—'
    : mockThreadsCount;
  const avgCsat = hasCurrentProjectCounts
    ? liveCounts.avgCsat
    : isLiveProject
    ? undefined
    : mockAvgCsat;
  const techsCount = hasCurrentProjectCounts
    ? liveCounts.techs
    : isLiveProject
    ? '—'
    : mockTechsCount;

  const menuItems: NavMenuItem[] = [
    {
      key: 'tickets',
      label: 'ภาพรวมและใบงาน (Tickets)',
      shortLabel: 'ใบงาน',
      icon: ClipboardList,
      badge: ticketsCount,
    },
    {
      key: 'conversations',
      label: 'ประวัติแชทบอท (Conversations)',
      shortLabel: 'แชทบอท',
      icon: MessageSquareText,
      badge: threadsCount,
    },
    {
      key: 'satisfaction',
      label: 'ความพึงพอใจลูกค้า (CSAT)',
      shortLabel: 'รีวิว CSAT',
      icon: Star,
      badge: isLiveProject && !hasCurrentProjectCounts
        ? '—'
        : avgCsat
        ? `★${avgCsat}`
        : 0,
    },
    {
      key: 'technicians',
      label: 'ทีมช่างและตั้งค่าบอท',
      shortLabel: 'ช่าง & บอท',
      icon: Wrench,
      badge: techsCount,
    },
  ];

  const webhookUrl = `${window.location.origin}/api/webhooks/${currentProject.id}`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectProject = (nextId: string) => {
    setSwitcherOpen(false);
    setMobileDrawerOpen(false);
    navigate(`/projects/${nextId}`);
  };

  return (
    <div className="min-h-screen flex bg-[#070b14] text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#0b101e]/95 border-r border-slate-800/90 backdrop-blur-xl transition-[width] duration-300 ease-out sticky top-0 h-screen z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div
          className={`h-16 border-b border-slate-800/90 flex items-center relative ${
            sidebarCollapsed ? 'px-2 justify-center' : 'px-4 justify-between gap-2'
          }`}
        >
          <Link
            to="/projects"
            className="flex items-center gap-2.5 min-w-0 group"
            title="กลับหน้ารวมโปรเจกต์"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform">
              P
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <span className="font-bold tracking-tight text-white block leading-none truncate">
                  Plasom Console
                </span>
                <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">
                  Store Workspace
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => {
              setSidebarCollapsed((prev) => !prev);
              setSwitcherOpen(false);
            }}
            aria-label={sidebarCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
            className={`bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer shrink-0 ${
              sidebarCollapsed
                ? 'absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-40'
                : 'p-1.5 rounded-lg'
            }`}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <div ref={switcherRef} className="p-3 border-b border-slate-800/90 relative">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-medium text-slate-400">สลับโปรเจกต์ร้านค้า</span>
                <Link
                  to="/projects"
                  className="text-[11px] text-orange-400 hover:text-orange-300 font-medium"
                >
                  ดูทั้งหมด
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setSwitcherOpen((prev) => !prev)}
                className="w-full p-2.5 rounded-xl bg-[#070b14] border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{currentProject.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {currentProject.branchName} • {currentProject.category}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    switcherOpen ? 'rotate-180 text-orange-400' : ''
                  }`}
                />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSwitcherOpen((prev) => !prev)}
              title={`สลับโปรเจกต์: ${currentProject.name}`}
              className="w-full h-11 rounded-xl bg-[#070b14] border border-slate-800 hover:border-orange-500/40 flex items-center justify-center text-orange-400 cursor-pointer"
            >
              <FolderKanban className="w-5 h-5" />
            </button>
          )}

          {switcherOpen && (
            <div
              className={`absolute z-50 mt-2 rounded-2xl bg-[#0e1526] border border-slate-700/90 shadow-2xl p-2 space-y-1 ${
                sidebarCollapsed ? 'left-20 top-2 w-68' : 'left-3 right-3'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                โปรเจกต์ของคุณ ({projects.length})
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {projects.map((p) => {
                  const isSelected = p.id === currentProject.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProject(p.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{p.branchName}</div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between gap-1">
                <Link
                  to="/projects/new"
                  onClick={() => setSwitcherOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>สร้างเพิ่ม</span>
                </Link>
                <Link
                  to="/projects"
                  onClick={() => setSwitcherOpen(false)}
                  className="py-2 px-3 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                >
                  หน้ารวม
                </Link>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => setActiveTab(item.key)}
                className={`relative w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent text-white border border-orange-500/30 shadow-[0_4px_20px_-6px_rgba(249,115,22,0.4)]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-orange-400 shadow-[0_0_12px_2px_rgba(251,146,60,0.9)]" />
                )}

                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      active ? 'text-orange-400' : 'text-slate-400'
                    }`}
                  />
                  {!sidebarCollapsed && <span className="truncate text-xs sm:text-sm">{item.label}</span>}
                </span>

                {!sidebarCollapsed && item.badge !== undefined && (
                  isBadgeLoading ? (
                    <span
                      aria-label="กำลังโหลดตัวเลขสรุป"
                      className="h-5 w-8 rounded-full skeleton-shimmer shrink-0"
                    />
                  ) : (
                    <span
                      title={badgeFailure ? 'โหลดตัวเลขสรุปไม่สำเร็จ' : undefined}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono shrink-0 ${
                        active
                          ? 'bg-orange-500 text-white font-semibold'
                          : 'bg-slate-800/90 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <div className="p-3.5 rounded-2xl bg-[#070b14] border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">สถานะ AI ประจำสาขา</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                    currentProject.chatbotConnected
                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {currentProject.chatbotConnected ? 'Chat ผูกแล้ว' : 'ยังไม่ผูก'}
                  </span>
                </div>
                <div
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                    currentProject.voicebotConnected
                      ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {currentProject.voicebotConnected ? 'Voice ผูกแล้ว' : 'ยังไม่ผูก'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-slate-800/90 flex items-center justify-between gap-2">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {avatarInitial(user?.name || 'U')}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Merchant Admin</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="ออกจากระบบ"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title={`ออกจากระบบ (${user?.name})`}
              className="w-full py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />
          <aside className="relative z-10 w-80 max-w-[86vw] bg-[#0b101e] border-r border-slate-800 flex flex-col justify-between h-full shadow-2xl">
            <div>
              <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
                <Link
                  to="/projects"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold flex items-center justify-center">
                    P
                  </div>
                  <span className="font-bold text-white">Plasom Console</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="ปิดเมนู"
                  className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-800 space-y-2">
                <label className="block text-xs text-slate-400 font-medium">
                  สลับโปรเจกต์ร้านค้า
                </label>
                <select
                  value={currentProject.id}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#070b14] border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.branchName})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <Link
                    to="/projects"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ดูโปรเจกต์ทั้งหมด
                  </Link>
                  <Link
                    to="/projects/new"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="text-orange-400 font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    สร้างโปรเจกต์ใหม่
                  </Link>
                </div>
              </div>

              <nav className="p-3 space-y-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.key);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium cursor-pointer ${
                        active
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        isBadgeLoading ? (
                          <span
                            aria-label="กำลังโหลดตัวเลขสรุป"
                            className="h-5 w-8 rounded-full skeleton-shimmer"
                          />
                        ) : (
                          <span
                            title={badgeFailure ? 'โหลดตัวเลขสรุปไม่สำเร็จ' : undefined}
                            className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                              active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400">ผู้ดูแลร้านค้า</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกระบบ
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-[#070b14]">
        {/* Full-bleed Vibrant Glowing Ambient Background (Multi-layer Aurora Glow + Tubelight + Cyber Grid + Beams) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Layer 1: Core Intense Radial Glow (กึ่งกลางบนสุด สว่างชัดเจนแบบรูปที่ 5) */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[46rem] max-w-[95vw] h-[22rem] rounded-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/55 via-amber-500/30 to-transparent blur-[75px]" />

          {/* Layer 2: Wide Ambient Aurora Atmosphere (รัศมีแผ่กว้างไล่เฉดส้ม-ทอง) */}
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[80rem] max-w-[150vw] h-[36rem] rounded-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/40 via-amber-500/22 via-orange-600/12 to-transparent blur-[115px] animate-aurora" />

          {/* Layer 3: Ultra-wide Deep Orange Aura */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[95rem] max-w-[165vw] h-[44rem] rounded-full bg-orange-600/18 blur-[140px]" />

          {/* Layer 4: Top Glowing Tubelight Line (เส้นขอบแสงนีออนเรืองแสงใต้ Header) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[48rem] max-w-full h-[2.5px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_25px_6px_rgba(249,115,22,0.9)] opacity-90" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28rem] max-w-full h-[6px] bg-gradient-to-r from-transparent via-amber-300 to-transparent blur-[3px] opacity-80" />

          {/* Side Spotlights (แสงเรืองส้มมุมข้าง) */}
          <div className="absolute top-16 -right-20 w-[38rem] h-[34rem] rounded-full bg-gradient-to-br from-orange-500/24 via-amber-500/12 to-transparent blur-[115px] animate-pulse-slow" />
          <div className="absolute top-28 -left-20 w-[32rem] h-[30rem] rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-600/14 to-transparent blur-[115px]" />
          <div className="absolute bottom-10 left-1/3 w-[40rem] h-[28rem] rounded-full bg-orange-500/10 blur-[135px]" />

          {/* Architectural Cyber Grid with Radial Vignette Mask */}
          <div
            className="absolute inset-0 bg-grid-dark opacity-75"
            style={{
              maskImage: 'radial-gradient(ellipse 90% 80% at 50% 25%, #000 45%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 25%, #000 45%, transparent 100%)',
            }}
          />

          {/* Vivid SVG Light Beams */}
          <svg
            className="absolute inset-0 w-full h-full opacity-55"
            viewBox="0 0 1440 900"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="console-beam-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                <stop offset="50%" stopColor="#fb923c" stopOpacity="1" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="console-beam-cyan" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M-100 120 C 350 250, 750 50, 1540 320"
              stroke="url(#console-beam-orange)"
              strokeWidth="1.8"
              strokeDasharray="180 620"
              className="animate-beam-flow"
            />
            <path
              d="M1540 90 C 950 260, 520 100, -100 380"
              stroke="url(#console-beam-cyan)"
              strokeWidth="1.4"
              strokeDasharray="150 680"
              style={{ animationDelay: '1.6s' }}
              className="animate-beam-flow"
            />
          </svg>
        </div>

        {/* Top Header with Frosted Glass so the Glow shines through */}
        <header className="sticky top-0 z-20 min-h-16 bg-[#0b101e]/70 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="เปิดเมนูร้านค้า"
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Link to="/projects" className="hover:text-orange-400 transition-colors hidden sm:inline">
                  โปรเจกต์ทั้งหมด
                </Link>
                <span className="hidden sm:inline text-slate-600">/</span>
                <span className="truncate text-orange-300 font-medium">
                  {currentProject.category}
                </span>
              </div>
              <h1 className="text-sm sm:text-lg font-extrabold text-white truncate">
                {currentProject.name}{' '}
                <span className="font-normal text-slate-400 text-xs sm:text-sm">
                  — {currentProject.branchName}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyWebhook}
              title="คัดลอก Webhook URL ประจำสาขานี้"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070b14]/80 border border-slate-800 hover:border-orange-500/40 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer backdrop-blur-sm"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">คัดลอก Webhook แล้ว</span>
                </>
              ) : (
                <>
                  <Webhook className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-mono text-[11px]">Copy Webhook</span>
                  <Copy className="w-3 h-3 text-slate-500" />
                </>
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-[11px] sm:text-xs font-semibold backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Webhook พร้อมรับใบงาน</span>
              <span className="sm:hidden">ออนไลน์</span>
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 overflow-y-auto relative z-10">
          <div key={`${currentProject.id}-${activeTab}`} className="max-w-6xl mx-auto">
            {activeTab === 'tickets' && <TicketsTab project={currentProject} />}
            {activeTab === 'conversations' && <ConversationsTab project={currentProject} />}
            {activeTab === 'satisfaction' && <SatisfactionTab project={currentProject} />}
            {activeTab === 'technicians' && <TechniciansTab project={currentProject} />}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#090e1c]/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5">
          <div className="grid grid-cols-4 gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors cursor-pointer ${
                    active ? 'text-orange-400 bg-orange-500/10' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full bg-orange-400 shadow-[0_0_10px_2px_rgba(251,146,60,0.9)]" />
                  )}
                  <Icon className="w-4.5 h-4.5" />
                  <span className="text-[10px] font-semibold mt-1 truncate max-w-full">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
