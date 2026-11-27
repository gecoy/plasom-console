import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  Search,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { MOCK_REVIEWS, ProjectItem, SatisfactionItem } from '../mockConsoleData';
import { fetchProjectReviewsApi, readCachedReviews, createSimulatedReviewApi } from '../consoleApi';
import {
  averageRating,
  belongsToProject,
  clampRating,
  filterReviewsByRating,
  formatClock,
  isDemoProject,
  ratingDistribution,
} from './tabUtils';

interface Props {
  project: ProjectItem;
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const full = clampRating(rating);
  return (
    <span className={`inline-flex items-center gap-0.5 ${size === 'lg' ? 'text-lg' : 'text-sm'}`} aria-label={`${full} จาก 5 ดาว`}>
      <span className="text-amber-400">{'★'.repeat(full)}</span>
      <span className="text-slate-700">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'slate',
}: {
  icon: typeof Star;
  label: string;
  value: string;
  detail: string;
  tone?: 'amber' | 'emerald' | 'rose' | 'slate';
}) {
  const tones = {
    amber: {
      icon: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
      accent: 'from-amber-400/80',
      value: 'text-amber-100',
    },
    emerald: {
      icon: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
      accent: 'from-emerald-400/80',
      value: 'text-emerald-100',
    },
    rose: {
      icon: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
      accent: 'from-rose-400/80',
      value: 'text-rose-100',
    },
    slate: {
      icon: 'bg-slate-700/50 text-slate-300 ring-slate-600/40',
      accent: 'from-slate-400/70',
      value: 'text-white',
    },
  };
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-[#172033] to-[#101725] p-5 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tones[tone].accent} via-transparent to-transparent`} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-slate-400">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone].icon}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className={`mt-4 text-3xl font-bold tracking-tight tabular-nums ${tones[tone].value}`}>{value}</div>
      <p className="mt-1.5 min-h-8 text-xs leading-5 text-slate-500">{detail}</p>
    </section>
  );
}

export function SatisfactionTab({ project }: Props) {
  return <SatisfactionTabContent key={project.id} project={project} />;
}

