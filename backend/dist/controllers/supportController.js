"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportController = void 0;
const store_js_1 = require("../data/store.js");
class SupportController {
    /**
     * POST /api/support/tickets
     */
    static async createTicket(req, res) {
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
            const newTicket = {
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
            store_js_1.store.supportTickets.unshift(newTicket);
            res.status(201).json({
                success: true,
                message: 'Support ticket opened successfully. A municipal officer will reply within 24 hours.',
                data: newTicket
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/support/tickets
     */
    static async getTickets(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const citizenTickets = store_js_1.store.supportTickets.filter(t => t.citizen_id === req.user.id);
            res.status(200).json({
                success: true,
                data: citizenTickets
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/support/tickets/:id
     */
    static async getTicketById(req, res) {
        try {
            const { id } = req.params;
            const ticket = store_js_1.store.supportTickets.find(t => t.id === id || t.ticket_number === id);
            if (!ticket) {
                res.status(404).json({ success: false, error: 'Support ticket not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: ticket
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/support/tickets/:id/messages
     */
    static async addMessage(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const { message } = req.body;
            const ticket = store_js_1.store.supportTickets.find(t => t.id === id);
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
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.SupportController = SupportController;
