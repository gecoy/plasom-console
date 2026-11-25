import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Star } from 'lucide-react';
import { MOCK_REVIEWS, ProjectItem, SatisfactionItem } from '../mockConsoleData';
import { fetchProjectReviewsApi } from '../consoleApi';
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

function Stars({ rating }: { rating: number }) {
  const full = clampRating(rating);
  return (
    <span aria-label={`${full} จาก 5 ดาว`}>
      <span className="text-amber-400">{'★'.repeat(full)}</span>
      <span className="text-slate-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export function SatisfactionTab({ project }: Props) {
  return <SatisfactionTabContent key={project.id} project={project} />;
}

function SatisfactionTabContent({ project }: Props) {
  const isDemo = isDemoProject(project.id);
  const demoReviews = isDemo
    ? MOCK_REVIEWS.filter((r) => belongsToProject(r.projectId, project.id))
    : [];

  // ร้านจริงเริ่มจากค่าว่าง + loading ห้ามเอารีวิวปลอมมาโชว์คั่นเวลา
  const [reviews, setReviews] = useState<SatisfactionItem[]>(demoReviews);
  const [loading, setLoading] = useState(!isDemo);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => (isDemo ? new Date() : null));
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const requestId = useRef(0);

  const loadReviews = useCallback(
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
      requests.current++; // ออกจากหน้าแล้ว ทิ้งผลที่มาทีหลัง
    };
  }, [loadReviews]);

  const busy = loading || refreshing;

  const avgScore = averageRating(reviews);
  const distribution = ratingDistribution(reviews);
  const visibleReviews = filterReviewsByRating(reviews, starFilter);
  const csatOn = project.features.collectCsat;

  const toggleStar = (star: number) => setStarFilter((cur) => (cur === star ? null : star));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="w-2.5 h-6 rounded-sm bg-amber-400 inline-block" />
            <span>ความพึงพอใจลูกค้า (CSAT Reviews)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            สรุปคะแนนรีวิว 1–5 ดาว และข้อเสนอแนะจากลูกค้าหลังปิดใบงานซ่อมสำเร็จ
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            type="button"
            onClick={() => loadReviews('refresh')}
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
            onClick={() => loadReviews('refresh')}
            className="text-rose-200 underline hover:text-white cursor-pointer"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#111827] border border-slate-800 animate-pulse">
                <div className="h-3 w-1/2 rounded bg-slate-800" />
                <div className="mt-3 h-8 w-2/3 rounded bg-slate-800" />
              </div>
            ))}
          </div>
          <div className="p-10 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col items-center gap-3 text-sm text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
            <span>กำลังดึงรีวิวจากฐานข้อมูล...</span>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        !error && (
          <div className="p-12 rounded-2xl bg-[#111827] border border-slate-800 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-400" />
            </div>
            <div className="mt-4 font-bold text-white">ยังไม่มีรีวิว</div>
            <p className="mt-1 text-sm text-slate-400">
              {csatOn
                ? 'เมื่อช่างปิดงานและลูกค้าให้ดาวผ่านบอท รีวิวจะแสดงที่นี่ กด “รีเฟรชข้อมูลล่าสุด” เพื่อเช็กรีวิวใหม่'
                : 'ร้านนี้ยังปิดระบบส่งแบบประเมินอยู่ เปิดได้ที่การตั้งค่าบอทของร้าน'}
            </p>
          </div>
        )
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800">
          <div className="text-xs text-slate-400">คะแนนความพึงพอใจเฉลี่ย</div>
          <div className="mt-2 text-3xl font-bold text-amber-400">{avgScore} / 5.0</div>
          <div className="mt-1 text-sm">
            <Stars rating={Number(avgScore)} />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800">
          <div className="text-xs text-slate-400">จำนวนรีวิวทั้งหมด</div>
          <div className="mt-2 text-3xl font-bold text-white">{reviews.length} รายการ</div>
        </div>
        <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800">
          <div className="text-xs text-slate-400">สถานะระบบส่งแบบประเมิน</div>
          <div className={`mt-2 text-lg font-bold ${csatOn ? 'text-emerald-400' : 'text-rose-400'}`}>
            {csatOn ? 'เปิดส่งอัตโนมัติหลังจบงาน' : 'ปิดอยู่'}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm">สรุปคะแนนรีวิวแยกตามดาว</h3>
          <span className="text-[11px] text-slate-500">กดแถบเพื่อกรองคำติชม</span>
        </div>
        <div className="space-y-2.5">
          {distribution.map((d) => {
            const active = starFilter === d.star;
            return (
              <button
                key={d.star}
                type="button"
                onClick={() => toggleStar(d.star)}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  active ? 'bg-amber-500/10 ring-1 ring-amber-500/40' : 'hover:bg-slate-800/60'
                }`}
              >
                <span className="w-12 shrink-0 text-sm font-semibold text-slate-200">{d.star} ★</span>
                <span className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${d.percent}%` }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-slate-400">
                  {d.count} รีวิว ({d.percent}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">กรองคำติชม:</span>
          {[null, 5, 4, 3, 2, 1].map((star) => {
            const active = starFilter === star;
            return (
              <button
                key={star ?? 'all'}
                type="button"
                onClick={() => setStarFilter(star)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-900 border-amber-500'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {star === null ? `ทั้งหมด (${reviews.length})` : `${star} ★`}
              </button>
            );
          })}
        </div>

        <div className="divide-y divide-slate-800">
          {reviews.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              ยังไม่มีข้อมูลรีวิวในโปรเจกต์นี้ (รีวิวจะถูกบันทึกผ่าน Webhook หลังใบงานปิดสถานะเสร็จสิ้น)
            </div>
          ) : visibleReviews.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              ยังไม่มีรีวิว {starFilter} ดาว{' '}
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                ดูทั้งหมด
              </button>
            </div>
          ) : (
            visibleReviews.map((rv) => (
              <div key={rv.id} className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white">
                    {rv.customerName}{' '}
                    <span className="font-normal text-xs text-slate-400">
                      (ใบงาน {rv.ticketCode}) · {rv.createdAt}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{rv.comment || '— ไม่ได้เขียนคำติชม —'}</p>
                </div>
                <div className="shrink-0 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 font-bold text-sm">
                  <Stars rating={rv.rating} /> <span className="text-amber-400">({rv.rating}/5)</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
