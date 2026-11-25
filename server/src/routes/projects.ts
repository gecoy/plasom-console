import { Router } from "express";
import {
  createProject,
  createProjectTechnician,
  deleteProject,
  deleteProjectTechnician,
  getProjectById,
  getProjectReviews,
  getProjectSummary,
  getProjectTicketMessages,
  getProjects,
  getProjectTechnicians,
  getProjectTickets,
  rotateProjectWebhookSecret,
  updateProject,
  updateProjectTechnician,
  updateProjectTicket,
  createProjectTicket,
} from "../controllers/project.controller";
import { authRequired } from "../middleware/auth";

const router = Router();

router.use(authRequired);

router.get("/", getProjects);
router.post("/", createProject);
router.get("/:projectId", getProjectById);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);
router.get("/:projectId/summary", getProjectSummary);
router.post("/:projectId/webhook-secret", rotateProjectWebhookSecret);
router.get("/:projectId/tickets", getProjectTickets);
router.post("/:projectId/tickets", createProjectTicket);
router.get("/:projectId/tickets/:ticketId/messages", getProjectTicketMessages);
router.patch("/:projectId/tickets/:ticketId", updateProjectTicket);
router.get("/:projectId/technicians", getProjectTechnicians);
router.post("/:projectId/technicians", createProjectTechnician);
router.patch("/:projectId/technicians/:technicianId", updateProjectTechnician);
router.delete("/:projectId/technicians/:technicianId", deleteProjectTechnician);
router.get("/:projectId/reviews", getProjectReviews);

export default router;
