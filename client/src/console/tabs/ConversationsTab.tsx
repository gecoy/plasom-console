import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { ChatThread, MOCK_THREADS, ProjectItem } from '../mockConsoleData';
import { fetchProjectThreadsApi } from '../consoleApi';
import { avatarInitial, belongsToProject, filterThreadsByCustomer } from './tabUtils';

interface Props {
  project: ProjectItem;
}

export function ConversationsTab({ project }: Props) {
  return <ConversationsTabContent key={project.id} project={project} />;
}

function ConversationsTabContent({ project }: Props) {
  const isDemoProject = project.id.startsWith('proj-');
  const fallbackMocks = isDemoProject
    ? MOCK_THREADS.filter((t) => belongsToProject(t.projectId, project.id))
    : [];
  const [threads, setThreads] = useState<ChatThread[]>(fallbackMocks);
  const [loading, setLoading] = useState(!isDemoProject);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(fallbackMocks[0]?.id || '');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (project.id.startsWith('proj-')) return;
      try {
        const dbThreads = await fetchProjectThreadsApi(project.id);
        if (!cancelled) {
          setThreads(dbThreads);
          setSelectedId(dbThreads[0]?.id || '');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load project conversations', error);
          setThreads([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [project.id, retry]);

  const visibleThreads = filterThreadsByCustomer(threads, query);
  const activeThread = visibleThreads.find((t) => t.id === selectedId) || visibleThreads[0];

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดบทสนทนา">
        <div className="space-y-3 pb-4 border-b border-slate-800">
          <div className="h-7 w-80 max-w-full rounded skeleton-shimmer" />
          <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[480px] rounded-2xl bg-[#111827] border border-slate-800 overflow-hidden">
          <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-4">
            <div className="h-10 rounded-lg skeleton-shimmer" />
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-16 rounded-xl skeleton-shimmer" />
            ))}
          </div>
          <div className="lg:col-span-2 p-6 space-y-5">
            <div className="h-12 w-1/2 rounded-xl skeleton-shimmer" />
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={`h-16 w-2/3 rounded-2xl skeleton-shimmer ${index % 2 ? 'ml-auto' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="p-8 rounded-2xl bg-[#111827] border border-rose-500/30 text-center space-y-3"
      >
        <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
        <h2 className="text-base font-bold text-white">โหลดประวัติบทสนทนาไม่สำเร็จ</h2>
        <p className="text-sm text-slate-400">ตรวจสอบการเชื่อมต่อแล้วลองโหลดข้อมูลอีกครั้ง</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadError(false);
            setRetry((current) => current + 1);
          }}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer"
        >
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="w-2.5 h-6 rounded-sm bg-orange-500 inline-block" />
            <span>ประวัติบทสนทนาบอท (Conversations)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ตรวจสอบข้อความสนทนาระหว่างลูกค้ากับ AI Chatbot / Voicebot และใบงานที่ถูกเปิดอัตโนมัติ
          </p>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#111827] border border-slate-800 text-center text-sm text-slate-400">
          ยังไม่มีประวัติบทสนทนาในโปรเจกต์นี้ เมื่อลูกค้าแจ้งซ่อมผ่านบอทหรือสร้างใบงานใหม่ ประวัติแชทจะแสดงที่นี่อัตโนมัติ
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden min-h-[480px]">
          <div className="border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-800">
              <label htmlFor="chat-search" className="sr-only">
                ค้นหาชื่อลูกค้า
              </label>
              <div className="relative">
                <input
                  id="chat-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อลูกค้า..."
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-[#0b0f19] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="ล้างคำค้นหา"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {query ? `พบ ${visibleThreads.length} จาก ${threads.length} ห้องแชท` : `ทั้งหมด ${threads.length} ห้องแชท`}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-slate-800">
              {visibleThreads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  ไม่พบลูกค้าชื่อ “{query.trim()}”
                </div>
              ) : (
                visibleThreads.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setSelectedId(th.id)}
                    aria-current={activeThread?.id === th.id}
                    className={`w-full text-left p-4 hover:bg-slate-800/60 transition-colors cursor-pointer border-l-2 ${
                      activeThread?.id === th.id ? 'bg-slate-800/90 border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">{th.customerName}</span>
                      <span className="text-xs text-slate-400 shrink-0">{th.updatedAt}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 truncate">{th.lastMessage}</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {th.channel}
                      </span>
                      {th.openedTicketCode && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500 text-white font-mono">
                          เปิดเคส: {th.openedTicketCode}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col min-h-0 bg-[#0b0f19]/60">
            {activeThread ? (
              <>
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center shrink-0">
                      {avatarInitial(activeThread.customerName)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{activeThread.customerName}</div>
                      <div className="text-xs text-slate-400">
                        {activeThread.channel} · {activeThread.messages.length} ข้อความ · อัปเดต {activeThread.updatedAt}
                      </div>
                    </div>
                  </div>
                  {activeThread.openedTicketCode && (
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
                      ใบงาน #{activeThread.openedTicketCode}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[520px] p-6 space-y-4">
                  {activeThread.messages.map((m, idx) => {
                    const isBot = m.sender === 'BOT';
                    return (
                      <div key={idx} className={`flex flex-col ${isBot ? 'items-end' : 'items-start'}`}>
                        <span className="text-[11px] text-slate-500 mb-1 px-1">
                          {isBot ? 'บอท' : activeThread.customerName}
                        </span>
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isBot
                              ? 'bg-orange-500 text-white rounded-br-sm'
                              : 'bg-[#111827] border border-slate-700 text-slate-100 rounded-bl-sm'
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          <div className="text-[10px] opacity-70 mt-1 text-right">{m.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
                  ประวัติย้อนหลังแบบอ่านอย่างเดียว · ข้อความถูกบันทึกจากฐานข้อมูลจริง
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-10 text-sm text-slate-400">
                เลือกห้องแชทด้านซ้ายเพื่ออ่านบทสนทนา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
