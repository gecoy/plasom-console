import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Bot,
  Mic,
  MessageSquareText,
  ClipboardCheck,
  Users,
  Star,
  Wind,
  Car,
  Smartphone,
  Armchair,
  Layers,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  LogIn,
  Webhook,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ScrollReveal, Tilt3DCard, NumberTicker } from '../components/InteractiveUI';
import {
  AuroraBackground,
  GlowingCard,
  BorderBeam,
  ShimmerLink,
  TubelightTabs,
  InfiniteMarquee,
} from '../components/ui/twenty-first';

type DemoIndustryKey = 'air' | 'car' | 'mobile' | 'sofa';

interface IndustryShowcase {
  key: DemoIndustryKey;
  tabLabel: string;
  shopName: string;
  branch: string;
  channel: string;
  trackingCode: string;
  techName: string;
  userMsg: string;
  botReply: string;
  extractedFields: { label: string; value: string }[];
}

const INDUSTRY_DEMOS: Record<DemoIndustryKey, IndustryShowcase> = {
  air: {
    key: 'air',
    tabLabel: 'งานแอร์ & ความเย็น',
    shopName: 'สยามแอร์แคร์ เซอร์วิส',
    branch: 'สาขาพระราม 2',
    channel: 'LINE OA',
    trackingCode: 'CC-20261126-A8F2',
    techName: 'ช่างเอก (ทีมแอร์อินเวอร์เตอร์)',
    userMsg: 'แอร์ Daikin 18,000 BTU มีแต่ลมไม่เย็นเลยค่ะ มีน้ำหยดตรงท่อ นัดพรุ่งนี้บ่ายได้ไหมคะ',
    botReply:
      'รับเรื่องเรียบร้อยค่ะ น้อง AI เปิดใบงาน #CC-20261126-A8F2 และล็อกคิวช่างเข้าตรวจเช็กพรุ่งนี้ช่วงบ่ายให้แล้วนะคะ',
    extractedFields: [
      { label: 'ยี่ห้อแอร์', value: 'Daikin Inverter' },
      { label: 'ขนาด BTU', value: '18,000 BTU' },
      { label: 'อาการเสีย', value: 'มีแต่ลม / น้ำหยดท่อ' },
      { label: 'วันนัดหมาย', value: 'พรุ่งนี้ 13:00 น.' },
    ],
  },
  car: {
    key: 'car',
    tabLabel: 'อู่ซ่อมรถยนต์',
    shopName: 'อู่เฮียสมชาย ออโต้เซอร์วิส',
    branch: 'สาขาลาดพร้าว',
    channel: 'LINE OA',
    trackingCode: 'CC-20261126-K3Q1',
    techName: 'ช่างพงษ์ (ช่วงล่าง/เบรก)',
    userMsg: 'Honda Civic FE เลขไมล์ 45,200 กม. เหยียบเบรกแล้วดังเอี๊ยดล้อหน้าซ้าย ขอนัดเข้าอู่พรุ่งนี้ครับ',
    botReply:
      'บันทึกคิวเข้าอู่รหัส #CC-20261126-K3Q1 เรียบร้อยครับ แจ้งทีมช่างเตรียมอะไหล่ผ้าเบรก Honda Civic รอไว้ให้แล้วครับ',
    extractedFields: [
      { label: 'รุ่นรถยนต์', value: 'Honda Civic FE' },
      { label: 'เลขไมล์', value: '45,200 กม.' },
      { label: 'อาการผิดปกติ', value: 'เบรกดังล้อหน้าซ้าย' },
      { label: 'สถานะรถ', value: 'ขับเข้าอู่เองได้' },
    ],
  },
  mobile: {
    key: 'mobile',
    tabLabel: 'ซ่อมมือถือ & ไอที',
    shopName: 'ไอฟิกซ์ สมาร์ทโฟนแล็บ',
    branch: 'สาขาสยาม',
    channel: 'AI Voicebot',
    trackingCode: 'CC-20261126-M5T9',
    techName: 'ช่างนนท์ (ช่างบอร์ด/จอแท้)',
    userMsg: '“หน้าจอ iPhone 15 Pro ตกแตกทัชสกรีนไม่ได้ เครื่องหมดประกันแล้ว อยากเข้าไปซ่อมเย็นนี้เลยครับ”',
    botReply:
      'ระบบ Voicebot ถอดเสียงสนทนาและเปิดใบงานด่วน #CC-20261126-M5T9 ล็อกอะไหล่จอแท้รอรับเครื่องช่วง 17:30 น. ค่ะ',
    extractedFields: [
      { label: 'รุ่นอุปกรณ์', value: 'iPhone 15 Pro' },
      { label: 'อาการเสีย', value: 'จอแตก / ทัชไม่ได้' },
      { label: 'สถานะประกัน', value: 'หมดประกันศูนย์' },
      { label: 'เวลานัดรับเครื่อง', value: 'วันนี้ 17:30 น.' },
    ],
  },
  sofa: {
    key: 'sofa',
    tabLabel: 'เฟอร์นิเจอร์ & โซฟา',
    shopName: 'โมเดิร์นคราฟต์ สตูดิโอ',
    branch: 'สำนักงานใหญ่ บางนา',
    channel: 'LINE OA',
    trackingCode: 'CC-20261126-S7D4',
    techName: 'ช่างเดช (ทีมหุ้มหนังแท้)',
    userMsg: 'ต้องการหุ้มหนังโซฟาตัว L ใหม่ครับ หนังเดิมลอกตรงเบาะนั่ง อยู่หมู่บ้านย่านบางนาครับ',
    botReply:
      'เปิดใบงานประเมินหน้างาน #CC-20261126-S7D4 เรียบร้อยค่ะ ทีมช่างจะนำตัวอย่างเฉดสีหนังเข้าไปให้เลือกตามวันนัดนะคะ',
    extractedFields: [
      { label: 'ชนิดเฟอร์นิเจอร์', value: 'โซฟาเข้ามุมตัว L' },
      { label: 'วัสดุที่ต้องการ', value: 'หุ้มหนังเกรดพรีเมียม' },
      { label: 'จุดที่ชำรุด', value: 'เบาะนั่งหนังลอก' },
      { label: 'พื้นที่รับ-ส่ง', value: 'โซนบางนา-ตราด' },
    ],
  },
};

