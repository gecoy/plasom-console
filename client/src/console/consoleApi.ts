import api from '../lib/api';
import type {
  BotFeatures,
  ChatThread,
  ConsoleTicket,
  ProjectItem,
  SatisfactionItem,
} from './mockConsoleData';

export interface CreateProjectPayload {
  name: string;
  category: string;
  branchName: string;
  chatbotConnected?: boolean;
  botnoiBotId?: string | null;
  voicebotConnected?: boolean;
  voiceAgentId?: string | null;
  greetingMessage?: string;
  requiredFields?: string[];
  features?: BotFeatures;
}

export interface ApiProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  branchName: string;
  chatbotConnected: boolean;
  botnoiBotId: string | null;
  voicebotConnected: boolean;
  voiceAgentId: string | null;
  greetingMessage: string;
  requiredFields: string[];
  features: Partial<BotFeatures> | null;
  createdAt: string;
  updatedAt: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

const DEFAULT_FEATURES: BotFeatures = {
  createTicket: true,
  trackStatus: true,
  priceEstimate: false,
  faqAutoReply: true,
  collectCsat: true,
  humanHandover: false,
};

// ==========================================
// Helper: Fast Local Cache (0ms Instant Load)
// ==========================================
function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function readCachedTickets(projectId: string): any[] {
  return readCache<any[]>(`plasom_tickets_cache_${projectId}`, []);
}

export function readCachedTechnicians(projectId: string): any[] {
  return readCache<any[]>(`plasom_techs_cache_${projectId}`, []);
}

export function readCachedThreads(projectId: string): ChatThread[] {
  return readCache<ChatThread[]>(`plasom_threads_cache_${projectId}`, []);
}

export function readCachedReviews(projectId: string): SatisfactionItem[] {
  return readCache<SatisfactionItem[]>(`plasom_reviews_cache_${projectId}`, []);
}

export function readCachedSummary(projectId: string): any | null {
  return readCache<any | null>(`plasom_summary_cache_${projectId}`, null);
}

