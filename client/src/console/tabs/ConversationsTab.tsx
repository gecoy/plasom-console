import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { ChatThread, MOCK_THREADS, ProjectItem } from '../mockConsoleData';
import { fetchProjectThreadsApi } from '../consoleApi';
import {
  avatarInitial,
  belongsToProject,
  filterThreadsByCustomer,
  formatClock,
  isDemoProject,
} from './tabUtils';

interface Props {
  project: ProjectItem;
}

/** ข้อความที่แอดมินพิมพ์ในหน้านี้ (จำลอง ยังไม่ได้บันทึกลงฐานข้อมูล) */
interface StaffDraft {
  text: string;
  time: string;
}

export function ConversationsTab({ project }: Props) {
  // key = project.id → สลับร้านแล้วคำค้นหา/ห้องที่เลือก/ข้อความจำลองเริ่มใหม่
  return <ConversationsTabContent key={project.id} project={project} />;
}

function ConversationsTabContent({ project }: Props) {
  const isDemo = isDemoProject(project.id);
  const demoThreads = isDemo
    ? MOCK_THREADS.filter((t) => belongsToProject(t.projectId, project.id))
    : [];

  // ร้านจริงเริ่มจากค่าว่าง + loading ห้ามเอาแชทปลอมมาโชว์คั่นเวลา
  const [threads, setThreads] = useState<ChatThread[]>(demoThreads);
  const [loading, setLoading] = useState(!isDemo);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => (isDemo ? new Date() : null));
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(demoThreads[0]?.id || '');
  const [staffDrafts, setStaffDrafts] = useState<Record<string, StaffDraft[]>>({});
  const [replyText, setReplyText] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const requestId = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(
    async (mode: 'initial' | 'refresh') => {
      // ครั้งแรก state เริ่มต้นถูกตั้งไว้แล้ว (loading=true, error='') จึงไม่ต้อง setState ทันที
      if (isDemo) {
        if (mode === 'refresh') setLastUpdated(new Date());
        return;
      }
      const myRequest = ++requestId.current;
      if (mode === 'refresh') {
        setRefreshing(true);
        setError('');
      }
      try {
        const list = await fetchProjectThreadsApi(project.id);
        if (myRequest !== requestId.current) return; // มีคำขอใหม่กว่าแล้ว ทิ้งผลเก่า
        setThreads(list);
        setSelectedId((cur) => (list.some((t) => t.id === cur) ? cur : list[0]?.id || ''));
        setLastUpdated(new Date());
      } catch {
        if (myRequest !== requestId.current) return;
        setError('โหลดประวัติแชทไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      } finally {
        if (myRequest === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [isDemo, project.id],
  );

  useEffect(() => {
    const requests = requestId;
    loadThreads('initial');
    return () => {
      requests.current++; // ออกจากหน้าแล้ว ทิ้งผลที่มาทีหลัง
    };
  }, [loadThreads]);

  const visibleThreads = filterThreadsByCustomer(threads, query);
  const activeThread = visibleThreads.find((t) => t.id === selectedId) || visibleThreads[0];
  const activeDrafts = activeThread ? staffDrafts[activeThread.id] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeThread?.id, activeDrafts.length]);

  const sendReply = () => {
    const text = replyText.trim();
    if (!text || !activeThread) return;
    setStaffDrafts((prev) => ({
      ...prev,
      [activeThread.id]: [...(prev[activeThread.id] || []), { text, time: formatClock(new Date()) }],
    }));
    setReplyText('');
  };

  const copyTicketCode = async (code: string) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      // บางเบราว์เซอร์/หน้าต่างที่ไม่ได้โฟกัสไม่ให้ใช้ clipboard API → ลองวิธีเก่าแทน
      const el = document.createElement('textarea');
      el.value = code;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(el);
    }
    setCopiedCode(ok ? code : `fail:${code}`);
    window.setTimeout(() => setCopiedCode(''), 2000);
  };

  const busy = loading || refreshing;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="w-2.5 h-6 rounded-sm bg-orange-500 inline-block" />
            <span>ประวัติบทสนทนาบอท (Conversations)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ตรวจสอบข้อความสนทนาระหว่างลูกค้ากับ AI Chatbot / Voicebot และใบงานที่ถูกเปิดอัตโนมัติ
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            type="button"
            onClick={() => loadThreads('refresh')}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูลล่าสุด'}
          </button>
          {lastUpdated && (
            <span className="text-[11px] text-slate-500">อัปเดตล่าสุด {formatClock(lastUpdated)}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadThreads('refresh')}
            className="text-rose-200 underline hover:text-white cursor-pointer"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {loading ? (
        <div
          role="status"
          className="grid grid-cols-1 lg:grid-cols-3 bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden min-h-[480px]"
        >
          <div className="border-r border-slate-800 p-4 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-3.5 w-2/3 rounded bg-slate-800" />
                <div className="h-3 w-full rounded bg-slate-800/70" />
                <div className="h-3 w-1/3 rounded bg-slate-800/70" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 flex flex-col items-center justify-center gap-3 text-sm text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
            <span>กำลังดึงประวัติแชทจากฐานข้อมูล...</span>
          </div>
        </div>
      ) : threads.length === 0 ? (
        !error && (
          <div className="p-12 rounded-2xl bg-[#111827] border border-slate-800 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-orange-400" />
            </div>
            <div className="mt-4 font-bold text-white">ยังไม่มีประวัติแชท</div>
            <p className="mt-1 text-sm text-slate-400">
              เมื่อลูกค้าทักบอทหรือแจ้งซ่อมเข้ามา บทสนทนาจะแสดงที่นี่ กด “รีเฟรชข้อมูลล่าสุด” เพื่อเช็กข้อความใหม่
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden min-h-[480px]">
          {/* ---------- รายชื่อห้องแชท + ช่องค้นหา ---------- */}
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
                <div className="p-6 text-center text-xs text-slate-400">ไม่พบลูกค้าชื่อ “{query.trim()}”</div>
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

          {/* ---------- ห้องอ่านแชท + ช่องตอบกลับ ---------- */}
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
                        {activeThread.channel} · {activeThread.messages.length + activeDrafts.length} ข้อความ · อัปเดต{' '}
                        {activeThread.updatedAt}
                      </div>
                    </div>
                  </div>
                  {activeThread.openedTicketCode && (
                    <button
                      type="button"
                      onClick={() => copyTicketCode(activeThread.openedTicketCode!)}
                      title="กดเพื่อคัดลอกรหัสใบงาน ไปค้นหาในแท็บใบงานได้เลย"
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 cursor-pointer"
                    >
                      {copiedCode === activeThread.openedTicketCode ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> คัดลอกแล้ว
                        </>
                      ) : copiedCode === `fail:${activeThread.openedTicketCode}` ? (
                        <>คัดลอกไม่ได้ · {activeThread.openedTicketCode}</>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> ใบงาน #{activeThread.openedTicketCode}
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[440px] p-6 space-y-4">
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

                  {activeDrafts.map((d, idx) => (
                    <div key={`staff-${idx}`} className="flex flex-col items-end">
                      <span className="text-[11px] text-sky-400 mb-1 px-1">แอดมิน (STAFF) · จำลอง</span>
                      <div className="max-w-md px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed bg-sky-600 text-white">
                        <div className="whitespace-pre-wrap break-words">{d.text}</div>
                        <div className="text-[10px] opacity-70 mt-1 text-right">{d.time}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReply();
                  }}
                  className="px-4 py-3 border-t border-slate-800 space-y-1.5"
                >
                  <div className="flex items-end gap-2">
                    <label htmlFor="staff-reply" className="sr-only">
                      พิมพ์ข้อความตอบกลับลูกค้า
                    </label>
                    <textarea
                      id="staff-reply"
                      rows={1}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่ (ไม่ส่งตอนกำลังพิมพ์ภาษาไทยด้วย IME)
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      maxLength={1000}
                      placeholder="พิมพ์ข้อความตอบกลับในนามแอดมิน..."
                      className="flex-1 resize-none px-3 py-2 rounded-lg bg-[#0b0f19] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> ส่ง
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    โหมดจำลอง: ข้อความแสดงเฉพาะหน้านี้ ยังไม่ส่งถึงลูกค้าและไม่บันทึกลงฐานข้อมูล
                  </p>
                </form>
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
