import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Wrench,
  Briefcase,
  Bot,
  User,
  Sparkles,
  Phone,
  ShieldCheck,
  Building2,
  Send,
  MessageCircle,
  PauseCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Search,
  Filter,
  Award,
  TrendingUp,
} from 'lucide-react';
import type { ProjectItem, TechnicianItem } from '../mockConsoleData';
import {
  readCachedTechnicians,
  fetchProjectTechniciansApi,
  createProjectTechnicianApi,
  updateProjectTechnicianApi,
  deleteProjectTechnicianApi,
  rotateWebhookSecretApi,
} from '../consoleApi';

interface Props {
  project: ProjectItem;
}

export type TechStatus = 'AVAILABLE' | 'BUSY' | 'INACTIVE';

export interface ExtendedTechnician extends Omit<TechnicianItem, 'status'> {
  status: TechStatus;
  phone?: string;
  lineId?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  maxDailyJobs?: number;
}

const COMMON_SKILL_TAGS = [
  'ซ่อมบอร์ดอินเวอร์เตอร์',
  'ล้างแอร์ติดผนัง',
  'ติดตั้ง/ย้ายจุดแอร์',
  'เดินท่อน้ำยาและระบบไฟ',
  'ตรวจเช็กระยะ/ช่วงล่าง',
  'ซ่อมระบบเบรก',
  'เปลี่ยนถ่ายน้ำมันเครื่อง',
  'ตรวจเช็กระบบไฟฟ้า',
];

const TECH_STATUS_CONFIG: Record<
  TechStatus,
  {
    label: string;
    bgColor: string;
    textColor: string;
    dotColor: string;
    desc: string;
  }
> = {
  AVAILABLE: {
    label: 'พร้อมรับงาน',
    bgColor: '#ECFDF5',
    textColor: '#047857',
    dotColor: '#047857',
    desc: 'สามารถมอบหมายใบงานใหม่จากบอทได้ทันที',
  },
  BUSY: {
    label: 'ติดงานอยู่',
    bgColor: '#FFFBEB',
    textColor: '#B45309',
    dotColor: '#B45309',
    desc: 'อยู่ระหว่างปฏิบัติงานอื่น ยังไม่พร้อมรับเคสใหม่',
  },
  INACTIVE: {
    label: 'พักงาน/ปิดใช้งาน',
    bgColor: '#F3F4F6',
    textColor: '#6B7280',
    dotColor: '#9CA3AF',
    desc: 'ปิดรับงานชั่วคราว ไม่สามารถมอบหมายงานได้',
  },
};

