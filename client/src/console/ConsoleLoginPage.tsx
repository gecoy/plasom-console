import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  Phone,
  User as UserIcon,
  AlertCircle,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  Bot,
  CheckCircle2,
  ShieldCheck,
  Layers,
  MessageSquareText,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ApiResponse, User } from '../lib/types';
import { sanitizePhoneInput } from '../lib/format';
import {
  AuroraBackground,
  GlowingCard,
  BorderBeam,
  ShimmerButton,
  TubelightTabs,
} from '../components/ui/twenty-first';

/** เงื่อนไขรหัสผ่านให้ตรงกับ registerSchema ของเซิร์ฟเวอร์ (server/src/validations/auth.validation.ts) */
const PASSWORD_RULES: { key: string; label: string; test: (pw: string) => boolean }[] = [
  { key: 'length', label: 'ยาวอย่างน้อย 8 ตัวอักษร', test: (pw) => pw.length >= 8 && pw.length <= 100 },
  { key: 'letter', label: 'มีตัวอักษรภาษาอังกฤษ (A-Z หรือ a-z) อย่างน้อย 1 ตัว', test: (pw) => /[A-Za-z]/.test(pw) },
  { key: 'digit', label: 'มีตัวเลข (0-9) อย่างน้อย 1 ตัว', test: (pw) => /[0-9]/.test(pw) },
];