export function mapApiProjectToItem(raw: ApiProjectRecord): ProjectItem {
  return {
    id: raw.id,
    name: raw.name,
    branchName: raw.branchName,
    category: raw.category,
    chatbotConnected: Boolean(raw.chatbotConnected),
    botnoiBotId: raw.botnoiBotId || '',
    voicebotConnected: Boolean(raw.voicebotConnected),
    voiceAgentId: raw.voiceAgentId || '',
    greetingMessage: raw.greetingMessage || '',
    requiredFields: Array.isArray(raw.requiredFields) ? raw.requiredFields : [],
    features: {
      ...DEFAULT_FEATURES,
      ...(raw.features && typeof raw.features === 'object' ? raw.features : {}),
    },
    createdAt: raw.createdAt ? raw.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export function mapBackendStatusToUi(
  status: string,
  hasTech: boolean
): ConsoleTicket['status'] | 'CANCELLED' {
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (status === 'RECEIVED' || hasTech) return 'ASSIGNED';
  return 'PENDING';
}

export function mapUiStatusToBackend(
  uiStatus: string
): 'SUBMITTED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' {
  if (uiStatus === 'ASSIGNED') return 'RECEIVED';
  if (uiStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (uiStatus === 'COMPLETED') return 'COMPLETED';
  if (uiStatus === 'CANCELLED') return 'CANCELLED';
  return 'SUBMITTED';
}

// ==========================================
// 1. Projects API
// ==========================================
export async function fetchMyProjects(): Promise<ProjectItem[]> {
  const res = await api.get<{ success: boolean; data: ApiProjectRecord[] }>('/projects');
  const list = Array.isArray(res.data?.data) ? res.data.data : [];
  return list.map(mapApiProjectToItem);
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectItem> {
  const res = await api.get<{ success: boolean; data: ApiProjectRecord }>(`/projects/${projectId}`);
  return mapApiProjectToItem(res.data.data);
}

export async function fetchProjectSummaryApi(projectId: string): Promise<any> {
  const res = await api.get(`/projects/${projectId}/summary`);
  const data = res.data?.data ?? null;
  if (data) writeCache(`plasom_summary_cache_${projectId}`, data);
  return data;
}

export async function createProjectApi(payload: CreateProjectPayload): Promise<{
  project: ProjectItem;
  webhookUrl: string;
  webhookSecret: string;
}> {
  const res = await api.post<{ success: boolean; data: ApiProjectRecord }>('/projects', payload);
  const raw = res.data.data;
  const webhookUrl = raw.webhookUrl || `/api/webhooks/${raw.id}`;
  const webhookSecret = raw.webhookSecret || '';

  if (webhookSecret) {
    sessionStorage.setItem(`plasom_webhook_secret_${raw.id}`, webhookSecret);
  }

  return {
    project: mapApiProjectToItem(raw),
    webhookUrl,
    webhookSecret,
  };
}

export async function updateProjectApi(
  projectId: string,
  payload: Partial<CreateProjectPayload>
): Promise<ProjectItem> {
  const res = await api.patch<{ success: boolean; data: ApiProjectRecord }>(
    `/projects/${projectId}`,
    payload
  );
  return mapApiProjectToItem(res.data.data);
}

export async function deleteProjectApi(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}

export async function rotateWebhookSecretApi(projectId: string): Promise<{
  webhookUrl: string;
  webhookSecret: string;
}> {
  const res = await api.post<{
    success: boolean;
    data: { webhookUrl: string; webhookSecret: string };
  }>(`/projects/${projectId}/webhook-secret`);
  const data = res.data.data;
  if (data?.webhookSecret) {
    sessionStorage.setItem(`plasom_webhook_secret_${projectId}`, data.webhookSecret);
  }
  return data;
}

// ==========================================
// 2. Tickets & Messages API (Instant Cache)
// ==========================================
export async function fetchProjectTicketsApi(projectId: string): Promise<any[]> {
  const res = await api.get(`/projects/${projectId}/tickets`);
  const payload = res.data?.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.tickets)
    ? payload.tickets
    : [];
  writeCache(`plasom_tickets_cache_${projectId}`, list);
  return list;
}

export async function createManualTicketInDb(
  projectId: string,
  input: {
    customerName: string;
    customerPhone: string;
    subject: string;
    symptom: string;
    address: string;
    preferredDate: string;
    channel?: string;
    timeSlot?: string;
    priority?: string;
    extraDetails?: Record<string, string>;
  }
) {
  const res = await api.post(`/projects/${projectId}/tickets`, {
    brand: input.subject || 'แจ้งซ่อมทั่วไป',
    symptom: input.symptom || input.subject,
    address: input.address || 'ระบุในใบงาน',
    preferredDate: input.preferredDate
      ? new Date(input.preferredDate).toISOString()
      : new Date().toISOString(),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    note: input.timeSlot || '',
    extraFields: {
      ...(input.extraDetails || {}),
      _channel: input.channel || 'LINE OA',
      _priority: input.priority || 'NORMAL',
      _timeSlot: input.timeSlot || '',
    },
  });
  const created = res.data?.data;
  if (created) {
    const prev = readCachedTickets(projectId);
    writeCache(`plasom_tickets_cache_${projectId}`, [created, ...prev]);
  }
  return created;
}

export async function updateProjectTicketApi(
  projectId: string,
  ticketId: string,
  payload: Record<string, unknown>
) {
  const res = await api.patch(`/projects/${projectId}/tickets/${ticketId}`, payload);
  const updated = res.data?.data;
  if (updated) {
    const prev = readCachedTickets(projectId);
    writeCache(
      `plasom_tickets_cache_${projectId}`,
      prev.map((t: any) => (t.id === ticketId ? { ...t, ...updated } : t))
    );
  }
  return updated;
}

export async function fetchTicketMessagesApi(projectId: string, ticketId: string): Promise<any[]> {
  const res = await api.get(`/projects/${projectId}/tickets/${ticketId}/messages`);
  const payload = res.data?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages)) return payload.messages;
  return [];
}

export async function fetchProjectThreadsApi(projectId: string): Promise<ChatThread[]> {
  const rawTickets = await fetchProjectTicketsApi(projectId);
  if (rawTickets.length === 0) {
    writeCache(`plasom_threads_cache_${projectId}`, []);
    return [];
  }

  const threads = await Promise.all(
    rawTickets.slice(0, 15).map(async (t: any): Promise<ChatThread | null> => {
      try {
        const msgs = await fetchTicketMessagesApi(projectId, t.id);
        const extra = (
          t.extraFields && typeof t.extraFields === 'object' ? t.extraFields : {}
        ) as Record<string, any>;
        const channel = (extra._channel || extra.channel || 'LINE OA') as ChatThread['channel'];

        const mappedMessages: ChatThread['messages'] =
          msgs.length > 0
            ? msgs.map((m: any) => ({
                sender: m.sender === 'BOT' || m.sender === 'STAFF' || m.fromStaff ? 'BOT' : 'USER',
                text: m.text,
                time: m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '',
              }))
            : [
                {
                  sender: 'USER',
                  text: `${t.brand ? `[${t.brand}] ` : ''}${t.symptom}`,
                  time: '10:00',
                },
                {
                  sender: 'BOT',
                  text: `บันทึกใบงานเรียบร้อยค่ะ รหัสติดตามของคุณลูกค้าคือ ${t.trackingCode}`,
                  time: '10:00',
                },
              ];

        const lastMsg = mappedMessages[mappedMessages.length - 1];
        return {
          id: `th-${t.id}`,
          projectId,
          customerName: t.customerName || 'ลูกค้า',
          channel,
          lastMessage: lastMsg?.text || t.symptom || '',
          updatedAt: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('th-TH') : 'วันนี้',
          openedTicketCode: t.trackingCode,
          messages: mappedMessages,
        };
      } catch {
        return null;
      }
    })
  );

  const valid = threads.filter((item): item is ChatThread => item !== null);
  writeCache(`plasom_threads_cache_${projectId}`, valid);
  return valid;
}

// ==========================================
// 3. Technicians API (Instant Cache)
// ==========================================
export async function fetchProjectTechniciansApi(projectId: string): Promise<any[]> {
  const res = await api.get(`/projects/${projectId}/technicians`);
  const payload = res.data?.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.technicians)
    ? payload.technicians
    : [];
  writeCache(`plasom_techs_cache_${projectId}`, list);
  return list;
}

