import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Sparkles,
  Bot,
  Mic,
  Store,
  Wind,
  Car,
  Smartphone,
  Armchair,
  LogOut,
  ArrowUpRight,
  LayoutGrid,
  List,
  Layers,
  CheckCircle2,
  X,
  Loader2,
  Trash2,
  AlertCircle,
  Plug,
  Droplets,
  Laptop,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  loadProjects,
  loadDemoProjectsForUser,
  removeProjectFromCache,
  saveNewProject,
  type ProjectItem,
} from './mockConsoleData';
import { deleteProjectApi, fetchMyProjects, createProjectApi } from './consoleApi';
import { avatarInitial } from './tabs/tabUtils';
import { ScrollReveal, Tilt3DCard, NumberTicker } from '../components/InteractiveUI';
import {
  AuroraBackground,
  GlowingCard,
  BorderBeam,
  ShimmerLink,
  ShimmerButton,
  TubelightTabs,
} from '../components/ui/twenty-first';

type BotFilterKey = 'all' | 'full' | 'chat';

/** รหัสบอทว่าง หรือเป็นรหัสตัวอย่าง/รหัสปลอมจากระบบเก่า (auto-/bn-) = ยังรับแชทจาก Botnoi ไม่ได้ */
function isPlaceholderBotId(id: string | null | undefined): boolean {
  const v = (id || '').trim();
  return !v || v.startsWith('auto-') || v.startsWith('bn-');
}

/** สถานะ Chatbot ที่แสดงบนการ์ด: ผูกแล้วจริง / ตั้งว่าเชื่อมแต่รหัสยังไม่จริง / ยังไม่ผูก */
function getChatbotState(proj: ProjectItem): 'connected' | 'pending' | 'none' {
  if (!proj.chatbotConnected) return 'none';
  return isPlaceholderBotId(proj.botnoiBotId) ? 'pending' : 'connected';
}

function getCategoryVisual(category: string) {
  const c = category || '';
  if (c.includes('ประปา')) {
    return {
      Icon: Droplets,
      badgeClass: 'bg-sky-500/12 text-sky-300 border-sky-500/25',
      iconBoxClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      glow: 'rgba(56, 189, 248, 0.65)',
      secondaryGlow: 'rgba(56, 189, 248, 0.11)',
    };
  }
  if (c.includes('กล้อง')) {
    return {
      Icon: Camera,
      badgeClass: 'bg-pink-500/12 text-pink-300 border-pink-500/25',
      iconBoxClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
      glow: 'rgba(244, 114, 182, 0.65)',
      secondaryGlow: 'rgba(244, 114, 182, 0.11)',
    };
  }
  if (c.includes('คอมพิวเตอร์') || c.includes('โน้ตบุ๊ก') || c.includes('โน๊ตบุ๊ค')) {
    return {
      Icon: Laptop,
      badgeClass: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/25',
      iconBoxClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      glow: 'rgba(129, 140, 248, 0.65)',
      secondaryGlow: 'rgba(129, 140, 248, 0.11)',
    };
  }
  if (c.includes('เครื่องใช้ไฟฟ้า') || c.includes('ไฟฟ้า')) {
    return {
      Icon: Plug,
      badgeClass: 'bg-yellow-500/12 text-yellow-300 border-yellow-500/25',
      iconBoxClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      glow: 'rgba(250, 204, 21, 0.65)',
      secondaryGlow: 'rgba(250, 204, 21, 0.11)',
    };
  }
  if (c.includes('แอร์')) {
    return {
      Icon: Wind,
      badgeClass: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/25',
      iconBoxClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      glow: 'rgba(34, 211, 238, 0.65)',
      secondaryGlow: 'rgba(34, 211, 238, 0.11)',
    };
  }
  if (c.includes('รถ')) {
    return {
      Icon: Car,
      badgeClass: 'bg-orange-500/12 text-orange-300 border-orange-500/25',
      iconBoxClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      glow: 'rgba(249, 115, 22, 0.65)',
      secondaryGlow: 'rgba(249, 115, 22, 0.11)',
    };
  }
  if (c.includes('มือถือ') || c.includes('ไอที')) {
    return {
      Icon: Smartphone,
      badgeClass: 'bg-violet-500/12 text-violet-300 border-violet-500/25',
      iconBoxClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
      glow: 'rgba(167, 139, 250, 0.65)',
      secondaryGlow: 'rgba(167, 139, 250, 0.11)',
    };
  }
  if (c.includes('โซฟา') || c.includes('เฟอร์นิเจอร์')) {
    return {
      Icon: Armchair,
      badgeClass: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25',
      iconBoxClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      glow: 'rgba(52, 211, 153, 0.65)',
      secondaryGlow: 'rgba(52, 211, 153, 0.11)',
    };
  }
  return {
    Icon: Store,
    badgeClass: 'bg-amber-500/12 text-amber-300 border-amber-500/25',
    iconBoxClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    glow: 'rgba(251, 191, 36, 0.65)',
    secondaryGlow: 'rgba(251, 191, 36, 0.11)',
  };
}