export function TechniciansTab({ project }: Props) {
  const [techs, setTechs] = useState<ExtendedTechnician[]>(() => {
    if (!project.id.startsWith('proj-')) {
      return readCachedTechnicians(project.id).map((t: any) => ({
        id: t.id,
        projectId: project.id,
        name: t.name,
        specialty: t.specialty || 'ช่างประจำร้าน',
        phone: t.phone || '-',
        lineId: t.area || '-',
        activeJobs: Number(t.activeJobs ?? t._count?.tickets ?? 0),
        status: (t.status as TechStatus) || 'AVAILABLE',
        rating: t.rating ? Number(t.rating) : undefined,
        reviewCount: t.reviewCount ? Number(t.reviewCount) : 0,
        completedJobs: Number(t.completedJobs ?? 0),
        maxDailyJobs: 4,
      }));
    }
    return [];
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TechStatus>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<ExtendedTechnician | null>(null);
  const [deletingTech, setDeletingTech] = useState<ExtendedTechnician | null>(null);

  // Form States (for Add)
  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLineId, setNewLineId] = useState('');
  const [newStatus, setNewStatus] = useState<TechStatus>('AVAILABLE');

  // Form States (for Edit)
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLineId, setEditLineId] = useState('');
  const [editStatus, setEditStatus] = useState<TechStatus>('AVAILABLE');

  // Toast feedback
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const allProjectTechs = techs.filter((t) => t.projectId === project.id);
  const projectTechs = allProjectTechs.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.specialty.toLowerCase().includes(q) ||
      (t.phone || '').includes(q) ||
      (t.lineId || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Handle Add Technician (ข้อ 5)
  const handleAddTech = () => {
    if (!newName.trim()) {
      alert('กรุณาระบุชื่อช่าง');
      return;
    }

    const added: ExtendedTechnician = {
      id: `tech-${Date.now()}`,
      projectId: project.id,
      name: newName.trim(),
      specialty: newSpecialty.trim() || 'ช่างประจำร้าน',
      phone: newPhone.trim() || '08X-XXX-XXXX',
      lineId: newLineId.trim() || `@tech_${newName.trim().slice(0, 4)}`,
      activeJobs: 0,
      status: newStatus,
    };

    setTechs((prev) => [...prev, added]);
    setNewName('');
    setNewSpecialty('');
    setNewPhone('');
    setNewLineId('');
    setNewStatus('AVAILABLE');
    setIsAddModalOpen(false);
    showToast(`เพิ่มช่าง "${added.name}" เข้าโปรเจกต์เรียบร้อย`);
  };

  // Open Edit Modal (ข้อ 5)
  const handleOpenEdit = (tech: ExtendedTechnician) => {
    setEditingTech(tech);
    setEditName(tech.name);
    setEditSpecialty(tech.specialty);
    setEditPhone(tech.phone || '');
    setEditLineId(tech.lineId || '');
    setEditStatus(tech.status);
  };

  // Handle Save Edit (ข้อ 5)
  const handleSaveEdit = () => {
    if (!editingTech) return;
    if (!editName.trim()) {
      alert('กรุณาระบุชื่อช่าง');
      return;
    }

    setTechs((prev) =>
      prev.map((t) =>
        t.id === editingTech.id
          ? {
              ...t,
              name: editName.trim(),
              specialty: editSpecialty.trim() || 'ช่างประจำร้าน',
              phone: editPhone.trim() || t.phone,
              lineId: editLineId.trim() || t.lineId,
              status: editStatus,
            }
          : t
      )
    );

    showToast(`บันทึกข้อมูล "${editName.trim()}" เรียบร้อยแล้ว`);
    setEditingTech(null);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingTech) return;
    const targetName = deletingTech.name;
    setTechs((prev) => prev.filter((t) => t.id !== deletingTech.id));
    setDeletingTech(null);
    showToast(`ลบช่าง "${targetName}" ออกจากระบบแล้ว`);
  };

  // Toggle Status directly from card (AVAILABLE -> BUSY -> INACTIVE -> AVAILABLE)
  const handleCycleStatus = (techId: string) => {
    setTechs((prev) =>
      prev.map((t) => {
        if (t.id !== techId) return t;
        let nextStatus: TechStatus = 'AVAILABLE';
        if (t.status === 'AVAILABLE') nextStatus = 'BUSY';
        else if (t.status === 'BUSY') nextStatus = 'INACTIVE';
        else nextStatus = 'AVAILABLE';

        showToast(`สลับสถานะของ "${t.name}" เป็น "${TECH_STATUS_CONFIG[nextStatus].label}"`);
        return { ...t, status: nextStatus };
      })
    );
  };

  // Simulate Line Dispatch Notification (ข้อ 6)
  const handleSendNotification = (tech: ExtendedTechnician) => {
    if (tech.status === 'INACTIVE') {
      showToast(`⚠️ ช่าง "${tech.name}" กำลังพักงาน/ปิดใช้งานอยู่ ไม่สามารถส่งงานได้`, 'error');
      return;
    }
    showToast(
      `📲 ส่งข้อความแจ้งเตือนผ่าน LINE (${tech.lineId || 'LINE Official'}) ไปยัง "${tech.name}" เรียบร้อยแล้ว`,
      'success'
    );
  };

  // Append Quick Skill Tag
  const handleAppendSkill = (skill: string, isEdit = false) => {
    if (isEdit) {
      if (!editSpecialty.trim()) {
        setEditSpecialty(skill);
      } else if (!editSpecialty.includes(skill)) {
        setEditSpecialty(`${editSpecialty}, ${skill}`);
      }
    } else {
      if (!newSpecialty.trim()) {
        setNewSpecialty(skill);
      } else if (!newSpecialty.includes(skill)) {
        setNewSpecialty(`${newSpecialty}, ${skill}`);
      }
    }
  };

  // Get Initials for Avatar
  const getInitials = (name: string) => {
    const clean = name.replace(/ช่าง/g, '').trim();
    return clean ? clean.slice(0, 2) : name.slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/50 text-red-200'
              : toast.type === 'info'
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-[#111827] border-slate-700 text-slate-100'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800/70 bg-gradient-to-br from-[#0d1220]/95 via-[#111827]/95 to-[#0b0f19]/95 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
        <div className="absolute top-0 right-1/4 w-64 h-16 bg-orange-500/10 blur-2xl pointer-events-none rounded-full" />

        <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-600/20 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10">
              <Wrench className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent leading-tight">
                  จัดการทีมช่าง
                </h1>
                <span className="text-sm font-normal text-slate-500 leading-tight">(Technicians)</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  TEAM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                จัดการข้อมูลทีมช่าง · ช่องทางติดต่อ LINE/เบอร์โทร · ตรวจสอบสถานะความพร้อม · ส่งแจ้งเตือนงาน
              </p>
            </div>
          </div>

          {/* Add Technician Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="relative h-[38px] px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer overflow-hidden transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มช่างเข้าโปรเจกต์</span>
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Overview Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'ช่างทั้งหมดในร้าน',
            count: allProjectTechs.length,
            sub: 'คนในสังกัดโปรเจกต์นี้',
            color: 'text-white',
            numGlow: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]',
            accent: 'from-slate-500/15 to-slate-800/10',
            border: 'border-slate-700/60',
            dot: 'bg-slate-400',
            icon: <User className="w-3.5 h-3.5" />,
          },
          {
            label: 'พร้อมรับงานทันที',
            count: allProjectTechs.filter((t) => t.status === 'AVAILABLE').length,
            sub: 'สถานะ Available',
            color: 'text-emerald-300',
            numGlow: 'drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]',
            accent: 'from-emerald-500/15 to-emerald-900/10',
            border: 'border-emerald-800/40',
            dot: 'bg-emerald-400',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          },
          {
            label: 'ติดงานอยู่ / งานเต็ม',
            count: allProjectTechs.filter((t) => t.status === 'BUSY').length,
            sub: 'สถานะ Busy',
            color: 'text-amber-300',
            numGlow: 'drop-shadow-[0_0_10px_rgba(252,211,77,0.45)]',
            accent: 'from-amber-500/15 to-amber-900/10',
            border: 'border-amber-800/40',
            dot: 'bg-amber-400',
            icon: <Briefcase className="w-3.5 h-3.5" />,
          },
          {
            label: 'พักงาน / ปิดใช้งาน',
            count: allProjectTechs.filter((t) => t.status === 'INACTIVE').length,
            sub: 'สถานะ Inactive',
            color: 'text-slate-400',
            numGlow: 'drop-shadow-[0_0_6px_rgba(148,163,184,0.3)]',
            accent: 'from-slate-600/15 to-slate-800/10',
            border: 'border-slate-700/50',
            dot: 'bg-slate-500',
            icon: <PauseCircle className="w-3.5 h-3.5" />,
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`relative group p-4 rounded-2xl bg-gradient-to-br ${s.accent} bg-[#0d1220]/85 border ${s.border} overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-400 leading-tight">{s.label}</span>
                <span className={`${s.color} opacity-65`}>{s.icon}</span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight ${s.color} ${s.numGlow}`}>
                {s.count}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="text-[10px] text-slate-500 leading-tight">{s.sub}</div>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot} opacity-60 inline-block`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar (Phase 3) */}
      <div className="p-3.5 rounded-2xl bg-[#0d1220]/90 backdrop-blur-md border border-slate-800/80 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อช่าง, ความถนัด, เบอร์โทร หรือ LINE ID..."
            className="w-full pl-10 pr-8 h-[38px] rounded-xl bg-[#070b14]/90 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs bg-[#070b14]/70 p-1 rounded-xl border border-slate-800/80">
          {(['ALL', 'AVAILABLE', 'BUSY', 'INACTIVE'] as const).map((st) => {
            const isActive = statusFilter === st;
            const labels = {
              ALL: `ทั้งหมด (${allProjectTechs.length})`,
              AVAILABLE: `พร้อมรับงาน (${allProjectTechs.filter((t) => t.status === 'AVAILABLE').length})`,
              BUSY: `ติดงาน (${allProjectTechs.filter((t) => t.status === 'BUSY').length})`,
              INACTIVE: `พักงาน (${allProjectTechs.filter((t) => t.status === 'INACTIVE').length})`,
            };
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Technician Cards Grid */}
      {projectTechs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#111827] border border-slate-800 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#0b0f19] border border-slate-800 flex items-center justify-center text-slate-400">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-white">ยังไม่มีรายชื่อช่างในโปรเจกต์นี้</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            คุณสามารถเพิ่มช่างประจำร้านเพื่อเริ่มมอบหมายใบงานแจ้งซ่อมที่เข้ามาจากแชทบอทได้ทันที
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มช่างคนแรก</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectTechs.map((tech) => {
            const statusCfg = TECH_STATUS_CONFIG[tech.status] || TECH_STATUS_CONFIG.AVAILABLE;

            return (
              <div
                key={tech.id}
                className={`bg-[#111827] border rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4 group ${
                  tech.status === 'INACTIVE'
                    ? 'border-slate-800/60 opacity-80'
                    : 'border-slate-800 hover:border-orange-500/50 hover:shadow-lg'
                }`}
              >
                {/* Card Top: Avatar, Name, Specialty, Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Initials Avatar */}
                      <div
                        className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 tracking-wider shadow-sm ${
                          tech.status === 'INACTIVE' ? 'bg-slate-700' : 'bg-orange-500'
                        }`}
                      >
                        {getInitials(tech.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white truncate leading-tight">
                            {tech.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {tech.specialty || 'ช่างประจำร้าน'}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill & Star Rating */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(tech.id)}
                        title="คลิกเพื่อสลับสถานะ: พร้อมรับงาน -> ติดงานอยู่ -> พักงาน"
                        style={{
                          backgroundColor: statusCfg.bgColor,
                          color: statusCfg.textColor,
                          borderRadius: '999px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          boxShadow: 'none',
                          transition: 'all 150ms ease',
                        }}
                        className="inline-flex items-center gap-1.5 select-none shrink-0 cursor-pointer hover:opacity-90 active:scale-95"
                      >
                        <span
                          style={{ backgroundColor: statusCfg.dotColor }}
                          className="w-2 h-2 rounded-full shrink-0"
                        />
                        <span>{statusCfg.label}</span>
                      </button>

                      {/* CSAT Rating Badge */}
                      {tech.rating && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{tech.rating}</span>
                          <span className="text-[10px] text-slate-400">({tech.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info: Phone & LINE ID (ข้อ 5) */}
                  <div className="p-2.5 rounded-xl bg-[#0b0f19] border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-orange-400" />
                        <span>เบอร์ติดต่อ:</span>
                      </span>
                      <span className="font-medium">{tech.phone || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>LINE ID:</span>
                      </span>
                      <span className="font-mono text-emerald-300">{tech.lineId || '-'}</span>
                    </div>
                  </div>

                  {/* Performance & Workload Capacity (Phase 3) */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Award className="w-3.5 h-3.5 text-orange-400" />
                        <span>งานที่สำเร็จแล้ว</span>
                      </span>
                      <span className="font-semibold text-white">{tech.completedJobs ?? 0} งาน</span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>คิวงานวันนี้</span>
                        <span className="font-medium text-slate-200">
                          {tech.activeJobs} / {tech.maxDailyJobs || 4} เคส
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            tech.activeJobs >= (tech.maxDailyJobs || 4)
                              ? 'bg-amber-400'
                              : 'bg-orange-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (tech.activeJobs / (tech.maxDailyJobs || 4)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Notify Button (ข้อ 6) */}
                  <button
                    type="button"
                    onClick={() => handleSendNotification(tech)}
                    disabled={tech.status === 'INACTIVE'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tech.status === 'INACTIVE'
                        ? 'opacity-40 cursor-not-allowed text-slate-500'
                        : 'text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500 border border-orange-500/20 cursor-pointer'
                    }`}
                    title="จำลองส่งข้อความแจ้งเตือนงานเข้า LINE ช่างคนนี้"
                  >
                    <Send className="w-3 h-3" />
                    <span>แจ้งเตือน LINE</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tech)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#0b0f19] hover:bg-slate-800 border border-slate-700/80 transition-colors duration-150 cursor-pointer"
                      title="แก้ไขข้อมูลช่าง"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingTech(tech)}
                      className="flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors duration-150 cursor-pointer"
                      title="ลบรายชื่อช่าง"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bot Connection Settings Box (Navy Theme) */}
      <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-base text-white">ข้อมูลการผูกบอทของร้านค้านี้</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">รหัส Chatbot ID (Botnoi)</div>
            <div className="text-sm font-mono font-semibold text-orange-400 mt-1">
              {project.botnoiBotId || '-'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">รหัส Voicebot Agent ID</div>
            <div className="text-sm font-mono font-semibold text-orange-400 mt-1">
              {project.voiceAgentId || '-'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">ฟิลด์ข้อมูลที่บอทถามลูกค้า</div>
            <div className="text-sm font-medium text-slate-200 mt-1 truncate" title={project.requiredFields.join(', ')}>
              {project.requiredFields.join(', ') || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: เพิ่มช่างใหม่ (2-Column Wide Layout — No Scrollbar) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0d1220] rounded-2xl border border-slate-800/90 shadow-2xl max-w-4xl w-full overflow-hidden text-white flex flex-col max-lg:max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0f172a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/10">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">เพิ่มรายชื่อช่างใหม่เข้าโปรเจกต์</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    บันทึกข้อมูลทีมช่างและสายงานเพื่อจ่ายงานอัตโนมัติ • {project.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content — 2 Columns */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs max-lg:overflow-y-auto">
              {/* Left Column: Inputs & Skill Tags */}
              <div className="lg:col-span-7 space-y-4">
                <div className="font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span>ข้อมูลช่าง &amp; ช่องทางติดต่อ (LINE / โทรศัพท์)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-300 block mb-1">
                      ชื่อช่าง / ชื่อเรียก <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="เช่น ช่างนนท์ วงศ์สว่าง"
                      className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-300 block mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-300 block mb-1">LINE ID สำหรับรับงาน</label>
                    <input
                      type="text"
                      value={newLineId}
                      onChange={(e) => setNewLineId(e.target.value)}
                      placeholder="@line_tech หรือ ID ช่าง"
                      className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-300 block mb-1">ความถนัด / ทักษะเฉพาะทาง</label>
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="เช่น ซ่อมอินเวอร์เตอร์, ล้างแอร์"
                      className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Recommended Skill Tags */}
                <div className="p-3 rounded-xl bg-[#070b14]/90 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      <span>แท็กทักษะแนะนำ (คลิกเพื่อเติมด่วน):</span>
                    </span>
                    <span className="text-[10px] text-slate-500">คลิกเพื่อเพิ่มทักษะ</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_SKILL_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAppendSkill(tag, false)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-orange-500/15 text-slate-300 hover:text-orange-300 border border-slate-700/70 hover:border-orange-500/40 cursor-pointer transition-colors font-medium"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-2">
                  <div className="font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                    <span>สถานะความพร้อมในการรับงาน</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {(['AVAILABLE', 'BUSY', 'INACTIVE'] as const).map((st) => {
                      const cfg = TECH_STATUS_CONFIG[st];
                      const isSelected = newStatus === st;
                      const styleMap = {
                        AVAILABLE: {
                          selectedCard:
                            'bg-gradient-to-br from-emerald-500/15 via-[#0f1d1b] to-[#070b14] border-emerald-500/70 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                          pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                          dot: 'bg-emerald-400',
                          checkBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        },
                        BUSY: {
                          selectedCard:
                            'bg-gradient-to-br from-amber-500/15 via-[#1d180f] to-[#070b14] border-amber-500/70 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                          pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                          dot: 'bg-amber-400',
                          checkBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                        },
                        INACTIVE: {
                          selectedCard:
                            'bg-gradient-to-br from-slate-500/15 via-[#131824] to-[#070b14] border-slate-400/70 ring-1 ring-slate-400/30 shadow-[0_0_16px_rgba(148,163,184,0.12)]',
                          pill: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
                          dot: 'bg-slate-400',
                          checkBg: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
                        },
                      }[st];

                      return (
                        <div
                          key={st}
                          onClick={() => setNewStatus(st)}
                          className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                            isSelected
                              ? styleMap.selectedCard
                              : 'bg-[#070b14]/90 border-slate-800/90 hover:border-slate-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${styleMap.pill}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${styleMap.dot} ${
                                  st === 'AVAILABLE' && isSelected ? 'animate-pulse' : ''
                                }`}
                              />
                              <span>{cfg.label}</span>
                            </span>
                            {isSelected && (
                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${styleMap.checkBg}`}
                              >
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">{cfg.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Branch Pill + Live Preview + AI Dispatch */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
                {/* Branch / Project Info Pill */}
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-300 min-w-0">
                    <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="font-semibold text-white truncate">{project.name}</span>
                    <span className="text-slate-500 text-[11px] truncate">({project.branchName || 'สำนักงานใหญ่'})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-orange-300 font-medium border border-slate-700/60 shrink-0">
                    {project.category || 'งานบริการและซ่อมบำรุง'}
                  </span>
                </div>

                {/* Live Preview Card */}
                <div className="p-4 rounded-xl bg-[#070b14] border border-slate-800 space-y-3 flex-1 flex flex-col justify-center">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Award className="w-3.5 h-3.5 text-orange-400" />
                      <span>ตัวอย่างการแสดงผลบนแดชบอร์ด</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-medium">
                      Live Card Preview
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#111827] border border-slate-700/80 space-y-3 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                          {getInitials(newName || 'ช่าง')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate">
                            {newName.trim() || 'ชื่อช่างประจำร้าน'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {newSpecialty.trim() || 'ความถนัด / สายงานหลัก'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: TECH_STATUS_CONFIG[newStatus].bgColor,
                          color: TECH_STATUS_CONFIG[newStatus].textColor,
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <span
                          style={{ backgroundColor: TECH_STATUS_CONFIG[newStatus].dotColor }}
                          className="w-1.5 h-1.5 rounded-full"
                        />
                        <span>{TECH_STATUS_CONFIG[newStatus].label}</span>
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-lg bg-[#070b14]/80 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 truncate">{newPhone.trim() || 'ยังไม่ระบุเบอร์โทร'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400 truncate">{newLineId.trim() || 'ยังไม่ระบุ LINE ID'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                      <span className="text-slate-500">คะแนนช่างเริ่มต้น</span>
                      <span className="text-amber-400 font-semibold">⭐ 5.0 (ช่างใหม่)</span>
                    </div>
                  </div>
                </div>

                {/* AI Dispatch Box */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/25 space-y-1">
                  <div className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>ระบบจ่ายงานอัตโนมัติ (AI Dispatch)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ระบบแชทบอทจะคำนวณคิวว่างและทักษะช่าง เพื่อจ่ายงานเข้า LINE ทันทีที่ลูกค้ากดจองคิว
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#0f172a] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ข้อมูลช่างจะเชื่อมต่อกับระบบจ่ายงานและแชทบอททันที</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#070b14] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddTech}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/25"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มช่างเข้าสู่ระบบ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: แก้ไขข้อมูลช่าง (2-Column Wide Layout — No Scrollbar) */}
      {editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0d1220] rounded-2xl border border-slate-800/90 shadow-2xl max-w-4xl w-full overflow-hidden text-white flex flex-col max-lg:max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0f172a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">แก้ไขข้อมูลช่าง</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ปรับปรุงข้อมูลโปรไฟล์ เบอร์โทร LINE ID และสถานะการรับงาน • ID: {editingTech.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTech(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content — 2 Columns */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs max-lg:overflow-y-auto">
              {/* Left Column */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1.5">
                    ชื่อช่าง / ชื่อเรียกในการรับงาน <span className="text-orange-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {getInitials(editName || editingTech.name)}
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">LINE ID สำหรับรับงาน</label>
                    <input
                      type="text"
                      value={editLineId}
                      onChange={(e) => setEditLineId(e.target.value)}
                      placeholder="@line_tech"
                      className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 block">ความถนัด / สายงานหลัก</label>
                  <input
                    type="text"
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value)}
                    className="w-full h-[38px] px-3 rounded-xl bg-[#070b14] border border-slate-700/80 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                  <div className="p-3 rounded-xl bg-[#070b14]/90 border border-slate-800/90 space-y-2">
                    <span className="text-[11px] text-slate-400 block font-medium">แท็กทักษะแนะนำ (คลิกเพื่อเติมด่วน):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_SKILL_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAppendSkill(tag, true)}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-orange-500/15 text-slate-300 hover:text-orange-300 border border-slate-700/70 hover:border-orange-500/40 cursor-pointer transition-colors font-medium"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 block">สถานะความพร้อมในการรับงาน</label>
                  <div className="space-y-2">
                    {(['AVAILABLE', 'BUSY', 'INACTIVE'] as const).map((st) => {
                      const cfg = TECH_STATUS_CONFIG[st];
                      const isSelected = editStatus === st;
                      const styleMap = {
                        AVAILABLE: {
                          selectedCard:
                            'bg-gradient-to-br from-emerald-500/15 via-[#0f1d1b] to-[#070b14] border-emerald-500/70 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                          pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                          dot: 'bg-emerald-400',
                          checkBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        },
                        BUSY: {
                          selectedCard:
                            'bg-gradient-to-br from-amber-500/15 via-[#1d180f] to-[#070b14] border-amber-500/70 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                          pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                          dot: 'bg-amber-400',
                          checkBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                        },
                        INACTIVE: {
                          selectedCard:
                            'bg-gradient-to-br from-slate-500/15 via-[#131824] to-[#070b14] border-slate-400/70 ring-1 ring-slate-400/30 shadow-[0_0_16px_rgba(148,163,184,0.12)]',
                          pill: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
                          dot: 'bg-slate-400',
                          checkBg: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
                        },
                      }[st];

                      return (
                        <div
                          key={st}
                          onClick={() => setEditStatus(st)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                            isSelected
                              ? styleMap.selectedCard
                              : 'bg-[#070b14]/90 border-slate-800/90 hover:border-slate-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${styleMap.pill}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${styleMap.dot} ${
                                  st === 'AVAILABLE' && isSelected ? 'animate-pulse' : ''
                                }`}
                              />
                              <span>{cfg.label}</span>
                            </span>
                            <div className="text-[11px] text-slate-400 leading-snug">{cfg.desc}</div>
                          </div>
                          {isSelected && (
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${styleMap.checkBg}`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current Active Jobs badge */}
                <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">จำนวนใบงานที่กำลังถือครองอยู่:</span>
                  <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-mono">
                    {editingTech.activeJobs} งาน
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#0f172a] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTech(null)}
                className="px-4 py-2 rounded-xl bg-[#070b14] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/25"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ยืนยันการลบช่าง (Delete Confirmation Modal) */}
      {deletingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4 text-white animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ยืนยันการลบช่าง</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบช่าง{' '}
                <strong className="text-white">&quot;{deletingTech.name}&quot;</strong> ออกจากโปรเจกต์นี้?
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTech(null)}
                className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
