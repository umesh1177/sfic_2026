import { Response } from 'express';
import { store } from '../data/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SupportTicket } from '../types/index.js';

export class SupportController {
  /**
   * POST /api/support/tickets
   */
  public static async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { subject, description, category } = req.body;
      if (!subject || !description) {
        res.status(400).json({ success: false, error: 'Subject and description are required' });
        return;
      }

      const ticketNum = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket: SupportTicket = {
        id: `tkt-${Date.now()}`,
        ticket_number: ticketNum,
        citizen_id: req.user.id,
        subject: subject.trim(),
        description: description.trim(),
        category: category || 'general',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender_id: req.user.id,
            sender_name: req.user.full_name,
            is_staff: false,
            message: description.trim(),
            created_at: new Date().toISOString()
          }
        ]
      };

      store.supportTickets.unshift(newTicket);

      res.status(201).json({
        success: true,
        message: 'Support ticket opened successfully. A municipal officer will reply within 24 hours.',
        data: newTicket
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/support/tickets
   */
  public static async getTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const citizenTickets = store.supportTickets.filter(t => t.citizen_id === req.user!.id);
      res.status(200).json({
        success: true,
        data: citizenTickets
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/support/tickets/:id
   */
  public static async getTicketById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ticket = store.supportTickets.find(t => t.id === id || t.ticket_number === id);

      if (!ticket) {
        res.status(404).json({ success: false, error: 'Support ticket not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/support/tickets/:id/messages
   */
  public static async addMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { message } = req.body;

      const ticket = store.supportTickets.find(t => t.id === id);
      if (!ticket) {
        res.status(404).json({ success: false, error: 'Ticket not found' });
        return;
      }

      if (!message || message.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Message cannot be empty' });
        return;
      }

      const newMsg = {
        id: `msg-${Date.now()}`,
        sender_id: req.user.id,
        sender_name: req.user.full_name,
        is_staff: false,
        message: message.trim(),
        created_at: new Date().toISOString()
      };

      ticket.messages.push(newMsg);
      ticket.updated_at = new Date().toISOString();

      res.status(200).json({
        success: true,
        data: newMsg
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