export function ProjectsListPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [botFilter, setBotFilter] = useState<BotFilterKey>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const deleteDialogCancelRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (projectPendingDelete) {
      deleteDialogCancelRef.current?.focus();
    } else {
      deleteTriggerRef.current?.focus();
      deleteTriggerRef.current = null;
    }
  }, [projectPendingDelete]);

  const requestDeleteProject = (project: ProjectItem) => {
    if (!userId || deletingProjectId) return;
    deleteTriggerRef.current = document.activeElement as HTMLElement;
    setDeleteError(null);
    setProjectPendingDelete(project);
  };

  const dismissDeleteDialog = () => {
    if (deletingProjectId) return;
    setDeleteError(null);
    setProjectPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !projectPendingDelete || deletingProjectId) return;
    const project = projectPendingDelete;
    setDeletingProjectId(project.id);
    setDeleteError(null);
    try {
      await deleteProjectApi(project.id);
      removeProjectFromCache(project.id, userId);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      deleteTriggerRef.current = null;
      setProjectPendingDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      setDeleteError(message);
    } finally {
      setDeletingProjectId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadFromDb() {
      if (!userId) {
        setProjects([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const dbProjects = await fetchMyProjects();
        if (!cancelled) {
          setProjects(dbProjects);
          // ซิงก์เข้า local cache เพื่อให้หน้า ConsoleLayout เปิดโปรเจกต์ได้ทันที
          dbProjects.forEach((p) => saveNewProject(p, userId));
        }
      } catch {
        if (!cancelled) {
          setProjects(loadProjects(userId));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadFromDb();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLoadDemo = async () => {
    if (!user?.id || isSeedingDemo) return;
    setIsSeedingDemo(true);
    try {
      const demos = loadDemoProjectsForUser(user.id);
      const createdList: ProjectItem[] = [];
      for (const demo of demos) {
        const { project } = await createProjectApi({
          name: demo.name,
          branchName: demo.branchName,
          category: demo.category,
          // ร้านตัวอย่างยังไม่ได้ผูกบอทจริง ไม่ให้ขึ้นสถานะหลอกว่าเชื่อมต่อแล้ว
          chatbotConnected: false,
          botnoiBotId: null,
          voicebotConnected: false,
          voiceAgentId: null,
          greetingMessage: demo.greetingMessage,
          requiredFields: demo.requiredFields,
          features: demo.features,
        });
        saveNewProject(project, user.id);
        createdList.push(project);
      }
      setProjects(createdList);
    } catch {
      setProjects(loadDemoProjectsForUser(user.id));
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const stats = useMemo(() => {
    const chatbotCount = projects.filter((p) => p.chatbotConnected).length;
    const voicebotCount = projects.filter((p) => p.voicebotConnected).length;
    const activeFeaturesCount = projects.reduce(
      (acc, p) => acc + Object.values(p.features).filter(Boolean).length,
      0
    );
    return {
      total: projects.length,
      chatbotCount,
      voicebotCount,
      activeFeaturesCount,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((proj) => {
      const matchesQuery =
        !q ||
        proj.name.toLowerCase().includes(q) ||
        proj.branchName.toLowerCase().includes(q) ||
        proj.category.toLowerCase().includes(q) ||
        proj.requiredFields.some((f) => f.toLowerCase().includes(q));

      const matchesFilter =
        botFilter === 'all'
          ? true
          : botFilter === 'full'
          ? proj.chatbotConnected && proj.voicebotConnected
          : proj.chatbotConnected;

      return matchesQuery && matchesFilter;
    });
  }, [projects, searchQuery, botFilter]);

  return (
    <AuroraBackground
      intensity="medium"
      showBeams={false}
      className="min-h-screen text-slate-100 font-sans selection:bg-orange-500 selection:text-white"
    >
      <header className="sticky top-0 z-40 bg-[#090d18]/85 backdrop-blur-xl border-b border-slate-800/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold flex items-center justify-center shadow-[0_0_18px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform">
              P
            </div>
            <div>
              <span className="font-bold text-white tracking-tight block leading-none">
                Plasom Console
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Workspace Hub
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-900/90 border border-slate-800">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {avatarInitial(user?.name || 'U')}
              </div>
              <span className="text-xs text-slate-200 font-medium max-w-[100px] sm:max-w-[180px] truncate">
                {user?.name}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-mono font-semibold mb-2">
                <Layers className="w-3 h-3 text-orange-400" />
                MULTI-PROJECT WORKSPACE
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                โปรเจกต์และร้านค้าของคุณ
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                แต่ละบัญชีจะเห็นเฉพาะโปรเจกต์ร้านค้าและสาขาที่คุณเป็นผู้สร้างเท่านั้น
              </p>
            </div>

            {projects.length > 0 && (
              <ShimmerLink
                to="/projects/new"
                className="px-5 py-3 text-sm self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างโปรเจกต์ใหม่</span>
              </ShimmerLink>
            )}
          </div>
        </ScrollReveal>

        {isLoading ? (
          <div aria-busy="true" aria-label="กำลังโหลดโปรเจกต์">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-7">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="p-4 sm:p-5 rounded-2xl bg-[#0b1220]/90 border border-slate-800/80 shadow-lg shadow-black/10">
                  <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                  <div className="h-7 w-1/2 rounded skeleton-shimmer mt-3" />
                </div>
              ))}
            </div>
            <div className="h-14 rounded-2xl skeleton-shimmer mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-72 rounded-2xl bg-[#0b1220]/90 border border-slate-800/80 p-6 shadow-xl shadow-black/15">
                  <div className="h-10 w-2/3 rounded-xl skeleton-shimmer" />
                  <div className="h-5 w-1/2 rounded skeleton-shimmer mt-6" />
                  <div className="h-4 w-3/4 rounded skeleton-shimmer mt-3" />
                  <div className="h-16 rounded-xl skeleton-shimmer mt-8" />
                  <div className="h-4 w-2/3 rounded skeleton-shimmer mt-7" />
                </div>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <ScrollReveal delay={80}>
            <div className="max-w-2xl mx-auto my-6">
              <GlowingCard
                className="rounded-3xl shadow-2xl"
                innerClassName="rounded-[calc(1.5rem-1px)] p-8 sm:p-12 text-center space-y-6"
              >
                <BorderBeam duration={8} />

                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-2xl bg-orange-500/30 blur-xl animate-pulse" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/35 text-orange-400 flex items-center justify-center shadow-inner animate-float">
                    <Sparkles className="w-7 h-7" />
                  </div>
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    ยังไม่มีโปรเจกต์ในบัญชีของคุณ
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    เริ่มต้นสร้างโปรเจกต์ร้านค้าหรือสาขาแรกของคุณ เพื่อตั้งค่าข้อมูลที่ต้องการให้ AI
                    ถามลูกค้า และดูใบงานแจ้งซ่อมแยกตามร้านได้ทันที
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {[
                    { icon: Wind, label: 'ร้านแอร์' },
                    { icon: Car, label: 'อู่รถยนต์' },
                    { icon: Smartphone, label: 'ซ่อมมือถือ' },
                    { icon: Armchair, label: 'เฟอร์นิเจอร์' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300"
                      >
                        <Icon className="w-3.5 h-3.5 text-orange-400" />
                        {item.label}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <ShimmerLink to="/projects/new" className="px-6 py-3.5 text-sm">
                    <Plus className="w-4 h-4" />
                    <span>สร้างโปรเจกต์แรกของคุณ</span>
                  </ShimmerLink>
                  <ShimmerButton
                    type="button"
                    variant="dark"
                    onClick={handleLoadDemo}
                    className="px-5 py-3.5 text-xs sm:text-sm"
                  >
                    {isSeedingDemo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-orange-400" />
                    )}
                    <span>
                      {isSeedingDemo
                        ? 'กำลังสร้างโปรเจกต์ตัวอย่าง...'
                        : 'โหลดโปรเจกต์ตัวอย่างมาทดลองดู'}
                    </span>
                  </ShimmerButton>
                </div>
              </GlowingCard>
            </div>
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal delay={60}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-7">
                {[
                  {
                    label: 'ร้านค้า / สาขาทั้งหมด',
                    value: stats.total,
                    suffix: ' โปรเจกต์',
                    accent: 'text-white',
                  },
                  {
                    label: 'Chatbot เชื่อมต่อแล้ว',
                    value: stats.chatbotCount,
                    suffix: ' ร้าน',
                    accent: 'text-blue-400',
                  },
                  {
                    label: 'Voicebot เชื่อมต่อแล้ว',
                    value: stats.voicebotCount,
                    suffix: ' ร้าน',
                    accent: 'text-purple-400',
                  },
                  {
                    label: 'ความสามารถ AI ที่เปิดใช้',
                    value: stats.activeFeaturesCount,
                    suffix: ' โมดูล',
                    accent: 'text-emerald-400',
                  },
                ].map((kpi) => (
                  <GlowingCard key={kpi.label} innerClassName="p-4 sm:p-5">
                    <div className="text-xs text-slate-400">{kpi.label}</div>
                    <div className={`mt-1.5 text-xl sm:text-2xl font-extrabold font-mono ${kpi.accent}`}>
                      <NumberTicker value={kpi.value} suffix={kpi.suffix} />
                    </div>
                  </GlowingCard>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-3 rounded-2xl bg-[#0c1221]/90 border border-slate-800/90 backdrop-blur-xl">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อร้าน, สาขา, หมวดอาชีพ หรือฟิลด์ที่บอทเก็บ..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#070b14] border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="ล้างคำค้นหา"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
                  <div className="overflow-x-auto no-scrollbar">
                    <TubelightTabs<BotFilterKey>
                      activeKey={botFilter}
                      onChange={setBotFilter}
                      items={[
                        { key: 'all', label: 'ทั้งหมด', badge: projects.length },
                        {
                          key: 'full',
                          label: 'Chat + Voice',
                          badge: projects.filter((p) => p.chatbotConnected && p.voicebotConnected)
                            .length,
                        },
                        {
                          key: 'chat',
                          label: 'Chatbot',
                          badge: projects.filter((p) => p.chatbotConnected).length,
                        },
                      ]}
                    />
                  </div>

                  <div className="hidden sm:inline-flex items-center p-1 rounded-xl bg-[#070b14] border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="มุมมองการ์ด"
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-slate-800 text-orange-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="มุมมองรายการ"
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-slate-800 text-orange-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {filteredProjects.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#0e1424]/90 border border-slate-800 text-center space-y-3">
                <div className="text-base font-bold text-white">
                  ไม่พบโปรเจกต์ที่ตรงกับตัวกรองของคุณ
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  ลองเปลี่ยนคำค้นหา หรือกดแสดงโปรเจกต์ทั้งหมดอีกครั้ง
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setBotFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-orange-300 hover:bg-slate-700 cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredProjects.map((proj, idx) => {
                  const visual = getCategoryVisual(proj.category);
                  const CategoryIcon = visual.Icon;
                  const enabledCount = Object.values(proj.features).filter(Boolean).length;

                  return (
                    <ScrollReveal key={proj.id} delay={Math.min(idx * 60, 240)}>
                      <div className="block h-full group">
                        <GlowingCard
                          glowColor={visual.glow}
                          secondaryGlow={visual.secondaryGlow}
                          className="h-full"
                        >
                          <Tilt3DCard
                            maxTilt={4}
                            spotlightColor={visual.secondaryGlow}
                            className="p-6 h-full flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${visual.iconBoxClass}`}
                                  >
                                    <CategoryIcon className="w-5 h-5" />
                                  </div>
                                  <span
                                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border truncate ${visual.badgeClass}`}
                                  >
                                    {proj.category}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    ออนไลน์
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`ลบโปรเจกต์ร้านค้า ${proj.name}`}
                                    title="ลบโปรเจกต์ร้านค้า"
                                    disabled={deletingProjectId === proj.id}
                                    onClick={() => requestDeleteProject(proj)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-wait"
                                  >
                                    {deletingProjectId === proj.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              </div>
                              <Link to={`/projects/${proj.id}`} className="block">
                              <div>
                              <div className="mt-4">
                                <h2 className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                                  {proj.name}
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                                  {proj.branchName}
                                </p>
                              </div>

                              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${
                                    getChatbotState(proj) === 'connected'
                                      ? 'bg-blue-500/10 text-blue-300 border border-blue-500/25'
                                      : getChatbotState(proj) === 'pending'
                                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                                  }`}
                                >
                                  <Bot className="w-3.5 h-3.5" />
                                  Chatbot:{' '}
                                  {getChatbotState(proj) === 'connected'
                                    ? 'เชื่อมต่อแล้ว'
                                    : getChatbotState(proj) === 'pending'
                                    ? 'รอผูก Bot ID จริง'
                                    : 'ยังไม่ผูก'}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${
                                    proj.voicebotConnected
                                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/25'
                                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                                  }`}
                                >
                                  <Mic className="w-3.5 h-3.5" />
                                  Voicebot: {proj.voicebotConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ผูก'}
                                </span>
                              </div>

                              <div className="mt-4">
                                <div className="text-[11px] text-slate-400 mb-1.5">
                                  ข้อมูลที่บอทถามลูกค้า ({proj.requiredFields.length} หัวข้อ):
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {proj.requiredFields.slice(0, 4).map((field) => (
                                    <span
                                      key={field}
                                      className="text-[11px] px-2 py-0.5 rounded-md bg-[#080c17] border border-slate-800 text-slate-300"
                                    >
                                      {field}
                                    </span>
                                  ))}
                                  {proj.requiredFields.length > 4 && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-mono">
                                      +{proj.requiredFields.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                เปิดใช้ {enabledCount}/6 ฟีเจอร์ AI
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-orange-400 group-hover:translate-x-0.5 transition-transform">
                                เปิด Console
                                <ArrowUpRight className="w-4 h-4" />
                              </span>
                            </div>
                              </Link>
                          </Tilt3DCard>
                        </GlowingCard>
                      </div>
                    </ScrollReveal>
                  );
                })}

                <ScrollReveal delay={180}>
                  <Link
                    to="/projects/new"
                    className="group flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-700/90 hover:border-orange-500/60 bg-[#0b101e]/50 hover:bg-[#0e1526]/80 transition-all min-h-[260px] h-full"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-orange-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-white text-base">
                      สร้างโปรเจกต์ร้านค้า / สาขาเพิ่ม
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      ตั้งค่าฟิลด์ข้อมูลใหม่และผูก Chatbot หรือ Voicebot แยกตามสาขาได้ไม่จำกัด
                    </p>
                  </Link>
                </ScrollReveal>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map((proj) => {
                  const visual = getCategoryVisual(proj.category);
                  const CategoryIcon = visual.Icon;
                  return (
                    <div key={proj.id} className="block group">
                      <GlowingCard
                        glowColor={visual.glow}
                        secondaryGlow={visual.secondaryGlow}
                        innerClassName="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <Link
                          to={`/projects/${proj.id}`}
                          className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1"
                        >
                          <div
                            className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${visual.iconBoxClass}`}
                          >
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors truncate">
                                {proj.name}
                              </h2>
                              <span className="text-xs text-slate-400">({proj.branchName})</span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-md border ${visual.badgeClass}`}
                              >
                                {proj.category}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 truncate">
                              ข้อมูลที่บอทเก็บ: {proj.requiredFields.join(', ')}
                            </div>
                          </div>
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                              getChatbotState(proj) === 'connected'
                                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/25'
                                : getChatbotState(proj) === 'pending'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-900 text-slate-500'
                            }`}
                          >
                            Chat:{' '}
                            {getChatbotState(proj) === 'connected'
                              ? 'เชื่อมแล้ว'
                              : getChatbotState(proj) === 'pending'
                              ? 'รอผูก Bot ID จริง'
                              : 'ยังไม่ผูก'}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                              proj.voicebotConnected
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/25'
                                : 'bg-slate-900 text-slate-500'
                            }`}
                          >
                            Voice: {proj.voicebotConnected ? 'เชื่อมแล้ว' : 'ยังไม่ผูก'}
                          </span>
                          <Link
                            to={`/projects/${proj.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 pl-2"
                          >
                            จัดการ
                            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <button
                            type="button"
                            aria-label={`ลบโปรเจกต์ร้านค้า ${proj.name}`}
                            title="ลบโปรเจกต์ร้านค้า"
                            disabled={deletingProjectId === proj.id}
                            onClick={() => requestDeleteProject(proj)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-wait"
                          >
                            {deletingProjectId === proj.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            ลบ
                          </button>
                        </div>
                      </GlowingCard>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      {projectPendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismissDeleteDialog();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              dismissDeleteDialog();
              return;
            }
            if (event.key === 'Tab') {
              const focusable = event.currentTarget.querySelectorAll<HTMLButtonElement>(
                'button:not(:disabled)'
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (!first || !last) return;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            aria-describedby="delete-project-description"
            className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-rose-300/15 bg-gradient-to-br from-[#151a2a] via-[#101522] to-[#0b0f19] text-white shadow-[0_32px_100px_-24px_rgba(0,0,0,0.9)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
          >
            <div className="absolute inset-x-12 -top-20 h-40 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/50 to-transparent" />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/20 to-orange-500/10 text-rose-300 shadow-[0_8px_24px_-12px_rgba(244,63,94,0.8)]">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
                      ลบถาวร
                    </span>
                    <h2 id="delete-project-title" className="mt-1 text-lg font-bold tracking-tight">
                      ยืนยันการลบร้านค้า
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="ปิดหน้าต่างยืนยัน"
                  disabled={Boolean(deletingProjectId)}
                  onClick={dismissDeleteDialog}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p id="delete-project-description" className="mt-5 text-sm leading-6 text-slate-300">
                คุณกำลังจะลบโปรเจกต์{' '}
                <span className="font-semibold text-white">&quot;{projectPendingDelete.name}&quot;</span>
                <span className="text-slate-400"> การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>
              </p>

              <div className="mt-5 flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p className="text-xs leading-5 text-slate-300">
                  รีวิวของร้านนี้จะถูกลบ ส่วนใบงานและข้อมูลช่างจะยังอยู่ แต่จะไม่ผูกกับโปรเจกต์นี้อีก
                </p>
              </div>

              {deleteError && (
                <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  ลบโปรเจกต์ไม่สำเร็จ: {deleteError}
                </p>
              )}

              <div className="mt-7 grid grid-cols-2 gap-3">
                <button
                  ref={deleteDialogCancelRef}
                  type="button"
                  disabled={Boolean(deletingProjectId)}
                  onClick={dismissDeleteDialog}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  เก็บร้านนี้ไว้
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingProjectId)}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-gradient-to-r from-rose-600 to-red-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_28px_-12px_rgba(225,29,72,0.8)] transition-all hover:from-rose-500 hover:to-red-500 hover:shadow-[0_12px_34px_-12px_rgba(225,29,72,0.95)] disabled:cursor-wait disabled:opacity-70"
                >
                  {deletingProjectId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังลบ...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      ลบโปรเจกต์
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuroraBackground>
  );
}
