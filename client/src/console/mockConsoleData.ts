export interface BotFeatures {
  createTicket: boolean;
  trackStatus: boolean;
  priceEstimate: boolean;
  faqAutoReply: boolean;
  collectCsat: boolean;
  humanHandover: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  category: string;
  branchName: string;
  chatbotConnected: boolean;
  botnoiBotId: string;
  voicebotConnected: boolean;
  voiceAgentId: string;
  greetingMessage: string;
  requiredFields: string[];
  features: BotFeatures;
  createdAt: string;
}

export interface ConsoleTicket {
  id: string;
  trackingCode: string;
  projectId: string;
  customerName: string;
  customerPhone: string;
  channel: 'LINE OA' | 'Facebook' | 'Voicebot';
  subject: string;
  symptom: string;
  preferredDate: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTechName?: string;
  extraDetails: Record<string, string>;
}

export interface ChatThread {
  id: string;
  projectId: string;
  customerName: string;
  channel: 'LINE OA' | 'Facebook' | 'Voicebot';
  lastMessage: string;
  updatedAt: string;
  openedTicketCode?: string;
  messages: { sender: 'USER' | 'BOT'; text: string; time: string }[];
}

export interface TechnicianItem {
  id: string;
  projectId: string;
  name: string;
  specialty: string;
  activeJobs: number;
  status: 'AVAILABLE' | 'BUSY';
}

export interface SatisfactionItem {
  id: string;
  projectId: string;
  customerName: string;
  ticketCode: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-air-rama2',
    name: 'สยามแอร์แคร์ เซอร์วิส',
    category: 'งานแอร์และเครื่องทำความเย็น',
    branchName: 'สาขาพระราม 2',
    chatbotConnected: true,
    botnoiBotId: 'bn-chat-air01',
    voicebotConnected: true,
    voiceAgentId: 'bn-voice-air01',
    greetingMessage: 'สวัสดีค่ะ สยามแอร์แคร์ยินดีให้บริการ แจ้งล้างแอร์หรือซ่อมแอร์ได้เลยนะคะ',
    requiredFields: ['ยี่ห้อแอร์', 'ขนาด BTU', 'อาการเสีย', 'ที่อยู่หน้างาน', 'วันนัดหมาย'],
    features: {
      createTicket: true,
      trackStatus: true,
      priceEstimate: true,
      faqAutoReply: true,
      collectCsat: true,
      humanHandover: false,
    },
    createdAt: '2026-11-23',
  },
  {
    id: 'proj-car-somchai',
    name: 'อู่เฮียสมชาย ออโต้เซอร์วิส',
    category: 'อู่ซ่อมรถยนต์และเช็กระยะ',
    branchName: 'สาขาลาดพร้าว',
    chatbotConnected: true,
    botnoiBotId: 'bn-chat-car02',
    voicebotConnected: false,
    voiceAgentId: '',
    greetingMessage: 'สวัสดีครับ อู่เฮียสมชายครับ แจ้งรุ่นรถ ทะเบียนรถ และอาการได้เลยครับ',
    requiredFields: ['รุ่นรถยนต์', 'เลขทะเบียน', 'เลขไมล์', 'อาการผิดปกติ', 'วันนัดเข้าอู่'],
    features: {
      createTicket: true,
      trackStatus: true,
      priceEstimate: false,
      faqAutoReply: true,
      collectCsat: true,
      humanHandover: true,
    },
    createdAt: '2026-11-23',
  },
];

export const MOCK_TICKETS: ConsoleTicket[] = [
  {
    id: 't-101',
    trackingCode: 'PS-8821',
    projectId: 'proj-air-rama2',
    customerName: 'คุณพิมพ์ชนก',
    customerPhone: '08X-XXX-1102',
    channel: 'LINE OA',
    subject: 'แอร์ติดผนัง Daikin',
    symptom: 'แอร์มีแต่ลม ไม่มีความเย็นเลย และมีน้ำหยดตรงท่อ',
    preferredDate: '2026-11-25',
    status: 'PENDING',
    extraDetails: {
      'ยี่ห้อแอร์': 'Daikin Inverter',
      'ขนาด BTU': '18,000 BTU',
      'จำนวนเครื่อง': '1 เครื่อง',
    },
  },
  {
    id: 't-102',
    trackingCode: 'PS-8822',
    projectId: 'proj-air-rama2',
    customerName: 'คุณภาคิน',
    customerPhone: '08X-XXX-4490',
    channel: 'Voicebot',
    subject: 'ล้างแอร์ประจำปี Mitsubishi',
    symptom: 'ต้องการล้างแอร์ปลอดเชื้อจำนวน 2 เครื่อง',
    preferredDate: '2026-11-26',
    status: 'ASSIGNED',
    assignedTechName: 'ช่างเอก (ทีมแอร์)',
    extraDetails: {
      'ยี่ห้อแอร์': 'Mitsubishi Mr.Slim',
      'ขนาด BTU': '12,000 BTU',
      'จำนวนเครื่อง': '2 เครื่อง',
    },
  },
  {
    id: 't-201',
    trackingCode: 'CAR-3041',
    projectId: 'proj-car-somchai',
    customerName: 'คุณธนพล',
    customerPhone: '09X-XXX-7721',
    channel: 'LINE OA',
    subject: 'Honda Civic FE',
    symptom: 'เวลาเหยียบเบรกมีเสียงดังเอี๊ยดที่ล้อหน้าซ้าย',
    preferredDate: '2026-11-25',
    status: 'PENDING',
    extraDetails: {
      'รุ่นรถยนต์': 'Honda Civic ปี 2023',
      'เลขทะเบียน': 'หมวด กทม (แจ้งในแชท)',
      'เลขไมล์': '45,200 กม.',
      'สถานะการขับขี่': 'ยังขับเข้าอู่เองได้',
    },
  },
];

