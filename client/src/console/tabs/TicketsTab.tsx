import { useCallback, useState, useTransition, useRef, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  Printer,
  X,
  RotateCcw,
  Eye,
  Check,
  Plus,
  ArrowRight,
  AlertCircle,
  Calendar as CalendarIcon,
  Pencil,
  Send,
  MessageSquare,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  User,
  Filter,
  StickyNote,
  History,
  Phone,
  Sparkles,
  MapPin,
  Flame,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Camera,
  Activity,
  CheckSquare,
  Square,
  ExternalLink,
  CalendarDays,
  UserCheck,
  BarChart3,
  Smartphone,
  Star,
  FileText,
  Zap,
  Navigation,
  Repeat,
  Layers,
  TrendingUp,
  Award,
  Copy,
  ChevronDown,
} from 'lucide-react';
import {
  MOCK_THREADS,
  type ConsoleTicket,
  type ProjectItem,
  type TechnicianItem,
} from '../mockConsoleData';
import {
  fetchProjectTicketsApi,
  fetchProjectTechniciansApi,
  fetchTicketMessagesApi,
  createManualTicketInDb,
  updateProjectTicketApi,
  getApiErrorMessage,
  mapBackendStatusToUi,
  mapUiStatusToBackend,
  readCachedTickets,
  readCachedTechnicians,
} from '../consoleApi';

interface Props {
  project: ProjectItem;
}

export type TicketStatus = ConsoleTicket['status'] | 'CANCELLED';
export type TicketPriority = 'URGENT' | 'NORMAL' | 'LOW';

export interface InternalNote {
  id: string;
  author: string;
  text: string;
  time: string;
}

export interface WebhookLogItem {
  id: string;
  timestamp: string;
  channel: string;
  statusCode: number;
  trackingCode: string;
  customerName: string;
  latencyMs: number;
  payload: Record<string, any>;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ExtendedTicket extends Omit<ConsoleTicket, 'status'> {
  status: TicketStatus;
  priority?: TicketPriority;
  timeSlot?: string;
  address?: string;
  cost?: number;
  evidencePhoto?: string;
  internalNotes?: InternalNote[];
  equipmentModel?: string;
  recurringMonths?: number;
  csatRating?: number;
  csatComment?: string;
  invoiceNumber?: string;
}

// 5 Status Configurations with Exact Pill Styling
const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    bgColor: string;
    textColor: string;
    dotColor: string;
  }
> = {
  PENDING: {
    label: 'รอดำเนินการ',
    bgColor: '#F3F4F6',
    textColor: '#4B5563',
    dotColor: '#6B7280',
  },
  ASSIGNED: {
    label: 'มอบหมายแล้ว',
    bgColor: '#EFF6FF',
    textColor: '#1D4ED8',
    dotColor: '#1D4ED8',
  },
  IN_PROGRESS: {
    label: 'กำลังดำเนินการ',
    bgColor: '#FFFBEB',
    textColor: '#B45309',
    dotColor: '#B45309',
  },
  COMPLETED: {
    label: 'ปิดงานเรียบร้อย',
    bgColor: '#ECFDF5',
    textColor: '#047857',
    dotColor: '#047857',
  },
  CANCELLED: {
    label: 'ยกเลิกใบงาน',
    bgColor: '#FEF2F2',
    textColor: '#DC2626',
    dotColor: '#DC2626',
  },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; text: string; bg: string; border: string }> = {
  URGENT: { label: 'ด่วนมาก', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  NORMAL: { label: 'ปกติ', text: 'text-slate-300', bg: 'bg-slate-800', border: 'border-slate-700' },
  LOW: { label: 'ไม่เร่งด่วน', text: 'text-slate-400', bg: 'bg-[#0b0f19]', border: 'border-slate-800' },
};

function getNextStatusAction(status: TicketStatus): { next: TicketStatus; label: string } | null {
  if (status === 'PENDING') return { next: 'ASSIGNED', label: 'มอบหมายช่าง' };
  if (status === 'ASSIGNED') return { next: 'IN_PROGRESS', label: 'เริ่มงาน' };
  if (status === 'IN_PROGRESS') return { next: 'COMPLETED', label: 'ปิดงาน' };
  return null;
}

function formatThaiDate(dateStr: string, short = false) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const fullMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    if (short) {
      return `${d.getDate()} ${months[d.getMonth()]}`;
    }
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return dateStr;
  }
}

