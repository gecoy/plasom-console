import { Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { Prisma, TechnicianStatus, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  createProjectSchema,
  createTechnicianSchema,
  projectListQuerySchema,
  updateProjectSchema,
  updateProjectTicketSchema,
  updateTechnicianSchema,
} from "../validations/project.validation";

const projectSelect = {
  id: true,
  ownerId: true,
  name: true,
  category: true,
  branchName: true,
  chatbotConnected: true,
  botnoiBotId: true,
  voicebotConnected: true,
  voiceAgentId: true,
  greetingMessage: true,
  requiredFields: true,
  features: true,
  createdAt: true,
  updatedAt: true,
};

function getOwnerId(req: AuthRequest, res: Response): string | undefined {
  if (!req.user) {
    res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบก่อน" });
    return undefined;
  }
  return req.user.id;
}

async function findOwnedProject(projectId: string, ownerId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true },
  });
  return Boolean(project);
}

export async function createProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const data = createProjectSchema.parse(req.body);
    const webhookSecret = randomBytes(32).toString("hex");
    const webhookSecretHash = createHash("sha256").update(webhookSecret).digest("hex");

    const project = await prisma.project.create({
      data: {
        ...data,
        ownerId,
        botnoiBotId: data.botnoiBotId || null,
        voiceAgentId: data.voiceAgentId || null,
        features: data.features as Prisma.InputJsonValue,
        webhookSecretHash,
      },
      select: projectSelect,
    });

    res.status(201).json({
      success: true,
      data: {
        ...project,
        webhookUrl: `/api/webhooks/${project.id}`,
        webhookSecret,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjects(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projects = await prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: projectSelect,
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, ownerId },
      select: projectSelect,
    });
    if (!project) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    const existing = await prisma.project.findFirst({
      where: { id: projectId, ownerId },
      select: { id: true, features: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const data = updateProjectSchema.parse(req.body);
    const updateData: Prisma.ProjectUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.branchName !== undefined ? { branchName: data.branchName } : {}),
      ...(data.chatbotConnected !== undefined ? { chatbotConnected: data.chatbotConnected } : {}),
      ...(data.botnoiBotId !== undefined ? { botnoiBotId: data.botnoiBotId || null } : {}),
      ...(data.voicebotConnected !== undefined ? { voicebotConnected: data.voicebotConnected } : {}),
      ...(data.voiceAgentId !== undefined ? { voiceAgentId: data.voiceAgentId || null } : {}),
      ...(data.greetingMessage !== undefined ? { greetingMessage: data.greetingMessage } : {}),
      ...(data.requiredFields !== undefined ? { requiredFields: data.requiredFields } : {}),
    };

    if (data.features !== undefined) {
      const currentFeatures =
        existing.features && typeof existing.features === "object" && !Array.isArray(existing.features)
          ? (existing.features as Record<string, unknown>)
          : {};
      updateData.features = {
        ...currentFeatures,
        ...data.features,
      } as Prisma.InputJsonValue;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      select: projectSelect,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const deleted = await prisma.project.deleteMany({
      where: { id: req.params.projectId, ownerId },
    });
    if (!deleted.count) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    res.json({ success: true, message: "ลบร้านค้าเรียบร้อยแล้ว" });
  } catch (err) {
    next(err);
  }
}

export async function getProjectSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const [ticketGroups, technicianGroups, reviewAggregate] = await Promise.all([
      prisma.ticket.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { _all: true },
      }),
      prisma.technician.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { _all: true },
      }),
      prisma.review.aggregate({
        where: { projectId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<TicketStatus, number> = {
      [TicketStatus.SUBMITTED]: 0,
      [TicketStatus.RECEIVED]: 0,
      [TicketStatus.IN_PROGRESS]: 0,
      [TicketStatus.COMPLETED]: 0,
      [TicketStatus.CANCELLED]: 0,
    };
    let ticketTotal = 0;
    for (const row of ticketGroups) {
      const count = row._count._all;
      byStatus[row.status] = count;
      ticketTotal += count;
    }

    let techTotal = 0;
    let techAvailable = 0;
    let techBusy = 0;
    for (const row of technicianGroups) {
      const count = row._count._all;
      techTotal += count;
      if (row.status === TechnicianStatus.AVAILABLE) techAvailable = count;
      if (row.status === TechnicianStatus.BUSY) techBusy = count;
    }

    const rawAvg = reviewAggregate._avg.rating;
    const averageRating =
      typeof rawAvg === "number" && Number.isFinite(rawAvg)
        ? Math.round(rawAvg * 100) / 100
        : 0;

    res.json({
      success: true,
      data: {
        projectId,
        tickets: {
          total: ticketTotal,
          pending: byStatus[TicketStatus.SUBMITTED] + byStatus[TicketStatus.RECEIVED],
          inProgress: byStatus[TicketStatus.IN_PROGRESS],
          completed: byStatus[TicketStatus.COMPLETED],
          cancelled: byStatus[TicketStatus.CANCELLED],
          byStatus,
        },
        technicians: {
          total: techTotal,
          available: techAvailable,
          busy: techBusy,
        },
        reviews: {
          total: reviewAggregate._count._all,
          averageRating,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function rotateProjectWebhookSecret(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const webhookSecret = randomBytes(32).toString("hex");
    const webhookSecretHash = createHash("sha256").update(webhookSecret).digest("hex");
    await prisma.project.update({
      where: { id: projectId },
      data: { webhookSecretHash },
    });

    res.json({
      success: true,
      data: {
        projectId,
        webhookUrl: `/api/webhooks/${projectId}`,
        webhookSecret,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectTickets(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const { page, limit } = projectListQuerySchema.parse(req.query);
    const statusValue = req.query.status;
    let status: TicketStatus | undefined;
    if (typeof statusValue === "string") {
      if (!Object.values(TicketStatus).includes(statusValue as TicketStatus)) {
        res.status(400).json({ success: false, error: "สถานะที่ใช้กรองไม่ถูกต้อง" });
        return;
      }
      status = statusValue as TicketStatus;
    }

    const where: Prisma.TicketWhereInput = {
      projectId,
      ...(status ? { status } : {}),
    };
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: { select: { id: true, name: true, phone: true, area: true, specialty: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ success: true, data: tickets, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getProjectTicketMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const { projectId, ticketId } = req.params;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, projectId },
      select: { id: true },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: "ไม่พบใบงานในร้านนี้" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        text: true,
        sender: true,
        fromStaff: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}

export async function getProjectTechnicians(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const technicians = await prisma.technician.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
      include: {
        tickets: {
          where: { status: { notIn: [TicketStatus.COMPLETED, TicketStatus.CANCELLED] } },
          select: { id: true },
        },
      },
    });
    res.json({
      success: true,
      data: technicians.map(({ tickets, ...technician }) => ({
        ...technician,
        activeJobs: tickets.length,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createProjectTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const data = createTechnicianSchema.parse(req.body);
    const technician = await prisma.technician.create({
      data: { ...data, projectId, specialty: data.specialty || null },
    });
    res.status(201).json({ success: true, data: technician });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    const technicianId = req.params.technicianId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const data = updateTechnicianSchema.parse(req.body);
    const updated = await prisma.technician.updateMany({
      where: { id: technicianId, projectId },
      data,
    });
    if (!updated.count) {
      res.status(404).json({ success: false, error: "ไม่พบช่างในร้านนี้" });
      return;
    }

    const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
    res.json({ success: true, data: technician });
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectTechnician(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    const technicianId = req.params.technicianId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const deleted = await prisma.technician.deleteMany({
      where: { id: technicianId, projectId },
    });
    if (!deleted.count) {
      res.status(404).json({ success: false, error: "ไม่พบช่างในร้านนี้" });
      return;
    }

    res.json({ success: true, message: "ลบช่างเรียบร้อยแล้ว" });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    const ticketId = req.params.ticketId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const data = updateProjectTicketSchema.parse(req.body);
    const current = await prisma.ticket.findFirst({
      where: { id: ticketId, projectId },
      select: { id: true, status: true },
    });
    if (!current) {
      res.status(404).json({ success: false, error: "ไม่พบใบงานในร้านนี้" });
      return;
    }

    if (data.technicianId) {
      const technician = await prisma.technician.findFirst({
        where: { id: data.technicianId, projectId },
        select: { id: true },
      });
      if (!technician) {
        res.status(404).json({ success: false, error: "ไม่พบช่างในร้านนี้" });
        return;
      }
    }

    const resolvedBrand = data.brand ?? data.subject;

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const status = data.status ?? current.status;
      if (status !== current.status || data.note) {
        await tx.statusLog.create({
          data: { ticketId, status, note: data.note },
        });
      }

      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.technicianId !== undefined ? { technicianId: data.technicianId } : {}),
          ...(data.customerName !== undefined ? { customerName: data.customerName } : {}),
          ...(data.customerPhone !== undefined ? { customerPhone: data.customerPhone } : {}),
          ...(data.service !== undefined ? { service: data.service } : {}),
          ...(resolvedBrand !== undefined ? { brand: resolvedBrand } : {}),
          ...(data.symptom !== undefined ? { symptom: data.symptom } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.preferredDate !== undefined
            ? { preferredDate: new Date(data.preferredDate) }
            : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
          ...(data.extraFields !== undefined
            ? { extraFields: data.extraFields as Prisma.InputJsonValue }
            : {}),
        },
        include: {
          technician: { select: { id: true, name: true, phone: true, area: true, specialty: true } },
        },
      });
    });

    res.json({ success: true, data: updatedTicket });
  } catch (err) {
    next(err);
  }
}

export async function getProjectReviews(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const { page, limit } = projectListQuerySchema.parse(req.query);
    const ratingValue = req.query.rating;
    let rating: number | undefined;
    if (typeof ratingValue === "string") {
      rating = Number(ratingValue);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ success: false, error: "คะแนนรีวิวต้องอยู่ระหว่าง 1 ถึง 5" });
        return;
      }
    }

    const where = { projectId, ...(rating ? { rating } : {}) };
    const [reviews, total, aggregate] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { ticket: { select: { trackingCode: true } } },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: { projectId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    res.json({
      success: true,
      data: reviews.map(({ ticket, ...review }) => ({
        ...review,
        ticketCode: ticket?.trackingCode ?? null,
      })),
      total,
      page,
      limit,
      summary: { averageRating: aggregate._avg.rating ?? 0, total: aggregate._count._all },
    });
  } catch (err) {
    next(err);
  }
}


export async function createProjectTicket(req: any, res: any, next: any): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const body = req.body || {};
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = randomBytes(2).toString("hex").toUpperCase();
    const trackingCode = `CC-${ymd}-${rand}`;

    const brand = String(body.brand || body.subject || "งานแจ้งซ่อมทั่วไป").trim().slice(0, 100);
    const symptom = String(body.symptom || brand).trim().slice(0, 500);
    const address = String(body.address || "ไม่ระบุที่อยู่").trim().slice(0, 500);
    const customerName = String(body.customerName || "ลูกค้าหน้าร้าน").trim().slice(0, 100);
    const digits = String(body.customerPhone || "").replace(/\D/g, "").slice(0, 10);
    const customerPhone = digits.length >= 9 ? digits : "0800000000";
    const preferredDate = body.preferredDate && !isNaN(new Date(body.preferredDate).getTime())
      ? new Date(body.preferredDate)
      : now;
    const note = body.note ? String(body.note).trim().slice(0, 500) : null;
    const extraFields = body.extraFields && typeof body.extraFields === "object" ? body.extraFields : {};

    const created = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          trackingCode,
          projectId,
          service: "REPAIR",
          brand,
          symptom,
          address,
          preferredDate,
          note,
          extraFields,
          customerName,
          customerPhone,
        },
      });

      await tx.statusLog.create({
        data: {
          ticketId: t.id,
          status: TicketStatus.SUBMITTED,
          note: "สร้างใบงานผ่านหน้า Console",
        },
      });

      await tx.message.createMany({
        data: [
          {
            ticketId: t.id,
            text: `[${brand}] อาการ: ${symptom}`,
            sender: "CUSTOMER",
            fromStaff: false,
          },
          {
            ticketId: t.id,
            text: `รับเรื่องแจ้งซ่อมเรียบร้อยค่ะ รหัสติดตามงานคือ ${trackingCode}`,
            sender: "BOT",
            fromStaff: false,
          },
        ],
      });

      return t;
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function createProjectReview(req: any, res: any, next: any): Promise<void> {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const projectId = req.params.projectId;
    if (!(await findOwnedProject(projectId, ownerId))) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้ " });
      return;
    }

    const rating = Math.min(5, Math.max(1, Number(req.body?.rating) || 5));
    const samples = [
      { name: "คุณพิมพ์ชนก", text: "ช่างมาตรงเวลามาก ซ่อมเสร็จไว แอร์เย็นฉ่ำเลยค่ะ" },
      { name: "คุณธนกฤต", text: "บริการประทับใจ แจ้งผ่านบอทง่ายมาก แนะนำเลยครับ" },
      { name: "คุณกานต์พิชชา", text: "งานเรียบร้อย ช่างสุภาพ ให้คำแนะนำดีมากค่ะ" },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];

    const unreviewedTicket = await prisma.ticket.findFirst({
      where: { projectId, review: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, trackingCode: true, customerName: true },
    });

    const created = await prisma.review.create({
      data: {
        projectId,
        ticketId: unreviewedTicket?.id ?? null,
        customerName: req.body?.customerName || unreviewedTicket?.customerName || pick.name,
        rating,
        comment: req.body?.comment || pick.text,
      },
    });

    res.status(201).json({
      success: true,
      data: { ...created, ticketCode: unreviewedTicket?.trackingCode ?? null },
    });
  } catch (err) {
    next(err);
  }
}