export function ConsoleLoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleModeChange = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
          setError('รหัสผ่านยังไม่ตรงตามเงื่อนไข กรุณาตรวจสอบรายการด้านล่างช่องรหัสผ่าน');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
          setIsLoading(false);
          return;
        }
        const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/register', {
          name,
          phone,
          password,
        });
        if (res.data.success) {
          login(res.data.data.token, res.data.data.user);
          navigate('/projects');
        } else {
          setError(res.data.error || 'สมัครสมาชิกไม่สำเร็จ');
        }
      } else {
        const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
          phone,
          password,
        });
        if (res.data.success) {
          login(res.data.data.token, res.data.data.user);
          navigate('/projects');
        } else {
          setError(res.data.error || 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (mode === 'register'
            ? 'ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูล'
            : 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRuleResults = PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));
  const passwordValid = passwordRuleResults.every((rule) => rule.ok);
  const registerBlocked = mode === 'register' && (!passwordValid || password !== confirmPassword);

  const passwordsMatch =
    mode === 'register' && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    mode === 'register' && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <AuroraBackground
      intensity="vivid"
      className="min-h-screen text-slate-100 flex flex-col justify-between font-sans selection:bg-orange-500 selection:text-white"
    >
      {/* Top Minimal Responsive Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform">
            P
          </div>
          <div>
            <span className="font-bold text-white tracking-tight block leading-none">
              Plasom Console
            </span>
            <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">
              Merchant Portal
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
          <span>กลับหน้าแรก</span>
        </Link>
      </header>

      {/* Main 21st.dev Split-Screen Auth Container */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Visual Product Showcase (Desktop Split Panel) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>AI-Powered Repair Workspace</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
                ศูนย์กลางบริหารใบงานซ่อม แชทบอท และทีมช่างประจำร้าน
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                แยกพื้นที่ทำงานตามสาขาอย่างเป็นระบบ ตั้งค่าคำถาม AI เฉพาะอาชีพได้เอง
                และติดตามสถานะการซ่อมของลูกค้าได้แบบเรียลไทม์
              </p>
            </div>

            {/* Floating Live Activity Cards (21st.dev Animated Showcase) */}
            <div className="relative space-y-3.5">
              <div className="p-4 rounded-2xl bg-[#0d1424]/90 border border-slate-800/90 backdrop-blur-xl shadow-xl flex items-center justify-between gap-4 animate-float">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      บอทเปิดใบงานใหม่ #CC-20261126-A8F2 อัตโนมัติ
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      สยามแอร์แคร์ (สาขาพระราม 2) • ผ่าน LINE OA
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shrink-0">
                  เมื่อสักครู่
                </span>
              </div>

              <div className="ml-6 p-4 rounded-2xl bg-[#0d1424]/90 border border-slate-800/90 backdrop-blur-xl shadow-xl flex items-center justify-between gap-4 animate-float-delayed">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                    <MessageSquareText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      สกัดข้อมูลเฉพาะอาชีพครบ 5 หัวข้อ
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      พร้อมกดจ่ายงานให้ทีมช่างในสังกัดทันที
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Multi-Project Isolation</div>
                  <div className="text-[11px] text-slate-400">
                    แยกข้อมูลร้านค้าและสาขาตามบัญชีผู้ใช้
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Instant Webhook Sync</div>
                  <div className="text-[11px] text-slate-400">
                    เชื่อม Chatbot & Voicebot ได้ในไม่กี่คลิก
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 21st.dev Glowing Auth Card + BorderBeam */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="relative rounded-3xl">
              <GlowingCard
                className="rounded-3xl shadow-[0_24px_70px_-15px_rgba(0,0,0,0.8)]"
                innerClassName="rounded-[calc(1.5rem-1px)] p-6 sm:p-8 space-y-6"
              >
                <BorderBeam duration={7} />

                {/* Card Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto shadow-inner">
                    {mode === 'login' ? (
                      <LogIn className="w-5 h-5" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {mode === 'login' ? 'เข้าสู่ระบบผู้ประกอบการ' : 'สมัครเปิดบัญชีร้านค้าใหม่'}
                  </h1>
                  <p className="text-xs text-slate-400">
                    จัดการใบงานแจ้งซ่อม ประวัติแชท AI และทีมช่างในที่เดียว
                  </p>
                </div>

                {/* 21st.dev Tubelight Mode Switcher */}
                <TubelightTabs<'login' | 'register'>
                  fullWidth
                  activeKey={mode}
                  onChange={handleModeChange}
                  items={[
                    { key: 'login', label: 'เข้าสู่ระบบ', icon: LogIn },
                    { key: 'register', label: 'สมัครสมาชิกใหม่', icon: UserPlus },
                  ]}
                />

                {/* Error Alert */}
                {error && (
                  <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-orange-400" />
                        <span>ชื่อผู้ประกอบการ / ชื่อผู้ดูแล</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="กรอกชื่อของคุณ เช่น คุณสมชาย"
                        className="w-full px-4 py-3 text-sm bg-[#070b14]/90 border border-slate-700/90 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-orange-400" />
                        <span>เบอร์มือถือที่ลงทะเบียน</span>
                      </label>
                      <span
                        className={`text-[11px] font-mono ${
                          phone.length === 10 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {phone.length}/10 หลัก
                      </span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={phone}
                      onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                      placeholder="กรอกตัวเลข 10 หลัก เช่น 0812345678"
                      className="w-full px-4 py-3 text-sm font-mono tracking-wide bg-[#070b14]/90 border border-slate-700/90 rounded-xl text-slate-100 placeholder:text-slate-500 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-orange-400" />
                      <span>รหัสผ่าน</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        maxLength={100}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่าน"
                        className="w-full pl-4 pr-11 py-3 text-sm bg-[#070b14]/90 border border-slate-700/90 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {mode === 'register' && (
                      <ul className="pt-1 space-y-1" aria-live="polite">
                        {passwordRuleResults.map((rule) => (
                          <li
                            key={rule.key}
                            className={`flex items-center gap-1.5 text-[11px] ${
                              rule.ok ? 'text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {rule.ok ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 shrink-0 rounded-full border border-slate-600" />
                            )}
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-orange-400" />
                          <span>ยืนยันรหัสผ่านอีกครั้ง</span>
                        </label>
                        {passwordsMatch && (
                          <span className="text-[11px] text-emerald-400 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            รหัสผ่านตรงกัน
                          </span>
                        )}
                        {passwordsMismatch && (
                          <span className="text-[11px] text-rose-400 font-medium">
                            รหัสผ่านยังไม่ตรงกัน
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          maxLength={100}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                          className={`w-full pl-4 pr-11 py-3 text-sm bg-[#070b14]/90 border rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            passwordsMismatch
                              ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
                              : passwordsMatch
                              ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : 'border-slate-700/90 focus:border-orange-500 focus:ring-orange-500/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <ShimmerButton
                      type="submit"
                      disabled={isLoading || registerBlocked}
                      className="w-full py-3.5 px-4 text-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังตรวจสอบข้อมูล...</span>
                        </>
                      ) : mode === 'login' ? (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>เข้าสู่หน้า Console</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>ยืนยันสมัครและเข้าใช้งาน</span>
                        </>
                      )}
                    </ShimmerButton>
                  </div>
                </form>

                {/* Mobile Feature Summary Strip */}
                <div className="lg:hidden pt-4 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5 text-orange-400" />
                    AI Chatbot & Voice
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    แยกข้อมูลปลอดภัย
                  </span>
                </div>
              </GlowingCard>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-5 px-4 text-center text-[11px] text-slate-500">
        Plasom Console • ระบบจัดการร้านซ่อมอัจฉริยะสำหรับผู้ประกอบการ
      </footer>
    </AuroraBackground>
  );
}
