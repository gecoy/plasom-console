import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { BotFeatures, saveNewProject } from './mockConsoleData';
import { useAuth } from '../context/AuthContext';
import { createProjectApi } from './consoleApi';

const CATEGORY_PRESETS: Record<string, string[]> = {
  'งานแอร์และเครื่องทำความเย็น': ['ยี่ห้อแอร์', 'ขนาด BTU', 'อาการเสีย', 'ที่อยู่หน้างาน', 'วันนัดหมาย'],
  'อู่ซ่อมรถยนต์และเช็กระยะ': ['รุ่นรถยนต์', 'เลขทะเบียน', 'เลขไมล์', 'อาการผิดปกติ', 'วันนัดเข้าอู่'],
  'ซ่อมมือถือและอุปกรณ์ไอที': ['รุ่นอุปกรณ์', 'อาการเสีย', 'สถานะประกัน', 'เบอร์ติดต่อกลับ', 'วันนัดรับเครื่อง'],
  'ซ่อมโซฟาและเฟอร์นิเจอร์': ['ชนิดเฟอร์นิเจอร์', 'วัสดุหุ้ม', 'จุดที่ชำรุด', 'ที่อยู่รับส่งงาน', 'วันนัดประเมิน'],
};

export function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [category, setCategory] = useState('งานแอร์และเครื่องทำความเย็น');
  const [requiredFields, setRequiredFields] = useState<string[]>(
    CATEGORY_PRESETS['งานแอร์และเครื่องทำความเย็น']
  );
  const [newField, setNewField] = useState('');
  const [nameError, setNameError] = useState('');
  const [branchError, setBranchError] = useState('');

  const [botMode, setBotMode] = useState<'LATER' | 'EXISTING'>('LATER');
  const [botnoiBotId, setBotnoiBotId] = useState('');
  const [voiceAgentId, setVoiceAgentId] = useState('');
  const [botConnectionError, setBotConnectionError] = useState('');
  const [greetingMessage, setGreetingMessage] = useState(
    'สวัสดีค่ะ ยินดีให้บริการ แจ้งรายละเอียดอาการเสียและวันนัดหมายได้เลยนะคะ'
  );
  const [features, setFeatures] = useState<BotFeatures>({
    createTicket: true,
    trackStatus: true,
    priceEstimate: true,
    faqAutoReply: true,
    collectCsat: true,
    humanHandover: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    projectId: string;
    webhookUrl: string;
    webhookSecret: string;
    systemPrompt: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'url' | 'secret' | 'prompt' | null>(null);
  const [copyError, setCopyError] = useState('');

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    if (CATEGORY_PRESETS[newCategory]) {
      setRequiredFields(CATEGORY_PRESETS[newCategory]);
    }
  };

  const addRequiredField = () => {
    const field = newField.trim();
    if (!field) return;
    setRequiredFields((prev) => (prev.includes(field) ? prev : [...prev, field]));
    setNewField('');
  };

  const handleProceedToBotSettings = () => {
    const nextNameError = name.trim().length < 2 ? 'กรุณากรอกชื่อร้านอย่างน้อย 2 ตัวอักษร' : '';
    const nextBranchError =
      branchName.trim().length < 2 ? 'กรุณากรอกชื่อสาขาอย่างน้อย 2 ตัวอักษร' : '';
    setNameError(nextNameError);
    setBranchError(nextBranchError);
    if (nextNameError || nextBranchError) return;
    setStep(2);
  };

  const toggleFeature = (key: keyof BotFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async (text: string, key: 'url' | 'secret' | 'prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setCopyError('');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopyError('คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง');
    }
  };

  const handleCreateFinish = async () => {
    const finalName = name.trim();
    const finalBranch = branchName.trim();
    const nextNameError = finalName.length < 2 ? 'กรุณากรอกชื่อร้านอย่างน้อย 2 ตัวอักษร' : '';
    const nextBranchError =
      finalBranch.length < 2 ? 'กรุณากรอกชื่อสาขาอย่างน้อย 2 ตัวอักษร' : '';
    setNameError(nextNameError);
    setBranchError(nextBranchError);
    if (nextNameError || nextBranchError) {
      setStep(1);
      return;
    }

    const finalBotId = botMode === 'EXISTING' ? botnoiBotId.trim() || null : null;
    const finalVoiceId = botMode === 'EXISTING' ? voiceAgentId.trim() || null : null;
    if (botMode === 'EXISTING' && !finalBotId && !finalVoiceId) {
      setBotConnectionError('กรุณากรอกรหัส Chatbot ID หรือ Voicebot Agent ID จริง หรือเลือกข้ามไปผูกภายหลัง');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { project, webhookUrl, webhookSecret } = await createProjectApi({
        name: finalName,
        branchName: finalBranch,
        category,
        chatbotConnected: botMode === 'EXISTING' && Boolean(finalBotId),
        botnoiBotId: finalBotId,
        voicebotConnected: botMode === 'EXISTING' && Boolean(finalVoiceId),
        voiceAgentId: finalVoiceId,
        greetingMessage,
        requiredFields,
        features,
      });

      // ซิงก์เข้า local cache ด้วยเพื่อให้ ConsoleLayout เปิดต่อได้ไร้รอยต่อ
      saveNewProject(project, user?.id);

      const fullWebhookUrl = webhookUrl.startsWith('http')
        ? webhookUrl
        : `${window.location.origin}${webhookUrl}`;

      setCreatedResult({
        projectId: project.id,
        webhookUrl: fullWebhookUrl,
        webhookSecret,
        systemPrompt: [
          `คุณคือผู้ช่วย AI ของร้าน "${finalName}" สาขา "${finalBranch}"`,
          `ประเภทธุรกิจ: ${category}`,
          `ข้อความทักทาย: ${greetingMessage.trim() || '-'}`,
          `เมื่อลูกค้าแจ้งซ่อม ให้สอบถามข้อมูลที่จำเป็น: ${requiredFields.length ? requiredFields.join(', ') : 'ไม่มีหัวข้อบังคับเพิ่มเติม'}`,
          'หากต้องขอเบอร์โทรศัพท์ ให้รับเฉพาะตัวเลข 10 หลักติดกัน ห้ามใส่ขีดหรือเว้นวรรค',
          'เมื่อส่งข้อมูลผ่านพารามิเตอร์ info ให้คั่นแต่ละค่าและเรียงตามรูปแบบ: รุ่นอุปกรณ์ | อาการเสีย | ที่อยู่หน้างาน',
          'ถามอย่างสุภาพ กระชับ และไม่ถามข้อมูลที่ลูกค้าให้ไว้แล้ว',
        ].join('\n'),
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'ไม่สามารถบันทึกโปรเจกต์ลงฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans">
      <header className="bg-[#111827] border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-white">สร้างโปรเจกต์ใหม่ (Onboarding Wizard)</div>
          <Link to="/projects" className="text-sm text-slate-400 hover:text-white">
            ยกเลิกและกลับหน้ารวม
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { num: 1, label: '1. ข้อมูลธุรกิจและฟิลด์ข้อมูล' },
            { num: 2, label: '2. ตั้งค่าบอท AI และบริการ' },
            { num: 3, label: '3. พร้อมเริ่มใช้งาน' },
          ].map((item) => (
            <div
              key={item.num}
              className={`p-3 rounded-xl border text-center text-xs sm:text-sm font-semibold ${
                step === item.num
                  ? 'bg-orange-500 text-white border-orange-500'
                  : step > item.num
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-[#111827] text-slate-500 border-slate-800'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-[#111827] p-8 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-xl font-bold text-white">ข้อมูลร้านค้าและสิ่งที่ให้บอทเก็บข้อมูล</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ชื่อร้าน / ชื่อโปรเจกต์
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim().length >= 2) setNameError('');
                  }}
                  placeholder="เช่น ร้านซ่อมมือถือ ไอฟิกซ์"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                  aria-invalid={Boolean(nameError)}
                />
                {nameError && <p className="text-xs text-rose-400 mt-1.5">{nameError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ชื่อสาขา
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => {
                    setBranchName(e.target.value);
                    if (e.target.value.trim().length >= 2) setBranchError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                  aria-invalid={Boolean(branchError)}
                />
                {branchError && <p className="text-xs text-rose-400 mt-1.5">{branchError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                หมวดหมู่ธุรกิจ
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เช่น ร้านซ่อมเครื่องชงกาแฟ"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                หมวดยอดนิยม — กดเพื่อเลือกหมวดและเติมชุดคำถามแนะนำ
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.keys(CATEGORY_PRESETS).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    aria-pressed={category === cat}
                    className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                      category === cat
                        ? 'border-orange-500 text-orange-300 bg-orange-500/10'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                หัวข้อข้อมูลเฉพาะทางที่ต้องการให้ AI ถามลูกค้า
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {requiredFields.map((field, index) => (
                  <span
                    key={`${field}-${index}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs"
                  >
                    {field}
                    <button
                      type="button"
                      onClick={() => setRequiredFields((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={`ลบหัวข้อ ${field}`}
                      className="text-orange-200 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {requiredFields.length === 0 && (
                  <span className="text-xs text-slate-500">ยังไม่มีหัวข้อคำถาม</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRequiredField();
                    }
                  }}
                  placeholder="พิมพ์หัวข้อใหม่แล้วกด Enter"
                  className="min-w-0 flex-1 px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={addRequiredField}
                  className="px-4 rounded-xl bg-slate-800 text-sm text-slate-100 hover:bg-slate-700 cursor-pointer"
                >
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setRequiredFields(CATEGORY_PRESETS[category] || [])}
                  className="px-3 rounded-xl border border-slate-700 text-xs text-slate-300 hover:border-slate-500 cursor-pointer"
                >
                  เติมค่าเริ่มต้นตามหมวด
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                ข้อมูลส่วนนี้จะถูกเก็บแบบยืดหยุ่น (JSON / Free Text) ทำให้รองรับงานซ่อมได้ทุกประเภทโดยไม่ต้องแก้ฐานข้อมูล
              </p>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleProceedToBotSettings}
                className="px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 cursor-pointer"
              >
                ถัดไป: ตั้งค่าบอท AI
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-[#111827] p-8 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-xl font-bold text-white">เชื่อมต่อ Chatbot / Voicebot และเปิดฟีเจอร์</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setBotMode('EXISTING');
                  setBotConnectionError('');
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer ${
                  botMode === 'EXISTING'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-[#0b0f19]'
                }`}
              >
                <div className="font-semibold text-sm text-white">ผูกรหัสบอทจริงตอนนี้</div>
                <div className="text-xs text-slate-400 mt-1">
                  นำรหัสจากแพลตฟอร์ม Botnoi มาผูกเข้ากับโปรเจกต์นี้
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBotMode('LATER');
                  setBotConnectionError('');
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer ${
                  botMode === 'LATER'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-[#0b0f19]'
                }`}
              >
                <div className="font-semibold text-sm text-white">ข้ามไปผูกบอทภายหลัง</div>
                <div className="text-xs text-slate-400 mt-1">
                  บันทึกโดยไม่สร้างรหัสบอทปลอม สามารถเพิ่มรหัสจริงภายหลังได้
                </div>
              </button>
            </div>

            {botMode === 'EXISTING' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    รหัส Chatbot ID
                  </label>
                  <input
                    type="text"
                    value={botnoiBotId}
                    onChange={(e) => {
                      setBotnoiBotId(e.target.value);
                      if (e.target.value.trim() || voiceAgentId.trim()) setBotConnectionError('');
                    }}
                    placeholder="[ใส่รหัส Chatbot ID]"
                    className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-slate-700 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    รหัส Voicebot Agent ID
                  </label>
                  <input
                    type="text"
                    value={voiceAgentId}
                    onChange={(e) => {
                      setVoiceAgentId(e.target.value);
                      if (e.target.value.trim() || botnoiBotId.trim()) setBotConnectionError('');
                    }}
                    placeholder="[ใส่รหัส Voice Agent ID]"
                    className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-slate-700 text-sm text-slate-100"
                  />
                </div>
              </div>
            )}
            {botConnectionError && (
              <p className="text-xs text-rose-400">{botConnectionError}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                ข้อความทักทายเริ่มต้นของบอท
              </label>
              <input
                type="text"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-slate-300 mb-3">
                สวิตช์เปิด-ปิดความสามารถของ AI ประจำร้าน
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'createTicket', label: 'รับแจ้งซ่อมและเปิด Ticket อัตโนมัติ' },
                  { key: 'trackStatus', label: 'ตอบสถานะงานซ่อมตามรหัสใบงาน' },
                  { key: 'priceEstimate', label: 'แจ้งราคาประเมินเบื้องต้น' },
                  { key: 'faqAutoReply', label: 'ตอบคำถามพบบ่อยของร้าน (FAQ)' },
                  { key: 'collectCsat', label: 'เก็บคะแนนความพึงพอใจหลังจบงาน' },
                  { key: 'humanHandover', label: 'ส่งต่อให้แอดมินร้านเมื่อเคสซับซ้อน' },
                ].map((item) => {
                  const k = item.key as keyof BotFeatures;
                  const enabled = features[k];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleFeature(k)}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800 hover:border-slate-600 text-left cursor-pointer"
                    >
                      <span className="text-sm text-slate-200 font-medium">{item.label}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {enabled ? 'เปิด' : 'ปิด'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 cursor-pointer"
              >
                ถัดไป: ตรวจสอบและเริ่มใช้งาน
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-[#111827] p-8 rounded-2xl border border-slate-800 space-y-6">
            {!createdResult ? (
              <>
                <h2 className="text-xl font-bold text-white">พร้อมเปิดใช้งานโปรเจกต์ของคุณแล้ว!</h2>
                <p className="text-sm text-slate-400">
                  เมื่อกดยืนยัน ระบบจะบันทึกโปรเจกต์ลงฐานข้อมูลจริงและสร้าง Webhook URL พร้อม Secret ประจำร้านสำหรับเชื่อมต่อกับ Botnoi ทันที
                </p>

                <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-300">ชื่อโปรเจกต์: </span>
                    <span className="text-white">
                      {name.trim()} ({branchName.trim()})
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">หมวดหมู่: </span>
                    <span className="text-white">{category}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">รูปแบบ Webhook ประจำร้าน: </span>
                    <span className="text-orange-400 font-mono text-xs">
                      {window.location.origin}/api/webhooks/[projectId]
                    </span>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {submitError}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCreateFinish}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isSubmitting ? 'กำลังสร้างโปรเจกต์...' : 'ยืนยันสร้างโปรเจกต์จริง'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-emerald-400">
                  <ShieldCheck className="w-7 h-7 shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-white">สร้างโปรเจกต์ลงฐานข้อมูลสำเร็จ!</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      คัดลอกข้อมูล Webhook และแม่แบบ Prompt ด้านล่างไปตั้งค่าใน Botnoi Studio
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-4 text-xs">
                  <div>
                    <div className="text-slate-400 mb-1 font-medium">Webhook URL (รับใบงานแจ้งซ่อม):</div>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#111827] border border-slate-800 font-mono text-orange-300 break-all">
                      <span>{createdResult.webhookUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdResult.webhookUrl, 'url')}
                        className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'url' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                      </button>
                    </div>
                  </div>

                  {createdResult.webhookSecret && (
                    <div>
                      <div className="text-slate-400 mb-1 font-medium">
                        Header <code className="text-amber-300">x-webhook-secret</code> (บันทึกเก็บไว้ก่อนปิดหน้านี้):
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#111827] border border-slate-800 font-mono text-emerald-300 break-all">
                        <span>{createdResult.webhookSecret}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(createdResult.webhookSecret, 'secret')}
                          className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'secret' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-slate-400 mb-1 font-medium">แม่แบบ System Prompt ประจำร้าน:</div>
                    <textarea
                      readOnly
                      rows={9}
                      value={createdResult.systemPrompt}
                      className="w-full p-3 rounded-lg bg-[#111827] border border-slate-800 font-mono text-slate-200 leading-relaxed resize-y"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(createdResult.systemPrompt, 'prompt')}
                      className="mt-2 px-3 py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'prompt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'prompt' ? 'คัดลอกแม่แบบแล้ว' : 'คัดลอกแม่แบบ Prompt'}
                    </button>
                    {copyError && <p className="text-xs text-rose-400 mt-2">{copyError}</p>}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${createdResult.projectId}`)}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 cursor-pointer"
                  >
                    เข้าสู่ Dashboard ของร้านนี้ →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