const MARQUEE_BADGES = [
  { icon: Wind, text: 'ร้านล้างและซ่อมแอร์บ้าน/โรงงาน' },
  { icon: Car, text: 'อู่ซ่อมรถยนต์ & ศูนย์เช็กระยะ' },
  { icon: Smartphone, text: 'ศูนย์ซ่อมมือถือ คอมพิวเตอร์ & IT' },
  { icon: Armchair, text: 'ร้านซ่อมโซฟา & บิ้วอินเฟอร์นิเจอร์' },
  { icon: Bot, text: 'เชื่อม LINE Official Account & Botnoi AI' },
  { icon: Mic, text: 'AI Voicebot รับสายโทรศัพท์ 24 ชม.' },
  { icon: Webhook, text: 'Dynamic JSON Webhook ไม่ต้องแก้ DB' },
];

export function LandingConsolePage() {
  const { user, logout } = useAuth();
  const [activeIndustry, setActiveIndustry] = useState<DemoIndustryKey>('air');
  const [activeNav, setActiveNav] = useState<'hero' | 'demo' | 'flow' | 'features' | 'start'>('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentDemo = INDUSTRY_DEMOS[activeIndustry];

  const scrollToSection = (id: string, key: 'hero' | 'demo' | 'flow' | 'features' | 'start') => {
    setActiveNav(key);
    setMobileMenuOpen(false);
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AuroraBackground
      intensity="vivid"
      className="min-h-screen text-slate-100 font-sans selection:bg-orange-500 selection:text-white"
    >
      {/* =====================================================================
       * 21st.dev Floating Glassmorphic Tubelight Navbar
       * ===================================================================== */}
      <header className="sticky top-0 z-50 px-3 sm:px-6 pt-3">
        <div className="max-w-6xl mx-auto rounded-2xl border border-slate-800/90 bg-[#0a0f1d]/80 backdrop-blur-xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.75)]">
          <div className="px-4 sm:px-5 h-16 flex items-center justify-between gap-3">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => scrollToSection('top', 'hero')}
              className="flex items-center gap-3 text-left group cursor-pointer shrink-0"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold flex items-center justify-center text-base shadow-[0_0_20px_rgba(249,115,22,0.45)] group-hover:scale-105 transition-transform">
                <span>P</span>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0f1d]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Plasom Console
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/25 font-mono font-semibold">
                  B2B SaaS
                </span>
              </div>
            </button>

            {/* Center Tubelight Navigation (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-[#060913]/90 border border-slate-800/90">
              {[
                { key: 'hero' as const, id: 'top', label: 'ภาพรวม' },
                { key: 'demo' as const, id: 'live-demo', label: 'ทดลองสลับอาชีพ' },
                { key: 'flow' as const, id: 'ai-flow', label: 'การทำงาน AI' },
                { key: 'features' as const, id: 'features', label: 'ฟีเจอร์หลัก' },
                { key: 'start' as const, id: 'get-started', label: 'เริ่มใช้งาน' },
              ].map((nav) => {
                const active = activeNav === nav.key;
                return (
                  <button
                    key={nav.key}
                    type="button"
                    onClick={() => scrollToSection(nav.id, nav.key)}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      active
                        ? 'bg-slate-800/95 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {active && (
                      <>
                        <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-7 h-[2px] rounded-full bg-orange-400 shadow-[0_0_10px_2px_rgba(251,146,60,0.9)]" />
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full bg-orange-500/25 blur-sm" />
                      </>
                    )}
                    {nav.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Auth Controls (Desktop/Tablet) */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              {user ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium max-w-[160px] truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">สวัสดี, {user.name}</span>
                  </span>
                  <ShimmerLink to="/projects" className="px-4 py-2 text-xs sm:text-sm">
                    <span>ไปที่โปรเจกต์ของฉัน</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </ShimmerLink>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <ShimmerLink to="/projects" className="px-4 py-2 text-xs sm:text-sm">
                    <span>เริ่มต้นใช้งาน Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </ShimmerLink>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="เปิดเมนูนำทาง"
              className="md:hidden p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Responsive Menu Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800/90 px-4 py-4 space-y-3 bg-[#080d1a]/95 rounded-b-2xl">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'hero' as const, id: 'top', label: 'ภาพรวมแพลตฟอร์ม' },
                  { key: 'demo' as const, id: 'live-demo', label: 'ทดลองสลับอาชีพ' },
                  { key: 'flow' as const, id: 'ai-flow', label: 'การทำงาน AI' },
                  { key: 'features' as const, id: 'features', label: 'ฟีเจอร์หลัก' },
                  { key: 'start' as const, id: 'get-started', label: 'เริ่มใช้งาน' },
                ].map((nav) => (
                  <button
                    key={nav.key}
                    type="button"
                    onClick={() => scrollToSection(nav.id, nav.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-colors cursor-pointer ${
                      activeNav === nav.key
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    {nav.label}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
                {user ? (
                  <>
                    <div className="flex items-center justify-between px-1 text-xs">
                      <span className="text-emerald-400 font-medium truncate">
                        สวัสดี, {user.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="text-rose-400 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        ออกจากระบบ
                      </button>
                    </div>
                    <ShimmerLink
                      to="/projects"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 text-sm"
                    >
                      <span>ไปที่โปรเจกต์ของฉัน</span>
                      <ArrowRight className="w-4 h-4" />
                    </ShimmerLink>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200"
                    >
                      <LogIn className="w-3.5 h-3.5 text-orange-400" />
                      เข้าสู่ระบบ
                    </Link>
                    <ShimmerLink
                      to="/projects"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 px-3 text-xs"
                    >
                      <span>เริ่มต้นใช้งาน</span>
                    </ShimmerLink>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================================
       * Hero Section + 21st.dev Interactive Multi-Industry Console Preview
       * ===================================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-18 pb-14 text-center">
        <ScrollReveal direction="down">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-orange-300 text-xs font-semibold border border-orange-500/25 shadow-[0_0_25px_rgba(249,115,22,0.15)] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>แพลตฟอร์มกลางจัดการงานซ่อมและบริการหลังการขายด้วย AI</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.18]">
            รวมแชทลูกค้า ใบงานแจ้งซ่อม{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-cyan-300 bg-clip-text text-transparent">
              และทีมช่างของทุกร้าน
            </span>{' '}
            ไว้ใน Console เดียว
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            รองรับทุกธุรกิจงานซ่อม ไม่ว่าจะเป็นร้านแอร์ อู่รถยนต์ ร้านซ่อมมือถือ หรือเฟอร์นิเจอร์
            เพียงผูก Chatbot และ Voicebot ประจำร้าน ระบบพร้อมเปิดใบงานเข้า Dashboard อัตโนมัติทันที
          </p>
        </ScrollReveal>

        <ScrollReveal delay={240}>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 max-w-md sm:max-w-none mx-auto">
            <ShimmerLink
              to={user ? '/projects' : '/login'}
              className="px-7 py-3.5 text-sm sm:text-base"
            >
              <span>{user ? 'เข้าสู่หน้าจัดการโปรเจกต์' : 'เข้าสู่ระบบเพื่อจัดการร้านค้า'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </ShimmerLink>
            <Link
              to={user ? '/projects/new' : '/login'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0f172a]/90 text-slate-200 text-sm sm:text-base font-semibold border border-slate-700/80 hover:border-orange-500/50 hover:text-white hover:bg-slate-900 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4 text-orange-400" />
              <span>สร้างโปรเจกต์บอทใหม่</span>
            </Link>
          </div>
        </ScrollReveal>

        {/*KPI Quick Numbers (21st.dev NumberTicker) */}
        <ScrollReveal delay={300}>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {[
              { value: 24, suffix: '/7', label: 'AI รับแจ้งซ่อมอัตโนมัติ' },
              { value: 3, prefix: '< ', suffix: ' วินาที', label: 'เปิด Ticket เข้าหน้าร้าน' },
              { value: 100, suffix: '%', label: 'ตั้งฟิลด์ข้อมูลอิสระตามอาชีพ' },
              { value: 2, suffix: ' ช่องทางหลัก', label: 'LINE OA • AI Voicebot' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#0d1323]/80 border border-slate-800/90 backdrop-blur-md"
              >
                <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                  <NumberTicker
                    value={item.value}
                    prefix={item.prefix}
                    suffix={item.suffix}
                  />
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* =================================================================
         * 21st.dev Interactive Browser Frame + BorderBeam Live Switcher
         * ================================================================= */}
        <ScrollReveal delay={360} className="mt-12 sm:mt-16 text-left">
          <div id="live-demo" className="scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 px-1">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">
                  Interactive Live Preview
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  ลองกดสลับประเภทธุรกิจ เพื่อดูวิธีที่ AI สกัดข้อมูลเปิดใบงานอัตโนมัติ
                </h2>
              </div>
              <div className="overflow-x-auto no-scrollbar pb-1">
                <TubelightTabs<DemoIndustryKey>
                  activeKey={activeIndustry}
                  onChange={setActiveIndustry}
                  items={[
                    { key: 'air', label: 'ร้านแอร์', icon: Wind },
                    { key: 'car', label: 'อู่รถยนต์', icon: Car },
                    { key: 'mobile', label: 'ซ่อมมือถือ', icon: Smartphone },
                    { key: 'sofa', label: 'เฟอร์นิเจอร์', icon: Armchair },
                  ]}
                />
              </div>
            </div>

            <div className="relative rounded-3xl bg-[#0b101e]/95 border border-slate-800/90 shadow-[0_24px_80px_-20px_rgba(249,115,22,0.22)] overflow-hidden">
              <BorderBeam duration={8} />

              {/* Mockup Window Top Bar */}
              <div className="px-4 sm:px-6 py-3.5 bg-[#070b14]/90 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400 truncate max-w-[200px] sm:max-w-none">
                    plasom-console.vercel.app/projects/{currentDemo.key}-workspace
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Webhook Online
                  </span>
                  <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 font-medium">
                    {currentDemo.shopName} ({currentDemo.branch})
                  </span>
                </div>
              </div>

              {/* Mockup Split Body */}
              <div
                key={currentDemo.key}
                className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80"
              >
                {/* Left: Customer <-> AI Bot Conversation */}
                <div className="lg:col-span-6 p-5 sm:p-7 space-y-4 bg-[#090e1a]/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        {currentDemo.channel === 'AI Voicebot' ? (
                          <Mic className="w-4 h-4" />
                        ) : (
                          <MessageSquareText className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          บทสนทนาเข้าผ่าน {currentDemo.channel}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {currentDemo.shopName} • ตอบกลับอัตโนมัติ
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      Real-time Sync
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 px-4 py-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
                        <div className="text-[10px] font-semibold text-slate-400 mb-1">
                          ลูกค้าแจ้งซ่อม
                        </div>
                        {currentDemo.userMsg}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-orange-600 to-amber-600 px-4 py-3 text-xs sm:text-sm text-white shadow-lg leading-relaxed">
                        <div className="text-[10px] font-semibold text-orange-100 mb-1 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          Plasom AI ประจำร้าน
                        </div>
                        {currentDemo.botReply}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Extracted Structured Ticket Card */}
                <div className="lg:col-span-6 p-5 sm:p-7 bg-[#0d1424]/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-500 text-white shadow-sm">
                          #{currentDemo.trackingCode}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-semibold">
                          เปิดใบงานอัตโนมัติสำเร็จ
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">JSON Payload</span>
                    </div>

                    <div className="text-xs text-slate-400 mb-2.5">
                      ฟิลด์เฉพาะอาชีพที่บอทสกัดได้ (Dynamic Fields):
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentDemo.extractedFields.map((f) => (
                        <div
                          key={f.label}
                          className="p-3 rounded-xl bg-[#080c17] border border-slate-800/90 flex flex-col"
                        >
                          <span className="text-[11px] text-slate-400">{f.label}</span>
                          <span className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                            {f.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        เตรียมจ่ายงานให้: <strong className="text-white">{currentDemo.techName}</strong>
                      </span>
                    </div>
                    <Link
                      to={user ? '/projects' : '/login'}
                      className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1"
                    >
                      <span>เปิดดูใน Console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* =====================================================================
       * 21st.dev Infinite Marquee Ticker
       * ===================================================================== */}
      <section className="py-6 border-y border-slate-800/70 bg-[#060912]/70">
        <InfiniteMarquee>
          {MARQUEE_BADGES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.text}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0e1526] border border-slate-800/90 text-xs text-slate-300 font-medium whitespace-nowrap"
              >
                <Icon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{item.text}</span>
              </div>
            );
          })}
        </InfiniteMarquee>
      </section>

      {/* =====================================================================
       * 21st.dev Animated Beam Workflow Section
       * ===================================================================== */}
      <section id="ai-flow" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Omnichannel AI Pipeline
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            เชื่อมต่อทุกช่องทางแชทและเสียง สู่ศูนย์บัญชาการร้านซ่อม
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            ลูกค้าทักจากช่องทางไหนก็ไม่ตกหล่น AI ประจำร้านช่วยซักถามอาการเสียให้ครบตามหัวข้อที่คุณตั้งไว้
            ก่อนส่งเข้า Dashboard พร้อมจ่ายงานทันที
          </p>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <div className="relative rounded-3xl bg-[#0b101e]/90 border border-slate-800/90 p-6 sm:p-10 overflow-hidden">
            {/* Desktop SVG Animated Energy Beams Connecting Left -> Hub -> Right */}
            <svg
              aria-hidden="true"
              className="hidden lg:block pointer-events-none absolute inset-0 w-full h-full"
              viewBox="0 0 1000 340"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="flow-grad-left" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                  <stop offset="60%" stopColor="#f97316" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="flow-grad-right" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Base guide paths */}
              <path d="M 270 75 C 380 75, 390 170, 500 170" stroke="rgba(51,65,85,0.5)" strokeWidth="1.5" />
              <path d="M 270 170 L 500 170" stroke="rgba(51,65,85,0.5)" strokeWidth="1.5" />
              <path d="M 270 265 C 380 265, 390 170, 500 170" stroke="rgba(51,65,85,0.5)" strokeWidth="1.5" />
              <path d="M 500 170 C 610 170, 620 75, 730 75" stroke="rgba(51,65,85,0.5)" strokeWidth="1.5" />
              <path d="M 500 170 L 730 170" stroke="rgba(51,65,85,0.5)" strokeWidth="1.5" />
              <path d="M 500 170 C 610 170, 620 265, 730 265" stroke="rgba(51,65,85,0.5)" strokeWidth="1.5" />

              {/* Animated energy beams */}
              <path
                d="M 270 75 C 380 75, 390 170, 500 170"
                stroke="url(#flow-grad-left)"
                strokeWidth="2.5"
                strokeDasharray="90 260"
                className="animate-beam-flow"
              />
              <path
                d="M 270 170 L 500 170"
                stroke="url(#flow-grad-left)"
                strokeWidth="2.5"
                strokeDasharray="90 260"
                style={{ animationDelay: '0.6s' }}
                className="animate-beam-flow"
              />
              <path
                d="M 270 265 C 380 265, 390 170, 500 170"
                stroke="url(#flow-grad-left)"
                strokeWidth="2.5"
                strokeDasharray="90 260"
                style={{ animationDelay: '1.2s' }}
                className="animate-beam-flow"
              />
              <path
                d="M 500 170 C 610 170, 620 75, 730 75"
                stroke="url(#flow-grad-right)"
                strokeWidth="2.5"
                strokeDasharray="90 260"
                style={{ animationDelay: '0.4s' }}
                className="animate-beam-flow"
              />
              <path
                d="M 500 170 L 730 170"
                stroke="url(#flow-grad-right)"
                strokeWidth="2.5"
                strokeDasharray="90 260"
                style={{ animationDelay: '1.0s' }}
                className="animate-beam-flow"
              />
              <path
                d="M 500 170 C 610 170, 620 265, 730 265"
                stroke="url(#flow-grad-right)"
                strokeWidth="2.5"
                strokeDasharray="90 260"
                style={{ animationDelay: '1.6s' }}
                className="animate-beam-flow"
              />
            </svg>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 items-center">
              {/* Column 1: Customer Channels */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 text-center lg:text-left">
                  1. ช่องทางรับเรื่องลูกค้า
                </div>
                {[
                  {
                    title: 'LINE Official Account',
                    sub: 'แชทถามอาการ & ส่งรูปหน้างาน',
                    badge: 'Chat',
                    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
                  },
                  {
                    title: 'Botnoi Event Stream',
                    sub: 'ดักจับแชทสดเรียลไทม์ & ส่งปุ่มให้ดาว CSAT อัตโนมัติ',
                    badge: 'Live',
                    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
                  },
                  {
                    title: 'Botnoi AI Voicebot',
                    sub: 'คุยโทรศัพท์โต้ตอบเสียงเรียลไทม์',
                    badge: 'Voice',
                    color: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
                  },
                ].map((ch) => (
                  <div
                    key={ch.title}
                    className="p-3.5 rounded-2xl bg-[#070b14]/95 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{ch.title}</div>
                      <div className="text-xs text-slate-400">{ch.sub}</div>
                    </div>
                    <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${ch.color}`}>
                      {ch.badge}
                    </span>
                  </div>
                ))}
              </div>

              {/* Column 2: Central AI Hub */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#131c31] to-[#0a0f1d] border border-orange-500/40 shadow-[0_0_50px_-10px_rgba(249,115,22,0.45)] text-center max-w-xs w-full">
                  <BorderBeam duration={5} />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg mb-3 animate-float">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div className="text-base font-extrabold text-white">Plasom AI Router</div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    วิเคราะห์บริบท สกัดฟิลด์เฉพาะร้าน และยิง Webhook แยกตามโปรเจกต์สาขา
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 text-orange-300 text-[11px] font-mono">
                    <Activity className="w-3.5 h-3.5" />
                    Multi-Tenant Engine
                  </div>
                </div>
              </div>

              {/* Column 3: Console Outputs */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 text-center lg:text-right">
                  3. ผลลัพธ์ใน Console ร้านค้า
                </div>
                {[
                  {
                    icon: ClipboardCheck,
                    title: 'เปิดใบงาน (Smart Ticket)',
                    sub: 'สร้างรหัสติดตามงานซ่อมทันที',
                    accent: 'text-orange-400',
                  },
                  {
                    icon: Users,
                    title: 'มอบหมายช่างประจำสาขา',
                    sub: 'เลือกช่างตามความถนัดและคิวว่าง',
                    accent: 'text-cyan-400',
                  },
                  {
                    icon: Star,
                    title: 'เก็บคะแนนรีวิว CSAT',
                    sub: 'สรุปความพึงพอใจหลังปิดงานซ่อม',
                    accent: 'text-amber-400',
                  },
                ].map((out) => {
                  const Icon = out.icon;
                  return (
                    <div
                      key={out.title}
                      className="p-3.5 rounded-2xl bg-[#070b14]/95 border border-slate-800 flex items-center gap-3.5 shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        <Icon className={`w-5 h-5 ${out.accent}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{out.title}</div>
                        <div className="text-xs text-slate-400">{out.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* =====================================================================
       * 21st.dev Bento Grid + GlowingEffect + 3D Tilt Cards
       * ===================================================================== */}
      <section id="features" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">
            Core Capabilities
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            ออกแบบมาเพื่อผู้ประกอบการงานซ่อมยุคใหม่โดยเฉพาะ
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <ScrollReveal delay={0}>
            <GlowingCard
              glowColor="rgba(59, 130, 246, 0.7)"
              secondaryGlow="rgba(59, 130, 246, 0.12)"
              className="h-full"
            >
              <Tilt3DCard maxTilt={5} spotlightColor="rgba(59, 130, 246, 0.14)" className="p-6 sm:p-7 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 font-mono font-bold flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-blue-400/80 font-bold">01 / MULTI-STORE</span>
                </div>

                <h3 className="font-bold text-white text-lg sm:text-xl">
                  รองรับหลายสาขาและทุกอาชีพซ่อม
                </h3>
                <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
                  หนึ่งบัญชีสร้างแยกได้หลายโปรเจกต์ กำหนดหัวข้อข้อมูลที่ต้องการให้ AI
                  ถามลูกค้าได้อย่างอิสระตามประเภทธุรกิจโดยไม่ต้องแก้โครงสร้างฐานข้อมูล
                </p>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {['ขนาด BTU', 'เลขทะเบียนรถ', 'เลขไมล์', 'รุ่นมือถือ', 'วัสดุหุ้มโซฟา'].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </Tilt3DCard>
            </GlowingCard>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <GlowingCard
              glowColor="rgba(16, 185, 129, 0.7)"
              secondaryGlow="rgba(16, 185, 129, 0.12)"
              className="h-full"
            >
              <Tilt3DCard maxTilt={5} spotlightColor="rgba(16, 185, 129, 0.14)" className="p-6 sm:p-7 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono font-bold flex items-center justify-center">
                    <MessageSquareText className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-emerald-400/80 font-bold">
                    02 / CHAT SYNC
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg sm:text-xl">
                  ดูประวัติแชทคู่กับใบงานทันที
                </h3>
                <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
                  ตรวจสอบบทสนทนาจาก LINE OA และสายสนทนา AI Voicebot
                  ย้อนหลังได้ครบถ้วนเคียงคู่รหัสใบงาน ไม่ตกหล่นรายละเอียดสำคัญหน้างาน
                </p>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-300">LINE OA • คุณพิมพ์ชนก</span>
                    <span className="font-mono text-emerald-400 font-semibold">#CC-20261126-A8F2</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-300">Voicebot • คุณภาคิน</span>
                    <span className="font-mono text-emerald-400 font-semibold">#CC-20261126-V2B6</span>
                  </div>
                </div>
              </Tilt3DCard>
            </GlowingCard>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <GlowingCard
              glowColor="rgba(245, 158, 11, 0.7)"
              secondaryGlow="rgba(245, 158, 11, 0.12)"
              className="h-full"
            >
              <Tilt3DCard maxTilt={5} spotlightColor="rgba(245, 158, 11, 0.14)" className="p-6 sm:p-7 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono font-bold flex items-center justify-center">
                    <Star className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-amber-400/80 font-bold">
                    03 / DISPATCH & CSAT
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg sm:text-xl">
                  จ่ายงานช่างและวัดผลความพึงพอใจ
                </h3>
                <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
                  เพิ่มรายชื่อทีมช่างประจำร้านเพื่อกดมอบหมายงานซ่อมได้ในคลิกเดียว
                  พร้อมระบบส่งแบบประเมินและแดชบอร์ดสรุปคะแนนรีวิวหลังจบงาน
                </p>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-400">คะแนนรีวิวเฉลี่ยหลังซ่อม</div>
                    <div className="text-sm font-bold text-amber-400">★★★★★ 4.9 / 5.0</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto CSAT
                  </span>
                </div>
              </Tilt3DCard>
            </GlowingCard>
          </ScrollReveal>
        </div>

        {/* Bottom High-Impact Call to Action */}
        <ScrollReveal delay={150} className="mt-16">
          <GlowingCard className="w-full" innerClassName="p-8 sm:p-12 text-center">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                พร้อมเปิดพื้นที่ทำงานแยกตามบัญชีร้านค้าของคุณทันที
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                ยกระดับร้านซ่อมของคุณให้รับลูกค้าได้ตลอด 24 ชั่วโมง
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                ทดลองสร้างโปรเจกต์ร้านค้าหรือโหลดข้อมูลร้านตัวอย่างมาดูระบบจัดการใบงานและแชทบอทได้ฟรีทันที
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
                <ShimmerLink
                  to={user ? '/projects' : '/login'}
                  className="px-7 py-3.5 text-sm sm:text-base"
                >
                  <span>{user ? 'เปิดหน้าโปรเจกต์ของฉัน' : 'เริ่มต้นสร้างบัญชีร้านค้าฟรี'}</span>
                  <ArrowRight className="w-4 h-4" />
                </ShimmerLink>
                <div className="inline-flex items-center justify-center gap-2 text-xs text-slate-400 px-3 py-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>แยกข้อมูลแต่ละบัญชีผู้ประกอบการอย่างปลอดภัย</span>
                </div>
              </div>
            </div>
          </GlowingCard>
        </ScrollReveal>
      </section>

      {/* =====================================================================
       * เริ่มต้นใช้งานจริงใน 3 ขั้นตอน (ลำดับการทำงานจริงของแพลตฟอร์ม)
       * ===================================================================== */}
      <section id="get-started" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Getting Started
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            เริ่มต้นใช้งานจริงใน 3 ขั้นตอน
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            ตั้งร้าน ผูกบอท แล้วรับใบงานจาก LINE ได้ทันที ไม่ต้องเขียนโค้ดเพิ่ม
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              step: '01',
              icon: Layers,
              color: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
              title: 'สร้างร้านค้าและตั้งคำถาม AI',
              desc: 'สร้างโปรเจกต์ร้าน เลือกหรือพิมพ์หมวดอาชีพของคุณเอง แล้วกำหนดหัวข้อที่ต้องการให้ AI ถามลูกค้า เช่น รุ่นอุปกรณ์ อาการเสีย ที่อยู่หน้างาน',
            },
            {
              step: '02',
              icon: Webhook,
              color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
              title: 'ผูกบอทกับ Botnoi Studio',
              desc: 'ใส่รหัส Chatbot ID ของร้าน แล้วนำลิงก์ Webhook และรหัสลับ x-webhook-secret ไปตั้งเป็น API Object ใน Botnoi Studio ให้บอทเปิดใบงานได้เอง',
            },
            {
              step: '03',
              icon: ClipboardCheck,
              color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
              title: 'รับใบงาน จ่ายงานช่าง ปิดงาน',
              desc: 'ใบงานพร้อมแชทสดเข้าคอนโซลอัตโนมัติ มอบหมายช่างได้ในคลิกเดียว และเมื่อกดปิดงาน ระบบส่งปุ่มให้ดาว 1–5 ดาวเข้า LINE ลูกค้าให้เอง',
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={item.step} delay={index * 100}>
                <div className="h-full p-6 sm:p-7 rounded-2xl bg-[#0b101e]/90 border border-slate-800/90">
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-slate-500 font-bold">ขั้นตอน {item.step}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg">{item.title}</h3>
                  <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <ShimmerLink to={user ? '/projects/new' : '/login'} className="px-7 py-3.5 text-sm sm:text-base">
            <span>{user ? 'สร้างร้านค้าแรกของคุณ' : 'สมัครและเริ่มขั้นตอนที่ 1'}</span>
            <ArrowRight className="w-4 h-4" />
          </ShimmerLink>
        </div>
      </section>

      {/* Footer padded generously so floating corner widgets never overlap */}
      <footer className="border-t border-slate-800/80 bg-[#050811]/90 py-8 pb-24 sm:pb-12 px-6 text-center text-xs text-slate-500">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span className="font-semibold text-slate-300">Plasom Console B2B Platform</span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span>ระบบบริหารจัดการใบงานซ่อม แชทบอท และทีมช่างครบวงจร</span>
        </div>
      </footer>
    </AuroraBackground>
  );
}