export async function createProjectTechnicianApi(
  projectId: string,
  payload: { name: string; phone: string; area: string; specialty?: string | null }
) {
  const res = await api.post(`/projects/${projectId}/technicians`, payload);
  const created = res.data?.data;
  if (created) {
    const prev = readCachedTechnicians(projectId);
    writeCache(`plasom_techs_cache_${projectId}`, [...prev, created]);
  }
  return created;
}

export async function updateProjectTechnicianApi(
  projectId: string,
  technicianId: string,
  payload: {
    name?: string;
    phone?: string;
    area?: string;
    specialty?: string | null;
    status?: 'AVAILABLE' | 'BUSY';
  }
) {
  const res = await api.patch(`/projects/${projectId}/technicians/${technicianId}`, payload);
  const updated = res.data?.data;
  if (updated) {
    const prev = readCachedTechnicians(projectId);
    writeCache(
      `plasom_techs_cache_${projectId}`,
      prev.map((t: any) => (t.id === technicianId ? { ...t, ...updated } : t))
    );
  }
  return updated;
}

export async function deleteProjectTechnicianApi(projectId: string, technicianId: string) {
  const res = await api.delete(`/projects/${projectId}/technicians/${technicianId}`);
  const prev = readCachedTechnicians(projectId);
  writeCache(
    `plasom_techs_cache_${projectId}`,
    prev.filter((t: any) => t.id !== technicianId)
  );
  return res.data;
}

// ==========================================
// 4. Reviews (CSAT) API (Instant Cache)
// ==========================================
export async function fetchProjectReviewsApi(projectId: string): Promise<SatisfactionItem[]> {
  const res = await api.get(`/projects/${projectId}/reviews`);
  const payload = res.data?.data;
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.reviews)
    ? payload.reviews
    : [];

  const mapped = rawList.map((rv: any) => ({
    id: rv.id,
    projectId,
    customerName: rv.customerName || 'ลูกค้า',
    ticketCode: rv.ticket?.trackingCode || rv.ticketCode || '-',
    rating: Number(rv.rating) || 5,
    comment: rv.comment || '',
    createdAt: rv.createdAt ? String(rv.createdAt).slice(0, 10) : '',
  }));
  writeCache(`plasom_reviews_cache_${projectId}`, mapped);
  return mapped;
}