export const MOCK_THREADS: ChatThread[] = [
  {
    id: 'ch-1',
    projectId: 'proj-air-rama2',
    customerName: 'คุณพิมพ์ชนก',
    channel: 'LINE OA',
    lastMessage: 'บันทึกใบงานเรียบร้อยแล้วค่ะ รหัสของคุณลูกค้าคือ PS-8821',
    updatedAt: '10 นาทีที่แล้ว',
    openedTicketCode: 'PS-8821',
    messages: [
      { sender: 'USER', text: 'แอร์ Daikin 18000 BTU ไม่เย็นเลยค่ะ มีน้ำหยดด้วย', time: '12:40' },
      { sender: 'BOT', text: 'รับทราบค่ะ ขอทราบชื่อคุณลูกค้า เบอร์ติดต่อ และวันที่สะดวกนัดช่าง (ตั้งแต่พรุ่งนี้เป็นต้นไป) ได้เลยนะคะ', time: '12:40' },
      { sender: 'USER', text: 'ชื่อพิมพ์ชนกค่ะ นัดวันที่ 25 พ.ย. นี้ค่ะ', time: '12:42' },
      { sender: 'BOT', text: 'บันทึกใบงานเรียบร้อยแล้วค่ะ รหัสของคุณลูกค้าคือ PS-8821', time: '12:43' },
    ],
  },
  {
    id: 'ch-2',
    projectId: 'proj-car-somchai',
    customerName: 'คุณธนพล',
    channel: 'LINE OA',
    lastMessage: 'รับคิวนัดเข้าอู่วันที่ 25 พ.ย. รหัสคิว CAR-3041 ครับ',
    updatedAt: '25 นาทีที่แล้ว',
    openedTicketCode: 'CAR-3041',
    messages: [
      { sender: 'USER', text: 'รถ Civic เหยียบเบรกแล้วดังเอี๊ยดๆ ครับ เลขไมล์สี่หมื่นห้า', time: '12:20' },
      { sender: 'BOT', text: 'รถยังขับเคลื่อนเข้าอู่เองได้ไหมครับ และสะดวกนัดเข้าเช็กวันไหนดีครับ', time: '12:20' },
      { sender: 'USER', text: 'ขับได้ปกติครับ ขอจองคิววันที่ 25 พ.ย. ครับ', time: '12:22' },
      { sender: 'BOT', text: 'รับคิวนัดเข้าอู่วันที่ 25 พ.ย. รหัสคิว CAR-3041 ครับ', time: '12:22' },
    ],
  },
];

export const MOCK_TECHS: TechnicianItem[] = [
  { id: 'tech-1', projectId: 'proj-air-rama2', name: 'ช่างเอก (ทีมแอร์)', specialty: 'ซ่อมอินเวอร์เตอร์ & ล้างแอร์', activeJobs: 2, status: 'AVAILABLE' },
  { id: 'tech-2', projectId: 'proj-air-rama2', name: 'ช่างบอย (ทีมติดตั้ง)', specialty: 'ติดตั้งและย้ายจุดแอร์', activeJobs: 3, status: 'BUSY' },
  { id: 'tech-3', projectId: 'proj-car-somchai', name: 'ช่างพงษ์ (ช่วงล่าง/เบรก)', specialty: 'ระบบเบรกและช่วงล่างรถยนต์', activeJobs: 1, status: 'AVAILABLE' },
];

export const MOCK_REVIEWS: SatisfactionItem[] = [
  { id: 'rv-1', projectId: 'proj-air-rama2', customerName: 'คุณกานดา', ticketCode: 'PS-8790', rating: 5, comment: 'บอทรับเรื่องไวมาก ช่างมาตรงเวลา แอร์เย็นฉ่ำเลยค่ะ', createdAt: '2026-11-22' },
  { id: 'rv-2', projectId: 'proj-air-rama2', customerName: 'คุณวิชัย', ticketCode: 'PS-8795', rating: 4, comment: 'จองคิวง่ายผ่านไลน์ ไม่ต้องรอแอดมินตอบนาน', createdAt: '2026-11-23' },
  { id: 'rv-3', projectId: 'proj-car-somchai', customerName: 'คุณนภัส', ticketCode: 'CAR-3012', rating: 5, comment: 'แจ้งอาการไว้ก่อน พอถึงอู่ช่างเตรียมอะไหล่รอไว้ให้เลย สะดวกมากครับ', createdAt: '2026-11-22' },
];

function getStorageKey(userId?: string): string {
  return `plasom_console_v2_projects_${userId || 'guest'}`;
}

export function loadProjects(userId?: string): ProjectItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNewProject(project: ProjectItem, userId?: string): ProjectItem[] {
  const current = loadProjects(userId);
  const updated = [project, ...current];
  localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  return updated;
}

export function removeProjectFromCache(projectId: string, userId?: string): ProjectItem[] {
  const updated = loadProjects(userId).filter((project) => project.id !== projectId);
  localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  return updated;
}

export function loadDemoProjectsForUser(userId?: string): ProjectItem[] {
  const cloned = INITIAL_PROJECTS.map((p) => ({
    ...p,
    id: `${p.id}-${(userId || 'demo').slice(0, 6)}`,
  }));
  localStorage.setItem(getStorageKey(userId), JSON.stringify(cloned));
  return cloned;
}