function SatisfactionTabContent({ project }: Props) {
  const isDemo = isDemoProject(project.id);
  const initialReviews = isDemo
    ? MOCK_REVIEWS.filter((r) => belongsToProject(r.projectId, project.id))
    : readCachedReviews(project.id);

  const [reviews, setReviews] = useState<SatisfactionItem[]>(initialReviews);
  const [loading, setLoading] = useState(!isDemo && initialReviews.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => (isDemo ? new Date() : null));
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const [simulating, setSimulating] = useState(false);
  const requestId = useRef(0);

  const loadReviews = useCallback(
    async (mode: 'initial' | 'refresh') => {
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
        const list = await fetchProjectReviewsApi(project.id);
        if (myRequest !== requestId.current) return;
        setReviews(list);
        setLastUpdated(new Date());
      } catch {
        if (myRequest !== requestId.current) return;
        setError('โหลดรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
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
    loadReviews('initial');
    return () => {
      requests.current++;
    };
  }, [loadReviews]);

  const busy = loading || refreshing;
  const avgScore = averageRating(reviews);
  const distribution = ratingDistribution(reviews);
  const searchedReviews = reviews.filter((review) => {
    const q = searchQuery.trim().toLocaleLowerCase();
    if (!q) return true;
    return [review.customerName, review.ticketCode, review.comment]
      .some((value) => String(value || '').toLocaleLowerCase().includes(q));
  });
  const filteredReviews = filterReviewsByRating(searchedReviews, starFilter);
  const reviewsPerPage = 5;
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / reviewsPerPage));
  const currentReviewPage = Math.min(reviewPage, totalReviewPages);
  const visibleReviews = filteredReviews.slice(
    (currentReviewPage - 1) * reviewsPerPage,
    currentReviewPage * reviewsPerPage,
  );
  const csatOn = project.features.collectCsat;
  const positiveCount = reviews.filter((review) => clampRating(review.rating) >= 4).length;
  const positivePercent = reviews.length ? Math.round((positiveCount / reviews.length) * 100) : 0;
  const followUpCount = reviews.filter((review) => clampRating(review.rating) <= 3).length;
  const followUpPercent = reviews.length ? Math.round((followUpCount / reviews.length) * 100) : 0;

  const toggleStar = (star: number) => setStarFilter((cur) => (cur === star ? null : star));

  const exportReviewsCsv = () => {
    const escapeCsv = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = [
      ['ชื่อลูกค้า', 'รหัสใบงาน', 'คะแนน', 'ความคิดเห็น', 'วันที่'],
      ...reviews.map((review) => [review.customerName, review.ticketCode, review.rating, review.comment, review.createdAt]),
    ];
    const csv = String.fromCharCode(0xfeff) + rows.map((row) => row.map(escapeCsv).join(',')).join(String.fromCharCode(13, 10));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `plasom-reviews-${project.id}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleSimulateReview = async () => {
    if (isDemo || simulating) return;
    setSimulating(true);
    setError('');
    try {
      const added = await createSimulatedReviewApi(project.id, 5);
      setReviews((prev) => [added, ...prev]);
      setLastUpdated(new Date());
    } catch {
      setError('จำลองส่งรีวิวไม่สำเร็จ (เช็กว่าเซิร์ฟเวอร์รันอยู่หรือดันโค้ดขึ้น main แล้ว)');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="relative isolate">
      <div className="relative">
      <div className="relative [filter:drop-shadow(0_0_12px_rgba(251,191,36,0.08))_drop-shadow(0_2px_8px_rgba(148,163,184,0.08))]">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.08)]">
            <Sparkles className="h-3.5 w-3.5" />
            Customer experience
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">ความพึงพอใจลูกค้า</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-[15px]">
            ภาพรวมคะแนนและเสียงตอบรับจากลูกค้าหลังปิดใบงาน เพื่อช่วยให้เห็นคุณภาพการบริการได้ชัดเจนขึ้น
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {!isDemo && (
            <button
              type="button"
              onClick={handleSimulateReview}
              disabled={busy || simulating}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-800/70 px-4 text-sm font-semibold text-slate-200 shadow-lg shadow-black/10 backdrop-blur transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Star className="h-4 w-4 text-amber-400" />
              {simulating ? 'กำลังบันทึก...' : 'สร้างรีวิวทดสอบ'}
            </button>
          )}
          <button
            type="button"
            onClick={() => loadReviews('refresh')}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 text-sm font-bold text-slate-950 shadow-[0_8px_24px_rgba(245,158,11,0.18)] transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
          </button>
        </div>
      </header>

      <div className="mt-7 flex flex-col gap-3 border-t border-slate-700/70 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 ${csatOn ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200' : 'border-slate-600 bg-slate-800/70 text-slate-300'}`}>
          <span className={`h-2 w-2 rounded-full ${csatOn ? 'bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
          <span className="font-semibold">{csatOn ? 'ระบบส่งแบบประเมินเปิดใช้งาน' : 'ระบบส่งแบบประเมินปิดอยู่'}</span>
        </div>
        {lastUpdated && <span className="text-slate-400">อัปเดตล่าสุด <span className="ml-1 font-semibold tabular-nums text-slate-200">{formatClock(lastUpdated)}</span></span>}
      </div>
      </div>
      </div>
      </section>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => loadReviews('refresh')} className="inline-flex items-center gap-1 self-start font-semibold text-rose-100 hover:text-white">
            ลองอีกครั้ง <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-[#111827]" />)}
          </div>
          <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#111827] text-sm text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
            กำลังดึงรีวิว...
          </div>
        </div>
      ) : reviews.length === 0 ? (
        !error && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-[#111827] px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-white">ยังไม่มีรีวิวจากลูกค้า</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              {csatOn
                ? 'เมื่อช่างปิดงานและลูกค้าให้คะแนนผ่านบอท รีวิวจะปรากฏในหน้านี้โดยอัตโนมัติ'
                : 'ร้านนี้ยังปิดระบบส่งแบบประเมินอยู่ สามารถเปิดใช้งานได้ที่การตั้งค่าบอทของร้าน'}
            </p>
            <button type="button" onClick={() => loadReviews('refresh')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
              <RefreshCw className="h-4 w-4" /> ตรวจสอบอีกครั้ง
            </button>
          </div>
        )
      ) : (
        <>
          <section aria-label="สรุปผลรีวิว" className="grid grid-cols-1 items-stretch gap-x-4 gap-y-4 sm:grid-cols-3">
            <MetricCard
              icon={MessageSquare}
              label="รีวิวทั้งหมด"
              value={reviews.length.toLocaleString('th-TH')}
              detail="จำนวนแบบประเมินที่ได้รับ"
            />
            <MetricCard
              icon={TrendingUp}
              label="คะแนนเชิงบวก"
              value={`${positivePercent}%`}
              detail={`${positiveCount.toLocaleString('th-TH')} จาก ${reviews.length.toLocaleString('th-TH')} รีวิว ได้ 4–5 ดาว`}
              tone="emerald"
            />
            <MetricCard
              icon={AlertCircle}
              label="รีวิวที่ควรติดตาม"
              value={followUpCount.toLocaleString('th-TH')}
              detail={`${followUpPercent}% ของรีวิวทั้งหมดได้ 1–3 ดาว`}
              tone="rose"
            />
          </section>

          <section className="grid grid-cols-1 gap-5 rounded-2xl border border-slate-800 bg-[#111827] p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-6">
            <div className="flex flex-col justify-center border-b border-slate-800 py-5 lg:border-b-0 lg:border-r lg:py-0 lg:pr-6">
              <p className="text-base font-semibold text-slate-100 sm:text-lg">คะแนนความพึงพอใจโดยรวม</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-6xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.16)] sm:text-7xl">{avgScore}</span>
                <span className="pb-2 text-base text-slate-400 sm:text-lg">/ 5 คะแนน</span>
              </div>
              <div className="mt-2 scale-110 origin-left sm:scale-125"><Stars rating={Number(avgScore)} size="lg" /></div>
              <p className="mt-4 text-sm text-slate-400 sm:text-base">คำนวณจากรีวิวทั้งหมด {reviews.length.toLocaleString('th-TH')} รายการ</p>
            </div>
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">การกระจายของคะแนน</h2>
                  <p className="mt-1 text-xs text-slate-500">เลือกคะแนนเพื่อดูรีวิวในกลุ่มนั้น</p>
                </div>
                {starFilter !== null && (
                  <button type="button" onClick={() => setStarFilter(null)} className="text-xs font-medium text-amber-300 hover:text-amber-200">
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:justify-around">
                <div className="relative h-52 w-52 shrink-0" role="group" aria-label="กราฟวงกลมการกระจายคะแนน เลือกส่วนของกราฟเพื่อกรองรีวิว">
                  <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90 overflow-visible">
                    {(() => {
                      const total = reviews.length;
                      const circumference = 2 * Math.PI * 58;
                      const colors: Record<number, string> = { 5: '#fbbf24', 4: '#34d399', 3: '#60a5fa', 2: '#fb923c', 1: '#f87171' };
                      let offset = 0;
                      return distribution.filter((d) => d.count > 0).map((d) => {
                        const length = (d.count / total) * circumference;
                        const segmentOffset = offset;
                        offset += length;
                        const active = starFilter === d.star;
                        return (
                          <circle
                            key={d.star}
                            cx="80"
                            cy="80"
                            r="58"
                            fill="none"
                            stroke={colors[d.star]}
                            strokeWidth={active ? 34 : 29}
                            strokeDasharray={`${length} ${circumference - length}`}
                            strokeDashoffset={-segmentOffset}
                            strokeLinecap="butt"
                            className="cursor-pointer transition-all duration-200 hover:opacity-80"
                            style={{ filter: `drop-shadow(0 0 4px ${colors[d.star]}) drop-shadow(0 0 9px ${colors[d.star]}99)` }}
                            opacity={starFilter !== null && !active ? 0.28 : 1}
                            onMouseEnter={() => setHoveredStar(d.star)}
                            onMouseLeave={() => setHoveredStar(null)}
                            onClick={() => toggleStar(d.star)}
                            role="button"
                            tabIndex={0}
                            aria-label={`${d.star} ดาว ${d.count} รีวิว ${d.percent} เปอร์เซ็นต์`}
                            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleStar(d.star); } }}
                          >
                            <title>{`${d.star} ดาว · ${d.count} รีวิว (${d.percent}%) — คลิกเพื่อกรอง`}</title>
                          </circle>
                        );
                      });
                    })()}
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold tabular-nums text-white">{hoveredStar === null ? reviews.length : distribution.find((d) => d.star === hoveredStar)?.count ?? 0}</span>
                    <span className="mt-1 text-xs text-slate-400">{hoveredStar === null ? 'รีวิวทั้งหมด' : `${hoveredStar} ดาว`}</span>
                    {hoveredStar !== null && <span className="mt-0.5 text-xs font-semibold text-amber-300">{distribution.find((d) => d.star === hoveredStar)?.percent ?? 0}%</span>}
                  </div>
                </div>
                <div className="w-full max-w-xs space-y-2.5">
                  {distribution.map((d) => {
                    const active = starFilter === d.star;
                    const colors: Record<number, string> = { 5: 'bg-amber-400', 4: 'bg-emerald-400', 3: 'bg-blue-400', 2: 'bg-orange-400', 1: 'bg-rose-400' };
                    return (
                      <button
                        key={d.star}
                        type="button"
                        onClick={() => toggleStar(d.star)}
                        onMouseEnter={() => setHoveredStar(d.star)}
                        onMouseLeave={() => setHoveredStar(null)}
                        aria-pressed={active}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${active ? 'bg-amber-400/10 ring-1 ring-amber-400/30' : 'hover:bg-slate-800/60'}`}
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                          <span className={`h-2.5 w-2.5 rounded-full ${colors[d.star]}`} />
                          {d.star} <span className="text-amber-400">★</span>
                        </span>
                        <span className="text-xs tabular-nums text-slate-400">{d.count} <span className="text-slate-600">({d.percent}%)</span></span>
                      </button>
                    );
                  })}
                  <p className="px-3 pt-1 text-[11px] text-slate-500">ชี้เพื่อดูรายละเอียด · คลิกส่วนกราฟหรือรายการเพื่อกรองรีวิว</p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#151f30] to-[#0e1522] shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-4 border-b border-slate-700/70 bg-slate-800/20 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.08)]"><MessageSquare className="h-5 w-5" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">เสียงตอบรับจากลูกค้า</h2>
                      <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">CUSTOMER FEEDBACK</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">รีวิวและความคิดเห็นหลังใช้บริการ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={exportReviewsCsv}
                  disabled={reviews.length === 0}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">ค้นหาชื่อลูกค้า รหัสใบงาน หรือความคิดเห็น</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setReviewPage(1); }}
                    placeholder="ค้นหาชื่อลูกค้า / รหัสใบงาน / ความคิดเห็น..."
                    className="h-10 w-full rounded-xl border border-slate-700 bg-[#0b0f19] pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} aria-label="ล้างคำค้นหา" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><Filter className="h-3.5 w-3.5" /> คะแนน</span>
                  {[null, 5, 4, 3, 2, 1].map((star) => {
                    const active = starFilter === star;
                    return (
                      <button
                        key={star ?? 'all'}
                        type="button"
                        onClick={() => { setStarFilter(star); setReviewPage(1); }}
                        aria-pressed={active}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${active ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'}`}
                      >
                        {star === null ? 'ทั้งหมด' : `${star} ★`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-slate-400 sm:px-6">
              <span>แสดง {filteredReviews.length === 0 ? 0 : ((currentReviewPage - 1) * reviewsPerPage + 1).toLocaleString('th-TH')}–{Math.min(currentReviewPage * reviewsPerPage, filteredReviews.length).toLocaleString('th-TH')} จาก {filteredReviews.length.toLocaleString('th-TH')} รีวิวที่ตรงเงื่อนไข</span>
              {(starFilter !== null || searchQuery) && (
                <button type="button" onClick={() => { setStarFilter(null); setSearchQuery(''); setReviewPage(1); }} className="font-medium text-amber-300 hover:text-amber-200">
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>

            <div className="space-y-3 px-4 pb-5 sm:px-5 sm:pb-6">
              {visibleReviews.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-400"><Search className="h-5 w-5" /></div>
                  <p className="mt-3 text-sm font-medium text-slate-200">ไม่พบรีวิวที่ตรงกับเงื่อนไข</p>
                  <p className="mt-1 text-xs text-slate-500">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองคะแนน</p>
                  <button type="button" onClick={() => { setStarFilter(null); setSearchQuery(''); setReviewPage(1); }} className="mt-4 text-xs font-semibold text-amber-300 hover:text-amber-200">ล้างตัวกรอง</button>
                </div>
              ) : (
                visibleReviews.map((rv) => (
                  <article key={rv.id} className="group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-[#121c2b]/85 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-[#172337] sm:p-5">
                    <div className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-gradient-to-b from-amber-300/80 to-amber-500/10 opacity-60 transition group-hover:opacity-100" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-600/70 bg-gradient-to-br from-slate-700 to-slate-800 text-base font-bold text-slate-100 shadow-inner">
                          {(rv.customerName || '?').trim().charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                            <h3 className="text-sm font-bold text-white">{rv.customerName || 'ลูกค้า'}</h3>
                            <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">ใบงาน {rv.ticketCode}</span>
                          </div>
                          <p className="mt-2.5 break-words text-sm leading-6 text-slate-300">{rv.comment || 'ลูกค้าไม่ได้เขียนความคิดเห็นเพิ่มเติม'}</p>
                          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><span className="h-1 w-1 rounded-full bg-slate-600" />{rv.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-amber-300/15 bg-[#0d1726]/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_12px_rgba(0,0,0,0.12)]">
                        <div className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-lg font-bold leading-none text-amber-300 tabular-nums">{Number(rv.rating).toFixed(1)}</div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex items-center gap-0.5" aria-label={`${rv.rating} จาก 5 ดาว`}>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Star key={value} className={`h-3 w-3 ${value <= clampRating(rv.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-800 text-slate-700'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium leading-none text-slate-400">คะแนนรีวิว</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {filteredReviews.length > reviewsPerPage && (
              <div className="flex flex-col gap-3 border-t border-slate-700/70 bg-slate-800/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">หน้า {currentReviewPage.toLocaleString('th-TH')} จาก {totalReviewPages.toLocaleString('th-TH')}</p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button type="button" onClick={() => setReviewPage((page) => Math.max(1, page - 1))} disabled={currentReviewPage === 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                  </button>
                  <button type="button" onClick={() => setReviewPage((page) => Math.min(totalReviewPages, page + 1))} disabled={currentReviewPage === totalReviewPages} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                    ถัดไป <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
