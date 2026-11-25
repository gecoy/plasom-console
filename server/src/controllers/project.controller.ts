import { Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import {
  createProjectSchema,
  createTechnicianSchema,
  projectListQuerySchema,
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

    res.json({ success: true, message: "ลบโปรเจกต์ร้านค้าเรียบร้อยแล้ว" });
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
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId },
      select: { _count: { select: { tickets: true, technicians: true } } },
    });
    if (!project) {
      res.status(404).json({ success: false, error: "ไม่พบร้านค้าในบัญชีนี้" });
      return;
    }

    const reviews = await prisma.review.aggregate({
      where: { projectId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    res.json({
      success: true,
      data: {
        tickets: project._count.tickets,
        threads: project._count.tickets,
        techs: project._count.technicians,
        avgCsat:
          reviews._count._all > 0 ? (reviews._avg.rating ?? 0).toFixed(1) : undefined,
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
          ...(data.status ? { status: data.status } : {}),
          ...(data.technicianId !== undefined ? { technicianId: data.technicianId } : {}),
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
