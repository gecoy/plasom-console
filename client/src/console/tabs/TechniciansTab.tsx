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
import { MOCK_TECHS, ProjectItem, TechnicianItem } from '../mockConsoleData';

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
  const [techs, setTechs] = useState<ExtendedTechnician[]>(() =>
    MOCK_TECHS.map((t, idx) => ({
      ...t,
      projectId: project.id,
      status: t.status as TechStatus,
      phone: `08${idx + 1}-555-${1000 + idx * 123}`,
      lineId: `@tech_${t.name.split(' ')[0]}`,
      rating: Number((4.7 + (idx % 3) * 0.1).toFixed(1)),
      reviewCount: 24 + idx * 11,
      completedJobs: 38 + idx * 17,
      maxDailyJobs: 4,
    }))
  );

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
    <div className="space-y-5">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="w-2.5 h-6 rounded-sm bg-orange-500 inline-block" />
            <span>จัดการทีมช่าง (Technicians)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            จัดการข้อมูลทีมช่าง ช่องทางติดต่อ LINE/เบอร์โทร ตรวจสอบสถานะความพร้อม และส่งแจ้งเตือนงาน
          </p>
        </div>

        {/* Add Technician Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="h-[40px] px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors duration-150 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มช่างเข้าโปรเจกต์</span>
        </button>
      </div>

      {/* Unified Overview Metrics (single container with internal dividers) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/80">
          {[
            { label: 'ช่างทั้งหมดในร้าน', value: allProjectTechs.length, sub: 'สังกัดโปรเจกต์นี้', color: 'text-white', icon: <User className="w-4 h-4" /> },
            { label: 'พร้อมรับงานทันที', value: allProjectTechs.filter((t) => t.status === 'AVAILABLE').length, sub: 'Available', color: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: 'ติดงานอยู่ / งานเต็ม', value: allProjectTechs.filter((t) => t.status === 'BUSY').length, sub: 'Busy', color: 'text-amber-400', icon: <AlertCircle className="w-4 h-4" /> },
            { label: 'พักงาน / ปิดใช้งาน', value: allProjectTechs.filter((t) => t.status === 'INACTIVE').length, sub: 'Inactive', color: 'text-slate-400', icon: <PauseCircle className="w-4 h-4" /> },
          ].map((kpi, idx) => (
            <div key={idx} className="p-4 sm:p-5 flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl bg-slate-800/60 ${kpi.color} flex items-center justify-center shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-400 truncate">{kpi.label}</div>
                <div className={`text-2xl font-bold font-mono ${kpi.color} leading-tight`}>{kpi.value}</div>
                <div className="text-[10px] text-slate-500">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Technician List Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Section Header: Search & Filter integrated */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f172a]/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อช่าง, ความถนัด, เบอร์โทร หรือ LINE ID..."
              className="w-full pl-10 pr-8 h-[36px] rounded-xl bg-[#0b0f19] border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
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
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
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
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-[#0b0f19] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {labels[st]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table-style Technician List */}
        {projectTechs.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
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
          <div className="divide-y divide-slate-800/70">
            {projectTechs.map((tech, rowIdx) => {
              const statusCfg = TECH_STATUS_CONFIG[tech.status] || TECH_STATUS_CONFIG.AVAILABLE;
              const capacityPct = Math.min(100, (tech.activeJobs / (tech.maxDailyJobs || 4)) * 100);

              return (
                <div
                  key={tech.id}
                  className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 transition-colors ${
                    tech.status === 'INACTIVE'
                      ? 'opacity-60'
                      : rowIdx % 2 === 1
                      ? 'bg-[#0d1320]/40'
                      : ''
                  } hover:bg-slate-800/30`}
                >
                  {/* Col 1: Avatar + Name + Specialty */}
                  <div className="flex items-center gap-3.5 min-w-0 lg:w-[260px] shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 tracking-wider shadow-sm ${
                        tech.status === 'INACTIVE' ? 'bg-slate-700' : 'bg-gradient-to-br from-orange-500 to-orange-600'
                      }`}
                    >
                      {getInitials(tech.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white truncate leading-tight">{tech.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{tech.specialty || 'ช่างประจำร้าน'}</p>
                    </div>
                  </div>

                  {/* Col 2: Contact Info */}
                  <div className="flex items-center gap-4 text-xs text-slate-300 lg:w-[240px] shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="font-medium">{tech.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono text-emerald-300 text-[11px]">{tech.lineId || '-'}</span>
                    </div>
                  </div>

                  {/* Col 3: Performance Stats */}
                  <div className="flex items-center gap-5 text-xs lg:flex-1 min-w-0">
                    {/* Rating */}
                    {tech.rating && (
                      <div className="flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{tech.rating}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({tech.reviewCount})</span>
                      </div>
                    )}

                    {/* Completed Jobs */}
                    <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                      <Award className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-white font-semibold">{tech.completedJobs || 35}</span>
                      <span>งาน</span>
                    </div>

                    {/* Capacity bar */}
                    <div className="hidden sm:flex items-center gap-2 flex-1 min-w-[100px] max-w-[180px]">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">คิว {tech.activeJobs}/{tech.maxDailyJobs || 4}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${capacityPct >= 100 ? 'bg-amber-400' : 'bg-orange-500'}`}
                          style={{ width: `${capacityPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Col 4: Status + Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 lg:w-auto">
                    {/* Status Pill */}
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(tech.id)}
                      title="คลิกเพื่อสลับสถานะ"
                      style={{
                        backgroundColor: statusCfg.bgColor,
                        color: statusCfg.textColor,
                        borderRadius: '999px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                      className="inline-flex items-center gap-1.5 select-none cursor-pointer hover:opacity-90 active:scale-95 shrink-0"
                    >
                      <span style={{ backgroundColor: statusCfg.dotColor }} className="w-1.5 h-1.5 rounded-full" />
                      <span>{statusCfg.label}</span>
                    </button>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 border-l border-slate-800 pl-2.5 ml-0.5">
                      <button
                        type="button"
                        onClick={() => handleSendNotification(tech)}
                        disabled={tech.status === 'INACTIVE'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          tech.status === 'INACTIVE'
                            ? 'opacity-30 cursor-not-allowed text-slate-500'
                            : 'text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 cursor-pointer'
                        }`}
                        title="ส่งแจ้งเตือน LINE"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tech)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลช่าง"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTech(tech)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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

        {/* Footer summary */}
        {projectTechs.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-800 bg-[#0b0f19]/50 flex items-center justify-between text-xs text-slate-400">
            <span>แสดง {projectTechs.length} จาก {allProjectTechs.length} คน</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> พร้อม {allProjectTechs.filter((t) => t.status === 'AVAILABLE').length}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> ติดงาน {allProjectTechs.filter((t) => t.status === 'BUSY').length}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> พัก {allProjectTechs.filter((t) => t.status === 'INACTIVE').length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bot Connection Settings (Unified single section) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0f172a]/50 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">ข้อมูลการผูกบอทของร้านค้านี้</h3>
            <p className="text-[11px] text-slate-400">การเชื่อมต่อระบบแชทบอทและ Voicebot สำหรับรับงานอัตโนมัติ</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
          <div className="p-4 sm:p-5">
            <div className="text-[11px] text-slate-400 font-medium">รหัส Chatbot ID (Botnoi)</div>
            <div className="text-sm font-mono font-semibold text-orange-400 mt-1.5">
              {project.botnoiBotId || '-'}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] text-slate-400 font-medium">รหัส Voicebot Agent ID</div>
            <div className="text-sm font-mono font-semibold text-orange-400 mt-1.5">
              {project.voiceAgentId || '-'}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[11px] text-slate-400 font-medium">ฟิลด์ข้อมูลที่บอทถามลูกค้า</div>
            <div className="text-sm font-medium text-slate-200 mt-1.5 truncate" title={project.requiredFields.join(', ')}>
              {project.requiredFields.join(', ') || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: เพิ่มช่างใหม่ (Detailed Rich Modal with Phone & LINE ID - Spacious, Balanced & Symmetrical) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-3xl w-full overflow-hidden text-white flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
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

            {/* Modal Form Content (Spacious & Clean Single Sheet) */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Branch / Project Info Pill */}
              <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-300 text-xs">
                  <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>สังกัดสาขา:</span>
                  <span className="font-semibold text-white">{project.name}</span>
                  <span className="text-slate-500">({project.branchName || 'สำนักงานใหญ่'})</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-orange-300 font-medium border border-slate-700/60">
                  {project.category || 'งานบริการและซ่อมบำรุง'}
                </span>
              </div>

              {/* Section 1: ข้อมูลช่าง & ช่องทางติดต่อ (2x2 Balanced Grid) */}
              <div className="space-y-2">
                <div className="font-semibold uppercase tracking-wider text-slate-400 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span>ข้อมูลช่าง & ช่องทางติดต่อ (LINE / โทรศัพท์)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      ชื่อช่าง / ชื่อเรียกในการรับงาน <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="เช่น ช่างนนท์ วงศ์สว่าง"
                      className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">LINE ID สำหรับรับงาน</label>
                    <input
                      type="text"
                      value={newLineId}
                      onChange={(e) => setNewLineId(e.target.value)}
                      placeholder="@line_tech หรือ ID ช่าง"
                      className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      ความถนัด / ทักษะเฉพาะทาง
                    </label>
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="เช่น ซ่อมอินเวอร์เตอร์, ล้างแอร์ติดผนัง"
                      className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: แท็กทักษะแนะนำ (4x2 Symmetrical Grid) */}
              <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>แท็กทักษะแนะนำ (คลิกเพื่อเติมด่วน):</span>
                  </span>
                  <span className="text-[11px] text-slate-500">คลิกเพื่อเพิ่มทักษะในช่อง</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMMON_SKILL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAppendSkill(tag, false)}
                      className="text-xs px-2.5 py-2 rounded-lg bg-[#111827] hover:bg-orange-500/15 text-slate-300 hover:text-orange-300 border border-slate-700/70 hover:border-orange-500/40 text-center truncate cursor-pointer transition-colors font-medium shadow-2xs"
                      title={tag}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: สถานะความพร้อม (Unified Symmetrical Container) */}
              <div className="space-y-2">
                <div className="font-semibold uppercase tracking-wider text-slate-400 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>สถานะความพร้อมในการรับงาน</span>
                </div>

                <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
                    {(['AVAILABLE', 'BUSY', 'INACTIVE'] as const).map((st) => {
                      const cfg = TECH_STATUS_CONFIG[st];
                      const isSelected = newStatus === st;

                      return (
                        <div
                          key={st}
                          onClick={() => setNewStatus(st)}
                          className={`p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-orange-500/10 ring-inset ring-2 ring-orange-500/50'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              style={{
                                backgroundColor: cfg.bgColor,
                                color: cfg.textColor,
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                              className="inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <span style={{ backgroundColor: cfg.dotColor }} className="w-1.5 h-1.5 rounded-full" />
                              <span>{cfg.label}</span>
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                                  : 'border-slate-700 bg-[#111827]'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed min-h-[30px] flex items-center">
                            {cfg.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Live Preview Card (Balanced & Modern) */}
              <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Award className="w-3.5 h-3.5 text-orange-400" />
                    <span>ตัวอย่างการแสดงผลบนแดชบอร์ด</span>
                  </span>
                  <span className="text-[11px] text-orange-400 font-medium">Live Card Preview</span>
                </div>

                <div className="p-3 rounded-xl bg-[#111827] border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                      {getInitials(newName || 'ช่าง')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">
                        {newName.trim() || 'ชื่อช่างประจำร้าน'}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {newSpecialty.trim() || 'ความถนัด / สายงานหลัก'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>{newPhone.trim() || 'ยังไม่ระบุเบอร์โทร'}</span>
                        <span>•</span>
                        <span>{newLineId.trim() || 'ยังไม่ระบุ LINE ID'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                    <span
                      style={{
                        backgroundColor: TECH_STATUS_CONFIG[newStatus].bgColor,
                        color: TECH_STATUS_CONFIG[newStatus].textColor,
                        borderRadius: '999px',
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span
                        style={{ backgroundColor: TECH_STATUS_CONFIG[newStatus].dotColor }}
                        className="w-1.5 h-1.5 rounded-full"
                      />
                      <span>{TECH_STATUS_CONFIG[newStatus].label}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">⭐ 5.0 (ช่างใหม่)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Balanced & Symmetrical) */}
            <div className="px-6 py-4 border-t border-slate-800 bg-[#0f172a] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ข้อมูลช่างจะเชื่อมต่อกับระบบจ่ายงานและแชทบอททันที</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddTech}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มช่างเข้าสู่ระบบ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: แก้ไขข้อมูลช่าง (Detailed Rich Edit Modal with Inactive Toggle - Spacious, Balanced & Symmetrical) */}
      {editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl max-w-3xl w-full overflow-hidden text-white flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
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

            {/* Modal Form Content */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Basic Info */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  ชื่อช่าง / ชื่อเรียกในการรับงาน <span className="text-orange-400">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {getInitials(editName || editingTech.name)}
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                  />
                </div>
              </div>

              {/* Phone & LINE ID (Balanced 2 Cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">LINE ID สำหรับรับงาน</label>
                  <input
                    type="text"
                    value={editLineId}
                    onChange={(e) => setEditLineId(e.target.value)}
                    placeholder="@line_tech"
                    className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                  />
                </div>
              </div>

              {/* Specialty & Skill Tags */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  ความถนัด / สายงานหลัก
                </label>
                <input
                  type="text"
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  className="w-full h-[40px] px-3.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 focus:border-orange-500 focus:outline-none transition-colors text-xs"
                />
                <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block font-medium">แท็กทักษะแนะนำ (คลิกเพื่อเติมด่วน):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COMMON_SKILL_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAppendSkill(tag, true)}
                        className="text-xs px-2.5 py-2 rounded-lg bg-[#111827] hover:bg-orange-500/15 text-slate-300 hover:text-orange-300 border border-slate-700/70 hover:border-orange-500/40 text-center truncate cursor-pointer transition-colors font-medium shadow-2xs"
                        title={tag}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Status Radio Selection (Unified Symmetrical Container) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  สถานะความพร้อมในการรับงาน
                </label>
                <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
                    {(['AVAILABLE', 'BUSY', 'INACTIVE'] as const).map((st) => {
                      const cfg = TECH_STATUS_CONFIG[st];
                      const isSelected = editStatus === st;

                      return (
                        <div
                          key={st}
                          onClick={() => setEditStatus(st)}
                          className={`p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-orange-500/10 ring-inset ring-2 ring-orange-500/50'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              style={{
                                backgroundColor: cfg.bgColor,
                                color: cfg.textColor,
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                              className="inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <span style={{ backgroundColor: cfg.dotColor }} className="w-1.5 h-1.5 rounded-full" />
                              <span>{cfg.label}</span>
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                                  : 'border-slate-700 bg-[#111827]'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed min-h-[30px] flex items-center">
                            {cfg.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Current Active Jobs badge */}
              <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">จำนวนใบงานที่กำลังถือครองอยู่:</span>
                <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-mono">
                  {editingTech.activeJobs} งาน
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTech(null)}
                className="px-4 py-2 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
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