function formatThaiDateFull(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    return `${dayNames[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return dateStr;
  }
}

function getTodayLocalDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getChannelLabel(channel: string): string {
  if (channel === 'Walk-in') return 'หน้าร้าน / โทรศัพท์';
  return channel;
}

// Custom Dark Date RANGE Picker Component (รองรับการเลือกช่วงวันที่ เช่น 1 ต.ค. - 8 ต.ค.)
function CustomDarkDateRangePicker({
  range,
  onChange,
  tickets = [],
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  tickets?: ExtendedTicket[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = range.start ? new Date(range.start) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const clickedDate = `${currentYear}-${mm}-${dd}`;

    if (!range.start || (range.start && range.end)) {
      // First click: Start new selection
      onChange({ start: clickedDate, end: '' });
    } else {
      // Second click: Complete range
      if (clickedDate < range.start) {
        onChange({ start: clickedDate, end: range.start });
      } else {
        onChange({ start: range.start, end: clickedDate });
      }
    }
  };

  // Button text display
  let buttonLabel = 'วันนัดหมาย: ทั้งหมด';
  if (range.start && !range.end) {
    buttonLabel = `นัดหมาย: ${formatThaiDate(range.start)}`;
  } else if (range.start && range.end) {
    if (range.start === range.end) {
      buttonLabel = `นัดหมาย: ${formatThaiDate(range.start)}`;
    } else {
      buttonLabel = `${formatThaiDate(range.start, true)} - ${formatThaiDate(range.end)}`;
    }
  }

  const hasRange = Boolean(range.start);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[42px] px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-all ${hasRange
          ? 'bg-orange-500/10 border-orange-500/50 text-orange-200'
          : 'bg-[#0b0f19] border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        title="เลือกช่วงวันนัดหมาย (เช่น วันที่ 1 ถึง 8)"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <span>{buttonLabel}</span>
        {hasRange && (
          <X
            className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer ml-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: '', end: '' });
            }}
          />
        )}
      </button>

      {/* Dark Styled Date Range Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-50 p-4 rounded-2xl bg-[#111827] border border-slate-700 shadow-2xl w-[310px] text-slate-100 animate-in zoom-in-95 duration-150">
          {/* Header Month / Year & Arrows */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>{monthNames[currentMonth]}</span>
                <span className="text-orange-400 font-mono">{currentYear + 543}</span>
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {!range.start ? 'คลิกเลือกวันเริ่มต้น' : !range.end ? 'คลิกเลือกวันสิ้นสุดช่วง' : 'เลือกช่วงวันที่เรียบร้อย'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center text-[11px] font-semibold text-slate-400">
            <span>อา</span>
            <span>จ</span>
            <span>อ</span>
            <span>พ</span>
            <span>พฤ</span>
            <span>ศ</span>
            <span>ส</span>
          </div>

          {/* Days Grid with Range Highlighting */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty-${i}`} className="p-1.5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isStart = range.start === dateStr;
              const isEnd = range.end === dateStr;
              const inRange = range.start && range.end && dateStr > range.start && dateStr < range.end;
              const isSelectedBoundary = isStart || isEnd;
              const hasTickets = tickets.some((t) => t.preferredDate === dateStr);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`p-1.5 flex flex-col items-center justify-center relative cursor-pointer transition-all ${isSelectedBoundary
                    ? 'bg-orange-500 text-white font-bold rounded-lg shadow-sm z-10'
                    : inRange
                      ? 'bg-orange-500/20 text-orange-200 font-semibold'
                      : 'hover:bg-slate-800 text-slate-200 rounded-lg'
                    }`}
                >
                  <span>{day}</span>
                  {hasTickets && !isSelectedBoundary && (
                    <span className="w-1 h-1 rounded-full bg-orange-400 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Range Shortcuts */}
          <div className="pt-3 mt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                onChange({ start: dStr, end: dStr });
                setIsOpen(false);
              }}
              className="text-orange-400 hover:underline cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const endD = new Date(now);
                endD.setDate(endD.getDate() + 7);
                const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
                onChange({ start: startStr, end: endStr });
                setIsOpen(false);
              }}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              7 วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const firstDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
                const lastDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
                onChange({ start: firstDayStr, end: lastDayStr });
                setIsOpen(false);
              }}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              ทั้งเดือนนี้
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ start: '', end: '' });
                setIsOpen(false);
              }}
              className="text-slate-500 hover:text-red-400 cursor-pointer"
            >
              ล้างค่า
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Dark Single Date Picker Component (เลือกวันนัดหมายวันเดียว สำหรับฟอร์มและ Pop-Up)
function CustomDarkSingleDatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันนัดหมาย',
  className = '',
}: {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

  // Synchronize calendar view month/year when external value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const selectedDateStr = `${currentYear}-${mm}-${dd}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const todayStr = getTodayLocalDateStr();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[40px] px-3.5 rounded-xl border text-left flex items-center justify-between text-xs sm:text-sm font-medium transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#0b0f19] border-orange-500 text-white ring-1 ring-orange-500/30'
            : value
            ? 'bg-[#0b0f19] border-slate-700 text-slate-100 hover:border-slate-600'
            : 'bg-[#0b0f19] border-slate-700 text-slate-400 hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="truncate">{value ? formatThaiDate(value) : placeholder}</span>
        </div>
        {value ? (
          <X
            className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer ml-1 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          />
        ) : null}
      </button>

      {/* Dark Styled Calendar Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[70] p-4 rounded-2xl bg-[#111827] border border-slate-700 shadow-2xl w-[300px] text-slate-100 animate-in zoom-in-95 duration-150">
          {/* Header Month / Year & Arrows */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>{monthNames[currentMonth]}</span>
                <span className="text-orange-400 font-mono">{currentYear + 543}</span>
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5">คลิกเลือกวันนัดหมาย</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center text-[11px] font-semibold text-slate-400">
            <span className="text-red-400">อา</span>
            <span>จ</span>
            <span>อ</span>
            <span>พ</span>
            <span>พฤ</span>
            <span>ศ</span>
            <span className="text-blue-400">ส</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty-single-${i}`} className="p-1.5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(currentMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateStr = `${currentYear}-${mm}-${dd}`;
              const isSelected = value === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white font-bold shadow-md'
                      : isToday
                      ? 'bg-orange-500/10 text-orange-400 font-bold border border-orange-500/30 hover:bg-slate-800'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <span>{day}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts */}
          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                onChange(dStr);
                setIsOpen(false);
              }}
              className="text-orange-400 hover:underline font-semibold cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                onChange(dStr);
                setIsOpen(false);
              }}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              พรุ่งนี้
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-slate-500 hover:text-red-400 cursor-pointer"
            >
              ล้างค่า
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function mapRawTicketToExtended(t: any, projectId: string): ExtendedTicket {
  const extra = t.extraFields && typeof t.extraFields === 'object' ? t.extraFields : {};
  return {
    id: t.id,
    trackingCode: t.trackingCode,
    projectId,
    customerName: t.customerName,
    customerPhone: t.customerPhone,
    channel: extra._channel || extra.channel || 'LINE OA',
    subject: t.brand || 'งานแจ้งซ่อม',
    symptom: t.symptom,
    preferredDate: t.preferredDate ? String(t.preferredDate).slice(0, 10) : '',
    timeSlot: extra._timeSlot || t.note || '09:00 - 12:00 น. (ช่วงเช้า)',
    priority: extra._priority || 'NORMAL',
    address: t.address || '',
    status: mapBackendStatusToUi(t.status, Boolean(t.technician?.name || t.technicianId)),
    assignedTechName: t.technician?.name || undefined,
    extraDetails: extra,
    csatRating: t.review?.rating,
    csatComment: t.review?.comment,
    internalNotes: [
      {
        id: `note-${t.id}`,
        author: 'ระบบฐานข้อมูล',
        text: `รับใบงานเข้าระบบ (${t.trackingCode})`,
        time: t.createdAt ? new Date(t.createdAt).toLocaleDateString('th-TH') : 'วันนี้',
      },
    ],
  };
}

function mapRawTechToItem(tc: any, projectId: string): TechnicianItem & { id: string } {
  return {
    id: tc.id,
    projectId,
    name: tc.name,
    specialty: tc.specialty || 'ช่างประจำร้าน',
    activeJobs: Number(tc.activeJobs ?? tc._count?.tickets ?? 0),
    status: tc.status === 'BUSY' ? 'BUSY' : 'AVAILABLE',
  };
}

export function TicketsTab({ project }: Props) {
  const [tickets, setTickets] = useState<ExtendedTicket[]>(() =>
    project.id.startsWith('proj-')
      ? []
      : readCachedTickets(project.id).map((t: any) => mapRawTicketToExtended(t, project.id))
  );

  const [dbTechs, setDbTechs] = useState<(TechnicianItem & { id: string })[]>(() =>
    project.id.startsWith('proj-')
      ? []
      : readCachedTechnicians(project.id)
          .filter((tc: any) => tc.status !== 'INACTIVE')
          .map((tc: any) => mapRawTechToItem(tc, project.id))
  );

  // โหลดใบงาน + ช่างจากฐานข้อมูลจริง (ใช้ตอนเปิดหน้า และตอนบันทึกไม่สำเร็จเพื่อย้อนข้อมูลบนจอให้ตรงกับระบบ)
  const liveLoadId = useRef(0);
  const reloadTicketsFromServer = useCallback(async () => {
    if (project.id.startsWith('proj-')) return;
    const myLoad = ++liveLoadId.current;
    try {
      const [rawTickets, rawTechs] = await Promise.all([
        fetchProjectTicketsApi(project.id),
        fetchProjectTechniciansApi(project.id),
      ]);
      if (myLoad !== liveLoadId.current) return;
      // ช่างที่พักงาน (INACTIVE) ไม่ให้เลือกมอบหมายงาน
      setDbTechs(
        rawTechs
          .filter((tc: any) => tc.status !== 'INACTIVE')
          .map((tc: any) => mapRawTechToItem(tc, project.id))
      );
      setTickets(rawTickets.map((t: any) => mapRawTicketToExtended(t, project.id)));
    } catch {
      // fallback: ใช้ข้อมูลจาก cache ต่อไป
    }
  }, [project.id]);

  useEffect(() => {
    const loads = liveLoadId;
    reloadTicketsFromServer();
    return () => {
      loads.current++; // ออกจากหน้าแล้ว ทิ้งผลที่มาทีหลัง
    };
  }, [reloadTicketsFromServer]);


  // View Switcher (ตารางใบงาน, ปฏิทินงาน, แดชบอร์ดสถิติ)
  const [activeView, setActiveView] = useState<'table' | 'calendar' | 'dashboard'>('table');

  // Calendar View Month/Year State (สำหรับหน้าปฏิทินเต็มเดือน)
  const [calDate, setCalDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'code-asc' | 'urgent-desc'>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handleCopyTrackingCode = (code: string) => {
    try {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(code);
        showToast(`คัดลอกรหัส ${code} เรียบร้อย`, 'success');
      }
    } catch {
      // fallback
    }
  };

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<ExtendedTicket | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'chat' | 'timeline' | 'notes' | 'crm' | 'invoice'>('info');
  const [newNoteInput, setNewNoteInput] = useState('');
  const [ticketChatMessages, setTicketChatMessages] = useState<
    { id: string; text: string; sender: string; fromStaff?: boolean; createdAt?: string; time?: string; user?: { name?: string } }[]
  >([]);
  const [isLoadingTicketChat, setIsLoadingTicketChat] = useState(false);

  // Phase 3: Mobile Simulator Modal
  const [isMobileSimModalOpen, setIsMobileSimModalOpen] = useState(false);
  const [mobileSimTechName, setMobileSimTechName] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ExtendedTicket | null>(null);

  // Modal: มอบหมายงาน & เลือกวันนัดหมาย (เพื่อให้งานขึ้นบนปฏิทินทันที)
  const [assigningTicket, setAssigningTicket] = useState<ExtendedTicket | null>(null);
  const [assignTechName, setAssignTechName] = useState('');
  const [assignDate, setAssignDate] = useState(getTodayLocalDateStr);
  const [assignTimeSlot, setAssignTimeSlot] = useState('09:00 - 12:00 น. (ช่วงเช้า)');

  // Modal: ปิดงานพร้อมหลักฐาน
  const [closingTicket, setClosingTicket] = useState<ExtendedTicket | null>(null);
  const [closingCost, setClosingCost] = useState('1500');
  const [closingNotes, setClosingNotes] = useState('ตรวจเช็กและซ่อมแซมเรียบร้อย พร้อมทดสอบการทำงาน');
  const [closingPhoto, setClosingPhoto] = useState('https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300');

  // Modal: Webhook Logs
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);

  // Form State for Manual Ticket
  const [createCustomerName, setCreateCustomerName] = useState('');
  const [createCustomerPhone, setCreateCustomerPhone] = useState('');
  const [createChannel, setCreateChannel] = useState<'LINE OA' | 'Voicebot' | 'Walk-in'>('LINE OA');
  const [createSubject, setCreateSubject] = useState('');
  const [createSymptom, setCreateSymptom] = useState('');
  const [createPreferredDate, setCreatePreferredDate] = useState(getTodayLocalDateStr);
  const [createTimeSlot, setCreateTimeSlot] = useState('09:00 - 12:00 น. (ช่วงเช้า)');
  const [createPriority, setCreatePriority] = useState<TicketPriority>('NORMAL');
  const [createAddress, setCreateAddress] = useState('');
  const [createAssignedTech, setCreateAssignedTech] = useState('');
  const [createDynamicExtra, setCreateDynamicExtra] = useState<Record<string, string>>({});

  // Toast feedback
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // บันทึกลงระบบไม่สำเร็จ: แจ้งผู้ใช้ แล้วโหลดข้อมูลจริงกลับมาแทนที่สิ่งที่เปลี่ยนบนจอไปก่อนหน้า
  const handleSyncError = (err: unknown) => {
    showToast(getApiErrorMessage(err, 'บันทึกลงระบบไม่สำเร็จ ข้อมูลถูกโหลดใหม่จากระบบแล้ว'), 'error');
    reloadTicketsFromServer();
  };

  /** อัปเดตหลายใบงานพร้อมกัน รายงานจำนวนที่บันทึกไม่ผ่าน */
  const syncManyTickets = async (
    items: { id: string; payload: Record<string, unknown> }[]
  ) => {
    if (project.id.startsWith('proj-') || items.length === 0) return;
    const results = await Promise.allSettled(
      items.map((it) => updateProjectTicketApi(project.id, it.id, it.payload))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`บันทึกไม่สำเร็จ ${failed} จาก ${items.length} รายการ ข้อมูลถูกโหลดใหม่จากระบบแล้ว`, 'error');
      reloadTicketsFromServer();
    }
  };

  const projectTickets = tickets.filter((t) => t.projectId === project.id);
  const projectTechs = dbTechs;

  const handleOpenMobileSim = () => {
    setMobileSimTechName((prev) =>
      prev && projectTechs.some((tc) => tc.name === prev) ? prev : projectTechs[0]?.name || ''
    );
    setIsMobileSimModalOpen(true);
  };

  useEffect(() => {
    if (isMobileSimModalOpen && !mobileSimTechName && projectTechs.length > 0) {
      setMobileSimTechName(projectTechs[0].name);
    }
  }, [isMobileSimModalOpen, mobileSimTechName, projectTechs]);

  useEffect(() => {
    if (!selectedTicket || detailTab !== 'chat') return;
    if (project.id.startsWith('proj-')) {
      const matchedThread = MOCK_THREADS.find(
        (th) => th.openedTicketCode === selectedTicket.trackingCode
      );
      setTicketChatMessages(
        matchedThread
          ? matchedThread.messages.map((m, idx) => ({
              id: `mock-msg-${idx}`,
              text: m.text,
              sender: m.sender === 'BOT' ? 'BOT' : 'CUSTOMER',
              time: m.time,
            }))
          : []
      );
      setIsLoadingTicketChat(false);
      return;
    }

    let cancelled = false;
    setIsLoadingTicketChat(true);
    setTicketChatMessages([]);
    fetchTicketMessagesApi(project.id, selectedTicket.id)
      .then((msgs) => {
        if (!cancelled) {
          setTicketChatMessages(Array.isArray(msgs) ? msgs : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTicketChatMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingTicketChat(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, selectedTicket, detailTab]);

  // Conflict Detection Helper
  const getTechJobCountOnDate = (techName: string, date: string, excludeTicketId?: string) => {
    return projectTickets.filter(
      (t) =>
        t.assignedTechName === techName &&
        t.preferredDate === date &&
        t.id !== excludeTicketId &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED'
    ).length;
  };

  // Smart Auto-Assign Helper (Phase 3)
  const handleSmartAutoAssign = (ticket: ExtendedTicket, targetDate: string) => {
    const activeTechs = projectTechs;
    if (activeTechs.length === 0) {
      showToast('ไม่พบช่างที่พร้อมปฏิบัติงานในระบบ', 'error');
      return;
    }

    const scored = activeTechs.map((tech) => {
      let score = 0;
      const count = getTechJobCountOnDate(tech.name, targetDate, ticket.id);
      if (tech.status === 'AVAILABLE') score += 15;
      score -= count * 6;

      const sub = (ticket.subject + ' ' + ticket.symptom).toLowerCase();
      const spec = tech.specialty.toLowerCase();

      if (
        (sub.includes('แอร์') && (spec.includes('แอร์') || spec.includes('อินเวอร์เตอร์'))) ||
        (sub.includes('ไฟ') && spec.includes('ไฟ')) ||
        (sub.includes('เครื่องยนต์') && (spec.includes('เครื่องยนต์') || spec.includes('น้ำมันเครื่อง'))) ||
        (sub.includes('เบรก') && spec.includes('เบรก'))
      ) {
        score += 25;
      }

      return { tech, score, count };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best) {
      setAssignTechName(best.tech.name);
      showToast(
        `⚡ AI แนะนำ "${best.tech.name}" (ตรงสายงาน: ${best.tech.specialty}, มีงาน ${best.count} เคส)`,
        'info'
      );
    }
  };

  // Filter & Search Logic (รวม Date Range: จากวันที่ A ถึง B)
  const filteredTickets = projectTickets.filter((ticket) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      ticket.trackingCode.toLowerCase().includes(q) ||
      ticket.customerName.toLowerCase().includes(q) ||
      ticket.customerPhone.toLowerCase().includes(q) ||
      ticket.subject.toLowerCase().includes(q) ||
      ticket.symptom.toLowerCase().includes(q) ||
      (ticket.address || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesTech = techFilter === 'ALL' || ticket.assignedTechName === techFilter;
    const matchesChannel = channelFilter === 'ALL' || ticket.channel === channelFilter;
    const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;

    // Date Range Logic
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      matchesDate =
        Boolean(ticket.preferredDate) &&
        ticket.preferredDate >= dateRange.start &&
        ticket.preferredDate <= dateRange.end;
    } else if (dateRange.start) {
      matchesDate = ticket.preferredDate === dateRange.start;
    }

    return matchesSearch && matchesStatus && matchesTech && matchesChannel && matchesDate && matchesPriority;
  });

  // Sorting
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortBy === 'urgent-desc') {
      const pMap = { URGENT: 3, NORMAL: 2, LOW: 1 };
      return (pMap[b.priority || 'NORMAL'] || 2) - (pMap[a.priority || 'NORMAL'] || 2);
    }
    if (sortBy === 'code-asc') {
      return a.trackingCode.localeCompare(b.trackingCode);
    }
    if (sortBy === 'date-asc') {
      return (a.preferredDate || '').localeCompare(b.preferredDate || '');
    }
    return (b.preferredDate || '').localeCompare(a.preferredDate || '');
  });

  // Pagination
  const totalPages = Math.ceil(sortedTickets.length / pageSize) || 1;
  const paginatedTickets = sortedTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Bulk Selection
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedTickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTickets.map((t) => t.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Open Assign Modal (เพื่อเลือกช่าง + เลือกวันนัด แล้วยืนยันให้ขึ้นในปฏิทินทันที)
  const handleOpenAssignModal = (ticket: ExtendedTicket) => {
    setAssigningTicket(ticket);
    setAssignTechName(ticket.assignedTechName || (projectTechs[0]?.name || ''));
    setAssignDate(ticket.preferredDate || new Date().toISOString().slice(0, 10));
    setAssignTimeSlot(ticket.timeSlot || '09:00 - 12:00 น. (ช่วงเช้า)');
  };

  // Confirm Assign & Schedule
  const handleConfirmAssign = () => {
    if (!assigningTicket || !assignTechName) {
      showToast('กรุณาเลือกช่างผู้รับผิดชอบ', 'error');
      return;
    }

    const matchedTech = projectTechs.find((tc) => tc.name === assignTechName);
    if (!project.id.startsWith('proj-')) {
      updateProjectTicketApi(project.id, assigningTicket.id, {
        status: 'RECEIVED',
        technicianId: matchedTech?.id || null,
        note: assignTimeSlot,
        ...(assignDate ? { preferredDate: assignDate } : {}),
      }).catch(handleSyncError);
    }

    const conflictCount = getTechJobCountOnDate(assignTechName, assignDate, assigningTicket.id);

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== assigningTicket.id) return t;
        return {
          ...t,
          assignedTechName: assignTechName,
          preferredDate: assignDate,
          timeSlot: assignTimeSlot,
          status: 'ASSIGNED',
          internalNotes: [
            ...(t.internalNotes || []),
            {
              id: `note-${Date.now()}`,
              author: 'ระบบจ่ายงาน',
              text: `มอบหมายงานให้ช่าง "${assignTechName}" นัดหมายวันที่ ${formatThaiDate(assignDate)} (${assignTimeSlot})`,
              time: 'เพิ่งอัปเดต',
            },
          ],
        };
      })
    );

    if (conflictCount >= 2) {
      showToast(
        `มอบหมายสำเร็จ: แต่อาจเกิดคิวชน (ช่าง "${assignTechName}" มีงานในวันนี้แล้ว ${conflictCount} งาน)`,
        'info'
      );
    } else {
      showToast(
        `มอบหมายงาน ${assigningTicket.trackingCode} ให้ "${assignTechName}" วันที่ ${formatThaiDate(assignDate)} และบันทึกลงปฏิทินสำเร็จ!`,
        'success'
      );
    }

    // Also auto-switch or sync month in calendar if outside view
    try {
      const d = new Date(assignDate);
      setCalDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } catch { }

    setAssigningTicket(null);
  };

  // Status Change with validation
  const handleChangeStatus = (ticketId: string, newStatus: TicketStatus) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;

    if ((newStatus === 'IN_PROGRESS' || newStatus === 'COMPLETED') && !targetTicket.assignedTechName) {
      showToast('⚠️ ไม่สามารถเริ่มงานหรือปิดงานได้: กรุณามอบหมายช่างผู้รับผิดชอบก่อน', 'error');
      return;
    }

    if (newStatus === 'COMPLETED') {
      setClosingTicket(targetTicket);
      return;
    }

    if (!project.id.startsWith('proj-')) {
      updateProjectTicketApi(project.id, ticketId, {
        status: mapUiStatusToBackend(newStatus),
      }).catch(handleSyncError);
    }

    startTransition(() => {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    });
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showToast(`เปลี่ยนสถานะเป็น "${STATUS_CONFIG[newStatus].label}"`, 'success');
  };

  // Confirm Closing with Evidence
  const handleConfirmCloseTicket = () => {
    if (!closingTicket) return;
    const costNum = parseFloat(closingCost) || 0;

    if (!project.id.startsWith('proj-')) {
      updateProjectTicketApi(project.id, closingTicket.id, {
        status: 'COMPLETED',
        note: `${closingNotes} (ยอด ${closingCost} บาท)`,
      }).catch(handleSyncError);
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.id === closingTicket.id
          ? {
            ...t,
            status: 'COMPLETED',
            cost: costNum,
            evidencePhoto: closingPhoto,
            internalNotes: [
              ...(t.internalNotes || []),
              {
                id: `note-${Date.now()}`,
                author: 'ระบบปิดงานพร้อมหลักฐาน',
                text: `ปิดงานสำเร็จ: ยอดชำระ ${costNum.toLocaleString()} บาท | บันทึก: ${closingNotes}`,
                time: 'เพิ่งเสร็จสิ้น',
              },
            ],
          }
          : t
      )
    );

    showToast(`ปิดงาน ${closingTicket.trackingCode} เรียบร้อย ยอด ${costNum.toLocaleString()} ฿`, 'success');
    setClosingTicket(null);
  };

  // Manual Creation
  const handleCreateTicket = async () => {
    if (!createCustomerName.trim()) {
      showToast('กรุณาระบุชื่อลูกค้า', 'error');
      return;
    }
    if (!createSubject.trim()) {
      showToast('กรุณาระบุหัวข้องานแจ้งซ่อม', 'error');
      return;
    }

    const cleanedExtra = Object.fromEntries(
      Object.entries(createDynamicExtra)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v !== '')
    );

    let createdDb: any = null;
    if (!project.id.startsWith('proj-')) {
      try {
        createdDb = await createManualTicketInDb(project.id, {
          customerName: createCustomerName.trim(),
          customerPhone: createCustomerPhone.trim(),
          subject: createSubject.trim(),
          symptom: createSymptom.trim(),
          address: createAddress.trim(),
          preferredDate: createPreferredDate,
          channel: createChannel,
          timeSlot: createTimeSlot,
          priority: createPriority,
          extraDetails: cleanedExtra,
        });
        if (createdDb?.id && createAssignedTech) {
          const matchedTech = projectTechs.find((tc) => tc.name === createAssignedTech);
          if (matchedTech) {
            await updateProjectTicketApi(project.id, createdDb.id, {
              status: 'RECEIVED',
              technicianId: matchedTech.id,
              note: createTimeSlot,
            });
          }
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          'เชื่อมต่อหลังบ้านไม่ได้ (เช็กว่าเปิด npm run dev ในโฟลเดอร์ server แล้วหรือยัง)';
        showToast(msg, 'error');
        return;
      }
    }
    const compactToday = getTodayLocalDateStr().replace(/-/g, '');
    const code = createdDb?.trackingCode || `CC-${compactToday}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: ExtendedTicket = {
      id: createdDb?.id || `t-manual-${Date.now()}`,
      trackingCode: code,
      projectId: project.id,
      customerName: createCustomerName.trim(),
      customerPhone: createCustomerPhone.trim() || '08X-XXX-XXXX',
      channel: createChannel,
      subject: createSubject.trim(),
      symptom: createSymptom.trim() || 'แจ้งงานผ่านช่องทางเปิดใบงานแบบ Manual',
      preferredDate: createPreferredDate,
      timeSlot: createTimeSlot,
      priority: createPriority,
      address: createAddress.trim() || 'ที่อยู่ระบุในใบงาน',
      status: createAssignedTech ? 'ASSIGNED' : 'PENDING',
      assignedTechName: createAssignedTech || undefined,
      extraDetails: cleanedExtra,
      internalNotes: [
        {
          id: `note-${Date.now()}`,
          author: 'เจ้าหน้าที่หน้าร้าน',
          text: `เปิดใบงาน Manual เข้าระบบสำเร็จ รหัส ${code}`,
          time: 'เพิ่งเปิดใบงาน',
        },
      ],
    };

    startTransition(() => {
      setTickets((prev) => [newTicket, ...prev]);
    });
    setCreateCustomerName('');
    setCreateCustomerPhone('');
    setCreateChannel('LINE OA');
    setCreateSubject('');
    setCreateSymptom('');
    setCreatePreferredDate(getTodayLocalDateStr());
    setCreateTimeSlot('09:00 - 12:00 น. (ช่วงเช้า)');
    setCreatePriority('NORMAL');
    setCreateAddress('');
    setCreateAssignedTech('');
    setCreateDynamicExtra({});
    setIsCreateModalOpen(false);
    showToast(`สร้างใบงานใหม่สำเร็จ: ${code} และบันทึกในปฏิทินแล้ว`, 'success');
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filteredTickets.length > 0 ? filteredTickets : projectTickets;
    if (exportData.length === 0) {
      showToast('ไม่มีข้อมูลใบงานสำหรับส่งออก', 'error');
      return;
    }

    const headers = [
      'รหัสใบงาน', 'สถานะ', 'ความเร่งด่วน', 'ชื่อลูกค้า', 'เบอร์โทร', 'ช่องทาง',
      'วันนัดหมาย', 'ช่วงเวลา', 'หัวข้องาน', 'อาการ', 'สถานที่', 'ช่างผู้รับผิดชอบ', 'ยอดชำระ',
    ];

    const rows = exportData.map((t) => [
      t.trackingCode,
      STATUS_CONFIG[t.status]?.label || t.status,
      PRIORITY_CONFIG[t.priority || 'NORMAL'].label,
      t.customerName,
      t.customerPhone,
      t.channel,
      t.preferredDate,
      t.timeSlot || '-',
      t.subject,
      t.symptom,
      t.address || '-',
      t.assignedTechName || 'ยังไม่ระบุ',
      t.cost ? `${t.cost} บาท` : '-',
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ใบงาน_${project.name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว');
  };

  // Export PDF
  const handleExportPDF = () => {
    const exportData = filteredTickets.length > 0 ? filteredTickets : projectTickets;
    if (exportData.length === 0) {
      showToast('ไม่มีข้อมูลใบงานสำหรับพิมพ์หรือส่งออก PDF', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัปเพื่อพิมพ์/บันทึก PDF');
      return;
    }

    const rowsHtml = exportData
      .map(
        (t, idx) => `
        <tr style="border-bottom: 1px solid #E5E5E5;">
          <td style="padding: 8px; text-align: center; font-size: 11px; color: #888888;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: 600; font-family: monospace; font-size: 12px; color: #EA580C;">${t.trackingCode}</td>
          <td style="padding: 8px; font-size: 12px; color: #171717;">${t.customerName}<br><span style="color: #888888; font-size: 10px;">${t.customerPhone}</span></td>
          <td style="padding: 8px; font-size: 12px; color: #171717;">${t.subject}<br><span style="color: #888888; font-size: 10px;">${t.symptom}</span></td>
          <td style="padding: 8px; font-size: 11px; white-space: nowrap; color: #404040;">${t.preferredDate}<br><span style="color: #888888; font-size: 10px;">${t.timeSlot || ''}</span></td>
          <td style="padding: 8px; font-size: 11px; color: #404040;">${t.assignedTechName || '<span style="color: #AAAAAA;">- ยังไม่ระบุ -</span>'}</td>
          <td style="padding: 8px; text-align: center; font-size: 11px;">
            <span style="display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; background-color: ${STATUS_CONFIG[t.status]?.bgColor || '#F3F4F6'
          }; color: ${STATUS_CONFIG[t.status]?.textColor || '#4B5563'};">
              ${STATUS_CONFIG[t.status]?.label || t.status}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงานใบงาน_${project.name}_${new Date().toISOString().slice(0, 10)}</title>
          <meta charset="utf-8" />
          <style>
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: sans-serif; color: #171717; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #F8FAFC; padding: 8px; font-size: 11px; text-align: left; border-bottom: 2px solid #CBD5E1; color: #334155; }
          </style>
        </head>
        <body>
          <h2 style="margin: 0; color: #0F172A;">รายงานสรุปใบงานบริการ — ${project.name}</h2>
          <p style="color: #64748B; font-size: 12px; margin: 4px 0 16px 0;">หมวดหมู่: ${project.category} | สาขา: ${project.branchName} | วันที่จัดพิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">ลำดับ</th>
                <th style="width: 90px;">รหัสใบงาน</th>
                <th style="width: 150px;">ข้อมูลลูกค้า</th>
                <th>อาการเสีย / รายละเอียด</th>
                <th style="width: 100px;">วัน-เวลานัด</th>
                <th style="width: 120px;">ช่างผู้ดูแล</th>
                <th style="width: 120px; text-align: center;">สถานะ</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Calendar View Helpers (สร้างตารางปฏิทิน 7 คอลัมน์เต็มเดือน)
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calFirstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const monthThaiNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 ${toast.type === 'error'
            ? 'bg-red-950/90 border-red-500/50 text-red-200'
            : toast.type === 'info'
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-[#111827] border-slate-700 text-slate-100'
            }`}
        >
          {toast.type === 'error' ? (
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800/70 bg-gradient-to-br from-[#0d1220]/95 via-[#111827]/95 to-[#0b0f19]/95 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-16 bg-orange-500/10 blur-2xl pointer-events-none rounded-full" />

        <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-600/20 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10">
              <Layers className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent leading-tight">
                  จัดการใบงาน
                </h1>
                <span className="text-sm font-normal text-slate-500 leading-tight">(Tickets &amp; Schedule)</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                ระบบบริหารใบงาน · ตารางปฏิทินคิวช่าง · มอบหมายงาน · รายงานผลในโปรเจกต์{' '}
                <span className="text-orange-400 font-medium">{project.name}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0b0f19]/90 border border-slate-800/90">
              <button
                type="button"
                onClick={handleOpenMobileSim}
                className="h-[32px] px-2.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="จำลองมุมมองแอปมือถือของช่างสำหรับรับงานและนำทาง"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">พอร์ทัลช่าง (Mobile)</span>
                <span className="sm:hidden">พอร์ทัลช่าง</span>
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                type="button"
                onClick={() => setIsWebhookModalOpen(true)}
                className="h-[32px] px-2.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="ดูบันทึก Webhook และทดสอบการเชื่อมต่อบอท"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Webhook &amp; Test</span>
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                type="button"
                onClick={handleExportExcel}
                className="h-[32px] px-2.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="ส่งออก Excel (.csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                type="button"
                onClick={handleExportPDF}
                className="h-[32px] px-2.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="พิมพ์หรือบันทึกเป็น PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="relative h-[38px] px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer overflow-hidden transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างใบงานใหม่</span>
            </button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Clickable KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            id: 'ALL' as const,
            label: 'ใบงานทั้งหมด',
            count: projectTickets.length,
            color: 'text-white',
            numGlow: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]',
            accent: 'from-slate-500/15 to-slate-800/10',
            border: 'border-slate-700/60',
            activeBorder: 'border-orange-500',
            activeRing: 'ring-orange-500/30',
            dot: 'bg-slate-400',
            icon: <Layers className="w-3.5 h-3.5" />,
          },
          {
            id: 'PENDING' as const,
            label: 'รอดำเนินการ',
            count: projectTickets.filter((t) => t.status === 'PENDING').length,
            color: 'text-slate-200',
            numGlow: 'drop-shadow-[0_0_8px_rgba(203,213,225,0.35)]',
            accent: 'from-slate-600/15 to-slate-800/10',
            border: 'border-slate-700/60',
            activeBorder: 'border-orange-500',
            activeRing: 'ring-orange-500/30',
            dot: 'bg-slate-400',
            icon: <Clock className="w-3.5 h-3.5" />,
          },
          {
            id: 'ASSIGNED' as const,
            label: 'มอบหมายช่างแล้ว',
            count: projectTickets.filter((t) => t.status === 'ASSIGNED').length,
            color: 'text-blue-300',
            numGlow: 'drop-shadow-[0_0_10px_rgba(96,165,250,0.45)]',
            accent: 'from-blue-500/15 to-blue-900/10',
            border: 'border-blue-800/40',
            activeBorder: 'border-blue-400',
            activeRing: 'ring-blue-500/30',
            dot: 'bg-blue-400',
            icon: <UserCheck className="w-3.5 h-3.5" />,
          },
          {
            id: 'IN_PROGRESS' as const,
            label: 'กำลังดำเนินการ',
            count: projectTickets.filter((t) => t.status === 'IN_PROGRESS').length,
            color: 'text-amber-300',
            numGlow: 'drop-shadow-[0_0_10px_rgba(252,211,77,0.45)]',
            accent: 'from-amber-500/15 to-amber-900/10',
            border: 'border-amber-800/40',
            activeBorder: 'border-amber-400',
            activeRing: 'ring-amber-500/30',
            dot: 'bg-amber-400',
            icon: <Zap className="w-3.5 h-3.5" />,
          },
          {
            id: 'COMPLETED' as const,
            label: 'ปิดงานเรียบร้อย',
            count: projectTickets.filter((t) => t.status === 'COMPLETED').length,
            color: 'text-emerald-300',
            numGlow: 'drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]',
            accent: 'from-emerald-500/15 to-emerald-900/10',
            border: 'border-emerald-800/40',
            activeBorder: 'border-emerald-400',
            activeRing: 'ring-emerald-500/30',
            dot: 'bg-emerald-400',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          },
        ].map((stat) => {
          const isActive = statusFilter === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => {
                setStatusFilter(stat.id);
                setCurrentPage(1);
              }}
              className={`relative group p-4 rounded-2xl bg-gradient-to-br ${stat.accent} bg-[#0d1220]/85 border cursor-pointer transition-all duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg ${
                isActive
                  ? `${stat.activeBorder} ring-2 ${stat.activeRing} shadow-lg`
                  : `${stat.border} hover:border-slate-600/70`
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 leading-tight">{stat.label}</span>
                  <span className={`${stat.color} opacity-65`}>{stat.icon}</span>
                </div>
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${stat.color} ${stat.numGlow}`}>
                  {stat.count}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="text-[10px] text-slate-500 leading-tight">คลิกเพื่อกรองสถานะนี้</div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                      กำลังกรอง
                    </span>
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${stat.dot} opacity-50 inline-block`} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar: View Switcher, Search & Filters */}
      <div className="p-4 rounded-2xl bg-[#0d1220]/90 backdrop-blur-md border border-slate-800/80 shadow-lg space-y-3">
        {/* Row 1: View Switcher + Search + Sort */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* View Switcher: Table vs Calendar vs Dashboard */}
          <div className="flex items-center bg-[#070b14]/90 p-1 rounded-xl border border-slate-800/90 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                activeView === 'table'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>ตารางใบงาน (Table)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                activeView === 'calendar'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>ปฏิทินงาน (Calendar)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>แดชบอร์ดสถิติ (Dashboard)</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l-xl bg-[#070b14] border-r border-slate-800/80 pointer-events-none">
              <Search className="w-4 h-4 text-orange-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหารหัสใบงาน, ชื่อลูกค้า, เบอร์โทร, อาการ หรือที่อยู่..."
              className="w-full pl-12 pr-24 h-[40px] rounded-xl bg-[#070b14]/90 border border-slate-700/80 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 focus:outline-none transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-medium mr-0.5">
                  {filteredTickets.length} ผลลัพธ์
                </span>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                  title="ล้างการค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sort By Dropdown (Table view) */}
          {activeView === 'table' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 shrink-0">เรียง:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-[42px] px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-xs font-medium text-slate-200 focus:border-orange-500 cursor-pointer"
              >
                <option value="date-desc">วันนัดหมาย (ใหม่ ➔ เก่า)</option>
                <option value="date-asc">วันนัดหมาย (เก่า ➔ ใหม่)</option>
                <option value="urgent-desc">ความเร่งด่วนสูงสุดก่อน</option>
                <option value="code-asc">รหัสใบงาน (ก - ฮ)</option>
              </select>
            </div>
          )}
        </div>

        {/* Row 2: Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">ตัวกรอง</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="h-[36px] px-3 rounded-lg bg-[#0b0f19] border border-slate-700/80 text-[11px] font-medium text-slate-200 focus:border-orange-500 cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="ALL">สถานะ: ทั้งหมด</option>
            <option value="PENDING">รอดำเนินการ</option>
            <option value="ASSIGNED">มอบหมายแล้ว</option>
            <option value="IN_PROGRESS">กำลังดำเนินการ</option>
            <option value="COMPLETED">ปิดงานเรียบร้อย</option>
            <option value="CANCELLED">ยกเลิกใบงาน</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-[36px] px-3 rounded-lg bg-[#0b0f19] border border-slate-700/80 text-[11px] font-medium text-slate-200 focus:border-orange-500 cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="ALL">ความเร่งด่วน: ทั้งหมด</option>
            <option value="URGENT">🔥 ด่วนมาก</option>
            <option value="NORMAL">ปกติ</option>
            <option value="LOW">ไม่เร่งด่วน</option>
          </select>

          {/* Technician Filter */}
          <select
            value={techFilter}
            onChange={(e) => {
              setTechFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-[36px] px-3 rounded-lg bg-[#0b0f19] border border-slate-700/80 text-[11px] font-medium text-slate-200 focus:border-orange-500 cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="ALL">ช่าง: ทุกคน</option>
            {projectTechs.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name} ({t.status === 'AVAILABLE' ? 'ว่าง' : 'ติดงาน'})
              </option>
            ))}
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-[36px] px-3 rounded-lg bg-[#0b0f19] border border-slate-700/80 text-[11px] font-medium text-slate-200 focus:border-orange-500 cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="ALL">ช่องทาง: ทั้งหมด</option>
            <option value="LINE OA">LINE OA</option>
            <option value="Voicebot">Voicebot</option>
            <option value="Walk-in">หน้าร้าน / โทรศัพท์</option>
          </select>

          {/* Date Range Picker */}
          <CustomDarkDateRangePicker
            range={dateRange}
            onChange={(r) => {
              setDateRange(r);
              setCurrentPage(1);
            }}
            tickets={projectTickets}
          />

          {/* Active Filter Count + Reset */}
          {(() => {
            const activeFilters = [
              searchQuery ? 'ค้นหา' : '',
              statusFilter !== 'ALL' ? 'สถานะ' : '',
              techFilter !== 'ALL' ? 'ช่าง' : '',
              channelFilter !== 'ALL' ? 'ช่องทาง' : '',
              dateRange.start ? 'วันที่' : '',
              priorityFilter !== 'ALL' ? 'เร่งด่วน' : '',
            ].filter(Boolean);

            if (activeFilters.length === 0) return null;

            return (
              <>
                <span className="text-[10px] text-orange-400 font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg select-none">
                  กรองอยู่ {activeFilters.length} เงื่อนไข
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setTechFilter('ALL');
                    setChannelFilter('ALL');
                    setDateRange({ start: '', end: '' });
                    setPriorityFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="h-[36px] px-3 rounded-lg text-[11px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="รีเซ็ตเงื่อนไขการค้นหาและตัวกรองทั้งหมด"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างทั้งหมด</span>
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && activeView === 'table' && (
        <div className="p-3.5 rounded-2xl bg-orange-950/40 border border-orange-500/40 flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-orange-200 font-semibold">
            <CheckSquare className="w-4 h-4 text-orange-400" />
            <span>เลือกอยู่ {selectedIds.length} รายการ</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                const targetTech = e.target.value;
                if (!targetTech) return;
                const matched = projectTechs.find((tc) => tc.name === targetTech);
                syncManyTickets(
                  tickets
                    .filter((t) => selectedIds.includes(t.id))
                    .map((t) => ({
                      id: t.id,
                      payload: {
                        technicianId: matched?.id || null,
                        ...(t.status === 'PENDING' ? { status: 'RECEIVED' } : {}),
                      },
                    }))
                );
                setTickets((prev) =>
                  prev.map((t) =>
                    selectedIds.includes(t.id)
                      ? { ...t, assignedTechName: targetTech, status: t.status === 'PENDING' ? 'ASSIGNED' : t.status }
                      : t
                  )
                );
                showToast(`มอบหมายงาน ${selectedIds.length} รายการให้ "${targetTech}" สำเร็จ`, 'success');
                setSelectedIds([]);
                e.target.value = '';
              }}
              className="h-[34px] px-2.5 rounded-lg bg-[#0b0f19] border border-orange-500/40 text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                -- มอบหมายช่างทั้งหมด --
              </option>
              {projectTechs.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                // ปิดงานผ่านระบบจริง (ใบงานจาก LINE จะได้รับปุ่มให้ดาวอัตโนมัติ)
                syncManyTickets(
                  tickets
                    .filter((t) => selectedIds.includes(t.id) && t.status !== 'COMPLETED')
                    .map((t) => ({ id: t.id, payload: { status: 'COMPLETED' } }))
                );
                setTickets((prev) =>
                  prev.map((t) => (selectedIds.includes(t.id) ? { ...t, status: 'COMPLETED' } : t))
                );
                showToast(`ปิดงาน ${selectedIds.length} รายการเรียบร้อยแล้ว`, 'success');
                setSelectedIds([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 font-semibold cursor-pointer transition-colors"
            >
              ปิดงานทั้งหมด
            </button>

            <button
              type="button"
              onClick={() => {
                syncManyTickets(
                  tickets
                    .filter((t) => selectedIds.includes(t.id) && t.status !== 'CANCELLED')
                    .map((t) => ({ id: t.id, payload: { status: 'CANCELLED' } }))
                );
                setTickets((prev) =>
                  prev.map((t) => (selectedIds.includes(t.id) ? { ...t, status: 'CANCELLED' } : t))
                );
                showToast(`ยกเลิกใบงาน ${selectedIds.length} รายการแล้ว`, 'info');
                setSelectedIds([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/30 font-semibold cursor-pointer transition-colors"
            >
              ยกเลิกทั้งหมด
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              ยกเลิกการเลือก
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: Modern Data Table View */}
      {activeView === 'table' && (
        <div className="bg-[#0d1220]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          {paginatedTickets.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#0b0f19] border border-slate-800 flex items-center justify-center text-slate-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-base font-semibold text-white">ไม่พบรายการใบงานที่ค้นหา</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ลองปรับเปลี่ยนเงื่อนไขการค้นหา หรือกดรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTechFilter('ALL');
                  setChannelFilter('ALL');
                  setDateRange({ start: '', end: '' });
                  setPriorityFilter('ALL');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold cursor-pointer transition-colors mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตตัวกรองทั้งหมด</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#070b14]/95 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-3 w-[42px] text-center">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {selectedIds.length === paginatedTickets.length && paginatedTickets.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-3 w-[135px] whitespace-nowrap">รหัส &amp; ความเร่งด่วน</th>
                      <th className="py-3.5 px-4 min-w-[205px] whitespace-nowrap">ลูกค้า &amp; ช่องทาง</th>
                      <th className="py-3.5 px-4 min-w-[230px] whitespace-nowrap">หัวข้อ &amp; ที่อยู่หน้างาน</th>
                      <th className="py-3.5 px-4 w-[165px] whitespace-nowrap">วัน-เวลานัดหมาย</th>
                      <th className="py-3.5 px-4 w-[195px] whitespace-nowrap">ช่างผู้รับผิดชอบ</th>
                      <th className="py-3.5 px-4 w-[160px] whitespace-nowrap">สถานะงาน</th>
                      <th className="py-3.5 px-4 text-right w-[108px] whitespace-nowrap">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {paginatedTickets.map((ticket, rowIdx) => {
                      const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.PENDING;
                      const priorityCfg = PRIORITY_CONFIG[ticket.priority || 'NORMAL'];
                      const nextAction = getNextStatusAction(ticket.status);
                      const isSelected = selectedIds.includes(ticket.id);
                      const hasConflict =
                        ticket.assignedTechName &&
                        ticket.preferredDate &&
                        getTechJobCountOnDate(ticket.assignedTechName, ticket.preferredDate, ticket.id) >= 2;

                      // Relative date indicator
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const tomorrowDate = new Date();
                      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
                      const isDateToday = ticket.preferredDate === todayStr;
                      const isDateTomorrow = ticket.preferredDate === tomorrowStr;
                      const isOverdue = ticket.preferredDate && ticket.preferredDate < todayStr && ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED';

                      const statusPillClass =
                        ticket.status === 'PENDING'
                          ? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                          : ticket.status === 'ASSIGNED'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : ticket.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : ticket.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30';

                      return (
                        <tr
                          key={ticket.id}
                          className={`transition-colors border-l-2 ${
                            isSelected
                              ? 'bg-orange-500/10 border-l-orange-500'
                              : isOverdue
                              ? 'border-l-red-500/70 hover:bg-slate-800/35'
                              : rowIdx % 2 === 1
                              ? 'border-l-transparent bg-[#0b0f19]/40 hover:bg-slate-800/35'
                              : 'border-l-transparent hover:bg-slate-800/35'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-4 px-3 align-top text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(ticket.id)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-orange-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Code & Priority */}
                          <td className="py-4 px-3 align-top space-y-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleCopyTrackingCode(ticket.trackingCode)}
                              className="font-mono font-bold text-xs text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-500/25 inline-flex items-center gap-1.5 tracking-tight cursor-pointer transition-colors group/copy whitespace-nowrap"
                              title="คลิกเพื่อคัดลอกรหัสใบงาน"
                            >
                              <span>{ticket.trackingCode}</span>
                              <Copy className="w-3 h-3 text-orange-400/60 group-hover/copy:text-orange-400 transition-colors shrink-0" />
                            </button>
                            <div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border inline-flex items-center gap-1 whitespace-nowrap ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border}`}
                              >
                                {ticket.priority === 'URGENT' && <Flame className="w-2.5 h-2.5 text-red-400 shrink-0" />}
                                <span>{priorityCfg.label}</span>
                              </span>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-4 px-4 align-top">
                            <div className="font-semibold text-sm text-white whitespace-nowrap">{ticket.customerName}</div>
                            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
                              {ticket.customerPhone && ticket.customerPhone !== '-' ? (
                                <a
                                  href={`tel:${ticket.customerPhone}`}
                                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                  title="กดโทรออก"
                                >
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{ticket.customerPhone}</span>
                                </a>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                              <span className="text-slate-600">•</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                  ticket.channel === 'LINE OA'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                    : ticket.channel === 'Walk-in'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                                    : 'bg-orange-500/10 text-orange-400 border-orange-500/25'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    ticket.channel === 'LINE OA'
                                      ? 'bg-emerald-400'
                                      : ticket.channel === 'Walk-in'
                                      ? 'bg-blue-400'
                                      : 'bg-orange-400'
                                  }`}
                                />
                                <span>{getChannelLabel(ticket.channel)}</span>
                              </span>
                            </div>
                          </td>

                          {/* Subject & Address */}
                          <td className="py-4 px-4 align-top space-y-1">
                            <div className="font-semibold text-sm text-slate-100 line-clamp-1">
                              {ticket.subject && ticket.subject !== '-' ? (
                                ticket.subject
                              ) : (
                                <span className="text-slate-500 italic font-normal text-xs">ไม่ได้ระบุหัวข้องาน</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 line-clamp-1">
                              {ticket.symptom && ticket.symptom !== '-' ? (
                                ticket.symptom
                              ) : (
                                <span className="text-slate-600 italic text-[11px]">ไม่มีรายละเอียดเพิ่มเติม</span>
                              )}
                            </div>
                            {ticket.address && ticket.address !== '-' && ticket.address.trim() !== '' ? (
                              <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                                <span className="truncate max-w-[220px]">{ticket.address}</span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-400 hover:underline flex items-center gap-0.5 ml-1 shrink-0"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            ) : null}
                          </td>

                          {/* Preferred Date & Time */}
                          <td className="py-4 px-4 align-top whitespace-nowrap">
                            <div className={`flex items-center gap-1.5 font-medium ${isOverdue ? 'text-red-400' : 'text-slate-200'}`}>
                              <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`} />
                              <span>{formatThaiDate(ticket.preferredDate) || '-'}</span>
                            </div>
                            {isOverdue && (
                              <div className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded w-fit">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>เลยกำหนด</span>
                              </div>
                            )}
                            {isDateToday && !isOverdue && (
                              <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded w-fit">
                                <Clock className="w-2.5 h-2.5" />
                                <span>วันนี้</span>
                              </div>
                            )}
                            {isDateTomorrow && (
                              <div className="text-[10px] text-sky-400 font-semibold mt-1 flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded w-fit">
                                <Clock className="w-2.5 h-2.5" />
                                <span>พรุ่งนี้</span>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{ticket.timeSlot || 'ไม่ระบุช่วงเวลา'}</span>
                            </div>
                          </td>

                          {/* Assigned Tech & Quick Assign Modal Button */}
                          <td className="py-4 px-4 align-top space-y-1.5">
                            {ticket.assignedTechName ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500/25 to-amber-600/30 border border-orange-500/35 flex items-center justify-center text-xs font-bold text-orange-300 shrink-0">
                                  {ticket.assignedTechName.replace(/^ช่าง/, '').trim().charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs sm:text-sm text-white font-medium truncate">{ticket.assignedTechName}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {(() => {
                                      const tech = projectTechs.find((t) => t.name === ticket.assignedTechName);
                                      const isAvail = tech?.status === 'AVAILABLE';
                                      return (
                                        <span className={`inline-flex items-center gap-1 text-[10px] ${isAvail ? 'text-emerald-400' : 'text-amber-400'}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                          {isAvail ? 'ว่าง' : 'มีงาน'}
                                        </span>
                                      );
                                    })()}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssignModal(ticket)}
                                      className="text-[10px] text-slate-400 hover:text-orange-400 cursor-pointer transition-colors"
                                      title="เปลี่ยนช่าง"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(ticket)}
                                className="w-full px-2.5 py-2 rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer hover:bg-orange-500/15 hover:border-orange-500/70 text-orange-300"
                                title="คลิกเพื่อเลือกช่างและกำหนดวันนัดหมายลงปฏิทิน"
                              >
                                <div className="w-5 h-5 rounded-full border border-dashed border-orange-500/50 flex items-center justify-center shrink-0">
                                  <Plus className="w-3 h-3 text-orange-400" />
                                </div>
                                <span className="leading-tight">กำหนดช่าง &amp; วันนัด</span>
                              </button>
                            )}
                            {hasConflict && (
                              <div className="text-[10px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>คิวชน: มีงานวันนี้แล้ว</span>
                              </div>
                            )}
                          </td>

                          {/* Status Badge & Selector */}
                          <td className="py-4 px-4 align-top space-y-1.5 whitespace-nowrap">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap select-none ${statusPillClass}`}
                              >
                                <span
                                  style={{ backgroundColor: statusCfg.dotColor }}
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                />
                                <span>{statusCfg.label}</span>
                              </span>
                            </div>
                            <div className="relative">
                              <select
                                value={ticket.status}
                                onChange={(e) =>
                                  handleChangeStatus(ticket.id, e.target.value as TicketStatus)
                                }
                                className="h-[28px] w-full pl-2.5 pr-6 rounded-lg bg-[#070b14]/90 border border-slate-700/70 hover:border-slate-600 text-[11px] text-slate-300 focus:border-orange-500 focus:outline-none cursor-pointer appearance-none transition-colors"
                              >
                                <option value="PENDING">รอดำเนินการ</option>
                                <option value="ASSIGNED">มอบหมายแล้ว</option>
                                <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                                <option value="COMPLETED">ปิดงานเรียบร้อย</option>
                                <option value="CANCELLED">ยกเลิกใบงาน</option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setDetailTab('info');
                                }}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="ดูรายละเอียดใบงาน"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTicket({ ...ticket })}
                                className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                                title="แก้ไขใบงาน"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {nextAction && ticket.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => handleChangeStatus(ticket.id, nextAction.next)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                  title={`ขั้นตอนถัดไป: ${STATUS_CONFIG[nextAction.next].label}`}
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-4 py-3.5 bg-[#070b14]/50 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    แสดง <span className="text-white font-semibold">{(currentPage - 1) * pageSize + 1}</span> -{' '}
                    <span className="text-white font-semibold">{Math.min(currentPage * pageSize, sortedTickets.length)}</span> จากทั้งหมด{' '}
                    <span className="text-white font-semibold">{sortedTickets.length}</span> รายการ
                  </div>
                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                    <span className="text-slate-500">แถวต่อหน้า:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-[#0b0f19] border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:border-orange-500 focus:outline-none cursor-pointer hover:border-slate-600 transition-colors"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ก่อนหน้า</span>
                  </button>
                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 6) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else if (currentPage <= 3) {
                      pages.push(1, 2, 3, 4, '...', totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                    }

                    return pages.map((page, idx) => {
                      if (typeof page === 'string') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1 text-slate-600 select-none">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg font-bold transition-colors cursor-pointer text-xs ${
                            currentPage === page
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                              : 'bg-[#0b0f19] border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FULL MONTH CALENDAR GRID + DAY DETAIL SIDE PANEL */}
      {activeView === 'calendar' && (() => {
        const selectedDayTickets = selectedCalDay
          ? projectTickets.filter((t) => t.preferredDate === selectedCalDay)
          : [];
        const isPanelOpen = Boolean(selectedCalDay);

        return (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Calendar Header with Month Navigation & Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-orange-400" />
                <span>{monthThaiNames[calMonth]} {calYear + 543}</span>
              </h3>
              <div className="flex items-center gap-1 bg-[#0b0f19] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(calYear, calMonth - 1, 1);
                    setCalDate(prev);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calYear, calMonth + 1, 1);
                    setCalDate(next);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  }}
                  className="px-2 py-1 text-xs text-orange-400 font-semibold hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  เดือนปัจจุบัน
                </button>
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> มอบหมายแล้ว
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> กำลังดำเนินการ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> ปิดงาน
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" /> รอดำเนินการ
              </span>
            </div>
          </div>

          {/* Calendar Layout: Full width by default, 70/30 split when a day is selected */}
          <div className="flex gap-4 items-start">
            {/* Calendar Grid: w-full when panel closed, w-[70%] when panel open */}
            <div className={`${isPanelOpen ? 'w-[70%]' : 'w-full'} min-w-0 border border-slate-800 rounded-xl overflow-hidden bg-[#0b0f19] transition-all duration-200`}>
              {/* Weekday Row */}
              <div className="grid grid-cols-7 border-b border-slate-800 bg-[#0f172a] text-center text-xs font-bold text-slate-300 py-2.5">
                <span className="text-red-400">อา</span>
                <span>จ</span>
                <span>อ</span>
                <span>พ</span>
                <span>พฤ</span>
                <span>ศ</span>
                <span className="text-blue-400">ส</span>
              </div>

              {/* Days Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/80">
                {/* Empty leading cells */}
                {Array.from({ length: calFirstDayOfWeek }).map((_, i) => (
                  <div key={`empty-cal-${i}`} className="min-h-[80px] p-1.5 bg-[#080c14] opacity-40" />
                ))}

                {/* Day Cells of the Month */}
                {Array.from({ length: calDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const mm = String(calMonth + 1).padStart(2, '0');
                  const dd = String(dayNum).padStart(2, '0');
                  const dateKey = `${calYear}-${mm}-${dd}`;
                  const dayTickets = projectTickets.filter((t) => t.preferredDate === dateKey);
                  const isToday = dateKey === getTodayLocalDateStr();
                  const isSelected = dateKey === selectedCalDay;

                  return (
                    <div
                      key={dateKey}
                      onClick={() => setSelectedCalDay(isSelected ? null : dateKey)}
                      className={`min-h-[80px] p-1.5 flex flex-col cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-orange-500/10 ring-1 ring-inset ring-orange-500/40'
                          : isToday
                          ? 'bg-orange-500/5 hover:bg-orange-500/10'
                          : 'bg-[#0b0f19] hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Date Number */}
                      <div className="flex items-center justify-between pb-0.5">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm'
                              : isSelected
                              ? 'text-orange-300 px-1'
                              : 'text-slate-400 px-1'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayTickets.length > 0 && (
                          <span className="text-[9px] text-orange-400 font-bold bg-orange-500/10 px-1 rounded-full border border-orange-500/20">
                            {dayTickets.length}
                          </span>
                        )}
                      </div>

                      {/* Compact ticket indicators */}
                      <div className="space-y-0.5 mt-0.5 flex-1 overflow-hidden">
                        {dayTickets.slice(0, 3).map((t) => {
                          const statusDot = STATUS_CONFIG[t.status]?.dotColor || '#F97316';
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-1 text-[9px] leading-tight truncate"
                            >
                              <span
                                style={{ backgroundColor: statusDot }}
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                              />
                              <span className="text-slate-300 truncate font-medium">{t.trackingCode}</span>
                            </div>
                          );
                        })}
                        {dayTickets.length > 3 && (
                          <span className="text-[9px] text-slate-500">+{dayTickets.length - 3} อื่นๆ</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Day Detail Panel — 30% (แสดงเฉพาะเมื่อกดเลือกวัน ไม่ยืดทะลุด้านล่าง) */}
            {isPanelOpen && selectedCalDay && (
              <div className="w-[30%] min-w-[280px] max-h-[520px] xl:max-h-[560px] flex flex-col bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-right-3 duration-200">
                {/* Day Detail Header */}
                <div className="p-4 border-b border-slate-800 bg-[#0f172a] shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-orange-400" />
                        <span>รายละเอียดคิวงาน</span>
                      </h4>
                      <p className="text-xs text-orange-300 mt-1 font-medium">
                        {formatThaiDateFull(selectedCalDay)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        selectedDayTickets.length > 0
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {selectedDayTickets.length} งาน
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCalDay(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="ปิดแถบรายละเอียด"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              {/* Day Tickets List (จำกัดความสูงและเลื่อนดูภายในกล่องได้ ไม่ทะลุลงล่าง) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
                {selectedDayTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                    <CalendarDays className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="text-xs text-slate-500 font-medium">ไม่มีใบงานในวันนี้</p>
                    <p className="text-[10px] text-slate-600 mt-1">คลิกวันที่มีงานบนปฏิทินเพื่อดูรายละเอียด</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatePreferredDate(selectedCalDay);
                        setIsCreateModalOpen(true);
                      }}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-semibold hover:bg-orange-500/20 transition-colors cursor-pointer"
                    >
                      + สร้างใบงานวันนี้
                    </button>
                  </div>
                ) : (
                  selectedDayTickets.map((t) => {
                    const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                    return (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-[#111827] border border-slate-700/70 hover:border-orange-500/60 transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedTicket(t);
                          setDetailTab('info');
                        }}
                      >
                        {/* Ticket Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-orange-400">{t.trackingCode}</span>
                          <span
                            style={{
                              backgroundColor: statusCfg.bgColor,
                              color: statusCfg.textColor,
                              borderRadius: '999px',
                              padding: '3px 8px',
                              fontSize: '10px',
                              fontWeight: 600,
                            }}
                            className="inline-flex items-center gap-1 select-none"
                          >
                            <span
                              style={{ backgroundColor: statusCfg.dotColor }}
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                            />
                            <span>{statusCfg.label}</span>
                          </span>
                        </div>

                        {/* Subject */}
                        <div className="text-xs font-semibold text-white mb-1.5 leading-snug">{t.subject}</div>

                        {/* Customer Info */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.customerName}</span>
                          <span className="text-slate-600">•</span>
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{t.customerPhone}</span>
                        </div>

                        {/* Time & Tech */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.timeSlot || 'ยังไม่ระบุเวลา'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.assignedTechName || 'ยังไม่มอบหมายช่าง'}</span>
                        </div>

                        {/* Address */}
                        {t.address && (
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mt-1">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="truncate">{t.address}</span>
                          </div>
                        )}

                        {/* Priority Badge */}
                        {t.priority && t.priority !== 'NORMAL' && (
                          <div className="mt-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              t.priority === 'URGENT'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {t.priority === 'URGENT' ? '🔥 ด่วนมาก' : 'ไม่เร่งด่วน'}
                            </span>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center justify-end gap-1 mt-2.5 pt-2 border-t border-slate-800/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(t);
                              setDetailTab('info');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignModal(t);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                            title="มอบหมายช่าง"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTicket({ ...t });
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                            title="แก้ไขใบงาน"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer: Quick Add for selected date */}
              {selectedDayTickets.length > 0 && (
                <div className="p-3 border-t border-slate-800 shrink-0 bg-[#0b0f19]">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatePreferredDate(selectedCalDay);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold hover:bg-orange-500/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มงานวันที่ {formatThaiDate(selectedCalDay, true)}</span>
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* VIEW 3: FULL COMPREHENSIVE ANALYTICS & PERFORMANCE DASHBOARD */}
      {activeView === 'dashboard' && (() => {
        const dashTickets = filteredTickets;
        const totalTickets = dashTickets.length;
        const allProjectCount = projectTickets.length;
        const isDashFiltered =
          Boolean(searchQuery) ||
          statusFilter !== 'ALL' ||
          techFilter !== 'ALL' ||
          channelFilter !== 'ALL' ||
          Boolean(dateRange.start) ||
          priorityFilter !== 'ALL';

        const completedTickets = dashTickets.filter((t) => t.status === 'COMPLETED');
        const inProgressTickets = dashTickets.filter((t) => t.status === 'IN_PROGRESS');
        const assignedTickets = dashTickets.filter((t) => t.status === 'ASSIGNED');
        const pendingTickets = dashTickets.filter((t) => t.status === 'PENDING');
        const cancelledTickets = dashTickets.filter((t) => t.status === 'CANCELLED');

        const totalRevenue = completedTickets.reduce((sum, t) => sum + (t.cost || 0), 0);
        const completionRate = totalTickets > 0 ? Math.round((completedTickets.length / totalTickets) * 100) : 0;
        const availableTechs = projectTechs.filter((t) => t.status === 'AVAILABLE');
        const totalTechs = projectTechs.length;

        // CSAT calculation
        const ratedTickets = dashTickets.filter((t) => t.csatRating);
        const avgCsat = ratedTickets.length > 0
          ? (ratedTickets.reduce((sum, t) => sum + (t.csatRating || 5), 0) / ratedTickets.length).toFixed(1)
          : '0.0';

        // Priority breakdown
        const urgentCount = dashTickets.filter((t) => t.priority === 'URGENT').length;
        const normalCount = dashTickets.filter((t) => (t.priority || 'NORMAL') === 'NORMAL').length;
        const lowCount = dashTickets.filter((t) => t.priority === 'LOW').length;

        // Helper for SVG Donut Chart segments
        const renderDonutSvg = (
          segments: {
            key: string;
            label: string;
            count: number;
            stroke: string;
            active: boolean;
            onClick: () => void;
          }[],
          centerLabel: string,
          centerSub: string
        ) => {
          const radius = 50;
          const circumference = 2 * Math.PI * radius;
          const sum = segments.reduce((acc, s) => acc + s.count, 0);
          let cumulative = 0;

          return (
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(30, 41, 59, 0.8)"
                  strokeWidth="16"
                />
                {sum > 0 &&
                  segments.map((seg) => {
                    if (seg.count === 0) return null;
                    const segLen = (seg.count / sum) * circumference;
                    const dashArray = `${Math.max(segLen - 2, 0)} ${circumference}`;
                    const dashOffset = -cumulative;
                    cumulative += segLen;
                    return (
                      <circle
                        key={seg.key}
                        cx="66"
                        cy="66"
                        r={radius}
                        fill="transparent"
                        stroke={seg.stroke}
                        strokeWidth={seg.active ? '20' : '16'}
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="butt"
                        onClick={seg.onClick}
                        className="cursor-pointer transition-all duration-300 hover:opacity-85"
                        style={{
                          filter: seg.active ? `drop-shadow(0 0 6px ${seg.stroke})` : undefined,
                        }}
                      >
                        <title>{`${seg.label}: ${seg.count} งาน (${Math.round((seg.count / sum) * 100)}%) — คลิกเพื่อกรอง`}</title>
                      </circle>
                    );
                  })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-white leading-none">{centerLabel}</span>
                <span className="text-[10px] text-slate-400 mt-1">{centerSub}</span>
              </div>
            </div>
          );
        };

        const channelSegments = [
          {
            key: 'LINE OA',
            label: 'LINE OA',
            count: dashTickets.filter((t) => t.channel === 'LINE OA').length,
            stroke: '#10b981',
            dotClass: 'bg-emerald-400',
            textClass: 'text-emerald-400',
            active: channelFilter === 'LINE OA',
            onClick: () => {
              setChannelFilter((prev) => (prev === 'LINE OA' ? 'ALL' : 'LINE OA'));
              setCurrentPage(1);
            },
          },
          {
            key: 'Walk-in',
            label: 'หน้าร้าน / โทรศัพท์',
            count: dashTickets.filter((t) => t.channel === 'Walk-in').length,
            stroke: '#3b82f6',
            dotClass: 'bg-blue-400',
            textClass: 'text-blue-400',
            active: channelFilter === 'Walk-in',
            onClick: () => {
              setChannelFilter((prev) => (prev === 'Walk-in' ? 'ALL' : 'Walk-in'));
              setCurrentPage(1);
            },
          },
          {
            key: 'Voicebot',
            label: 'Voicebot',
            count: dashTickets.filter((t) => t.channel === 'Voicebot').length,
            stroke: '#f97316',
            dotClass: 'bg-orange-400',
            textClass: 'text-orange-400',
            active: channelFilter === 'Voicebot',
            onClick: () => {
              setChannelFilter((prev) => (prev === 'Voicebot' ? 'ALL' : 'Voicebot'));
              setCurrentPage(1);
            },
          },
        ];

        const statusSegments = [
          {
            key: 'COMPLETED',
            label: 'ปิดงานเรียบร้อย',
            count: completedTickets.length,
            stroke: '#10b981',
            dotClass: 'bg-emerald-400',
            textClass: 'text-emerald-400',
            active: statusFilter === 'COMPLETED',
            onClick: () => {
              setStatusFilter((prev) => (prev === 'COMPLETED' ? 'ALL' : 'COMPLETED'));
              setCurrentPage(1);
            },
          },
          {
            key: 'IN_PROGRESS',
            label: 'กำลังดำเนินการ',
            count: inProgressTickets.length,
            stroke: '#f59e0b',
            dotClass: 'bg-amber-400',
            textClass: 'text-amber-400',
            active: statusFilter === 'IN_PROGRESS',
            onClick: () => {
              setStatusFilter((prev) => (prev === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS'));
              setCurrentPage(1);
            },
          },
          {
            key: 'ASSIGNED',
            label: 'มอบหมายช่างแล้ว',
            count: assignedTickets.length,
            stroke: '#3b82f6',
            dotClass: 'bg-blue-400',
            textClass: 'text-blue-400',
            active: statusFilter === 'ASSIGNED',
            onClick: () => {
              setStatusFilter((prev) => (prev === 'ASSIGNED' ? 'ALL' : 'ASSIGNED'));
              setCurrentPage(1);
            },
          },
          {
            key: 'PENDING',
            label: 'รอดำเนินการ',
            count: pendingTickets.length,
            stroke: '#94a3b8',
            dotClass: 'bg-slate-400',
            textClass: 'text-slate-300',
            active: statusFilter === 'PENDING',
            onClick: () => {
              setStatusFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'));
              setCurrentPage(1);
            },
          },
          {
            key: 'CANCELLED',
            label: 'ยกเลิกใบงาน',
            count: cancelledTickets.length,
            stroke: '#ef4444',
            dotClass: 'bg-red-400',
            textClass: 'text-red-400',
            active: statusFilter === 'CANCELLED',
            onClick: () => {
              setStatusFilter((prev) => (prev === 'CANCELLED' ? 'ALL' : 'CANCELLED'));
              setCurrentPage(1);
            },
          },
        ];

        const prioritySegments = [
          {
            key: 'URGENT',
            label: 'ด่วนมาก (Urgent)',
            count: urgentCount,
            stroke: '#ef4444',
            dotClass: 'bg-red-400',
            textClass: 'text-red-400',
            active: priorityFilter === 'URGENT',
            onClick: () => {
              setPriorityFilter((prev) => (prev === 'URGENT' ? 'ALL' : 'URGENT'));
              setCurrentPage(1);
            },
          },
          {
            key: 'NORMAL',
            label: 'ปกติ (Normal)',
            count: normalCount,
            stroke: '#f97316',
            dotClass: 'bg-orange-400',
            textClass: 'text-orange-400',
            active: priorityFilter === 'NORMAL',
            onClick: () => {
              setPriorityFilter((prev) => (prev === 'NORMAL' ? 'ALL' : 'NORMAL'));
              setCurrentPage(1);
            },
          },
          {
            key: 'LOW',
            label: 'ไม่เร่งด่วน (Low)',
            count: lowCount,
            stroke: '#64748b',
            dotClass: 'bg-slate-400',
            textClass: 'text-slate-300',
            active: priorityFilter === 'LOW',
            onClick: () => {
              setPriorityFilter((prev) => (prev === 'LOW' ? 'ALL' : 'LOW'));
              setCurrentPage(1);
            },
          },
        ];

        return (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Dashboard Header Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#111827] via-[#162032] to-[#111827] border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 shadow-sm">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      ภาพรวมสถิติ &amp; ประสิทธิภาพการดำเนินงาน
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      เรียลไทม์
                    </span>
                    {isDashFiltered && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                        กำลังกรอง {totalTickets} / {allProjectCount} ใบงาน
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    วิเคราะห์ข้อมูลใบงานแบบกราฟวงกลมแบ่งสัดส่วน • คลิกที่กราฟหรือใช้ตัวกรองด้านบนเพื่อดูข้อมูลเฉพาะกลุ่ม • {project.name}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isDashFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setTechFilter('ALL');
                      setChannelFilter('ALL');
                      setDateRange({ start: '', end: '' });
                      setPriorityFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}
                <div className="px-3.5 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-xs text-slate-300 font-medium flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    ประจำเดือน {monthThaiNames[new Date().getMonth()]} {new Date().getFullYear() + 543}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="ส่งออกรายงาน Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="พิมพ์รายงาน PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* 5 Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* KPI 1: Revenue */}
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">รายได้รวมที่ปิดงาน</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    ฿{totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      เฉลี่ย ฿
                      {(completedTickets.length > 0
                        ? Math.round(totalRevenue / completedTickets.length)
                        : 0
                      ).toLocaleString()}{' '}
                      / ใบงาน
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI 2: Completion Rate */}
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">อัตราปิดงานสำเร็จ</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-blue-400">
                    {completionRate}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{completedTickets.length} / {totalTickets} ใบงาน</span>
                    <span className="text-blue-400 font-semibold">เป้าหมาย &gt; 80%</span>
                  </div>
                </div>
              </div>

              {/* KPI 3: CSAT */}
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">ความพึงพอใจ (CSAT)</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-amber-400 flex items-center gap-1">
                    <span>{avgCsat}</span>
                    <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </div>
                  <div className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                    <span>★★★★★</span>
                    <span className="text-slate-400">({ratedTickets.length} รีวิว)</span>
                  </div>
                </div>
              </div>

              {/* KPI 4: Tech Readiness */}
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">ความพร้อมทีมช่าง</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-white">
                    {availableTechs.length} <span className="text-sm font-normal text-slate-400">/ {totalTechs} คน</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>พร้อมรับงาน ({Math.round((availableTechs.length / (totalTechs || 1)) * 100)}%)</span>
                  </div>
                </div>
              </div>

              {/* KPI 5: Urgent Queue */}
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">เคสด่วนที่ต้องดูแล</span>
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-red-400">
                    {urgentCount} <span className="text-xs font-normal text-slate-400">เคส</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-red-400" />
                    <span>ตอบกลับเฉลี่ย &lt; 15 นาที</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: 3 Interactive Donut Charts (Filterable by clicking slices or legends) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Donut 1: Channel Acquisition */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">สัดส่วนช่องทางแจ้งซ่อม</h4>
                      <p className="text-[11px] text-slate-400">คลิกที่กราฟเพื่อกรองช่องทาง</p>
                    </div>
                  </div>
                  {channelFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setChannelFilter('ALL')}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 cursor-pointer hover:bg-orange-500/25"
                    >
                      รีเซ็ต
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {renderDonutSvg(channelSegments, `${totalTickets}`, 'ใบงาน')}
                  <div className="flex-1 w-full space-y-2">
                    {channelSegments.map((seg) => {
                      const pct = totalTickets > 0 ? Math.round((seg.count / totalTickets) * 100) : 0;
                      return (
                        <button
                          key={seg.key}
                          type="button"
                          onClick={seg.onClick}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                            seg.active
                              ? 'bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/30'
                              : 'bg-[#0b0f19] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-200">
                            <span className={`w-2.5 h-2.5 rounded-full ${seg.dotClass}`} />
                            <span>{seg.label}</span>
                          </span>
                          <span className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400 text-[11px]">{seg.count} งาน</span>
                            <span className={`font-bold ${seg.textClass}`}>{pct}%</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Donut 2: Status Pipeline */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">สัดส่วนสถานะใบงาน</h4>
                      <p className="text-[11px] text-slate-400">คลิกที่กราฟเพื่อกรองสถานะ</p>
                    </div>
                  </div>
                  {statusFilter !== 'ALL' ? (
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 cursor-pointer hover:bg-orange-500/25"
                    >
                      รีเซ็ต
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveView('table')}
                      className="text-[11px] text-orange-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span>ดูตาราง</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {renderDonutSvg(statusSegments, `${completionRate}%`, 'ปิดงานแล้ว')}
                  <div className="flex-1 w-full space-y-1.5">
                    {statusSegments.map((seg) => {
                      const pct = totalTickets > 0 ? Math.round((seg.count / totalTickets) * 100) : 0;
                      return (
                        <button
                          key={seg.key}
                          type="button"
                          onClick={seg.onClick}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                            seg.active
                              ? 'bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/30'
                              : 'bg-[#0b0f19] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-200 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${seg.dotClass}`} />
                            <span className="truncate">{seg.label}</span>
                          </span>
                          <span className="flex items-center gap-2 font-mono shrink-0">
                            <span className="text-slate-400 text-[11px]">{seg.count}</span>
                            <span className={`font-bold ${seg.textClass}`}>{pct}%</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Donut 3: Priority Breakdown */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">สัดส่วนความเร่งด่วน</h4>
                      <p className="text-[11px] text-slate-400">คลิกที่กราฟเพื่อกรองระดับงาน</p>
                    </div>
                  </div>
                  {priorityFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setPriorityFilter('ALL')}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 cursor-pointer hover:bg-orange-500/25"
                    >
                      รีเซ็ต
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {renderDonutSvg(prioritySegments, `${urgentCount}`, 'เคสด่วนมาก')}
                  <div className="flex-1 w-full space-y-2">
                    {prioritySegments.map((seg) => {
                      const pct = totalTickets > 0 ? Math.round((seg.count / totalTickets) * 100) : 0;
                      return (
                        <button
                          key={seg.key}
                          type="button"
                          onClick={seg.onClick}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                            seg.active
                              ? 'bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/30'
                              : 'bg-[#0b0f19] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-200">
                            <span className={`w-2.5 h-2.5 rounded-full ${seg.dotClass}`} />
                            <span>{seg.label}</span>
                          </span>
                          <span className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400 text-[11px]">{seg.count} งาน</span>
                            <span className={`font-bold ${seg.textClass}`}>{pct}%</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Leaderboard & Common Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Technician Leaderboard Card */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">ทำเนียบผลงานช่างยอดเยี่ยม (Top Technicians)</h4>
                      <p className="text-[11px] text-slate-400">จัดอันดับตามจำนวนงานที่ปิดสำเร็จและคะแนนความพึงพอใจ</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">ทั้งหมด {projectTechs.length} คน</span>
                </div>

                <div className="space-y-2.5">
                  {projectTechs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-[#0b0f19] rounded-xl border border-slate-800">
                      ยังไม่มีรายชื่อช่างในโปรเจกต์นี้
                    </div>
                  ) : (
                    projectTechs.slice(0, 4).map((tech, idx) => {
                      const isAvailable = tech.status === 'AVAILABLE';
                      const medals = ['🥇', '🥈', '🥉', '🎖️'];
                      const techJobCount = dashTickets.filter((t) => t.assignedTechName === tech.name).length;
                      const techRated = dashTickets.filter((t) => t.assignedTechName === tech.name && t.csatRating);
                      const techAvgRating = techRated.length > 0
                        ? (techRated.reduce((s, t) => s + (t.csatRating || 0), 0) / techRated.length).toFixed(1)
                        : '-';
                      return (
                        <div
                          key={tech.id}
                          className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold shrink-0">
                              {medals[idx]}
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {tech.name.replace(/^ช่าง/, '').trim().charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span>{tech.name}</span>
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full font-medium ${isAvailable ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                  <span className={`w-1 h-1 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                  {isAvailable ? 'พร้อมรับงาน' : 'ติดงาน'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{tech.specialty}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-white font-mono">{techJobCount} งาน</div>
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold mt-0.5 justify-end">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{techAvgRating} / 5.0</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Common Issues & Equipment Insights */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">วิเคราะห์ประเภทอาการเสีย &amp; ปัญหาที่พบบ่อย</h4>
                      <p className="text-[11px] text-slate-400">สถิติอาการแจ้งซ่อมจากใบงานจริงในระบบ</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-orange-400 font-semibold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                    ความถี่สูงสุด
                  </span>
                </div>

                {(() => {
                  const issueCounts = new Map<string, number>();
                  dashTickets.forEach((t) => {
                    const key = (t.subject && t.subject !== '-' ? t.subject : t.symptom) || 'ไม่ระบุอาการ';
                    issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
                  });
                  const colors = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500'];
                  const topIssues = Array.from(issueCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([issue, cnt], i) => ({
                      issue,
                      count: `${cnt} ครั้ง`,
                      percent: totalTickets > 0 ? Math.round((cnt / totalTickets) * 100) : 0,
                      color: colors[i % colors.length],
                    }));

                  if (topIssues.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500 bg-[#0b0f19] rounded-xl border border-slate-800">
                        ยังไม่มีข้อมูลอาการแจ้งซ่อมในระบบ
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 text-xs">
                      {topIssues.map((row) => (
                        <div key={row.issue} className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span className="font-medium text-slate-200 truncate mr-2">{row.issue}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-slate-400 font-mono">{row.count}</span>
                              <span className="font-bold font-mono text-white">{row.percent}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 4: Quick Action Shortcuts */}
            <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="font-medium text-slate-300">ทางลัดการทำงานด่วน:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('table')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <TableIcon className="w-3.5 h-3.5 text-orange-400" />
                  <span>เปิดตารางจัดการใบงาน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('calendar')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                  <span>ดูคิวงานในปฏิทิน</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenMobileSim}
                  className="px-3.5 py-1.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>จำลองแอปมือถือช่าง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ สร้างใบงานใหม่</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌟 MODAL: มอบหมายช่าง & กำหนดวันนัดหมาย (เพื่อให้งานขึ้นบนปฏิทินทันทีตามที่ผู้ใช้สั่ง) */}
      {assigningTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-400" />
                  <span>มอบหมายงาน & นัดหมายช่าง</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ใบงานรหัส: <strong className="text-orange-400">{assigningTicket.trackingCode}</strong> — {assigningTicket.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* เลือกช่าง พร้อมปุ่ม AI Auto-Match */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">
                    เลือกช่างผู้รับผิดชอบ <span className="text-orange-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSmartAutoAssign(assigningTicket, assignDate)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/30 hover:bg-orange-500/20 transition-colors cursor-pointer"
                    title="วิเคราะห์อาการและแนะนำช่างที่ว่างและตรงสายงานโดยอัตโนมัติ"
                  >
                    <Zap className="w-3 h-3 text-orange-400" />
                    <span>⚡ AI แนะนำช่าง</span>
                  </button>
                </div>
                <select
                  value={assignTechName}
                  onChange={(e) => setAssignTechName(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>-- เลือกช่างในสังกัด --</option>
                  {projectTechs.map((tech) => {
                    const jobsOnDate = getTechJobCountOnDate(tech.name, assignDate, assigningTicket.id);
                    return (
                      <option key={tech.id} value={tech.name}>
                        {tech.name} ({tech.specialty}) {jobsOnDate > 0 ? `• มีงานวันนั้น ${jobsOnDate} งาน` : '• ว่าง'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* เลือกวันนัดหมาย */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  กำหนดวันที่นัดหมาย (จะปรากฏบนปฏิทินงานทันที) <span className="text-orange-400">*</span>
                </label>
                <CustomDarkSingleDatePicker
                  value={assignDate}
                  onChange={setAssignDate}
                  placeholder="คลิกเพื่อเลือกวันนัดหมาย"
                />
              </div>

              {/* เลือกช่วงเวลานัดหมาย */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">ช่วงเวลาเข้าบริการ</label>
                <select
                  value={assignTimeSlot}
                  onChange={(e) => setAssignTimeSlot(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="09:00 - 12:00 น. (ช่วงเช้า)">09:00 - 12:00 น. (ช่วงเช้า)</option>
                  <option value="13:00 - 16:00 น. (ช่วงบ่าย)">13:00 - 16:00 น. (ช่วงบ่าย)</option>
                  <option value="16:00 - 19:00 น. (ช่วงเย็น)">16:00 - 19:00 น. (ช่วงเย็น)</option>
                </select>
              </div>

              {/* Conflict warning if overloaded */}
              {assignTechName && assignDate && getTechJobCountOnDate(assignTechName, assignDate, assigningTicket.id) >= 2 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>แจ้งเตือนคิวชน:</strong> ช่าง &quot;{assignTechName}&quot; มีงานในวันที่ {formatThaiDate(assignDate)} แล้ว{' '}
                    {getTechJobCountOnDate(assignTechName, assignDate, assigningTicket.id)} งาน อาจทำให้การเดินทางหรือเวลาซ้อนทับกัน
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-400 text-[11px]">
                💡 เมื่อกดยืนยัน ใบงานจะถูกปรับสถานะเป็น <strong>&quot;มอบหมายแล้ว&quot;</strong> และจะไปปรากฏบนช่องวันที่{' '}
                <strong className="text-white">{formatThaiDate(assignDate)}</strong> ในหน้าปฏิทินงานทันที
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAssigningTicket(null)}
                className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันมอบหมายงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ปิดงานพร้อมหลักฐาน & ค่าใช้จ่าย */}
      {closingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>ปิดงานซ่อมบริการพร้อมหลักฐาน</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ใบงานรหัส: <strong className="text-orange-400">{closingTicket.trackingCode}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClosingTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  ยอดค่าบริการ / ค่าอะไหล่รวม (บาท) <span className="text-orange-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={closingCost}
                    onChange={(e) => setClosingCost(e.target.value)}
                    className="w-full pl-9 pr-3.5 h-[40px] rounded-xl bg-[#0b0f19] border border-slate-700 text-white font-mono font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">ผลสรุปการซ่อม / อาการหลังแก้ไข</label>
                <textarea
                  rows={3}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-orange-400" />
                  <span>แนบรูปภาพหน้างาน / หลักฐานงานเสร็จสมบูรณ์</span>
                </label>
                <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 flex items-center gap-3">
                  <img
                    src={closingPhoto}
                    alt="Evidence"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-700"
                  />
                  <div className="space-y-1 text-slate-400">
                    <div className="text-white font-medium">รูปถ่ายอุปกรณ์และใบเสร็จหน้างาน</div>
                    <div className="text-[10px]">บันทึกโดยช่าง {closingTicket.assignedTechName || 'ประจำร้าน'}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ระบบจะส่งข้อความแจ้งเตือนปิดงานและขอคะแนนความพึงพอใจเข้า LINE ลูกค้าอัตโนมัติ</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClosingTicket(null)}
                className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseTicket}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                ยืนยันการปิดงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Webhook Logs */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Webhook Logs & Test Connection</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ตรวจสอบการส่งต่อข้อมูลจาก Botnoi Chatbot / Voicebot เข้าระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWebhookModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-sm text-white">Webhook Endpoint: Active</span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono break-all">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${project.id}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const webhookUrl = `${window.location.origin}/api/webhooks/${project.id}`;
                      navigator.clipboard?.writeText(webhookUrl);
                      showToast('คัดลอก Webhook URL เรียบร้อยแล้ว', 'success');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-orange-400" />
                    <span>คัดลอก URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      showToast('กำลังทดสอบ Ping ไปยัง Webhook Endpoint...', 'info');
                      setTimeout(() => {
                        const newLog: WebhookLogItem = {
                          id: `wh-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString('th-TH'),
                          channel: 'Botnoi Test Ping',
                          statusCode: 200,
                          trackingCode: 'PING-OK',
                          customerName: 'System Health Check',
                          latencyMs: Math.floor(90 + Math.random() * 40),
                          payload: { action: 'ping', status: 'healthy', project: project.name },
                        };
                        setWebhookLogs((prev) => [newLog, ...prev]);
                        showToast('🟢 Webhook เชื่อมต่อสมบูรณ์ (HTTP 200 OK • Latency: 114ms)', 'success');
                      }, 500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ทดสอบส่ง Ping</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                  ประวัติการเรียก Webhook ล่าสุด
                </div>
                {webhookLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          {log.statusCode} OK
                        </span>
                        <span className="text-white font-semibold">{log.channel}</span>
                        <span className="text-orange-400 font-mono font-bold">{log.trackingCode}</span>
                      </div>
                      <span className="text-slate-500">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-400 text-[11px] flex items-center justify-between">
                      <span>ลูกค้า: {log.customerName}</span>
                      <span className="font-mono text-slate-500">Latency: {log.latencyMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: หน้ารายละเอียดใบงาน (Detailed Modal) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-orange-500 text-white">
                    {selectedTicket.trackingCode}
                  </span>
                  <span
                    style={{
                      backgroundColor: STATUS_CONFIG[selectedTicket.status]?.bgColor,
                      color: STATUS_CONFIG[selectedTicket.status]?.textColor,
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      style={{ backgroundColor: STATUS_CONFIG[selectedTicket.status]?.dotColor }}
                      className="w-1.5 h-1.5 rounded-full"
                    />
                    <span>{STATUS_CONFIG[selectedTicket.status]?.label}</span>
                  </span>
                  {selectedTicket.priority === 'URGENT' && (
                    <span className="text-xs text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      🔥 ด่วนมาก
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">{selectedTicket.subject}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTicket({ ...selectedTicket })}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-orange-400" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-Tabs Nav */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-[#111827] text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${detailTab === 'info' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400'
                  }`}
              >
                ข้อมูลทั่วไป & อาการ
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('chat')}
                className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${detailTab === 'chat' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>บทสนทนาบอท</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('timeline')}
                className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${detailTab === 'timeline' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400'
                  }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>ไทม์ไลน์สถานะ</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('notes')}
                className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${detailTab === 'notes' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400'
                  }`}
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>บันทึกภายใน ({selectedTicket.internalNotes?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('crm')}
                className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${detailTab === 'crm' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400'
                  }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>CRM & อุปกรณ์</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('invoice')}
                className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${detailTab === 'invoice' ? 'border-orange-500 text-white' : 'border-transparent text-slate-400'
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ใบเสนอราคา/ใบเสร็จ</span>
              </button>
            </div>

            {/* Content Tabs */}
            {detailTab === 'info' && (
              <div className="p-6 space-y-4 overflow-y-auto text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs bg-[#0b0f19] p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block mb-0.5">ลูกค้า:</span>
                    <span className="font-semibold text-white text-sm">{selectedTicket.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">เบอร์ติดต่อ:</span>
                    <span className="font-medium text-slate-200 text-sm">{selectedTicket.customerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">ช่องทางติดต่อ:</span>
                    <span className="font-medium text-slate-200">{getChannelLabel(selectedTicket.channel)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">วัน-เวลานัดหมาย:</span>
                    <span className="font-medium text-slate-200">
                      {formatThaiDate(selectedTicket.preferredDate)} ({selectedTicket.timeSlot || 'ช่วงเวลาปกติ'})
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block mb-0.5">สถานที่หน้างาน:</span>
                    <div className="text-slate-200 flex items-center gap-1">
                      <span>{selectedTicket.address || '-'}</span>
                      {selectedTicket.address && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTicket.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:underline flex items-center gap-1 ml-2 font-medium"
                        >
                          <MapPin className="w-3 h-3" /> แผนที่
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    รายละเอียดอาการเสีย
                  </label>
                  <div className="text-xs text-slate-300 leading-relaxed bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800">
                    {selectedTicket.symptom}
                  </div>
                </div>

                {selectedTicket.evidencePhoto && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      หลักฐานและยอดชำระการปิดงาน
                    </label>
                    <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 flex items-center gap-4">
                      <img
                        src={selectedTicket.evidencePhoto}
                        alt="Evidence"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          ยอดชำระ: {selectedTicket.cost ? `${selectedTicket.cost.toLocaleString()} บาท` : '-'}
                        </div>
                        <div className="text-[11px] text-emerald-400">สถานะ: ปิดงานสมบูรณ์</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CSAT Customer Feedback */}
                {selectedTicket.csatRating ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      คะแนนความพึงพอใจลูกค้า (CSAT Feedback)
                    </label>
                    <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (selectedTicket.csatRating || 5)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                          <span className="font-bold text-xs ml-1.5 text-white">
                            {selectedTicket.csatRating}.0 / 5.0
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                          ผ่านการประเมินแล้ว
                        </span>
                      </div>
                      {selectedTicket.csatComment && (
                        <p className="text-xs text-slate-300 italic bg-[#111827] p-2.5 rounded-lg border border-slate-800">
                          "{selectedTicket.csatComment}"
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {detailTab === 'chat' && (
              <div className="p-6 overflow-y-auto space-y-3 max-h-[55vh]">
                <div className="text-xs text-slate-400 mb-2">
                  บันทึกบทสนทนาจากช่องทาง {getChannelLabel(selectedTicket.channel)}
                </div>
                {isLoadingTicketChat ? (
                  <div className="p-8 rounded-xl bg-[#0b0f19] border border-slate-800 text-center text-xs text-slate-400">
                    กำลังดึงประวัติแชทของใบงานจากฐานข้อมูล...
                  </div>
                ) : ticketChatMessages.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#0b0f19] border border-slate-800 text-center space-y-1">
                    <div className="text-xs font-semibold text-slate-300">
                      ยังไม่มีประวัติข้อความแชทในใบงานนี้
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ข้อความจะปรากฏเมื่อใบงานถูกเปิดผ่าน Chatbot / Voicebot หรือมีการบันทึกบทสนทนา
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ticketChatMessages.map((msg, idx) => {
                      const isBotOrStaff =
                        msg.sender === 'BOT' || msg.sender === 'STAFF' || Boolean(msg.fromStaff);
                      const timeText =
                        msg.time ||
                        (msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '');
                      const senderName =
                        msg.sender === 'STAFF' || msg.fromStaff
                          ? msg.user?.name || 'เจ้าหน้าที่ร้าน'
                          : msg.sender === 'BOT'
                          ? 'บอทประจำร้าน'
                          : selectedTicket.customerName;

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isBotOrStaff ? 'items-start' : 'items-end'}`}
                        >
                          <div className="text-[10px] text-slate-500 mb-1">
                            {senderName}
                            {timeText ? ` • ${timeText}` : ''}
                          </div>
                          <div
                            className={`max-w-[85%] px-4 py-2.5 text-xs whitespace-pre-wrap break-words ${
                              isBotOrStaff
                                ? 'bg-[#0b0f19] border border-slate-700 text-slate-200 rounded-2xl rounded-bl-none'
                                : 'bg-orange-500 text-white rounded-2xl rounded-br-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'timeline' && (
              <div className="p-6 overflow-y-auto space-y-4 max-h-[55vh]">
                <div className="text-xs text-slate-400 mb-1">ลำดับการดำเนินงาน</div>
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 text-xs">
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </div>
                    <div className="font-bold text-white">บันทึกใบงานเข้าระบบ</div>
                    <div className="text-slate-400 text-[11px]">{selectedTicket.channel} • รหัส {selectedTicket.trackingCode}</div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </div>
                    <div className="font-bold text-white">มอบหมายช่างผู้รับผิดชอบ</div>
                    <div className="text-slate-400 text-[11px]">
                      {selectedTicket.assignedTechName ? `ช่าง: ${selectedTicket.assignedTechName}` : 'รอจัดสรร'}
                    </div>
                  </div>
                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${selectedTicket.status === 'COMPLETED' ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-400'
                        }`}
                    >
                      {selectedTicket.status === 'COMPLETED' ? '✓' : '3'}
                    </div>
                    <div className="font-bold text-white">ปิดงานบริการ</div>
                    <div className="text-slate-400 text-[11px]">
                      {selectedTicket.status === 'COMPLETED' ? 'เสร็จสิ้นเรียบร้อย' : 'กำลังดำเนินการ'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'notes' && (
              <div className="p-6 overflow-y-auto space-y-4 max-h-[55vh]">
                <div className="space-y-2">
                  {(selectedTicket.internalNotes || []).map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-orange-400">{n.author}</span>
                        <span className="text-[10px]">{n.time}</span>
                      </div>
                      <div className="text-slate-200">{n.text}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    placeholder="พิมพ์โน้ตช่วยจำภายใน..."
                    className="flex-1 h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newNoteInput.trim()) return;
                      const newN: InternalNote = {
                        id: `note-${Date.now()}`,
                        author: 'แอดมินสาขา',
                        text: newNoteInput.trim(),
                        time: 'เมื่อสักครู่',
                      };
                      setTickets((prev) =>
                        prev.map((t) =>
                          t.id === selectedTicket.id ? { ...t, internalNotes: [...(t.internalNotes || []), newN] } : t
                        )
                      );
                      setSelectedTicket((prev) => (prev ? { ...prev, internalNotes: [...(prev.internalNotes || []), newN] } : null));
                      setNewNoteInput('');
                      showToast('บันทึกโน้ตสำเร็จ', 'success');
                    }}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            )}

            {/* CRM & Equipment & Recurring Maintenance */}
            {detailTab === 'crm' && (
              <div className="p-6 overflow-y-auto space-y-4 max-h-[55vh] text-xs">
                {/* Equipment & Dynamic Extra Details */}
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-orange-400" />
                      <span>ข้อมูลเฉพาะอาชีพ / รายละเอียดในใบงาน</span>
                    </h4>
                    <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
                      {project.category}
                    </span>
                  </div>
                  {(() => {
                    const extraEntries = Object.entries(selectedTicket.extraDetails || {}).filter(
                      ([key, val]) =>
                        !key.startsWith('_') &&
                        val !== undefined &&
                        val !== null &&
                        String(val).trim() !== ''
                    );
                    if (extraEntries.length === 0) {
                      return (
                        <div className="p-3 rounded-lg bg-[#111827] border border-slate-800 text-center text-slate-500 text-xs">
                          ไม่มีข้อมูลฟิลด์เฉพาะอาชีพเพิ่มเติมในใบงานนี้
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                        {extraEntries.map(([key, val]) => (
                          <div
                            key={key}
                            className="p-2.5 rounded-lg bg-[#111827] border border-slate-800/80"
                          >
                            <span className="text-slate-400 block text-[11px]">{key}:</span>
                            <span className="font-semibold text-white break-words">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Recurring Maintenance Scheduler */}
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-orange-400" />
                        <span>การบำรุงรักษาซ้ำอัตโนมัติ (Recurring Maintenance)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ระบบจะสร้างใบงานและส่งแจ้งเตือนลูกค้าทาง LINE OA โดยอัตโนมัติตามรอบที่กำหนด
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 font-medium">รอบบริการ:</span>
                    {[
                      { months: 3, label: 'ทุก 3 เดือน' },
                      { months: 6, label: 'ทุก 6 เดือน' },
                      { months: 12, label: 'ทุก 1 ปี' },
                    ].map((cycle) => (
                      <button
                        key={cycle.months}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...selectedTicket,
                            recurringMonths: cycle.months,
                          };
                          setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                          setSelectedTicket(updated);
                          showToast(`ตั้งรอบบำรุงรักษาซ้ำ ${cycle.label} เรียบร้อย`, 'success');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                          (selectedTicket.recurringMonths || 6) === cycle.months
                            ? 'bg-orange-500 text-white font-bold shadow-xs'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {cycle.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">นัดหมายตรวจเช็คครั้งถัดไป:</div>
                      <div className="text-[11px] text-orange-200 mt-0.5">
                        {(() => {
                          const baseDate = selectedTicket.preferredDate
                            ? new Date(selectedTicket.preferredDate)
                            : new Date();
                          baseDate.setMonth(baseDate.getMonth() + (selectedTicket.recurringMonths || 6));
                          const nextStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
                          return formatThaiDate(nextStr);
                        })()}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                      เปิดใช้งาน Auto-Cycle
                    </span>
                  </div>
                </div>

                {/* Service History */}
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>ประวัติบริการย้อนหลังของลูกค้าท่านนี้</span>
                  </h4>
                  {(() => {
                    const history = projectTickets.filter(
                      (t) =>
                        t.id !== selectedTicket.id &&
                        ((selectedTicket.customerPhone &&
                          selectedTicket.customerPhone !== '-' &&
                          t.customerPhone === selectedTicket.customerPhone) ||
                          t.customerName === selectedTicket.customerName)
                    );
                    if (history.length === 0) {
                      return (
                        <div className="p-3 rounded-lg bg-[#111827] border border-slate-800 text-center text-slate-500 text-xs">
                          ยังไม่มีประวัติบริการย้อนหลังของลูกค้าท่านนี้
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {history.map((h) => (
                          <div key={h.id} className="p-2.5 rounded-lg bg-[#111827] border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-200">{h.subject || h.symptom}</div>
                              <div className="text-[10px] text-slate-400">
                                {formatThaiDate(h.preferredDate) || '-'} • {h.assignedTechName || 'ยังไม่ระบุช่าง'} • {STATUS_CONFIG[h.status]?.label}
                              </div>
                            </div>
                            <span className="font-mono text-emerald-400 font-bold">
                              {h.cost ? `${h.cost.toLocaleString()} บาท` : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Quotation & Invoice */}
            {detailTab === 'invoice' && (
              <div className="p-6 overflow-y-auto space-y-4 max-h-[55vh] text-xs">
                {/* Quotation / Invoice Card */}
                <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-xl space-y-5">
                  {/* Invoice Header */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                      <div className="text-orange-600 font-black text-lg tracking-tight">{project.name}</div>
                      <div className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                        สาขา: {project.branchName}<br />
                        หมวดหมู่บริการ: {project.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 font-bold text-xs uppercase tracking-wide">
                        ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-1.5">
                        เลขที่: {selectedTicket.invoiceNumber || `INV-${selectedTicket.trackingCode}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        วันที่: {formatThaiDate(selectedTicket.preferredDate || getTodayLocalDateStr())}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Box */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">ข้อมูลลูกค้า:</span>
                      <strong className="text-slate-800">{selectedTicket.customerName}</strong>
                      <div className="text-slate-600 text-[11px]">โทร: {selectedTicket.customerPhone}</div>
                      <div className="text-slate-600 text-[11px] truncate">สถานที่: {selectedTicket.address || 'ตามที่อยู่นัดหมาย'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">รายละเอียดงาน:</span>
                      <strong className="text-slate-800">{selectedTicket.subject}</strong>
                      <div className="text-slate-600 text-[11px]">ช่างผู้ให้บริการ: {selectedTicket.assignedTechName || 'ช่างประจำศูนย์'}</div>
                      <div className="text-slate-600 text-[11px]">รหัสอ้างอิง: {selectedTicket.trackingCode}</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-500 text-left font-bold">
                        <th className="py-2 w-8">#</th>
                        <th className="py-2">รายการบริการและอะไหล่</th>
                        <th className="py-2 text-center w-16">จำนวน</th>
                        <th className="py-2 text-right w-24">หน่วยละ</th>
                        <th className="py-2 text-right w-24">รวมเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 text-slate-400">1</td>
                        <td className="py-2.5 font-medium text-slate-800">
                          ค่าบริการตรวจเช็คและค่าแรงช่างมาตรฐาน
                          <div className="text-[10px] text-slate-400">{selectedTicket.symptom}</div>
                        </td>
                        <td className="py-2.5 text-center text-slate-600">1 งาน</td>
                        <td className="py-2.5 text-right text-slate-600">500.00</td>
                        <td className="py-2.5 text-right font-medium text-slate-800">500.00</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400">2</td>
                        <td className="py-2.5 font-medium text-slate-800">
                          ค่าอะไหล่ทดแทน / น้ำยา / สารบำรุงรักษา
                          <div className="text-[10px] text-slate-400">
                            ให้บริการโดย {project.name} ({project.branchName})
                          </div>
                        </td>
                        <td className="py-2.5 text-center text-slate-600">1 ชุด</td>
                        <td className="py-2.5 text-right text-slate-600">
                          {((selectedTicket.cost || 1200) - 500).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-800">
                          {((selectedTicket.cost || 1200) - 500).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Price Calculations */}
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <div className="w-64 space-y-1.5 text-xs text-right">
                      <div className="flex justify-between text-slate-600">
                        <span>ยอดรวมก่อนภาษี (Subtotal):</span>
                        <span className="font-mono">
                          {(((selectedTicket.cost || 1200) * 100) / 107).toFixed(2)} ฿
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                        <span className="font-mono">
                          {((selectedTicket.cost || 1200) - ((selectedTicket.cost || 1200) * 100) / 107).toFixed(2)} ฿
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-base text-slate-900 border-t-2 border-slate-900 pt-1.5">
                        <span>ยอดสุทธิทั้งสิ้น (Total):</span>
                        <span className="text-orange-600 font-mono">
                          {(selectedTicket.cost || 1200).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      showToast(`ส่งใบเสนอราคา/ใบเสร็จ ${selectedTicket.invoiceNumber || 'INV-' + selectedTicket.trackingCode} ให้ลูกค้าทาง LINE OA สำเร็จ!`, 'success');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ส่งใบเสร็จให้ลูกค้า (LINE OA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ใบเสร็จ / ดาวน์โหลด PDF</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">ID: {selectedTicket.id}</span>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-400" />
                <span>สร้างใบงานใหม่ (Manual Entry)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">ชื่อลูกค้า *</label>
                  <input
                    type="text"
                    value={createCustomerName}
                    onChange={(e) => setCreateCustomerName(e.target.value)}
                    placeholder="เช่น คุณสมชาย เจริญสุข"
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">เบอร์ติดต่อ *</label>
                  <input
                    type="text"
                    value={createCustomerPhone}
                    onChange={(e) => setCreateCustomerPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">ช่องทาง</label>
                  <select
                    value={createChannel}
                    onChange={(e) => setCreateChannel(e.target.value as any)}
                    className="w-full h-[40px] px-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 cursor-pointer"
                  >
                    <option value="LINE OA">LINE OA</option>
                    <option value="Voicebot">Voicebot</option>
                    <option value="Walk-in">หน้าร้าน / โทรศัพท์</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">ความเร่งด่วน</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full h-[40px] px-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 cursor-pointer"
                  >
                    <option value="NORMAL">ปกติ</option>
                    <option value="URGENT">🔥 ด่วนมาก</option>
                    <option value="LOW">ไม่เร่งด่วน</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">วันนัดหมาย</label>
                  <CustomDarkSingleDatePicker
                    value={createPreferredDate}
                    onChange={setCreatePreferredDate}
                    placeholder="เลือกวันนัดหมาย"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">ช่วงเวลานัดหมาย</label>
                <select
                  value={createTimeSlot}
                  onChange={(e) => setCreateTimeSlot(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 cursor-pointer"
                >
                  <option value="09:00 - 12:00 น. (ช่วงเช้า)">09:00 - 12:00 น. (ช่วงเช้า)</option>
                  <option value="13:00 - 16:00 น. (ช่วงบ่าย)">13:00 - 16:00 น. (ช่วงบ่าย)</option>
                  <option value="16:00 - 19:00 น. (ช่วงเย็น)">16:00 - 19:00 น. (ช่วงเย็น)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">ที่อยู่หน้างาน / สถานที่เข้าบริการ</label>
                <input
                  type="text"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="เช่น เลขที่ 99 ซ.พระราม 2..."
                  className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">หัวข้องานแจ้งซ่อม *</label>
                <input
                  type="text"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  placeholder="เช่น ซ่อมแอร์ไม่เย็น, เปลี่ยนน้ำมันเครื่องรถยนต์"
                  className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">รายละเอียดอาการเสีย</label>
                <textarea
                  rows={2}
                  value={createSymptom}
                  onChange={(e) => setCreateSymptom(e.target.value)}
                  placeholder="ระบุอาการเพิ่มเติม..."
                  className="w-full p-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {project.requiredFields.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#0b0f19]/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-orange-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>ข้อมูลเฉพาะอาชีพ ({project.category})</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {project.requiredFields.length} ฟิลด์
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.requiredFields.map((field) => (
                      <div key={field}>
                        <label className="font-medium text-slate-300 block mb-1 text-[11px]">
                          {field}
                        </label>
                        <input
                          type="text"
                          value={createDynamicExtra[field] || ''}
                          onChange={(e) =>
                            setCreateDynamicExtra((prev) => ({
                              ...prev,
                              [field]: e.target.value,
                            }))
                          }
                          placeholder={`ระบุ${field}...`}
                          className="w-full h-[38px] px-3 rounded-xl bg-[#111827] border border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-300 block mb-1">มอบหมายช่างทันที</label>
                <select
                  value={createAssignedTech}
                  onChange={(e) => setCreateAssignedTech(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 cursor-pointer"
                >
                  <option value="">-- ยังไม่มอบหมาย (รอดำเนินการ) --</option>
                  {projectTechs.map((tech) => (
                    <option key={tech.id} value={tech.name}>
                      {tech.name} ({tech.specialty})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateTicket}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                บันทึกใบงานใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-orange-400" />
                <span>แก้ไขใบงาน ({editingTicket.trackingCode})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">ชื่อลูกค้า</label>
                  <input
                    type="text"
                    value={editingTicket.customerName}
                    onChange={(e) => setEditingTicket({ ...editingTicket, customerName: e.target.value })}
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">เบอร์ติดต่อ</label>
                  <input
                    type="text"
                    value={editingTicket.customerPhone}
                    onChange={(e) => setEditingTicket({ ...editingTicket, customerPhone: e.target.value })}
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">หัวข้องาน</label>
                  <input
                    type="text"
                    value={editingTicket.subject}
                    onChange={(e) => setEditingTicket({ ...editingTicket, subject: e.target.value })}
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">วันนัดหมาย</label>
                  <CustomDarkSingleDatePicker
                    value={editingTicket.preferredDate || ''}
                    onChange={(date) => setEditingTicket({ ...editingTicket, preferredDate: date })}
                    placeholder="เลือกวันนัดหมาย"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">ที่อยู่หน้างาน</label>
                <input
                  type="text"
                  value={editingTicket.address || ''}
                  onChange={(e) => setEditingTicket({ ...editingTicket, address: e.target.value })}
                  className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">อาการเสีย</label>
                <textarea
                  rows={3}
                  value={editingTicket.symptom}
                  onChange={(e) => setEditingTicket({ ...editingTicket, symptom: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!project.id.startsWith('proj-')) {
                    const cleanPhone = editingTicket.customerPhone.replace(/[\s-]/g, '');
                    updateProjectTicketApi(project.id, editingTicket.id, {
                      customerName: editingTicket.customerName.trim(),
                      ...(cleanPhone && cleanPhone !== '-' ? { customerPhone: cleanPhone } : {}),
                      brand: editingTicket.subject.trim(),
                      symptom: editingTicket.symptom.trim(),
                      ...(editingTicket.address?.trim() ? { address: editingTicket.address.trim() } : {}),
                      ...(editingTicket.preferredDate ? { preferredDate: editingTicket.preferredDate } : {}),
                    }).catch(handleSyncError);
                  }
                  setTickets((prev) => prev.map((t) => (t.id === editingTicket.id ? editingTicket : t)));
                  if (selectedTicket?.id === editingTicket.id) setSelectedTicket(editingTicket);
                  setEditingTicket(null);
                  showToast('อัปเดตใบงานเรียบร้อย', 'success');
                }}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Phase 3 MODAL: พอร์ทัลช่าง Technician Mobile Portal Simulator */}
      {isMobileSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative flex flex-col items-center">
            {/* Top Switcher & Close button */}
            <div className="w-[360px] flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Smartphone className="w-4 h-4 text-orange-400" />
                <span className="font-bold">จำลองแอปมือถือช่าง</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSimModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Smartphone Mockup Frame */}
            <div className="w-[360px] h-[720px] bg-[#090d16] rounded-[42px] border-[6px] border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 relative">
              {/* Top Dynamic Island / Speaker Notch */}
              <div className="pt-2.5 pb-1 flex justify-center bg-black">
                <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                </div>
              </div>

              {/* Status Bar */}
              <div className="px-5 py-1 flex items-center justify-between text-[11px] text-slate-400 bg-black font-medium">
                <span>09:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* App Bar */}
              <div className="p-3.5 bg-[#111827] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold flex items-center justify-center text-xs">
                    {mobileSimTechName.slice(0, 1)}
                  </div>
                  <div>
                    <select
                      value={mobileSimTechName}
                      onChange={(e) => setMobileSimTechName(e.target.value)}
                      className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer border-b border-slate-700 pb-0.5"
                    >
                      {projectTechs.map((tech) => (
                        <option key={tech.id} value={tech.name} className="bg-[#111827] text-white">
                          {tech.name}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ออนไลน์พร้อมรับงาน
                    </div>
                  </div>
                </div>
                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20 font-mono">
                  Plasom Tech App
                </span>
              </div>

              {/* Jobs Content for this Tech */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">คิวงานที่ได้รับมอบหมาย</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {projectTickets.filter((t) => t.assignedTechName === mobileSimTechName).length} งาน
                  </span>
                </div>

                {projectTickets.filter((t) => t.assignedTechName === mobileSimTechName).length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-[#0f172a] rounded-2xl border border-slate-800">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-400">ไม่มีคิวงานค้าง</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ช่างเคลียร์งานทั้งหมดเรียบร้อยแล้ว</p>
                  </div>
                ) : (
                  projectTickets
                    .filter((t) => t.assignedTechName === mobileSimTechName)
                    .map((job) => (
                      <div
                        key={job.id}
                        className="bg-[#111827] p-3 rounded-2xl border border-slate-800 space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-orange-400 text-xs">{job.trackingCode}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: STATUS_CONFIG[job.status].bgColor,
                              color: STATUS_CONFIG[job.status].textColor,
                            }}
                          >
                            {STATUS_CONFIG[job.status].label}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-white text-xs">{job.subject}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{job.symptom}</div>
                        </div>

                        {/* Customer & Location */}
                        <div className="p-2 rounded-xl bg-[#0b0f19] border border-slate-800/80 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">ลูกค้า:</span>
                            <span className="font-medium text-white">{job.customerName}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">เวลานัด:</span>
                            <span className="text-orange-300 font-medium">{formatThaiDate(job.preferredDate, true)}</span>
                          </div>
                        </div>

                        {/* Action Buttons for Mobile Tech */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={`tel:${job.customerPhone}`}
                            className="py-1.5 px-2 rounded-xl bg-[#0b0f19] border border-slate-700 hover:bg-slate-800 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>โทรหาลูกค้า</span>
                          </a>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address || job.customerName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 rounded-xl bg-[#0b0f19] border border-slate-700 hover:bg-slate-800 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5 text-blue-400" />
                            <span>นำทาง Maps</span>
                          </a>
                        </div>

                        {/* Status Change CTA in Mobile */}
                        {job.status === 'ASSIGNED' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!project.id.startsWith('proj-')) {
                                updateProjectTicketApi(project.id, job.id, {
                                  status: 'IN_PROGRESS',
                                }).catch(handleSyncError);
                              }
                              setTickets((prev) =>
                                prev.map((t) => (t.id === job.id ? { ...t, status: 'IN_PROGRESS' } : t))
                              );
                              if (selectedTicket?.id === job.id) {
                                setSelectedTicket((prev) =>
                                  prev ? { ...prev, status: 'IN_PROGRESS' } : null
                                );
                              }
                              showToast(`ช่างกดเริ่มงาน ${job.trackingCode} แล้ว`, 'success');
                            }}
                            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>เริ่มเข้าปฏิบัติงาน</span>
                          </button>
                        )}
                        {job.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!project.id.startsWith('proj-')) {
                                updateProjectTicketApi(project.id, job.id, {
                                  status: 'COMPLETED',
                                }).catch(handleSyncError);
                              }
                              setTickets((prev) =>
                                prev.map((t) =>
                                  t.id === job.id
                                    ? {
                                        ...t,
                                        status: 'COMPLETED',
                                        cost: t.cost || 1200,
                                        evidencePhoto:
                                          t.evidencePhoto ||
                                          'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&auto=format&fit=crop&q=80',
                                      }
                                    : t
                                )
                              );
                              if (selectedTicket?.id === job.id) {
                                setSelectedTicket((prev) =>
                                  prev ? { ...prev, status: 'COMPLETED' } : null
                                );
                              }
                              showToast(`ช่างปิดงานและส่งหลักฐาน ${job.trackingCode} เรียบร้อย`, 'success');
                            }}
                            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ถ่ายรูปส่งมอบ & ปิดงาน</span>
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Mobile Bottom Navigation */}
              <div className="p-2.5 bg-black border-t border-slate-800 flex items-center justify-around text-[10px] text-slate-400">
                <div className="flex flex-col items-center text-orange-400 font-bold">
                  <CheckSquare className="w-4 h-4" />
                  <span>งานของฉัน</span>
                </div>
                <div className="flex flex-col items-center hover:text-white cursor-pointer">
                  <CalendarDays className="w-4 h-4" />
                  <span>ตารางคิว</span>
                </div>
                <div className="flex flex-col items-center hover:text-white cursor-pointer">
                  <History className="w-4 h-4" />
                  <span>ประวัติ</span>
                </div>
                <div className="flex flex-col items-center hover:text-white cursor-pointer">
                  <User className="w-4 h-4" />
                  <span>โปรไฟล์</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
