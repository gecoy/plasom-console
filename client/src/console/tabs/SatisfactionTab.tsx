import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { MOCK_REVIEWS, ProjectItem, SatisfactionItem } from '../mockConsoleData';
import { fetchProjectReviewsApi } from '../consoleApi';
import {
  averageRating,
  belongsToProject,
  clampRating,
  filterReviewsByRating,
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
  const isDemoProject = project.id.startsWith('proj-');
  const fallbackMocks = isDemoProject
    ? MOCK_REVIEWS.filter((r) => belongsToProject(r.projectId, project.id))
    : [];
  const [reviews, setReviews] = useState<SatisfactionItem[]>(fallbackMocks);
  const [loading, setLoading] = useState(!isDemoProject);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (project.id.startsWith('proj-')) return;
      try {
        const dbReviews = await fetchProjectReviewsApi(project.id);
        if (!cancelled) {
          setReviews(dbReviews);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load project reviews', error);
          setReviews([]);
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

  const avgScore = averageRating(reviews);
  const distribution = ratingDistribution(reviews);
  const visibleReviews = filterReviewsByRating(reviews, starFilter);
  const csatOn = project.features.collectCsat;

  const toggleStar = (star: number) => setStarFilter((cur) => (cur === star ? null : star));

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดรีวิว">
        <div className="space-y-3 pb-4 border-b border-slate-800">
          <div className="h-7 w-80 max-w-full rounded skeleton-shimmer" />
          <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-28 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-4 rounded skeleton-shimmer" />
          ))}
        </div>
        <div className="h-56 rounded-2xl skeleton-shimmer" />
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
        <h2 className="text-base font-bold text-white">โหลดข้อมูลรีวิวไม่สำเร็จ</h2>
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
            <span className="w-2.5 h-6 rounded-sm bg-amber-400 inline-block" />
            <span>ความพึงพอใจลูกค้า (CSAT Reviews)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            สรุปคะแนนรีวิว 1–5 ดาว และข้อเสนอแนะจากลูกค้าหลังปิดใบงานซ่อมสำเร็จ
          </p>
        </div>
      </div>

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
    </div>
  );
}
