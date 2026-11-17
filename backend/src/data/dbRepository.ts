import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, isDbConnected } from './db.js';
import { store } from './store.js';
import {
  Complaint, CleanlinessDrive, AppNotification, Profile, ComplaintCategory,
  CommunityRecognitionPost, RecognitionComment, CitizenAuthProfile,
  Community, CommunityActivity, ActivityRegistration, ActivityQuestion,
  ActivityAiSuggestion, ActivityQuestionResponse, ActivityAnnouncement,
  ActivityEvidence, ActivityApprovalLog, CommunityDashboardSummary,
  WorkerProfile, WorkerDesignation, WorkerSkill, WorkAssignment,
  WorkAssignmentMember, WorkerAttendance, AttendanceException,
  WorkProgressUpdate, WorkEvidence, WorkCompletionReport,
  WorkReviewLog, WorkerDashboardSummary, CommunityProblem, WardApprovalItem,
  CommunityDriveRequest, AssignedCommunity
} from '../types/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgreSQL Database Repository
 * Executes real SQL queries (INSERT, SELECT, UPDATE, DELETE) against the live PostgreSQL database.
 * Gracefully synchronizes with in-memory store if DB is momentarily offline.
 */
export class DbRepository {
  /**
   * Check if a string is a valid RFC4122 UUID v4
   */
  public static isValidUUID(id?: string | null): boolean {
    if (!id || typeof id !== 'string') return false;
    return UUID_REGEX.test(id.trim());
  }

  /**
   * Ensures the citizen profile exists in PostgreSQL before creating foreign key references
   */
  public static async ensureProfileExists(
    id: string,
    fullName: string,
    phone: string,
    email?: string,
    address?: string,
    locality?: string
  ): Promise<string> {
    const validId = this.isValidUUID(id) ? id : 'c0000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        await pool.query(
          `INSERT INTO profiles (id, full_name, phone, email, address, locality, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone`,
          [validId, fullName || 'Citizen User', phone || '+919876543210', email || null, address || null, locality || 'Navsari']
        );
        await pool.query(
          `INSERT INTO user_roles (user_id, role)
           VALUES ($1, 'citizen')
           ON CONFLICT (user_id, role) DO UPDATE SET role = 'citizen'`,
          [validId]
        ).catch(() => {});
      } catch (err: any) {
        console.warn('[DB REPO - ensureProfileExists warning]:', err.message);
      }
    }
    return validId;
  }

  /**
   * Persist a newly signed-up citizen profile into PostgreSQL
   */
  public static async saveProfileToDb(profile: any, passwordHash: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        const validId = this.isValidUUID(profile.id) ? profile.id : randomUUID();
        const roleToAssign = profile.role || 'citizen';
        const plainPassword = profile.plain_password || null;
        const username = profile.username || null;
        const wardNum = profile.ward_number || 3;

        await pool.query(
          `INSERT INTO profiles (id, full_name, phone, email, username, plain_password, avatar_url, preferred_language, address, locality, ward_number, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (phone) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             email = COALESCE(EXCLUDED.email, profiles.email),
             username = COALESCE(EXCLUDED.username, profiles.username),
             plain_password = COALESCE(EXCLUDED.plain_password, profiles.plain_password),
             address = COALESCE(EXCLUDED.address, profiles.address),
             locality = COALESCE(EXCLUDED.locality, profiles.locality),
             ward_number = EXCLUDED.ward_number,
             preferred_language = EXCLUDED.preferred_language,
             role = EXCLUDED.role,
             updated_at = CURRENT_TIMESTAMP`,
          [
            validId,
            profile.full_name,
            profile.phone,
            profile.email || null,
            username,
            plainPassword,
            profile.avatar_url || null,
            profile.preferred_language || 'en',
            profile.address || null,
            profile.locality || 'Navsari',
            wardNum,
            roleToAssign,
            profile.is_active ?? true
          ]
        );

        await pool.query(
          `INSERT INTO user_roles (user_id, role)
           VALUES ($1, $2)
           ON CONFLICT (user_id, role) DO UPDATE SET role = EXCLUDED.role`,
          [validId, roleToAssign]
        ).catch(() => {});

        const authId = randomUUID();
        await pool.query(
          `INSERT INTO citizen_auth_profiles (id, user_id, mobile_number, password_hash, plain_password, mobile_verified, account_status)
           VALUES ($1, $2, $3, $4, $5, TRUE, 'active')
           ON CONFLICT (user_id) DO UPDATE SET
             password_hash = EXCLUDED.password_hash,
             plain_password = COALESCE(EXCLUDED.plain_password, citizen_auth_profiles.plain_password),
             mobile_number = EXCLUDED.mobile_number,
             updated_at = CURRENT_TIMESTAMP`,
          [authId, validId, profile.phone, passwordHash, plainPassword]
        );
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveProfileToDb]:', err.message);
      }
    }
    return false;
  }

  /**
   * Look up user profile and credentials from PostgreSQL by phone
   */
  public static async findUserByPhone(phone: string): Promise<{ profile: Profile; authProfile: CitizenAuthProfile } | null> {
    return this.findUserByIdentifier(phone);
  }

  /**
   * Universal User Lookup: by phone, mobile digits, email, username, or worker_code
   */
  public static async findUserByIdentifier(identifier: string): Promise<{ profile: Profile; authProfile: CitizenAuthProfile } | null> {
    if (!identifier) return null;
    if (isDbConnected()) {
      try {
        const cleanDigits = identifier.replace(/\D/g, '');
        const tenDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

        const res = await pool.query(
          `SELECT p.*, a.password_hash, a.plain_password as auth_plain_password, a.account_status, a.mobile_verified, r.role,
                  wp.worker_code, wp.username as worker_username, wp.plain_password as worker_plain_password,
                  c.username as comm_username, c.plain_password as comm_plain_password
           FROM profiles p
           LEFT JOIN citizen_auth_profiles a ON a.user_id = p.id
           LEFT JOIN user_roles r ON r.user_id = p.id
           LEFT JOIN worker_profiles wp ON wp.user_id = p.id
           LEFT JOIN communities c ON c.created_by = p.id
           WHERE LOWER(p.phone) = LOWER($1)
              OR ($2 <> '' AND RIGHT(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), 10) = $2)
              OR LOWER(COALESCE(p.email, '')) = LOWER($1)
              OR LOWER(COALESCE(p.username, '')) = LOWER($1)
              OR LOWER(COALESCE(wp.worker_code, '')) = LOWER($1)
              OR LOWER(COALESCE(wp.username, '')) = LOWER($1)
              OR LOWER(COALESCE(c.username, '')) = LOWER($1)
           LIMIT 1`,
          [identifier.trim(), tenDigits]
        );

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const plainPass = row.plain_password || row.auth_plain_password || row.worker_plain_password || row.comm_plain_password;
          const profile: any = {
            id: row.id,
            full_name: row.full_name,
            phone: row.phone,
            email: row.email,
            username: row.username || row.worker_code || row.worker_username || row.comm_username,
            plain_password: plainPass,
            avatar_url: row.avatar_url,
            preferred_language: row.preferred_language || 'en',
            address: row.address,
            locality: row.locality || 'Navsari',
            role: row.role || 'citizen',
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          const authProfile: any = {
            id: `auth-${row.id}`,
            user_id: row.id,
            mobile_number: row.phone,
            password_hash: row.password_hash || (plainPass ? await bcrypt.hash(plainPass, 10) : ''),
            plain_password: plainPass,
            mobile_verified: row.mobile_verified ?? true,
            account_status: row.account_status || 'active',
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          return { profile, authProfile };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - findUserByIdentifier]:', err.message);
      }
    }

    // In-memory fallback lookup
    const cleanDigits = identifier.replace(/\D/g, '');
    const tenDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

    // 1. Check store.profiles
    let foundProfile = (store.profiles || []).find(p =>
      (p.phone && (p.phone === identifier || (tenDigits && p.phone.replace(/\D/g, '').endsWith(tenDigits)))) ||
      (p.email && p.email.toLowerCase() === identifier.toLowerCase()) ||
      (p.username && p.username.toLowerCase() === identifier.toLowerCase())
    );

    // 2. Check store.communities
    if (!foundProfile) {
      const comm = (store.communities || []).find(c =>
        (c.phone && (c.phone === identifier || (tenDigits && c.phone.replace(/\D/g, '').endsWith(tenDigits)))) ||
        (c.email && c.email.toLowerCase() === identifier.toLowerCase()) ||
        (c.username && c.username.toLowerCase() === identifier.toLowerCase())
      );
      if (comm) {
        foundProfile = {
          id: comm.user_id || comm.id,
          full_name: comm.head_name || comm.community_name,
          phone: comm.phone,
          email: comm.email,
          username: comm.username || comm.email,
          preferred_language: 'en',
          locality: comm.locality || 'Dudhiya Talao',
          address: comm.address || 'Navsari',
          is_active: true,
          role: 'community_head',
          created_at: comm.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    }

    // 3. Check store.workers
    if (!foundProfile) {
      const w = (store.workers || []).find(worker =>
        (worker.phone && (worker.phone === identifier || (tenDigits && worker.phone.replace(/\D/g, '').endsWith(tenDigits)))) ||
        (worker.worker_code && worker.worker_code.toLowerCase() === identifier.toLowerCase()) ||
        (worker.username && worker.username.toLowerCase() === identifier.toLowerCase())
      );
      if (w) {
        foundProfile = {
          id: w.user_id || w.id,
          full_name: w.full_name,
          phone: w.phone,
          username: w.username || w.worker_code,
          email: `${w.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@navsarimunicipal.gov.in`,
          preferred_language: 'gu',
          locality: w.ward_name || 'Dudhiya Talao Ward 3',
          address: 'Navsari Municipal Staff Quarters',
          is_active: true,
          role: 'worker',
          created_at: w.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    }

    if (foundProfile) {
      if (!store.profiles) store.profiles = [];
      if (!store.profiles.some(p => p.id === foundProfile!.id)) {
        store.profiles.push(foundProfile);
      }

      const existingAuth = (store.authProfiles || []).find(a => a.user_id === foundProfile!.id || a.mobile_number === foundProfile!.phone);
      const authProfile: CitizenAuthProfile = existingAuth || {
        id: `auth-${foundProfile.id}`,
        user_id: foundProfile.id,
        mobile_number: foundProfile.phone,
        password_hash: (foundProfile as any).password_hash || '',
        plain_password: (foundProfile as any).plain_password || 'Navsari@2026',
        mobile_verified: true,
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!store.authProfiles) store.authProfiles = [];
      if (!existingAuth) {
        store.authProfiles.push(authProfile);
      }

      return { profile: foundProfile, authProfile };
    }

    return null;
  }

  /**
   * Updates user password across PostgreSQL and store models
   */
  public static async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE citizen_auth_profiles
          SET password_hash = $2, plain_password = $3, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `, [userId, passwordHash, newPassword]);

        await pool.query(`
          UPDATE communities
          SET plain_password = $2
          WHERE created_by = $1 OR id = $1
        `, [userId, newPassword]);

        await pool.query(`
          UPDATE worker_profiles
          SET plain_password = $2
          WHERE user_id = $1
        `, [userId, newPassword]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateUserPassword]:', err.message);
      }
    }

    // Update memory store
    let authProfile = (store.authProfiles || []).find(a => a.user_id === userId);
    if (authProfile) {
      authProfile.password_hash = passwordHash;
      authProfile.plain_password = newPassword;
      authProfile.updated_at = new Date().toISOString();
    }
    const profile = (store.profiles || []).find(p => p.id === userId);
    if (profile) {
      (profile as any).plain_password = newPassword;
      (profile as any).password_hash = passwordHash;
    }
    const comm = (store.communities || []).find(c => c.user_id === userId || c.id === userId || c.created_by === userId);
    if (comm) {
      (comm as any).plain_password = newPassword;
      (comm as any).password_hash = passwordHash;
      if (!profile) {
        const commProfile: Profile = {
          id: comm.user_id || comm.id,
          full_name: comm.head_name || comm.community_name,
          phone: comm.phone,
          email: comm.email,
          username: comm.username || comm.email,
          preferred_language: 'en',
          locality: comm.locality || 'Dudhiya Talao',
          address: comm.address || 'Navsari',
          is_active: true,
          role: 'community_head',
          created_at: comm.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        (commProfile as any).plain_password = newPassword;
        if (!store.profiles) store.profiles = [];
        store.profiles.push(commProfile);
      }
    }
    const worker = (store.workers || []).find(w => w.user_id === userId || w.id === userId);
    if (worker) {
      (worker as any).plain_password = newPassword;
      (worker as any).password_hash = passwordHash;
      if (!profile) {
        const workerProfile: Profile = {
          id: worker.user_id || worker.id,
          full_name: worker.full_name,
          phone: worker.phone,
          username: worker.username || worker.worker_code,
          email: `${worker.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@navsarimunicipal.gov.in`,
          preferred_language: 'gu',
          locality: worker.ward_name || 'Dudhiya Talao Ward 3',
          address: 'Navsari Municipal Staff Quarters',
          is_active: true,
          role: 'worker',
          created_at: worker.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        (workerProfile as any).plain_password = newPassword;
        if (!store.profiles) store.profiles = [];
        store.profiles.push(workerProfile);
      }
    }

    if (!authProfile) {
      if (!store.authProfiles) store.authProfiles = [];
      store.authProfiles.push({
        id: `auth-${userId}`,
        user_id: userId,
        mobile_number: profile?.phone || comm?.phone || worker?.phone || '',
        password_hash: passwordHash,
        plain_password: newPassword,
        mobile_verified: true,
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return true;
  }

  // =========================================================================
  // 1. COMPLAINTS: STORE, FETCH, UPDATE, DELETE (FULL CRUD)
  // =========================================================================

  public static async createComplaint(data: {
    complaint_number: string;
    citizen_id: string;
    citizen_name: string;
    citizen_phone: string;
    category_id: string;
    category_name: string;
    description: string;
    original_language?: string;
    image_url: string;
    latitude: number;
    longitude: number;
    address: string;
    landmark?: string;
    ward_id?: string;
    ward_number: number;
    ward_name: string;
    assigned_officer_name?: string;
    status?: string;
    priority?: string;
    is_urgent?: boolean;
    confidence_score?: number;
    ai_model_name?: string;
    ai_model_version?: string;
  }): Promise<Complaint> {
    const validCitizenId = await this.ensureProfileExists(data.citizen_id, data.citizen_name, data.citizen_phone);

    if (isDbConnected()) {
      try {
        const query = `
          INSERT INTO complaints (
            complaint_number, citizen_id, citizen_name, citizen_phone,
            category_id, category_name, description, original_language,
            image_url, latitude, longitude, address, landmark,
            ward_id, ward_number, ward_name, assigned_officer_name,
            status, priority, is_urgent, confidence_score,
            ai_model_name, ai_model_version, submitted_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23, NOW(), NOW(), NOW()
          ) RETURNING *
        `;

        const values = [
          data.complaint_number,
          validCitizenId,
          data.citizen_name,
          data.citizen_phone,
          data.category_id,
          data.category_name,
          data.description,
          data.original_language || 'en',
          data.image_url,
          data.latitude,
          data.longitude,
          data.address,
          data.landmark || null,
          data.ward_id || null,
          data.ward_number,
          data.ward_name,
          data.assigned_officer_name || 'Ramesh Patel (Chief Sanitary Inspector)',
          data.status || 'submitted',
          data.priority || (data.is_urgent ? 'urgent' : 'medium'),
          data.is_urgent || false,
          data.confidence_score || 0.95,
          data.ai_model_name || 'NavsariWasteClassifier-PyTorch-ResNet50',
          data.ai_model_version || 'v1.3.0'
        ];

        const res = await pool.query(query, values);
        const row = res.rows[0];

        // Also record initial activity log in PostgreSQL
        await pool.query(
          `INSERT INTO complaint_activity_logs (complaint_id, status, note, actor_name, actor_role)
           VALUES ($1, $2, $3, $4, $5)`,
          [row.id, 'submitted', 'Complaint lodged by citizen with location and photo evidence.', data.citizen_name, 'citizen']
        );

        const mapped = this.mapComplaintRow(row);
        store.complaints.unshift(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB REPO ERROR - createComplaint]:', err.message);
      }
    }

    // Fallback to store
    const newComp: Complaint = {
      id: `comp-${Date.now()}`,
      complaint_number: data.complaint_number,
      citizen_id: data.citizen_id,
      citizen_name: data.citizen_name,
      category_id: data.category_id,
      category_name: data.category_name,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        landmark: data.landmark,
        ward_id: data.ward_id || 'ward-03',
        ward_number: data.ward_number,
        ward_name: data.ward_name,
        assigned_officer_name: data.assigned_officer_name || 'Ramesh Patel'
      },
      description: data.description,
      original_language: (data.original_language as any) || 'en',
      image_url: data.image_url,
      confidence_score: data.confidence_score || 0.95,
      ai_model_name: data.ai_model_name || 'NavsariWasteClassifier-PyTorch-ResNet50',
      ai_model_version: data.ai_model_version || 'v1.3.0',
      status: (data.status as any) || 'submitted',
      priority: (data.priority as any) || 'medium',
      is_urgent: data.is_urgent || false,
      is_duplicate: false,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      upvotes_count: 0,
      followers_count: 0,
      activity_logs: [
        {
          id: `log-${Date.now()}`,
          complaint_id: `comp-${Date.now()}`,
          status: 'submitted',
          note: 'Complaint lodged by citizen with location and photo evidence.',
          actor_name: data.citizen_name,
          actor_role: 'citizen',
          created_at: new Date().toISOString()
        }
      ]
    };
    store.complaints.unshift(newComp);
    return newComp;
  }

  public static async getComplaints(params: {
    citizen_id?: string;
    status?: string;
    category_id?: string;
    search?: string;
  } = {}): Promise<Complaint[]> {
    if (isDbConnected()) {
      try {
        let query = 'SELECT * FROM complaints WHERE 1=1';
        const values: any[] = [];
        let idx = 1;

        if (params.citizen_id) {
          const validCitizenId = this.isValidUUID(params.citizen_id) ? params.citizen_id : 'c0000000-0000-0000-0000-000000000001';
          query += ` AND citizen_id = $${idx++}`;
          values.push(validCitizenId);
        }
        if (params.status && params.status !== 'all') {
          query += ` AND status = $${idx++}`;
          values.push(params.status);
        }
        if (params.category_id && params.category_id !== 'all') {
          query += ` AND category_id = $${idx++}`;
          values.push(params.category_id);
        }
        if (params.search) {
          query += ` AND (complaint_number ILIKE $${idx} OR description ILIKE $${idx} OR address ILIKE $${idx})`;
          values.push(`%${params.search}%`);
          idx++;
        }

        query += ' ORDER BY created_at DESC';
        const res = await pool.query(query, values);
        const mapped = res.rows.map(r => this.mapComplaintRow(r));
        if (!params.citizen_id) {
          return mapped.map(c => ({ ...c, citizen_name: 'Anonymous Citizen' }));
        }
        return mapped;
      } catch (err: any) {
        console.error('[DB REPO ERROR - getComplaints]:', err.message);
      }
    }

    // Fallback to store
    return store.complaints.filter(c => {
      if (params.citizen_id && c.citizen_id !== params.citizen_id) return false;
      if (params.status && params.status !== 'all' && c.status !== params.status) return false;
      if (params.category_id && params.category_id !== 'all' && c.category_id !== params.category_id) return false;
      if (params.search) {
        const q = params.search.toLowerCase();
        return c.complaint_number.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.location.address.toLowerCase().includes(q);
      }
      return true;
    }).map(c => {
      if (!params.citizen_id) {
        return { ...c, citizen_name: 'Anonymous Citizen' };
      }
      return c;
    });
  }

  public static async getComplaintById(id: string): Promise<Complaint | null> {
    if (isDbConnected()) {
      try {
        const res = await pool.query('SELECT * FROM complaints WHERE id = $1 OR complaint_number = $1', [id]);
        if (res.rows.length > 0) {
          const comp = this.mapComplaintRow(res.rows[0]);
          // Fetch activity logs
          const logRes = await pool.query('SELECT * FROM complaint_activity_logs WHERE complaint_id = $1 ORDER BY created_at ASC', [comp.id]);
          comp.activity_logs = logRes.rows.map(l => ({
            id: l.id,
            complaint_id: l.complaint_id,
            status: l.status,
            note: l.note,
            actor_name: l.actor_name,
            actor_role: l.actor_role,
            created_at: l.created_at
          }));
          return comp;
        }
        return null;
      } catch (err: any) {
        console.error('[DB REPO ERROR - getComplaintById]:', err.message);
      }
    }

    const found = store.complaints.find(c => c.id === id || c.complaint_number === id);
    return found || null;
  }

  public static async reopenComplaint(id: string, reason: string): Promise<Complaint | null> {
    if (isDbConnected()) {
      try {
        const updateRes = await pool.query(
          `UPDATE complaints SET status = 'reopened', updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id]
        );
        if (updateRes.rows.length > 0) {
          await pool.query(
            `INSERT INTO complaint_activity_logs (complaint_id, status, note, actor_name, actor_role)
             VALUES ($1, 'reopened', $2, 'Citizen Reporter', 'citizen')`,
            [id, `Complaint reopened by citizen: ${reason}`]
          );
          return this.mapComplaintRow(updateRes.rows[0]);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - reopenComplaint]:', err.message);
      }
    }

    const c = store.complaints.find(comp => comp.id === id);
    if (c) {
      c.status = 'reopened';
      c.updated_at = new Date().toISOString();
      c.activity_logs.push({
        id: `log-${Date.now()}`,
        complaint_id: c.id,
        status: 'reopened',
        note: `Complaint reopened by citizen: ${reason}`,
        actor_name: c.citizen_name,
        actor_role: 'citizen',
        created_at: new Date().toISOString()
      });
      return c;
    }
    return null;
  }

  public static async deleteComplaint(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        const res = await pool.query('DELETE FROM complaints WHERE id = $1', [id]);
        return (res.rowCount || 0) > 0;
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteComplaint]:', err.message);
      }
    }

    const idx = store.complaints.findIndex(c => c.id === id);
    if (idx !== -1) {
      store.complaints.splice(idx, 1);
      return true;
    }
    return false;
  }

  public static async updateComplaintStatus(
    id: string,
    newStatus: string,
    actorInfo?: { name: string; role: string; note: string; rejection_reason?: string }
  ): Promise<void> {
    // 1. Update in-memory store
    const complaint = (store.complaints || []).find(c => c.id === id || c.complaint_number === id);
    if (complaint) {
      complaint.status = newStatus as any;
      complaint.updated_at = new Date().toISOString();
      if (actorInfo?.rejection_reason) {
        (complaint as any).rejection_reason = actorInfo.rejection_reason;
      }
      if (actorInfo) {
        if (!complaint.activity_logs) complaint.activity_logs = [];
        complaint.activity_logs.push({
          id: `act-${Date.now()}`,
          complaint_id: complaint.id,
          status: newStatus as any,
          note: actorInfo.note,
          actor_name: actorInfo.name,
          actor_role: actorInfo.role as any,
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Synchronize to PostgreSQL if connected
    if (isDbConnected()) {
      try {
        await pool.query(
          `UPDATE complaints 
           SET status = $1, updated_at = NOW() 
           WHERE id = $2 OR complaint_number = $2`,
          [newStatus, id]
        );

        if (actorInfo) {
          await pool.query(
            `INSERT INTO complaint_activity_logs (complaint_id, status, note, actor_name, actor_role)
             VALUES (
               COALESCE((SELECT id FROM complaints WHERE id = $1 OR complaint_number = $1 LIMIT 1), $1),
               $2, $3, $4, $5
             )`,
            [id, newStatus, actorInfo.note, actorInfo.name, actorInfo.role]
          ).catch(() => {});
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateComplaintStatus]:', err.message);
      }
    }
  }

  public static async createNotification(
    userId: string,
    title: string,
    message: string,
    referenceId?: string,
    type: string = 'complaint_status',
    extra?: { points_awarded?: number; certificate?: any }
  ): Promise<AppNotification> {
    const notifObj: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      title,
      message,
      notification_type: type as any,
      reference_id: referenceId,
      points_awarded: extra?.points_awarded,
      certificate: extra?.certificate,
      is_read: false,
      created_at: new Date().toISOString()
    };

    if (!store.notifications) store.notifications = [];
    store.notifications.unshift(notifObj);

    if (isDbConnected()) {
      try {
        const validUserId = this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000001';
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, notification_type, reference_id, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
          [validUserId, title, message, type === 'certificate' ? 'reward_earned' : type, referenceId || null]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - createNotification]:', err.message);
      }
    }

    return notifObj;
  }

  public static async submitFeedback(complaintId: string, citizenId: string, rating: number, feedbackText: string, satisfactory: boolean) {
    if (isDbConnected()) {
      try {
        await pool.query(
          `INSERT INTO complaint_feedback (complaint_id, citizen_id, rating, feedback_text, resolution_satisfactory)
           VALUES ($1, $2, $3, $4, $5)`,
          [complaintId, citizenId, rating, feedbackText, satisfactory]
        );
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - submitFeedback]:', err.message);
      }
    }
    return true;
  }

  public static async toggleFollow(complaintId: string, citizenId: string): Promise<{ is_following: boolean; followers_count: number }> {
    if (isDbConnected()) {
      try {
        const check = await pool.query(
          'SELECT id FROM complaint_followers WHERE complaint_id = $1 AND citizen_id = $2',
          [complaintId, citizenId]
        );

        let isFollowing = false;
        if (check.rows.length > 0) {
          await pool.query('DELETE FROM complaint_followers WHERE complaint_id = $1 AND citizen_id = $2', [complaintId, citizenId]);
          await pool.query('UPDATE complaints SET followers_count = GREATEST(0, followers_count - 1), upvotes_count = GREATEST(0, upvotes_count - 1) WHERE id = $1', [complaintId]);
          isFollowing = false;
        } else {
          await pool.query('INSERT INTO complaint_followers (complaint_id, citizen_id) VALUES ($1, $2)', [complaintId, citizenId]);
          await pool.query('UPDATE complaints SET followers_count = followers_count + 1, upvotes_count = upvotes_count + 1 WHERE id = $1', [complaintId]);
          isFollowing = true;
        }

        const countRes = await pool.query('SELECT followers_count FROM complaints WHERE id = $1', [complaintId]);
        return { is_following: isFollowing, followers_count: countRes.rows[0]?.followers_count || 1 };
      } catch (err: any) {
        console.error('[DB REPO ERROR - toggleFollow]:', err.message);
      }
    }

    const c = store.complaints.find(comp => comp.id === complaintId);
    if (c) {
      c.is_following = !c.is_following;
      c.followers_count = c.is_following ? (c.followers_count || 0) + 1 : Math.max(0, (c.followers_count || 1) - 1);
      c.upvotes_count = c.followers_count;
      return { is_following: c.is_following, followers_count: c.followers_count };
    }
    return { is_following: true, followers_count: 1 };
  }

  public static async addEvidence(complaintId: string, actorName: string, note?: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query(
          `INSERT INTO complaint_activity_logs (complaint_id, status, note, actor_name, actor_role)
           VALUES ($1, 'updated', $2, $3, 'citizen')`,
          [complaintId, note || 'Citizen uploaded supplementary photo evidence.', actorName]
        );
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - addEvidence]:', err.message);
      }
    }
    return true;
  }

  // =========================================================================
  // 2. CLEANLINESS DRIVES: FETCH & REGISTER
  // =========================================================================

    public static async getDrives(citizenId?: string): Promise<CleanlinessDrive[]> {
    if (isDbConnected()) {
      try {
        const res = await pool.query('SELECT * FROM cleanliness_drives ORDER BY start_time ASC');
        let registeredDriveIds: Set<string> = new Set();
        const driveRegMap: Record<string, any> = {};
        if (citizenId) {
          const regRes = await pool
            .query('SELECT drive_id, community_id, community_name, attendance_status FROM drive_registrations WHERE citizen_id = $1', [citizenId])
            .catch(async () => pool.query('SELECT drive_id FROM drive_registrations WHERE citizen_id = $1', [citizenId]));
          for (const row of regRes.rows) {
            registeredDriveIds.add(row.drive_id);
            driveRegMap[row.drive_id] = row;
          }
        }

        const standardDrives: CleanlinessDrive[] = res.rows.map(r => {
          const memDriveReg = (store.driveRegistrations || []).find(mr => mr.drive_id === r.id && mr.citizen_id === citizenId);
          const memActReg = (store.activityRegistrations || []).find(mr => mr.activity_id === r.id && mr.citizen_id === citizenId);
          const dbDriveReg = driveRegMap[r.id];
          const isReg = registeredDriveIds.has(r.id) || Boolean(memDriveReg) || Boolean(memActReg);
          const attStatus =
            memActReg?.attendance_status && memActReg.attendance_status !== 'not_marked'
              ? memActReg.attendance_status
              : memDriveReg?.attendance_status && memDriveReg.attendance_status !== 'not_marked'
              ? memDriveReg.attendance_status
              : dbDriveReg?.attendance_status && dbDriveReg.attendance_status !== 'not_marked'
              ? dbDriveReg.attendance_status
              : isReg
              ? 'registered'
              : undefined;

          return {
            id: r.id,
            title: r.title,
            description: r.description,
            ward_id: r.ward_id,
            ward_name: r.ward_name,
            location_name: r.location_name,
            start_time: r.start_time,
            end_time: r.end_time,
            registration_deadline: r.registration_deadline,
            organiser_name: r.organiser_name,
            status: r.status,
            banner_url: r.banner_url || r.banner_path,
            max_volunteers: r.max_volunteers,
            registered_volunteers_count: r.registered_volunteers_count || 0,
            is_registered: isReg,
            latitude: parseFloat(r.latitude) || 20.9470,
            longitude: parseFloat(r.longitude) || 72.9280,
            attendance_status: attStatus,
            checkin_latitude: memActReg?.checkin_latitude ?? memDriveReg?.checkin_latitude,
            checkin_longitude: memActReg?.checkin_longitude ?? memDriveReg?.checkin_longitude,
            checkin_distance_meters: memActReg?.checkin_distance_meters ?? memDriveReg?.checkin_distance_meters,
            checkin_at: memActReg?.checkin_at ?? memDriveReg?.checkin_at,
            registered_community_id: dbDriveReg?.community_id || memDriveReg?.community_id,
            registered_community_name: dbDriveReg?.community_name || memDriveReg?.community_name
          };
        });

        // Also retrieve published & approved community activities so citizens can discover and register
        const actRes = await pool.query(`
          SELECT 
            a.id, a.title, COALESCE(a.short_description, a.detailed_description, '') as description,
            a.ward_id, a.ward_name, COALESCE(a.address, a.landmark, 'Navsari') as location_name,
            a.latitude, a.longitude,
            a.proposed_start_at as start_time, a.proposed_end_at as end_time,
            a.proposed_start_at as registration_deadline,
            COALESCE(c.community_name, 'Community Organization') as organiser_name,
            CASE WHEN a.event_status = 'completed' THEN 'completed' ELSE 'upcoming' END as status,
            COALESCE(a.cover_image_path, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80') as banner_url,
            COALESCE(a.maximum_participants, 50) as max_volunteers,
            COALESCE((SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id), 0) as registered_volunteers_count,
            (SELECT ar.attendance_status FROM activity_registrations ar WHERE ar.activity_id = a.id AND ar.citizen_id = $1 LIMIT 1) as my_attendance_status
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          WHERE a.approval_status IN ('approved', 'ward_approved') AND a.publication_status IN ('published', 'approved')
        `, [citizenId || 'c0000000-0000-0000-0000-000000000001']);

        let registeredActIds: Set<string> = new Set();
        let presentActIds: Set<string> = new Set();
        if (citizenId) {
          const actRegRes = await pool.query('SELECT activity_id, attendance_status FROM activity_registrations WHERE citizen_id = $1', [citizenId]);
          registeredActIds = new Set(actRegRes.rows.map(r => r.activity_id));
          presentActIds = new Set(actRegRes.rows.filter(r => r.attendance_status === 'present').map(r => r.activity_id));
        }

        const communityDrives: CleanlinessDrive[] = actRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          ward_id: r.ward_id,
          ward_name: r.ward_name,
          location_name: r.location_name,
          latitude: parseFloat(r.latitude) || 20.9470,
          longitude: parseFloat(r.longitude) || 72.9280,
          start_time: r.start_time,
          end_time: r.end_time,
          registration_deadline: r.registration_deadline,
          organiser_name: r.organiser_name,
          status: r.status,
          banner_url: r.banner_url,
          max_volunteers: r.max_volunteers,
          registered_volunteers_count: parseInt(r.registered_volunteers_count, 10),
          is_registered: registeredActIds.has(r.id) || registeredDriveIds.has(r.id),
          attendance_status: r.my_attendance_status || (presentActIds.has(r.id) ? 'present' : registeredActIds.has(r.id) ? 'registered' : undefined)
        }));

        const combined = [...communityDrives];
        for (const sd of standardDrives) {
          if (!combined.some(c => c.id === sd.id)) {
            combined.push(sd);
          }
        }

        // Also query approved community problems from database so citizens can join them
        const approvedProblemsRes = await pool.query(`
          SELECT * FROM community_problems
          WHERE status IN ('claimed', 'in_progress')
          ORDER BY start_time ASC
        `).catch(() => ({ rows: [] }));

        for (const pr of approvedProblemsRes.rows) {
          if (!combined.some(c => c.id === pr.id)) {
            const assignedComms = Array.isArray(pr.assigned_communities)
              ? pr.assigned_communities
              : (typeof pr.assigned_communities === 'string' ? JSON.parse(pr.assigned_communities) : []);
            const isJoint = assignedComms.length > 1;
            combined.push({
              id: pr.id,
              title: pr.title,
              description: pr.description,
              ward_id: `ward-${pr.ward_number < 10 ? '0' + pr.ward_number : pr.ward_number}`,
              ward_name: pr.ward_name || `Ward ${pr.ward_number}`,
              location_name: pr.location_name || pr.address || 'Navsari',
              latitude: parseFloat(pr.latitude) || 20.9470,
              longitude: parseFloat(pr.longitude) || 72.9280,
              start_time: pr.start_time ? (pr.start_time instanceof Date ? pr.start_time.toISOString() : String(pr.start_time)) : new Date(Date.now() + 86400000 * 2).toISOString(),
              end_time: pr.end_time ? (pr.end_time instanceof Date ? pr.end_time.toISOString() : String(pr.end_time)) : new Date(Date.now() + 86400000 * 2 + 14400000).toISOString(),
              registration_deadline: pr.start_time ? (pr.start_time instanceof Date ? pr.start_time.toISOString() : String(pr.start_time)) : new Date(Date.now() + 86400000 * 2).toISOString(),
              organiser_name: pr.claimed_by_community_name || 'Community Volunteers',
              status: 'upcoming',
              banner_url: pr.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
              max_volunteers: parseInt(pr.estimated_volunteers_needed || '30', 10),
              registered_volunteers_count: 0,
              is_registered: registeredDriveIds.has(pr.id),
              is_joint: isJoint,
              co_organisers: assignedComms.map((a: any) => a.community_name),
              drive_type: isJoint ? 'joint' : 'single',
              action_plan: pr.action_plan,
              suggested_equipment: Array.isArray(pr.suggested_equipment) ? pr.suggested_equipment : []
            });
          }
        }

        return combined;
      } catch (err: any) {
        console.error('[DB REPO ERROR - getDrives]:', err.message);
      }
    }

    // In-memory fallback
    if (!store.drives) store.drives = [];
    const validCitizenId = citizenId && this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';

    // Synchronize approved community problems into store.drives so citizens see all approved drives
    const approvedProblems = (store.communityProblems || []).filter(p =>
      (p.status === 'claimed' || p.status === 'in_progress') &&
      ((p.assigned_communities && p.assigned_communities.length > 0) || p.claimed_by_community_name)
    );
    for (const prob of approvedProblems) {
      const isJoint = (prob.assigned_communities?.length || 0) > 1;
      const coOrganisersList = prob.assigned_communities?.map(a => a.community_name) || [];
      const maxVolsPerComm = prob.max_volunteers_per_community || 25;
      const totalMaxVols = isJoint ? (prob.assigned_communities?.length || 1) * maxVolsPerComm : (prob.estimated_volunteers_needed || 30);

      const drivePayload: Partial<CleanlinessDrive> = {
        title: prob.title,
        description: prob.description,
        ward_id: `ward-${prob.ward_number < 10 ? '0' + prob.ward_number : prob.ward_number}`,
        ward_name: prob.ward_name || `Ward ${prob.ward_number}`,
        location_name: prob.meeting_point || prob.location_name || prob.address || 'Navsari',
        latitude: prob.latitude || 20.9470,
        longitude: prob.longitude || 72.9280,
        start_time: prob.start_time || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] + 'T08:00:00Z',
        end_time: prob.end_time || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] + 'T11:30:00Z',
        registration_deadline: prob.start_time || new Date(Date.now() + 86400000 * 3).toISOString(),
        organiser_name: prob.claimed_by_community_name || 'Community Volunteers',
        status: 'upcoming',
        banner_url: prob.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        max_volunteers: totalMaxVols,
        max_volunteers_per_community: maxVolsPerComm,
        is_joint: isJoint,
        co_organisers: coOrganisersList,
        drive_type: isJoint ? 'joint' : 'single',
        action_plan: prob.action_plan,
        suggested_equipment: prob.suggested_equipment,
        citizen_instructions: prob.citizen_instructions,
        necessary_gears: prob.necessary_gears && prob.necessary_gears.length > 0 ? prob.necessary_gears : prob.suggested_equipment,
        meeting_point: prob.meeting_point,
        emergency_contact: prob.emergency_contact,
        assigned_communities: prob.assigned_communities
      };

      const existingDrive = store.drives.find(d => d.id === prob.id);
      if (!existingDrive) {
        store.drives.unshift({
          id: prob.id,
          registered_volunteers_count: 0,
          ...drivePayload
        } as CleanlinessDrive);
      } else {
        Object.assign(existingDrive, drivePayload);
      }
    }

    return store.drives.map(d => {
      const userDriveReg = store.driveRegistrations?.find(r => r.drive_id === d.id && r.citizen_id === validCitizenId);
      const userActReg = store.activityRegistrations?.find(r => r.activity_id === d.id && r.citizen_id === validCitizenId);
      const isReg = Boolean(userDriveReg || userActReg);
      const effectiveAttendanceStatus =
        userActReg?.attendance_status && userActReg.attendance_status !== 'not_marked'
          ? userActReg.attendance_status
          : userDriveReg?.attendance_status && userDriveReg.attendance_status !== 'not_marked'
          ? userDriveReg.attendance_status
          : isReg
          ? 'registered'
          : undefined;
      const volunteerCounts: Record<string, number> = {};
      const allRegs = (store.driveRegistrations || []).filter(r => r.drive_id === d.id);
      for (const r of allRegs) {
        if (r.community_id) {
          volunteerCounts[r.community_id] = (volunteerCounts[r.community_id] || 0) + 1;
        }
      }
      return {
        ...d,
        is_registered: isReg,
        attendance_status: effectiveAttendanceStatus,
        checkin_latitude: userActReg?.checkin_latitude ?? userDriveReg?.checkin_latitude,
        checkin_longitude: userActReg?.checkin_longitude ?? userDriveReg?.checkin_longitude,
        checkin_distance_meters: userActReg?.checkin_distance_meters ?? userDriveReg?.checkin_distance_meters,
        checkin_at: userActReg?.checkin_at ?? userDriveReg?.checkin_at,
        registered_community_id: userDriveReg?.community_id || userActReg?.community_id,
        registered_community_name: userDriveReg?.community_name || userActReg?.community_name,
        community_volunteer_counts: volunteerCounts
      };
    });
  }

  public static async registerForDrive(
    driveId: string,
    citizenId: string,
    communityId?: string,
    communityName?: string
  ): Promise<{ success: boolean; message?: string }> {
    const validCitizenId = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    await this.ensureProfileExists(validCitizenId, 'Harshil Mehta', '+91 98251 00001');

    const drive = (store.drives || []).find(d => d.id === driveId);
    const prob = (store.communityProblems || []).find(p => p.id === driveId);
    const maxVolsPerCommunity = drive?.max_volunteers_per_community || prob?.max_volunteers_per_community || 25;

    // Check quota for selected community
    if (communityId) {
      if (isDbConnected()) {
        try {
          const countRes = await pool.query(
            `SELECT COUNT(*) AS total FROM drive_registrations WHERE drive_id = $1 AND community_id = $2`,
            [driveId, communityId]
          );
          const currentCount = parseInt(countRes.rows[0]?.total || '0', 10);
          if (currentCount >= maxVolsPerCommunity) {
            return {
              success: false,
              message: `Volunteer quota (${maxVolsPerCommunity} volunteers) for ${communityName || 'this community'} is full. Please choose another community or drive.`
            };
          }
        } catch (err: any) {
          console.error('[DB REPO ERROR - checkQuota]:', err.message);
        }
      } else {
        const currentCount = (store.driveRegistrations || []).filter(
          r => r.drive_id === driveId && r.community_id === communityId
        ).length;
        if (currentCount >= maxVolsPerCommunity) {
          return {
            success: false,
            message: `Volunteer quota (${maxVolsPerCommunity} volunteers) for ${communityName || 'this community'} is full. Please choose another community or drive.`
          };
        }
      }
    }

    if (isDbConnected()) {
      try {
        // 1. Check if driveId matches community_activities
        const actCheck = await pool.query('SELECT id, community_id, title FROM community_activities WHERE id = $1', [driveId]);
        if (actCheck.rows.length > 0) {
          const regNumber = `REG-NAV-${Math.floor(1000 + Math.random() * 9000)}`;
          await pool.query(`
            INSERT INTO activity_registrations (
              id, activity_id, citizen_id, registration_number, registration_status, attendance_status, registered_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, 'registered', 'registered', NOW()
            )
            ON CONFLICT (activity_id, citizen_id) DO UPDATE SET registration_status = 'registered', cancelled_at = NULL
          `, [driveId, validCitizenId, regNumber]);

          await pool.query(
            `UPDATE cleanliness_drives SET registered_volunteers_count = registered_volunteers_count + 1 WHERE id = $1`,
            [driveId]
          ).catch(() => {});
          return { success: true, message: 'Successfully registered for this cleanliness drive!' };
        }

        // 2. Otherwise cleanliness_drives
        await pool.query(
          `INSERT INTO drive_registrations (id, drive_id, citizen_id, community_id, community_name, registration_status, attendance_status, registered_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'registered', 'registered', NOW())
           ON CONFLICT (drive_id, citizen_id) DO UPDATE SET registration_status = 'registered', community_id = EXCLUDED.community_id, community_name = EXCLUDED.community_name`,
          [driveId, validCitizenId, communityId || null, communityName || null]
        );
        await pool.query(
          `UPDATE cleanliness_drives SET registered_volunteers_count = registered_volunteers_count + 1 WHERE id = $1`,
          [driveId]
        );
        return {
          success: true,
          message: communityName ? `Successfully registered to participate with ${communityName}!` : 'Successfully registered for this cleanliness drive!'
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - registerForDrive]:', err.message);
      }
    }

    // In-memory sync / fallback
    const profile = (store.profiles || []).find(p => p.id === validCitizenId || p.id === citizenId);
    const citizenName = profile?.full_name || 'Harshil Mehta';
    const citizenPhone = profile?.phone || '+91 98251 00001';
    const citizenEmail = profile?.email || 'citizen@navsari.gov.in';
    const regId = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const regNum = `REG-NAV-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!store.driveRegistrations) store.driveRegistrations = [];
    const existingReg = store.driveRegistrations.find(r => r.drive_id === driveId && r.citizen_id === validCitizenId);
    if (!existingReg) {
      store.driveRegistrations.push({
        id: regId,
        drive_id: driveId,
        citizen_id: validCitizenId,
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        citizen_email: citizenEmail,
        registration_number: regNum,
        registration_status: 'registered',
        attendance_status: 'not_marked',
        community_id: communityId,
        community_name: communityName,
        registered_at: new Date().toISOString()
      });
      if (drive) {
        drive.is_registered = true;
        drive.registered_volunteers_count = (drive.registered_volunteers_count || 0) + 1;
        drive.registered_community_id = communityId;
        drive.registered_community_name = communityName;
      }
    } else {
      existingReg.community_id = communityId || existingReg.community_id;
      existingReg.community_name = communityName || existingReg.community_name;
    }

    const act = (store.communityActivities || []).find(a => a.id === driveId);
    if (act) {
      (act as any).is_registered = true;
      act.registered_count = (act.registered_count || 0) + 1;
    }
    if (!store.activityRegistrations) store.activityRegistrations = [];
    const existingActReg = store.activityRegistrations.find(
      r => r.activity_id === driveId && r.citizen_id === validCitizenId
    );
    if (!existingActReg) {
      store.activityRegistrations.push({
        id: existingReg?.id || regId,
        activity_id: driveId,
        activity_title: drive?.title || prob?.title || act?.title || 'Cleanliness Drive',
        citizen_id: validCitizenId,
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        citizen_email: citizenEmail,
        community_id: communityId,
        community_name: communityName,
        registration_number: existingReg?.registration_number || regNum,
        registration_status: 'registered',
        attendance_status: 'not_marked',
        registered_at: new Date().toISOString()
      });
    } else {
      existingActReg.community_id = communityId || existingActReg.community_id;
      existingActReg.community_name = communityName || existingActReg.community_name;
    }

    return {
      success: true,
      message: communityName ? `Successfully registered to participate with ${communityName}!` : 'Successfully registered for this cleanliness drive!'
    };
  }

  public static async cancelDriveRegistration(driveId: string, citizenId: string): Promise<boolean> {
    const validCitizenId = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        await pool.query('DELETE FROM drive_registrations WHERE drive_id = $1 AND citizen_id = $2', [driveId, validCitizenId]).catch(() => {});
        await pool.query('DELETE FROM activity_registrations WHERE activity_id = $1 AND citizen_id = $2', [driveId, validCitizenId]).catch(() => {});
        await pool.query(
          `UPDATE cleanliness_drives SET registered_volunteers_count = GREATEST(0, registered_volunteers_count - 1) WHERE id = $1`,
          [driveId]
        ).catch(() => {});
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - cancelDriveRegistration]:', err.message);
      }
    }

    if (store.driveRegistrations) {
      store.driveRegistrations = store.driveRegistrations.filter(
        r => !(r.drive_id === driveId && r.citizen_id === validCitizenId)
      );
    }
    const drive = store.drives.find(d => d.id === driveId);
    if (drive) {
      drive.is_registered = false;
      drive.registered_volunteers_count = Math.max(0, (drive.registered_volunteers_count || 1) - 1);
    }
    const act = (store.communityActivities || []).find(a => a.id === driveId);
    if (act) {
      (act as any).is_registered = false;
      act.registered_count = Math.max(0, (act.registered_count || 1) - 1);
    }
    if ((store as any).activityRegistrations) {
      (store as any).activityRegistrations = (store as any).activityRegistrations.filter(
        (r: any) => !(r.activity_id === driveId && r.citizen_id === validCitizenId)
      );
    }
    return true;
  }

  private static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Citizen Geo-Tagged Self Check-In ("Dummy Attendance").
   * 1. Allowed ONLY between drive start_time and end_time.
   * 2. Requires live geo-tagged GPS coordinates within 150 meters of the cleanliness drive spot.
   * 3. Does NOT mark 'present' in DB — sets 'pending_verification' and routes to the respective Community Head
   *    for final attendance confirmation.
   */
  public static async markDriveAttendance(
    driveId: string,
    citizenId: string,
    latitude?: number,
    longitude?: number
  ): Promise<{ success: boolean; error?: string; message?: string; data?: any }> {
    const validCitizenId = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    const MAX_ATTENDANCE_RADIUS_METERS = 150;

    // 1. Locate drive metadata (from store.drives, communityProblems, communityActivities, or DB)
    const memDrive = (store.drives || []).find(d => d.id === driveId);
    const memProb = (store.communityProblems || []).find(p => p.id === driveId);
    const memAct = (store.communityActivities || []).find(a => a.id === driveId);
    let dbAct: any = null;
    if (!memDrive && !memProb && !memAct && isDbConnected() && this.isValidUUID(driveId)) {
      dbAct = await this.getActivityById(driveId);
    }

    const driveTitle = memDrive?.title || memProb?.title || memAct?.title || dbAct?.title || 'Cleanliness Drive';
    const startTimeStr = memDrive?.start_time || memProb?.start_time || memAct?.proposed_start_at || dbAct?.proposed_start_at;
    const endTimeStr = memDrive?.end_time || memProb?.end_time || memAct?.proposed_end_at || dbAct?.proposed_end_at;
    const driveLat = Number(memDrive?.latitude ?? memProb?.latitude ?? memAct?.latitude ?? dbAct?.latitude ?? 20.9470);
    const driveLng = Number(memDrive?.longitude ?? memProb?.longitude ?? memAct?.longitude ?? dbAct?.longitude ?? 72.9280);

    // 2. Verify citizen is registered for this drive
    const memDriveReg = (store.driveRegistrations || []).find(r => r.drive_id === driveId && r.citizen_id === validCitizenId);
    const memActReg = (store.activityRegistrations || []).find(r => r.activity_id === driveId && r.citizen_id === validCitizenId);
    let dbReg: any = null;
    if (!memDriveReg && !memActReg && isDbConnected() && this.isValidUUID(driveId)) {
      const r1 = await pool
        .query(`SELECT * FROM activity_registrations WHERE activity_id = $1 AND citizen_id = $2 LIMIT 1`, [driveId, validCitizenId])
        .catch(() => ({ rows: [] as any[] }));
      if (r1.rows.length > 0) {
        dbReg = r1.rows[0];
      } else {
        const r2 = await pool
          .query(`SELECT * FROM drive_registrations WHERE drive_id = $1 AND citizen_id = $2 LIMIT 1`, [driveId, validCitizenId])
          .catch(() => ({ rows: [] as any[] }));
        if (r2.rows.length > 0) dbReg = r2.rows[0];
      }
    }

    if (!memDriveReg && !memActReg && !dbReg) {
      return {
        success: false,
        error: 'You must register for this cleanliness drive before marking your attendance.'
      };
    }

    // If Community Head already marked this citizen as finally PRESENT, keep it confirmed
    const currentStatus = memActReg?.attendance_status || memDriveReg?.attendance_status || dbReg?.attendance_status;
    if (currentStatus === 'present') {
      return {
        success: true,
        message: 'Your final attendance has already been confirmed as PRESENT by your Community Head.',
        data: {
          drive_id: driveId,
          citizen_id: validCitizenId,
          attendance_status: 'present'
        }
      };
    }

    // 3. Enforce strict start_time <= now <= end_time window
    const nowMs = Date.now();
    if (startTimeStr) {
      const startMs = new Date(startTimeStr).getTime();
      if (!isNaN(startMs) && nowMs < startMs) {
        return {
          success: false,
          error: `Attendance is locked until the drive begins at ${new Date(startMs).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`
        };
      }
    }
    if (endTimeStr) {
      const endMs = new Date(endTimeStr).getTime();
      if (!isNaN(endMs) && nowMs > endMs) {
        return {
          success: false,
          error: `Attendance window has closed. This drive ended at ${new Date(endMs).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`
        };
      }
    }

    // 4. Enforce Geo-Tagged Location Check (within 150m of the cleanliness drive spot)
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        error: 'Live geo-tagged GPS coordinates are required to submit your check-in.'
      };
    }

    const distanceMeters = Math.round(this.calculateDistanceMeters(latitude, longitude, driveLat, driveLng));
    if (distanceMeters > MAX_ATTENDANCE_RADIUS_METERS) {
      return {
        success: false,
        error: `Location verification failed: you are ${distanceMeters}m away from the cleanliness drive spot. You must be within ${MAX_ATTENDANCE_RADIUS_METERS}m to submit attendance.`
      };
    }

    const nowIso = new Date().toISOString();

    // 5. Save DUMMY / PENDING attendance ('pending_verification') — NOT marked 'present' yet!
    if (isDbConnected() && this.isValidUUID(driveId)) {
      await pool.query(
        `UPDATE activity_registrations SET attendance_status = 'pending_verification', updated_at = NOW() WHERE activity_id = $1 AND citizen_id = $2`,
        [driveId, validCitizenId]
      ).catch(() => {});
      await pool.query(
        `UPDATE drive_registrations SET attendance_status = 'pending_verification' WHERE drive_id = $1 AND citizen_id = $2`,
        [driveId, validCitizenId]
      ).catch(() => {});
    }

    if (memDriveReg) {
      memDriveReg.attendance_status = 'pending_verification';
      memDriveReg.checkin_latitude = latitude;
      memDriveReg.checkin_longitude = longitude;
      memDriveReg.checkin_distance_meters = distanceMeters;
      memDriveReg.checkin_at = nowIso;
    }

    if (memActReg) {
      memActReg.attendance_status = 'pending_verification';
      memActReg.checkin_latitude = latitude;
      memActReg.checkin_longitude = longitude;
      memActReg.checkin_distance_meters = distanceMeters;
      memActReg.checkin_at = nowIso;
    } else if (memDriveReg || dbReg) {
      // Ensure mirror record exists in memory so geo-tag coordinates are preserved cleanly
      const profile = (store.profiles || []).find(p => p.id === validCitizenId || p.id === citizenId);
      if (!store.activityRegistrations) store.activityRegistrations = [];
      store.activityRegistrations.push({
        id: memDriveReg?.id || dbReg?.id || `reg-${Date.now()}`,
        activity_id: driveId,
        activity_title: driveTitle,
        citizen_id: validCitizenId,
        citizen_name: memDriveReg?.citizen_name || profile?.full_name || 'Citizen Volunteer',
        citizen_phone: memDriveReg?.citizen_phone || profile?.phone,
        citizen_email: memDriveReg?.citizen_email || profile?.email,
        community_id: memDriveReg?.community_id || dbReg?.community_id,
        community_name: memDriveReg?.community_name || dbReg?.community_name,
        registration_number: memDriveReg?.registration_number || dbReg?.registration_number || `REG-NAV-${Math.floor(1000 + Math.random() * 9000)}`,
        registration_status: 'registered',
        attendance_status: 'pending_verification',
        checkin_latitude: latitude,
        checkin_longitude: longitude,
        checkin_distance_meters: distanceMeters,
        checkin_at: nowIso,
        registered_at: memDriveReg?.registered_at || dbReg?.registered_at || nowIso
      });
    }

    // 6. Route dummy check-in notification to the RESPECTIVE Community Head through which the citizen participated
    const targetCommunityId =
      memDriveReg?.community_id ||
      memActReg?.community_id ||
      dbReg?.community_id ||
      memProb?.assigned_communities?.[0]?.community_id ||
      memAct?.community_id ||
      dbAct?.community_id;

    const targetCommunity = targetCommunityId
      ? (store.communities || []).find(c => c.id === targetCommunityId)
      : undefined;
    const targetCommunityName =
      memDriveReg?.community_name ||
      memActReg?.community_name ||
      targetCommunity?.community_name ||
      memProb?.claimed_by_community_name ||
      'your Community';

    // Resolve the respective Community Head's user_id
    let targetHeadUserId = targetCommunity?.created_by || memAct?.created_by || dbAct?.created_by;
    if (!targetHeadUserId && targetCommunity) {
      const cDigits = (targetCommunity.phone || targetCommunity.contact_phone || '').replace(/\D/g, '').slice(-10);
      if (cDigits.length === 10) {
        const headProf = (store.profiles || []).find(
          p => p.role === 'community_head' && (p.phone || '').replace(/\D/g, '').slice(-10) === cDigits
        );
        if (headProf) targetHeadUserId = headProf.id;
      }
    }
    const finalNotifRecipient = targetHeadUserId || targetCommunityId || 'c0000000-0000-0000-0000-000000000099';

    const citizenProfile = (store.profiles || []).find(p => p.id === validCitizenId || p.id === citizenId);
    const citizenName = memActReg?.citizen_name || memDriveReg?.citizen_name || citizenProfile?.full_name || 'Citizen Volunteer';

    await this.createNotification(
      finalNotifRecipient,
      `📍 Geo-Tagged Check-In Pending Approval: ${driveTitle}`,
      `${citizenName} checked in on-site (${distanceMeters}m from drive spot, GPS ${latitude.toFixed(4)}, ${longitude.toFixed(4)}) under ${targetCommunityName}. Please verify and mark their final attendance as Present in the Attendance tab.`,
      driveId,
      'system_alert'
    );

    return {
      success: true,
      message: `Geo-tagged check-in recorded (${distanceMeters}m from drive spot)! Sent to ${targetCommunityName}'s Community Head for final attendance verification.`,
      data: {
        drive_id: driveId,
        citizen_id: validCitizenId,
        attendance_status: 'pending_verification',
        checkin_latitude: latitude,
        checkin_longitude: longitude,
        checkin_distance_meters: distanceMeters,
        checkin_at: nowIso,
        community_id: targetCommunityId,
        community_name: targetCommunityName
      }
    };
  }

  // =========================================================================
  // 3. NOTIFICATIONS: FETCH & UPDATE
  // =========================================================================

  /**
   * Resolves the Ward Officer's profile user_id for a given ward number.
   */
  public static findWardOfficerUserId(wardNumber?: number): string {
    const targetWard = Number(wardNumber || 3);
    const profiles = store.profiles || [];
    const officer = profiles.find(p => {
      if (p.role !== 'ward_officer') return false;
      if (p.ward_number && Number(p.ward_number) === targetWard) return true;
      const locMatch = `${p.locality || ''} ${p.address || ''}`.match(/Ward\s*(\d+)/i);
      if (locMatch && Number(locMatch[1]) === targetWard) return true;
      return false;
    });
    if (officer) return officer.id;
    const anyOfficer = profiles.find(p => p.role === 'ward_officer');
    return anyOfficer?.id || `w0000000-0000-0000-0000-00000000000${targetWard < 10 ? targetWard : 3}`;
  }

  /**
   * Builds the set of notification user_id aliases belonging to a user
   * (user's own ID, owned community IDs for community heads, and ward officer IDs for same ward).
   */
  private static getNotificationAliasesForUser(userId: string): Set<string> {
    const validUserId = this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000001';
    const aliases = new Set<string>([userId, validUserId]);

    const userProfile = (store.profiles || []).find(p => p.id === userId || p.id === validUserId);
    const userPhoneDigits = (userProfile?.phone || '').replace(/\D/g, '').slice(-10);

    // 1. If Community Head (or owns a community), match notifications sent to their community ID(s)
    for (const c of (store.communities || [])) {
      const cDigits = (c.phone || c.contact_phone || '').replace(/\D/g, '').slice(-10);
      if (
        c.created_by === userId ||
        c.created_by === validUserId ||
        c.id === userId ||
        (userPhoneDigits.length === 10 && cDigits === userPhoneDigits)
      ) {
        aliases.add(c.id);
        if (c.created_by) aliases.add(c.created_by);
      }
    }

    // 2. If Ward Officer, also match legacy Ward Officer IDs for the same ward
    if (userProfile?.role === 'ward_officer') {
      let wardNum = userProfile.ward_number;
      if (!wardNum) {
        const m = `${userProfile.locality || ''} ${userProfile.address || ''}`.match(/Ward\s*(\d+)/i);
        if (m) wardNum = Number(m[1]);
      }
      if (wardNum) {
        const padded = wardNum < 10 ? `0${wardNum}` : `${wardNum}`;
        aliases.add(`w0000000-0000-0000-0000-0000000000${padded}`);
        aliases.add(`d0000000-0000-0000-0000-0000000000${padded}`);
        aliases.add(`ward-officer-ward-${wardNum}`);
      }
    }

    return aliases;
  }

  public static async getNotifications(userId: string): Promise<AppNotification[]> {
    const validUserId = this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000001';
    const matchingUserIds = this.getNotificationAliasesForUser(userId);
    const memNotifs = (store.notifications || []).filter(n => matchingUserIds.has(n.user_id));

    if (isDbConnected()) {
      try {
        const uuidAliases = Array.from(matchingUserIds).filter(id => this.isValidUUID(id));
        const res = await pool.query(
          'SELECT * FROM notifications WHERE user_id = ANY($1::uuid[]) ORDER BY created_at DESC',
          [uuidAliases.length > 0 ? uuidAliases : [validUserId]]
        );
        const dbNotifs: AppNotification[] = res.rows.map(r => {
          const memMatch = memNotifs.find(
            m => m.id === r.id || (m.title === r.title && m.reference_id === r.reference_id)
          );
          return {
            id: r.id,
            user_id: r.user_id,
            title: r.title,
            message: r.message,
            notification_type: memMatch?.certificate ? 'certificate' : r.notification_type,
            reference_id: r.reference_id,
            points_awarded: memMatch?.points_awarded,
            certificate: memMatch?.certificate,
            is_read: memMatch?.is_read !== undefined ? (r.is_read || memMatch.is_read) : r.is_read,
            created_at: r.created_at
          };
        });

        const dbKeys = new Set(dbNotifs.map(n => `${n.title}::${n.reference_id || ''}`));
        const extraMem = memNotifs.filter(m => !dbKeys.has(`${m.title}::${m.reference_id || ''}`));
        return [...extraMem, ...dbNotifs].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - getNotifications]:', err.message);
      }
    }
    return memNotifs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public static async markNotificationRead(id: string): Promise<boolean> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - markNotificationRead]:', err.message);
      }
    }
    const n = (store.notifications || []).find(notif => notif.id === id);
    if (n) n.is_read = true;
    return true;
  }

  public static async markAllNotificationsRead(userId: string): Promise<boolean> {
    const validUserId = this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000001';
    const matchingUserIds = this.getNotificationAliasesForUser(userId);

    if (isDbConnected()) {
      try {
        const uuidAliases = Array.from(matchingUserIds).filter(id => this.isValidUUID(id));
        await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = ANY($1::uuid[])',
          [uuidAliases.length > 0 ? uuidAliases : [validUserId]]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - markAllNotificationsRead]:', err.message);
      }
    }
    (store.notifications || [])
      .filter(n => matchingUserIds.has(n.user_id))
      .forEach(n => { n.is_read = true; });
    return true;
  }

  // =========================================================================
  // 4. CITIZEN DASHBOARD AGGREGATES
  // =========================================================================

  public static async getDashboardStats(citizenId: string) {
    const validCitizenId = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        const [statsRes, cityRes] = await Promise.all([
          pool.query(`
            SELECT
              count(*) AS total,
              count(*) FILTER (WHERE status = 'submitted' OR status = 'under_review') AS pending,
              count(*) FILTER (WHERE status = 'in_progress' OR status = 'assigned') AS in_progress,
              count(*) FILTER (WHERE status = 'resolved') AS resolved
            FROM complaints
            WHERE citizen_id = $1
          `, [validCitizenId]),
          pool.query(`
            SELECT
              count(*) AS total,
              count(*) FILTER (WHERE status = 'resolved') AS resolved
            FROM complaints
          `)
        ]);

        const s = statsRes.rows[0];
        const c = cityRes.rows[0];

        return {
          stats: {
            total_submitted: parseInt(s.total || '0'),
            pending: parseInt(s.pending || '0'),
            in_progress: parseInt(s.in_progress || '0'),
            resolved: parseInt(s.resolved || '0')
          },
          municipal_stats: {
            city_total_complaints: parseInt(c.total || '0'),
            city_resolved_complaints: parseInt(c.resolved || '0'),
            city_average_resolution_hours: 14.5,
            total_active_drives: 3,
            active_volunteers: 95
          }
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - getDashboardStats]:', err.message);
      }
    }

    const my = store.complaints.filter(c => c.citizen_id === citizenId);
    return {
      stats: {
        total_submitted: my.length,
        pending: my.filter(c => c.status === 'submitted' || c.status === 'under_review').length,
        in_progress: my.filter(c => c.status === 'in_progress' || c.status === 'assigned').length,
        resolved: my.filter(c => c.status === 'resolved').length
      },
      municipal_stats: {
        city_total_complaints: store.complaints.length,
        city_resolved_complaints: store.complaints.filter(c => c.status === 'resolved').length,
        city_average_resolution_hours: 14.5,
        total_active_drives: store.drives.length,
        active_volunteers: 95
      }
    };
  }

  // =========================================================================
  // 5. COMMUNITY RECOGNITION WALL (LINKEDIN-STYLE POSTS, LIKES, COMMENTS)
  // =========================================================================

  public static async getRecognitionPosts(citizenId?: string): Promise<CommunityRecognitionPost[]> {
    if (isDbConnected()) {
      try {
        const postsRes = await pool.query(
          `SELECT * FROM community_recognition_posts ORDER BY created_at DESC`
        );

        let likedPostIds = new Set<string>();
        if (citizenId) {
          const likesRes = await pool.query(
            `SELECT post_id FROM recognition_post_likes WHERE citizen_id = $1`,
            [citizenId]
          );
          likedPostIds = new Set(likesRes.rows.map(r => r.post_id));
        }

        // Fetch comments for all posts
        const commentsRes = await pool.query(
          `SELECT * FROM recognition_post_comments ORDER BY created_at ASC`
        );
        const commentsByPost: Record<string, RecognitionComment[]> = {};
        for (const row of commentsRes.rows) {
          if (!commentsByPost[row.post_id]) commentsByPost[row.post_id] = [];
          commentsByPost[row.post_id].push({
            id: row.id,
            post_id: row.post_id,
            citizen_id: row.citizen_id,
            citizen_name: row.citizen_name,
            citizen_role: row.citizen_role,
            comment_text: row.comment_text,
            created_at: row.created_at
          });
        }

        const dbPosts: CommunityRecognitionPost[] = postsRes.rows.map(r => {
          const memMatch = (store.recognitionPosts || []).find(
            m => m.id === r.id || (m.title === r.title && m.ward_number === r.ward_number)
          );
          return {
            id: r.id,
            author_name: r.author_name,
            author_role: r.author_role,
            author_avatar: r.author_avatar,
            is_verified_nmc: r.is_verified_nmc,
            ward_number: r.ward_number,
            ward_name: r.ward_name,
            hero_name: r.hero_name,
            hero_role: r.hero_role,
            badge_title: r.badge_title,
            title: r.title,
            description: r.description,
            achievement_stats: r.achievement_stats,
            image_url: r.image_url,
            before_image_url: r.before_image_url || memMatch?.before_image_url || undefined,
            after_image_url: r.after_image_url || memMatch?.after_image_url || undefined,
            after_photos: r.after_photos ? (typeof r.after_photos === 'string' ? JSON.parse(r.after_photos) : r.after_photos) : memMatch?.after_photos,
            participating_communities: memMatch?.participating_communities,
            drive_id: memMatch?.drive_id,
            volunteers_count: memMatch?.volunteers_count,
            points_awarded_citizen: memMatch?.points_awarded_citizen,
            points_awarded_community: memMatch?.points_awarded_community,
            likes_count: r.likes_count,
            comments_count: r.comments_count,
            is_liked: likedPostIds.has(r.id),
            created_at: r.created_at,
            comments: commentsByPost[r.id] || []
          };
        });

        // Prepend ALL in-memory posts (from any user: Citizen, Community Head, Ward Officer, Worker, Admin)
        // that aren't already in DB results so every post is universally viewable by every other user
        const dbIds = new Set(dbPosts.map(p => p.id));
        const dbTitleKeys = new Set(dbPosts.map(p => `${p.title}::${p.ward_number}::${p.author_name}`));
        const memOnly = (store.recognitionPosts || []).filter(
          p => !dbIds.has(p.id) && !dbTitleKeys.has(`${p.title}::${p.ward_number}::${p.author_name}`)
        );
        return [...memOnly, ...dbPosts].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - getRecognitionPosts]:', err.message);
      }
    }

    // Fallback in-memory store
    return (store.recognitionPosts || []).map(p => ({
      ...p,
      is_liked: !!p.is_liked
    }));
  }

  public static async togglePostLike(postId: string, citizenId: string): Promise<{ is_liked: boolean; likes_count: number }> {
    if (isDbConnected() && this.isValidUUID(postId) && this.isValidUUID(citizenId)) {
      try {
        const check = await pool.query(
          'SELECT id FROM recognition_post_likes WHERE post_id = $1 AND citizen_id = $2',
          [postId, citizenId]
        );

        let isLiked = false;
        if (check.rows.length > 0) {
          await pool.query('DELETE FROM recognition_post_likes WHERE post_id = $1 AND citizen_id = $2', [postId, citizenId]);
          await pool.query('UPDATE community_recognition_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
          isLiked = false;
        } else {
          await pool.query('INSERT INTO recognition_post_likes (post_id, citizen_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, citizenId]);
          await pool.query('UPDATE community_recognition_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
          isLiked = true;
        }

        const countRes = await pool.query('SELECT likes_count FROM community_recognition_posts WHERE id = $1', [postId]);
        const likesCount = countRes.rows[0]?.likes_count || 0;
        const memPost = (store.recognitionPosts || []).find(p => p.id === postId);
        if (memPost) {
          memPost.is_liked = isLiked;
          memPost.likes_count = likesCount;
        }
        return { is_liked: isLiked, likes_count: likesCount };
      } catch (err: any) {
        console.error('[DB REPO ERROR - togglePostLike]:', err.message);
      }
    }

    // Fallback store
    const post = (store.recognitionPosts || []).find(p => p.id === postId);
    if (post) {
      post.is_liked = !post.is_liked;
      post.likes_count = post.is_liked ? (post.likes_count + 1) : Math.max(0, post.likes_count - 1);
      return { is_liked: post.is_liked, likes_count: post.likes_count };
    }
    return { is_liked: true, likes_count: 1 };
  }

  public static async addPostComment(postId: string, citizenId: string, citizenName: string, text: string): Promise<RecognitionComment | null> {
    if (isDbConnected() && this.isValidUUID(postId)) {
      try {
        const validCitizen = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
        const res = await pool.query(
          `INSERT INTO recognition_post_comments (post_id, citizen_id, citizen_name, citizen_role, comment_text)
           VALUES ($1, $2, $3, 'Verified User', $4)
           RETURNING *`,
          [postId, validCitizen, citizenName, text]
        );
        await pool.query(
          `UPDATE community_recognition_posts SET comments_count = comments_count + 1 WHERE id = $1`,
          [postId]
        );

        const row = res.rows[0];
        const createdComment: RecognitionComment = {
          id: row.id,
          post_id: row.post_id,
          citizen_id: row.citizen_id,
          citizen_name: row.citizen_name,
          citizen_role: row.citizen_role,
          comment_text: row.comment_text,
          created_at: row.created_at
        };
        const memPost = (store.recognitionPosts || []).find(p => p.id === postId);
        if (memPost) {
          if (!memPost.comments) memPost.comments = [];
          memPost.comments.push(createdComment);
          memPost.comments_count = memPost.comments.length;
        }
        return createdComment;
      } catch (err: any) {
        console.error('[DB REPO ERROR - addPostComment]:', err.message);
      }
    }

    // Fallback store
    const post = (store.recognitionPosts || []).find(p => p.id === postId);
    const newComment: RecognitionComment = {
      id: `com-${Date.now()}`,
      post_id: postId,
      citizen_id: citizenId,
      citizen_name: citizenName,
      citizen_role: 'Verified Citizen · Ward 3',
      comment_text: text,
      created_at: new Date().toISOString()
    };
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push(newComment);
      post.comments_count = post.comments.length;
    }
    return newComment;
  }

  public static async createRecognitionPost(data: {
    author_name: string;
    author_role: string;
    is_verified_nmc?: boolean;
    ward_number: number;
    ward_name: string;
    hero_name: string;
    hero_role: string;
    badge_title: string;
    title: string;
    description: string;
    achievement_stats: string;
    image_url: string;
    before_image_url?: string;
    after_image_url?: string;
    after_photos?: string[];
    participating_communities?: string[];
    drive_id?: string;
    volunteers_count?: number;
    points_awarded_citizen?: number;
    points_awarded_community?: number;
  }): Promise<CommunityRecognitionPost | null> {
    const isVerified = data.is_verified_nmc !== undefined ? data.is_verified_nmc : true;

    if (isDbConnected()) {
      try {
        const afterPhotosJson = data.after_photos ? JSON.stringify(data.after_photos) : null;
        let res: any;
        try {
          res = await pool.query(
            `INSERT INTO community_recognition_posts (
              author_name, author_role, is_verified_nmc, ward_number, ward_name,
              hero_name, hero_role, badge_title, title, description,
              achievement_stats, image_url, likes_count, comments_count,
              before_image_url, after_image_url, after_photos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, 0, $13, $14, $15)
            RETURNING *`,
            [
              data.author_name,
              data.author_role,
              isVerified,
              data.ward_number,
              data.ward_name,
              data.hero_name,
              data.hero_role,
              data.badge_title,
              data.title,
              data.description,
              data.achievement_stats,
              data.image_url,
              data.before_image_url || null,
              data.after_image_url || null,
              afterPhotosJson
            ]
          );
        } catch {
          // Fallback to base schema columns if optional photo columns haven't been migrated in DB
          res = await pool.query(
            `INSERT INTO community_recognition_posts (
              author_name, author_role, is_verified_nmc, ward_number, ward_name,
              hero_name, hero_role, badge_title, title, description,
              achievement_stats, image_url, likes_count, comments_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, 0)
            RETURNING *`,
            [
              data.author_name,
              data.author_role,
              isVerified,
              data.ward_number,
              data.ward_name,
              data.hero_name,
              data.hero_role,
              data.badge_title,
              data.title,
              data.description,
              data.achievement_stats,
              data.image_url
            ]
          );
        }
        const r = res.rows[0];
        const postObj: any = {
          id: r.id,
          author_name: r.author_name,
          author_role: r.author_role,
          author_avatar: r.author_avatar,
          is_verified_nmc: r.is_verified_nmc,
          ward_number: r.ward_number,
          ward_name: r.ward_name,
          hero_name: r.hero_name,
          hero_role: r.hero_role,
          badge_title: r.badge_title,
          title: r.title,
          description: r.description,
          achievement_stats: r.achievement_stats,
          image_url: r.image_url,
          before_image_url: r.before_image_url || data.before_image_url,
          after_image_url: r.after_image_url || data.after_image_url,
          after_photos: r.after_photos || data.after_photos,
          participating_communities: data.participating_communities,
          drive_id: data.drive_id,
          volunteers_count: data.volunteers_count,
          points_awarded_citizen: data.points_awarded_citizen,
          points_awarded_community: data.points_awarded_community,
          likes_count: r.likes_count,
          comments_count: r.comments_count,
          is_liked: false,
          created_at: r.created_at,
          comments: []
        };
        if (!store.recognitionPosts) store.recognitionPosts = [];
        store.recognitionPosts.unshift(postObj);
        return postObj;
      } catch (err: any) {
        console.error('[DB REPO ERROR - createRecognitionPost]:', err.message);
      }
    }

    // Fallback store
    const newPost: CommunityRecognitionPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author_name: data.author_name,
      author_role: data.author_role,
      author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
      is_verified_nmc: isVerified,
      ward_number: data.ward_number,
      ward_name: data.ward_name,
      hero_name: data.hero_name,
      hero_role: data.hero_role,
      badge_title: data.badge_title,
      title: data.title,
      description: data.description,
      achievement_stats: data.achievement_stats,
      image_url: data.image_url,
      before_image_url: data.before_image_url,
      after_image_url: data.after_image_url,
      after_photos: data.after_photos,
      participating_communities: data.participating_communities,
      drive_id: data.drive_id,
      volunteers_count: data.volunteers_count,
      points_awarded_citizen: data.points_awarded_citizen,
      points_awarded_community: data.points_awarded_community,
      likes_count: 1,
      comments_count: 0,
      is_liked: false,
      created_at: new Date().toISOString(),
      comments: []
    };
    if (!store.recognitionPosts) store.recognitionPosts = [];
    store.recognitionPosts.unshift(newPost);
    return newPost;
  }

  // =========================================================================
  // COMMUNITY HEAD DASHBOARD REPOSITORY METHODS
  // =========================================================================

  public static async getCommunityByUserId(userId: string): Promise<Community | null> {
    if (isDbConnected()) {
      try {
        let res = await pool.query(`
          SELECT c.*, COALESCE(p.full_name, c.head_name) as head_name
          FROM communities c
          LEFT JOIN profiles p ON p.id = c.created_by
          WHERE c.created_by = $1 OR c.id = $1 OR c.id IN (SELECT community_id FROM community_members WHERE user_id = $1)
          ORDER BY (c.created_by = $1) DESC
          LIMIT 1
        `, [this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000099']);

        if (res.rows.length === 0 && (!userId || userId === 'c0000000-0000-0000-0000-000000000099')) {
          // Fallback to primary community for default demo evaluator seed only
          res = await pool.query(`
            SELECT c.*, p.full_name as head_name
            FROM communities c
            LEFT JOIN profiles p ON p.id = c.created_by
            WHERE c.id = 'b0000000-0000-0000-0000-000000000001'
            LIMIT 1
          `);
        }

        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            community_name: r.community_name,
            organisation_type: r.organisation_type,
            registration_number: r.registration_number,
            description: r.description,
            logo_path: r.logo_path,
            address: r.address,
            locality: r.locality,
            ward_id: r.ward_id,
            ward_number: r.ward_number,
            ward_name: r.ward_name,
            contact_email: r.contact_email,
            contact_phone: r.contact_phone,
            verification_status: r.verification_status,
            verification_comments: r.verification_comments,
            verified_by: r.verified_by,
            verified_at: r.verified_at,
            created_by: r.created_by,
            head_name: r.head_name || 'Community Leader',
            created_at: r.created_at,
            updated_at: r.updated_at
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getCommunityByUserId]:', err.message);
      }
    }

    const fromStore = (store.communities || []).find(c => c.user_id === userId || c.id === userId || c.created_by === userId);
    if (fromStore) {
      return {
        id: fromStore.id,
        community_name: fromStore.community_name,
        organisation_type: fromStore.organisation_type || 'Resident Welfare Association',
        registration_number: fromStore.registration_number || `NMC-RWA-2026-${fromStore.ward_number || 3}`,
        description: fromStore.description || `${fromStore.community_name} citizen community organization`,
        logo_path: fromStore.logo_path || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=300&q=80',
        address: fromStore.address || 'Dudhiya Talao Road, Ward 3, Navsari',
        locality: fromStore.locality || 'Dudhiya Talao',
        ward_id: `ward-0${fromStore.ward_number || 3}`,
        ward_number: fromStore.ward_number || 3,
        ward_name: fromStore.ward_name || 'Ward 3 - Dudhiya Talao',
        contact_email: fromStore.email,
        contact_phone: fromStore.phone,
        verification_status: 'verified',
        created_by: fromStore.user_id || userId,
        head_name: fromStore.head_name || 'Community Leader',
        created_at: fromStore.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    if (!userId || userId === 'c0000000-0000-0000-0000-000000000099') {
      return {
        id: 'b0000000-0000-0000-0000-000000000001',
        community_name: 'Navsari Green Warriors RWA',
        organisation_type: 'Resident Welfare Association',
        registration_number: 'NMC-RWA-2024-042',
        description: 'Citizen-led community coalition dedicated to lakefront conservation, zero-waste segregation and local ward hygiene in Dudhiya Talao and surrounding localities.',
        logo_path: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=300&q=80',
        address: 'Green Warriors Office, Lakeview Arcade, Dudhiya Talao',
        locality: 'Dudhiya Talao Ward 3',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao & Ashapuri',
        contact_email: 'contact@navsarigreen.org',
        contact_phone: '+919825100099',
        verification_status: 'verified',
        created_by: 'c0000000-0000-0000-0000-000000000099',
        head_name: 'Rajesh Varma',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return null;
  }

  public static async updateCommunity(id: string, data: Partial<Community>): Promise<Community | null> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        const res = await pool.query(`
          UPDATE communities
          SET community_name = COALESCE($1, community_name),
              organisation_type = COALESCE($2, organisation_type),
              registration_number = COALESCE($3, registration_number),
              description = COALESCE($4, description),
              address = COALESCE($5, address),
              locality = COALESCE($6, locality),
              contact_email = COALESCE($7, contact_email),
              contact_phone = COALESCE($8, contact_phone),
              updated_at = NOW()
          WHERE id = $9
          RETURNING *
        `, [
          data.community_name || null,
          data.organisation_type || null,
          data.registration_number || null,
          data.description || null,
          data.address || null,
          data.locality || null,
          data.contact_email || null,
          data.contact_phone || null,
          id
        ]);
        if (res.rows.length > 0) {
          return this.getCommunityByUserId(data.created_by || id);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateCommunity]:', err.message);
      }
    }
    return this.getCommunityByUserId(id);
  }

  public static async getCommunityActivities(communityId: string, params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ activities: CommunityActivity[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 15));
    const offset = (page - 1) * limit;

    if (isDbConnected()) {
      try {
        let query = `
          SELECT a.*, c.community_name,
            (SELECT COUNT(*) FROM activity_registrations r WHERE r.activity_id = a.id AND r.registration_status = 'registered') as registered_count,
            (SELECT COUNT(*) FROM activity_registrations r WHERE r.activity_id = a.id AND r.attendance_status = 'present') as verified_participants_count
          FROM community_activities a
          JOIN communities c ON c.id = a.community_id
          WHERE 1=1
        `;
        const values: any[] = [];
        let idx = 1;

        if (communityId && this.isValidUUID(communityId)) {
          query += ` AND a.community_id = $${idx++}`;
          values.push(communityId);
        }

        if (params.status && params.status !== 'all') {
          query += ` AND (a.approval_status = $${idx} OR a.registration_status = $${idx} OR a.event_status = $${idx})`;
          values.push(params.status);
          idx++;
        }

        if (params.search && params.search.trim()) {
          query += ` AND (a.title ILIKE $${idx} OR a.short_description ILIKE $${idx} OR a.address ILIKE $${idx})`;
          values.push(`%${params.search.trim()}%`);
          idx++;
        }

        // Count query
        const countQuery = `SELECT COUNT(*) FROM (${query}) q`;
        const countRes = await pool.query(countQuery, values);
        const total = parseInt(countRes.rows[0]?.count || '0');

        // Paginated records
        query += ` ORDER BY a.proposed_start_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        values.push(limit, offset);

        const res = await pool.query(query, values);
        const activities = res.rows.map(r => this.mapActivityRow(r));
        return { activities, total };
      } catch (err: any) {
        console.error('[DB REPO ERROR - getCommunityActivities]:', err.message);
      }
    }

    // Fallback store
    let acts = store.communityActivities || [];
    if (params.status && params.status !== 'all') {
      acts = acts.filter(a => a.approval_status === params.status || a.publication_status === params.status);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      acts = acts.filter(a => a.title.toLowerCase().includes(q) || a.short_description.toLowerCase().includes(q));
    }
    return { activities: acts, total: acts.length };
  }

  public static async getActivityById(id: string): Promise<CommunityActivity | null> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        const res = await pool.query(`
          SELECT a.*, c.community_name,
            (SELECT COUNT(*) FROM activity_registrations r WHERE r.activity_id = a.id AND r.registration_status = 'registered') as registered_count,
            (SELECT COUNT(*) FROM activity_registrations r WHERE r.activity_id = a.id AND r.attendance_status = 'present') as verified_participants_count
          FROM community_activities a
          JOIN communities c ON c.id = a.community_id
          WHERE a.id = $1
        `, [id]);
        if (res.rows.length > 0) {
          return this.mapActivityRow(res.rows[0]);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityById]:', err.message);
      }
    }
    return (store.communityActivities || []).find(a => a.id === id) || null;
  }

  public static async createCommunityActivity(data: Partial<CommunityActivity>): Promise<CommunityActivity> {
    if (isDbConnected()) {
      try {
        const query = `
          INSERT INTO community_activities (
            community_id, title, short_description, detailed_description,
            activity_category, objectives, expected_outcomes, instructions,
            equipment_requirements, safety_guidelines, faq,
            cover_image_path, ward_id, ward_number, ward_name, latitude, longitude,
            address, landmark, proposed_start_at, proposed_end_at,
            registration_open_at, registration_close_at,
            maximum_participants, minimum_participants, waiting_list_enabled,
            registration_requires_approval, publication_status, approval_status,
            registration_status, event_status, evidence_status, created_by
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23,
            $24, $25, $26,
            $27, $28, $29,
            $30, $31, $32, $33
          ) RETURNING *
        `;

        const values = [
          data.community_id || 'b0000000-0000-0000-0000-000000000001',
          data.title || 'Untitled Community Activity',
          data.short_description || 'Cleanliness drive in Navsari',
          data.detailed_description || 'Comprehensive cleanliness activity with volunteer participation.',
          data.activity_category || 'Public Area Cleaning',
          JSON.stringify(data.objectives || []),
          JSON.stringify(data.expected_outcomes || []),
          data.instructions || 'Report on time with safety gloves.',
          JSON.stringify(data.equipment_requirements || []),
          data.safety_guidelines || 'Follow team supervisor instructions.',
          JSON.stringify(data.faq || []),
          data.cover_image_path || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
          data.ward_id || 'ward-03',
          data.ward_number || 3,
          data.ward_name || 'Ward 3 - Dudhiya Talao',
          data.latitude || 20.9470,
          data.longitude || 72.9280,
          data.address || 'Navsari Municipal Area',
          data.landmark || null,
          data.proposed_start_at || new Date(Date.now() + 86400000).toISOString(),
          data.proposed_end_at || new Date(Date.now() + 86400000 + 10800000).toISOString(),
          data.registration_open_at || new Date().toISOString(),
          data.registration_close_at || new Date(Date.now() + 86400000).toISOString(),
          data.maximum_participants || 50,
          data.minimum_participants || 10,
          data.waiting_list_enabled ?? true,
          data.registration_requires_approval ?? false,
          data.publication_status || 'draft',
          data.approval_status || 'draft',
          data.registration_status || 'not_open',
          data.event_status || 'upcoming',
          data.evidence_status || 'not_submitted',
          this.isValidUUID(data.created_by) ? data.created_by : 'c0000000-0000-0000-0000-000000000099'
        ];

        const res = await pool.query(query, values);
        const mapped = this.mapActivityRow(res.rows[0]);
        if (!store.communityActivities) store.communityActivities = [];
        store.communityActivities.unshift(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB REPO ERROR - createCommunityActivity]:', err.message);
      }
    }

    // Fallback store
    const newAct: CommunityActivity = {
      id: `act-${Date.now()}`,
      community_id: data.community_id || 'b0000000-0000-0000-0000-000000000001',
      community_name: 'Navsari Green Warriors RWA',
      title: data.title || 'Community Cleanliness Drive',
      short_description: data.short_description || 'Cleanliness drive in Navsari',
      detailed_description: data.detailed_description || 'Volunteer-driven cleanup campaign.',
      activity_category: data.activity_category || 'Public Area Cleaning',
      objectives: data.objectives || ['Clean neighborhood', 'Promote hygiene'],
      expected_outcomes: data.expected_outcomes || ['Clean public area'],
      instructions: data.instructions || 'Bring gloves and meet at venue.',
      equipment_requirements: data.equipment_requirements || ['Gloves', 'Trash bags'],
      safety_guidelines: data.safety_guidelines || 'Stay safe and follow instructions.',
      faq: data.faq || [],
      cover_image_path: data.cover_image_path || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
      ward_id: data.ward_id || 'ward-03',
      ward_number: data.ward_number || 3,
      ward_name: data.ward_name || 'Ward 3 - Dudhiya Talao',
      latitude: data.latitude || 20.9315,
      longitude: data.longitude || 72.9280,
      address: data.address || 'Dudhiya Talao Road, Navsari',
      landmark: data.landmark || 'Near Garden Gate',
      proposed_start_at: data.proposed_start_at || new Date(Date.now() + 86400000).toISOString(),
      proposed_end_at: data.proposed_end_at || new Date(Date.now() + 97200000).toISOString(),
      registration_open_at: data.registration_open_at || new Date().toISOString(),
      registration_close_at: data.registration_close_at || new Date(Date.now() + 86400000).toISOString(),
      maximum_participants: data.maximum_participants || 50,
      minimum_participants: data.minimum_participants || 10,
      waiting_list_enabled: data.waiting_list_enabled ?? true,
      registration_requires_approval: data.registration_requires_approval ?? false,
      publication_status: (data.publication_status as any) || 'submitted',
      approval_status: (data.approval_status as any) || 'submitted',
      registration_status: (data.registration_status as any) || 'not_open',
      event_status: (data.event_status as any) || 'upcoming',
      evidence_status: (data.evidence_status as any) || 'not_submitted',
      registered_count: 0,
      verified_participants_count: 0,
      created_by: data.created_by || 'c0000000-0000-0000-0000-000000000099',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!store.communityActivities) store.communityActivities = [];
    store.communityActivities.unshift(newAct);

    // Also mirror to store.drives so Citizen dashboard sees it
    store.drives.unshift({
      id: newAct.id,
      title: newAct.title,
      description: newAct.short_description,
      ward_id: newAct.ward_id || 'ward-03',
      ward_name: newAct.ward_name,
      location_name: newAct.address,
      start_time: newAct.proposed_start_at,
      end_time: newAct.proposed_end_at,
      registration_deadline: newAct.registration_close_at,
      status: 'upcoming',
      max_volunteers: newAct.maximum_participants,
      registered_volunteers_count: 0,
      organiser_name: newAct.community_name || 'Navsari Green Warriors RWA',
      banner_url: newAct.cover_image_path,
      is_registered: false
    });

    return newAct;
  }

  public static async updateCommunityActivity(id: string, data: Partial<CommunityActivity>): Promise<CommunityActivity | null> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        const existing = await this.getActivityById(id);
        if (!existing) return null;

        const res = await pool.query(`
          UPDATE community_activities SET
            title = COALESCE($1, title),
            short_description = COALESCE($2, short_description),
            detailed_description = COALESCE($3, detailed_description),
            activity_category = COALESCE($4, activity_category),
            objectives = COALESCE($5, objectives),
            expected_outcomes = COALESCE($6, expected_outcomes),
            instructions = COALESCE($7, instructions),
            equipment_requirements = COALESCE($8, equipment_requirements),
            safety_guidelines = COALESCE($9, safety_guidelines),
            cover_image_path = COALESCE($10, cover_image_path),
            maximum_participants = COALESCE($11, maximum_participants),
            proposed_start_at = COALESCE($12, proposed_start_at),
            proposed_end_at = COALESCE($13, proposed_end_at),
            address = COALESCE($14, address),
            landmark = COALESCE($15, landmark),
            updated_at = NOW()
          WHERE id = $16
          RETURNING *
        `, [
          data.title || null,
          data.short_description || null,
          data.detailed_description || null,
          data.activity_category || null,
          data.objectives ? JSON.stringify(data.objectives) : null,
          data.expected_outcomes ? JSON.stringify(data.expected_outcomes) : null,
          data.instructions || null,
          data.equipment_requirements ? JSON.stringify(data.equipment_requirements) : null,
          data.safety_guidelines || null,
          data.cover_image_path || null,
          data.maximum_participants || null,
          data.proposed_start_at || null,
          data.proposed_end_at || null,
          data.address || null,
          data.landmark || null,
          id
        ]);

        return this.getActivityById(id);
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateCommunityActivity]:', err.message);
      }
    }
    return null;
  }

  public static async deleteCommunityActivity(id: string): Promise<boolean> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        const res = await pool.query('DELETE FROM community_activities WHERE id = $1', [id]);
        return (res.rowCount || 0) > 0;
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteCommunityActivity]:', err.message);
      }
    }
    return false;
  }

  public static async changeActivityStatus(
    id: string,
    updates: {
      publication_status?: string;
      approval_status?: string;
      registration_status?: string;
      event_status?: string;
      evidence_status?: string;
    },
    actorId: string,
    actionDesc: string
  ): Promise<CommunityActivity | null> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        const prev = await this.getActivityById(id);
        if (!prev) return null;

        const sets: string[] = ['updated_at = NOW()'];
        const values: any[] = [];
        let idx = 1;

        if (updates.publication_status) {
          sets.push(`publication_status = $${idx++}`);
          values.push(updates.publication_status);
        }
        if (updates.approval_status) {
          sets.push(`approval_status = $${idx++}`);
          values.push(updates.approval_status);
        }
        if (updates.registration_status) {
          sets.push(`registration_status = $${idx++}`);
          values.push(updates.registration_status);
        }
        if (updates.event_status) {
          sets.push(`event_status = $${idx++}`);
          values.push(updates.event_status);
        }
        if (updates.evidence_status) {
          sets.push(`evidence_status = $${idx++}`);
          values.push(updates.evidence_status);
        }

        values.push(id);
        const query = `UPDATE community_activities SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
        await pool.query(query, values);

        // Record log
        const validActor = this.isValidUUID(actorId) ? actorId : 'c0000000-0000-0000-0000-000000000099';
        await pool.query(`
          INSERT INTO community_activity_logs (activity_id, actor_id, action, previous_status, new_status, description)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          id,
          validActor,
          actionDesc,
          prev.approval_status,
          updates.approval_status || prev.approval_status,
          actionDesc
        ]).catch(() => {});

        return this.getActivityById(id);
      } catch (err: any) {
        console.error('[DB REPO ERROR - changeActivityStatus]:', err.message);
      }
    }
    return null;
  }

  public static async recordActivityApproval(
    activityId: string,
    reviewerId: string,
    reviewerRole: 'ward_officer' | 'nmc_admin',
    reviewStage: string,
    decision: 'approved' | 'rejected' | 'changes_requested',
    comments: string
  ): Promise<ActivityApprovalLog> {
    const validReviewer = this.isValidUUID(reviewerId) ? reviewerId : 'w0000000-0000-0000-0000-000000000003';
    let newStatus = 'ward_approved';
    if (reviewerRole === 'nmc_admin') {
      newStatus = decision === 'approved' ? 'nmc_admin_approved' : decision === 'rejected' ? 'rejected' : 'changes_requested';
    } else {
      newStatus = decision === 'approved' ? 'ward_approved' : decision === 'rejected' ? 'rejected' : 'changes_requested';
    }

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO community_activity_approval_logs (activity_id, reviewer_id, reviewer_role, review_stage, decision, comments)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [activityId, validReviewer, reviewerRole, reviewStage, decision, comments]);

        await this.changeActivityStatus(
          activityId,
          { approval_status: newStatus },
          validReviewer,
          `Official review by ${reviewerRole}: ${decision.toUpperCase()}`
        );

        const r = res.rows[0];
        return {
          id: r.id,
          activity_id: r.activity_id,
          reviewer_id: r.reviewer_id,
          reviewer_role: r.reviewer_role,
          review_stage: r.review_stage,
          decision: r.decision,
          comments: r.comments,
          created_at: r.created_at
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - recordActivityApproval]:', err.message);
      }
    }

    // Fallback store update
    const act = (store.communityActivities || []).find(a => a.id === activityId);
    if (act) {
      act.approval_status = (newStatus as any);
      act.publication_status = (newStatus === 'ward_approved' || newStatus === 'nmc_admin_approved') ? 'published' : 'draft';
      act.registration_status = (newStatus === 'ward_approved' || newStatus === 'nmc_admin_approved') ? 'open' : 'not_open';
    }
    const drv = (store.drives || []).find(d => d.id === activityId);
    if (drv) {
      drv.status = 'upcoming';
    }

    return {
      id: `appr-${Date.now()}`,
      activity_id: activityId,
      reviewer_id: validReviewer,
      reviewer_role: reviewerRole,
      review_stage: reviewStage,
      decision,
      comments,
      created_at: new Date().toISOString()
    };
  }

  public static async getActivityApprovalLogs(activityId: string): Promise<ActivityApprovalLog[]> {
    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        const res = await pool.query(`
          SELECT l.*, p.full_name as reviewer_name
          FROM community_activity_approval_logs l
          LEFT JOIN profiles p ON p.id = l.reviewer_id
          WHERE l.activity_id = $1
          ORDER BY l.created_at ASC
        `, [activityId]);

        return res.rows.map(r => ({
          id: r.id,
          activity_id: r.activity_id,
          reviewer_id: r.reviewer_id,
          reviewer_name: r.reviewer_name || (r.reviewer_role === 'ward_officer' ? 'Ward Sanitary Officer' : 'NMC Administrative Officer'),
          reviewer_role: r.reviewer_role,
          review_stage: r.review_stage,
          decision: r.decision,
          comments: r.comments,
          created_at: r.created_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityApprovalLogs]:', err.message);
      }
    }
    return [];
  }

  public static async getActivityRegistrations(activityId: string, params: {
    status?: string;
    attendance?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ registrations: ActivityRegistration[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(200, params.limit || 20));
    const offset = (page - 1) * limit;

    const mergedMap = new Map<string, ActivityRegistration>();

    if (isDbConnected()) {
      try {
        // 1. Check activity_registrations
        let query = `
          SELECT r.*,
                 COALESCE(p.full_name, 'Citizen Volunteer') as citizen_name,
                 COALESCE(p.phone, '+91 98251 00001') as citizen_phone,
                 COALESCE(p.email, 'citizen@navsari.gov.in') as citizen_email,
                 COALESCE(a.title, 'Cleanliness Drive') as activity_title
          FROM activity_registrations r
          LEFT JOIN profiles p ON p.id = r.citizen_id
          LEFT JOIN community_activities a ON a.id = r.activity_id
          WHERE 1=1
        `;
        const values: any[] = [];
        let idx = 1;

        if (activityId && this.isValidUUID(activityId)) {
          query += ` AND r.activity_id = $${idx++}`;
          values.push(activityId);
        }

        const res = await pool.query(`${query} ORDER BY r.registered_at DESC`, values);
        for (const r of res.rows) {
          mergedMap.set(`${r.activity_id}_${r.citizen_id}`, {
            id: r.id,
            activity_id: r.activity_id,
            activity_title: r.activity_title,
            citizen_id: r.citizen_id,
            citizen_name: r.citizen_name,
            citizen_phone: r.citizen_phone,
            citizen_email: r.citizen_email,
            registration_number: r.registration_number,
            registration_status: r.registration_status,
            attendance_status: r.attendance_status || 'not_marked',
            registered_at: r.registered_at,
            cancelled_at: r.cancelled_at
          });
        }

        // 2. Also check drive_registrations (covers Ward Officer-created drives!)
        if (activityId && this.isValidUUID(activityId)) {
          const driveRegRes = await pool.query(`
            SELECT dr.*,
                   COALESCE(p.full_name, 'Citizen Volunteer') as citizen_name,
                   COALESCE(p.phone, '+91 98251 00001') as citizen_phone,
                   COALESCE(p.email, 'citizen@navsari.gov.in') as citizen_email,
                   COALESCE(cd.title, 'Cleanliness Drive') as activity_title
            FROM drive_registrations dr
            LEFT JOIN profiles p ON p.id = dr.citizen_id
            LEFT JOIN cleanliness_drives cd ON cd.id = dr.drive_id
            WHERE dr.drive_id = $1
            ORDER BY dr.registered_at DESC
          `, [activityId]).catch(() => ({ rows: [] as any[] }));

          for (const r of driveRegRes.rows) {
            const key = `${r.drive_id}_${r.citizen_id}`;
            if (!mergedMap.has(key)) {
              mergedMap.set(key, {
                id: r.id,
                activity_id: r.drive_id,
                activity_title: r.activity_title,
                citizen_id: r.citizen_id,
                citizen_name: r.citizen_name,
                citizen_phone: r.citizen_phone,
                citizen_email: r.citizen_email,
                community_id: r.community_id || undefined,
                community_name: r.community_name || undefined,
                registration_number: r.registration_number || `REG-DRV-${String(r.id).slice(0, 6).toUpperCase()}`,
                registration_status: r.registration_status || 'registered',
                attendance_status: r.attendance_status || 'not_marked',
                registered_at: r.registered_at
              });
            }
          }
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityRegistrations]:', err.message);
      }
    }

    // 3. Merge in-memory activityRegistrations & driveRegistrations (also enriching DB rows with geo-tag check-in metadata!)
    const memActRegs = (store.activityRegistrations || []).filter(r => !activityId || r.activity_id === activityId);
    for (const r of memActRegs) {
      const key = `${r.activity_id}_${r.citizen_id}`;
      const existing = mergedMap.get(key);
      if (existing) {
        existing.checkin_latitude = existing.checkin_latitude ?? r.checkin_latitude;
        existing.checkin_longitude = existing.checkin_longitude ?? r.checkin_longitude;
        existing.checkin_distance_meters = existing.checkin_distance_meters ?? r.checkin_distance_meters;
        existing.checkin_at = existing.checkin_at ?? r.checkin_at;
        existing.community_id = existing.community_id || r.community_id;
        existing.community_name = existing.community_name || r.community_name;
        if (r.attendance_status === 'pending_verification' && existing.attendance_status === 'not_marked') {
          existing.attendance_status = 'pending_verification';
        }
      } else {
        const profile = (store.profiles || []).find(p => p.id === r.citizen_id);
        mergedMap.set(key, {
          ...r,
          citizen_name: r.citizen_name || profile?.full_name || 'Citizen Volunteer',
          citizen_phone: r.citizen_phone || profile?.phone || '+91 98251 00001',
          citizen_email: r.citizen_email || profile?.email || 'citizen@navsari.gov.in',
          registration_status: r.registration_status || 'registered',
          attendance_status: (r.attendance_status as any) || 'not_marked'
        });
      }
    }

    const memDriveRegs = (store.driveRegistrations || []).filter(r => !activityId || r.drive_id === activityId);
    for (const r of memDriveRegs) {
      const key = `${r.drive_id}_${r.citizen_id}`;
      const existing = mergedMap.get(key);
      if (existing) {
        existing.checkin_latitude = existing.checkin_latitude ?? r.checkin_latitude;
        existing.checkin_longitude = existing.checkin_longitude ?? r.checkin_longitude;
        existing.checkin_distance_meters = existing.checkin_distance_meters ?? r.checkin_distance_meters;
        existing.checkin_at = existing.checkin_at ?? r.checkin_at;
        existing.community_id = existing.community_id || r.community_id;
        existing.community_name = existing.community_name || r.community_name;
        if (r.attendance_status === 'pending_verification' && existing.attendance_status === 'not_marked') {
          existing.attendance_status = 'pending_verification';
        }
      } else {
        const profile = (store.profiles || []).find(p => p.id === r.citizen_id);
        const drive = (store.drives || []).find(d => d.id === r.drive_id);
        const prob = (store.communityProblems || []).find(p => p.id === r.drive_id);
        mergedMap.set(key, {
          id: r.id || `reg-drv-${r.drive_id.slice(0, 6)}-${r.citizen_id.slice(0, 6)}`,
          activity_id: r.drive_id,
          activity_title: drive?.title || prob?.title || 'Cleanliness Drive',
          citizen_id: r.citizen_id,
          citizen_name: r.citizen_name || profile?.full_name || 'Citizen Volunteer',
          citizen_phone: r.citizen_phone || profile?.phone || '+91 98251 00001',
          citizen_email: r.citizen_email || profile?.email || 'citizen@navsari.gov.in',
          community_id: r.community_id,
          community_name: r.community_name,
          registration_number: r.registration_number || `REG-NAV-${r.citizen_id.slice(-4).toUpperCase()}`,
          registration_status: r.registration_status || 'registered',
          attendance_status: r.attendance_status || 'not_marked',
          checkin_latitude: r.checkin_latitude,
          checkin_longitude: r.checkin_longitude,
          checkin_distance_meters: r.checkin_distance_meters,
          checkin_at: r.checkin_at,
          registered_at: r.registered_at
        });
      }
    }

    let allRegs = Array.from(mergedMap.values());
    if (params.status && params.status !== 'all') {
      allRegs = allRegs.filter(r => r.registration_status === params.status);
    }
    if (params.attendance && params.attendance !== 'all') {
      allRegs = allRegs.filter(r => r.attendance_status === params.attendance);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      allRegs = allRegs.filter(r =>
        (r.citizen_name || '').toLowerCase().includes(q) ||
        (r.registration_number || '').toLowerCase().includes(q) ||
        (r.citizen_phone || '').toLowerCase().includes(q) ||
        (r.community_name || '').toLowerCase().includes(q)
      );
    }

    // Prioritize pending geo-tagged check-ins at top so Community Heads see them immediately!
    allRegs.sort((a, b) => {
      const aPending = a.attendance_status === 'pending_verification' ? 1 : 0;
      const bPending = b.attendance_status === 'pending_verification' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime();
    });

    return {
      registrations: allRegs.slice(offset, offset + limit),
      total: allRegs.length
    };
  }

  public static async updateRegistrationAttendance(
    registrationId: string,
    attendanceStatus: string,
    registrationStatus?: string,
    actingCommunityId?: string
  ): Promise<{ success: boolean; error?: string; data?: ActivityRegistration | null }> {
    // Check community ownership if actingCommunityId is supplied (ensures in Joint Drives only the respective Community Head approves their citizens!)
    const memActRegCheck = (store.activityRegistrations || []).find(r => r.id === registrationId);
    const memDriveRegCheck = (store.driveRegistrations || []).find(
      r => r.id === registrationId || `reg-drv-${r.drive_id.slice(0, 6)}-${r.citizen_id.slice(0, 6)}` === registrationId
    );
    const regCommId = memActRegCheck?.community_id || memDriveRegCheck?.community_id;
    const regCommName = memActRegCheck?.community_name || memDriveRegCheck?.community_name;
    if (actingCommunityId && regCommId && regCommId !== actingCommunityId) {
      return {
        success: false,
        error: `Only the respective Community Head for "${regCommName || 'that community'}" can verify and mark final attendance for this volunteer.`
      };
    }

    let updatedRecord: ActivityRegistration | null = null;

    if (isDbConnected() && this.isValidUUID(registrationId)) {
      try {
        const sets: string[] = ['attendance_status = $1', 'updated_at = NOW()'];
        const values: any[] = [attendanceStatus];
        if (registrationStatus) {
          sets.push('registration_status = $2');
          values.push(registrationStatus);
        }
        values.push(registrationId);

        const res = await pool.query(`
          UPDATE activity_registrations
          SET ${sets.join(', ')}
          WHERE id = $${values.length}
          RETURNING *
        `, values);

        if (res.rows.length > 0) {
          const r = res.rows[0];
          updatedRecord = {
            id: r.id,
            activity_id: r.activity_id,
            citizen_id: r.citizen_id,
            registration_number: r.registration_number,
            registration_status: r.registration_status,
            attendance_status: r.attendance_status,
            registered_at: r.registered_at,
            cancelled_at: r.cancelled_at
          };
        } else {
          const dRes = await pool.query(`
            UPDATE drive_registrations
            SET attendance_status = $1
            WHERE id = $2
            RETURNING *
          `, [attendanceStatus, registrationId]).catch(() => ({ rows: [] as any[] }));

          if (dRes.rows.length > 0) {
            const r = dRes.rows[0];
            updatedRecord = {
              id: r.id,
              activity_id: r.drive_id,
              citizen_id: r.citizen_id,
              community_id: r.community_id,
              community_name: r.community_name,
              registration_number: r.registration_number || `REG-DRV-${String(r.id).slice(0, 6).toUpperCase()}`,
              registration_status: r.registration_status || 'registered',
              attendance_status: r.attendance_status,
              registered_at: r.registered_at
            };
          }
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateRegistrationAttendance]:', err.message);
      }
    }

    // Sync / update in-memory store (activityRegistrations + driveRegistrations)
    if (memActRegCheck) {
      memActRegCheck.attendance_status = attendanceStatus as any;
      if (registrationStatus) memActRegCheck.registration_status = registrationStatus as any;
      updatedRecord = updatedRecord || { ...memActRegCheck };
    }

    if (memDriveRegCheck) {
      memDriveRegCheck.attendance_status = attendanceStatus as any;
      if (registrationStatus) memDriveRegCheck.registration_status = registrationStatus as any;
      if (!updatedRecord) {
        const profile = (store.profiles || []).find(p => p.id === memDriveRegCheck.citizen_id);
        updatedRecord = {
          id: memDriveRegCheck.id || registrationId,
          activity_id: memDriveRegCheck.drive_id,
          citizen_id: memDriveRegCheck.citizen_id,
          citizen_name: memDriveRegCheck.citizen_name || profile?.full_name || 'Citizen Volunteer',
          citizen_phone: memDriveRegCheck.citizen_phone || profile?.phone,
          community_id: memDriveRegCheck.community_id,
          community_name: memDriveRegCheck.community_name,
          registration_number: memDriveRegCheck.registration_number || 'REG-NAV-0001',
          registration_status: memDriveRegCheck.registration_status || 'registered',
          attendance_status: memDriveRegCheck.attendance_status || (attendanceStatus as any),
          registered_at: memDriveRegCheck.registered_at
        };
      }
    }

    // Notify citizen about their final attendance confirmation
    if (updatedRecord?.citizen_id) {
      const targetDriveId = updatedRecord.activity_id;
      const driveTitle =
        (store.drives || []).find(d => d.id === targetDriveId)?.title ||
        (store.communityProblems || []).find(p => p.id === targetDriveId)?.title ||
        (store.communityActivities || []).find(a => a.id === targetDriveId)?.title ||
        'Cleanliness Drive';

      if (attendanceStatus === 'present') {
        await this.createNotification(
          updatedRecord.citizen_id,
          `✓ Final Attendance Confirmed: ${driveTitle}`,
          `Your Community Head has verified your participation and marked you PRESENT for "${driveTitle}". You will receive your Official NMC Completion Certificate & Civic Points once the Ward Officer approves the drive completion!`,
          targetDriveId,
          'drive_reminder'
        );
      } else if (attendanceStatus === 'absent') {
        await this.createNotification(
          updatedRecord.citizen_id,
          `Attendance Updated (Absent): ${driveTitle}`,
          `Your Community Head marked your attendance as ABSENT for "${driveTitle}". If this is an error, please contact your community coordinator.`,
          targetDriveId,
          'drive_reminder'
        );
      }
    }

    return { success: true, data: updatedRecord };
  }

  // =========================================================================
  // CITIZEN QUESTIONS & AI SUGGESTIONS
  // =========================================================================

  public static async createActivityQuestion(
    activityId: string,
    communityId: string,
    citizenId: string,
    questionText: string,
    lang: string = 'en'
  ): Promise<ActivityQuestion> {
    const validCitizen = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    await this.ensureProfileExists(validCitizen, 'Citizen Volunteer', '+919876543210');

    const profile = (store.profiles || []).find(p => p.id === validCitizen || p.id === citizenId);
    const citizenName = profile?.full_name || 'Citizen Volunteer';
    const act = (store.communityActivities || []).find(a => a.id === activityId);
    const prob = (store.communityProblems || []).find(p => p.id === activityId);
    const drv = (store.drives || []).find(d => d.id === activityId);
    const activityTitle = act?.title || prob?.title || drv?.title || 'Cleanliness Drive';

    if (isDbConnected() && this.isValidUUID(activityId) && this.isValidUUID(communityId)) {
      try {
        const res = await pool.query(`
          INSERT INTO activity_questions (activity_id, community_id, citizen_id, question_text, question_language, status)
          VALUES ($1, $2, $3, $4, $5, 'ai_suggestion_pending')
          RETURNING *
        `, [activityId, communityId, validCitizen, questionText.trim(), lang]);

        const r = res.rows[0];
        const created: ActivityQuestion = {
          id: r.id,
          activity_id: r.activity_id,
          activity_title: activityTitle,
          community_id: r.community_id,
          citizen_id: r.citizen_id,
          citizen_name: citizenName,
          question_text: r.question_text,
          question_language: r.question_language,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
        if (!store.activityQuestions) store.activityQuestions = [];
        store.activityQuestions.unshift(created);
        return created;
      } catch (err: any) {
        console.error('[DB REPO ERROR - createActivityQuestion]:', err.message);
      }
    }

    const memQuestion: ActivityQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      activity_id: activityId,
      activity_title: activityTitle,
      community_id: communityId || 'comm-lead',
      citizen_id: validCitizen,
      citizen_name: citizenName,
      question_text: questionText.trim(),
      question_language: (lang as any) || 'en',
      status: 'ai_suggestion_pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!store.activityQuestions) store.activityQuestions = [];
    store.activityQuestions.unshift(memQuestion);
    return memQuestion;
  }

  public static async getActivityQuestions(communityId: string, params: {
    activityId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ questions: ActivityQuestion[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 25));
    const offset = (page - 1) * limit;

    const mergedMap = new Map<string, ActivityQuestion>();

    if (isDbConnected()) {
      try {
        let query = `
          SELECT q.*, COALESCE(p.full_name, 'Citizen Volunteer') as citizen_name,
            COALESCE(a.title, 'Cleanliness Drive') as activity_title,
            s.id as s_id, s.suggested_answer, s.answerability_status, s.supporting_information, s.missing_information,
            resp.id as r_id, resp.response_text, resp.created_at as answered_at, rp.full_name as responder_name
          FROM activity_questions q
          LEFT JOIN profiles p ON p.id = q.citizen_id
          LEFT JOIN community_activities a ON a.id = q.activity_id
          LEFT JOIN activity_ai_answer_suggestions s ON s.question_id = q.id
          LEFT JOIN activity_question_responses resp ON resp.question_id = q.id
          LEFT JOIN profiles rp ON rp.id = resp.responder_id
          WHERE 1=1
        `;
        const values: any[] = [];
        let idx = 1;

        if (params.activityId && this.isValidUUID(params.activityId)) {
          query += ` AND q.activity_id = $${idx++}`;
          values.push(params.activityId);
        } else if (communityId && this.isValidUUID(communityId)) {
          query += ` AND q.community_id = $${idx++}`;
          values.push(communityId);
        }

        query += ` ORDER BY q.created_at DESC`;

        const res = await pool.query(query, values);
        for (const r of res.rows) {
          mergedMap.set(r.id, {
            id: r.id,
            activity_id: r.activity_id,
            activity_title: r.activity_title,
            community_id: r.community_id,
            citizen_id: r.citizen_id,
            citizen_name: r.citizen_name,
            question_text: r.question_text,
            question_language: r.question_language,
            status: r.status,
            created_at: r.created_at,
            updated_at: r.updated_at,
            ...(r.r_id ? { response_text: r.response_text, answered_at: r.answered_at } : {}),
            ai_suggestion: r.s_id ? {
              id: r.s_id,
              question_id: r.id,
              suggested_answer: r.suggested_answer,
              answer_language: r.question_language,
              answerability_status: r.answerability_status || 'high_confidence',
              supporting_information: r.supporting_information || [],
              missing_information: r.missing_information || [],
              generation_status: 'ready',
              created_at: r.created_at
            } : undefined,
            response: r.r_id ? {
              id: r.r_id,
              question_id: r.id,
              suggestion_id: r.s_id,
              responder_id: r.citizen_id,
              responder_name: r.responder_name || 'Community Head',
              response_text: r.response_text,
              ai_assisted: true,
              created_at: r.answered_at
            } : undefined
          } as any);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityQuestions]:', err.message);
      }
    }

    // Merge in-memory questions (covers Ward Officer drives & in-memory mode)
    for (const q of (store.activityQuestions || [])) {
      if (params.activityId) {
        if (q.activity_id !== params.activityId) continue;
      } else if (communityId && q.community_id && q.community_id !== communityId) {
        // Also allow if this community is assigned to the problem/drive
        const prob = (store.communityProblems || []).find(p => p.id === q.activity_id);
        const isAssigned = prob?.assigned_communities?.some(ac => ac.community_id === communityId);
        if (!isAssigned) continue;
      }
      if (!mergedMap.has(q.id)) {
        mergedMap.set(q.id, q);
      }
    }

    let allQuestions = Array.from(mergedMap.values());
    if (params.status && params.status !== 'all') {
      allQuestions = allQuestions.filter(q => q.status === params.status);
    }
    if (params.search && params.search.trim()) {
      const s = params.search.trim().toLowerCase();
      allQuestions = allQuestions.filter(q =>
        (q.question_text || '').toLowerCase().includes(s) ||
        (q.activity_title || '').toLowerCase().includes(s) ||
        (q.citizen_name || '').toLowerCase().includes(s)
      );
    }

    allQuestions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      questions: allQuestions.slice(offset, offset + limit),
      total: allQuestions.length
    };
  }

  public static async getQuestionById(questionId: string): Promise<ActivityQuestion | null> {
    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        const res = await pool.query(`
          SELECT q.*, COALESCE(p.full_name, 'Citizen Volunteer') as citizen_name,
            COALESCE(a.title, 'Cleanliness Drive') as activity_title,
            s.id as s_id, s.suggested_answer, s.answerability_status, s.supporting_information, s.missing_information,
            resp.id as r_id, resp.response_text, resp.created_at as answered_at, rp.full_name as responder_name
          FROM activity_questions q
          LEFT JOIN profiles p ON p.id = q.citizen_id
          LEFT JOIN community_activities a ON a.id = q.activity_id
          LEFT JOIN activity_ai_answer_suggestions s ON s.question_id = q.id
          LEFT JOIN activity_question_responses resp ON resp.question_id = q.id
          LEFT JOIN profiles rp ON rp.id = resp.responder_id
          WHERE q.id = $1
        `, [questionId]);

        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            activity_id: r.activity_id,
            activity_title: r.activity_title,
            community_id: r.community_id,
            citizen_id: r.citizen_id,
            citizen_name: r.citizen_name,
            question_text: r.question_text,
            question_language: r.question_language,
            status: r.status,
            created_at: r.created_at,
            updated_at: r.updated_at,
            ai_suggestion: r.s_id ? {
              id: r.s_id,
              question_id: r.id,
              suggested_answer: r.suggested_answer,
              answer_language: r.question_language,
              answerability_status: r.answerability_status,
              supporting_information: r.supporting_information || [],
              missing_information: r.missing_information || [],
              generation_status: 'ready',
              created_at: r.created_at
            } : undefined,
            response: r.r_id ? {
              id: r.r_id,
              question_id: r.id,
              suggestion_id: r.s_id,
              responder_id: r.citizen_id,
              responder_name: r.responder_name,
              response_text: r.response_text,
              ai_assisted: true,
              created_at: r.answered_at
            } : undefined
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getQuestionById]:', err.message);
      }
    }

    const memQ = (store.activityQuestions || []).find(q => q.id === questionId);
    return memQ || null;
  }

  public static async saveAiAnswerSuggestion(
    questionId: string,
    suggestion: {
      suggested_answer: string;
      answer_language?: string;
      answerability_status?: string;
      supporting_information?: string[];
      missing_information?: string[];
    }
  ): Promise<ActivityAiSuggestion> {
    let savedSug: ActivityAiSuggestion | null = null;

    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        await pool.query(`DELETE FROM activity_ai_answer_suggestions WHERE question_id = $1`, [questionId]);
        const res = await pool.query(`
          INSERT INTO activity_ai_answer_suggestions (
            question_id, suggested_answer, answer_language, answerability_status,
            supporting_information, missing_information, generation_status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'ready')
          RETURNING *
        `, [
          questionId,
          suggestion.suggested_answer,
          suggestion.answer_language || 'en',
          suggestion.answerability_status || 'high_confidence',
          JSON.stringify(suggestion.supporting_information || []),
          JSON.stringify(suggestion.missing_information || [])
        ]);

        await pool.query(`
          UPDATE activity_questions SET status = 'ai_suggestion_ready', updated_at = NOW() WHERE id = $1
        `, [questionId]);

        const r = res.rows[0];
        savedSug = {
          id: r.id,
          question_id: r.question_id,
          suggested_answer: r.suggested_answer,
          answer_language: r.answer_language,
          answerability_status: r.answerability_status,
          supporting_information: r.supporting_information || [],
          missing_information: r.missing_information || [],
          generation_status: 'ready',
          created_at: r.created_at
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveAiAnswerSuggestion]:', err.message);
      }
    }

    if (!savedSug) {
      savedSug = {
        id: `sug-${Date.now()}`,
        question_id: questionId,
        suggested_answer: suggestion.suggested_answer,
        answer_language: suggestion.answer_language || 'en',
        answerability_status: (suggestion.answerability_status || 'high_confidence') as any,
        supporting_information: suggestion.supporting_information || [],
        missing_information: suggestion.missing_information || [],
        generation_status: 'ready',
        created_at: new Date().toISOString()
      };
    }

    const memQ = (store.activityQuestions || []).find(q => q.id === questionId);
    if (memQ) {
      memQ.ai_suggestion = savedSug;
      memQ.status = 'ai_suggestion_ready';
      memQ.updated_at = new Date().toISOString();
    }

    return savedSug;
  }

  public static async respondToQuestion(
    questionId: string,
    responderId: string,
    responseText: string,
    suggestionId?: string
  ): Promise<ActivityQuestionResponse> {
    const validResponder = this.isValidUUID(responderId) ? responderId : 'c0000000-0000-0000-0000-000000000099';
    let savedResp: ActivityQuestionResponse | null = null;

    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        const qRes = await pool.query(`
          SELECT q.*, COALESCE(a.title, 'Cleanliness Drive') as activity_title, COALESCE(p.full_name, 'Citizen') as citizen_name
          FROM activity_questions q
          LEFT JOIN community_activities a ON a.id = q.activity_id
          LEFT JOIN profiles p ON p.id = q.citizen_id
          WHERE q.id = $1
        `, [questionId]);

        if (qRes.rows.length > 0) {
          const q = qRes.rows[0];

          await pool.query(`DELETE FROM activity_question_responses WHERE question_id = $1`, [questionId]);
          const res = await pool.query(`
            INSERT INTO activity_question_responses (question_id, suggestion_id, responder_id, response_text, ai_assisted)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [
            questionId,
            suggestionId && this.isValidUUID(suggestionId) ? suggestionId : null,
            validResponder,
            responseText.trim(),
            Boolean(suggestionId)
          ]);

          await pool.query(`
            UPDATE activity_questions SET status = 'answered', updated_at = NOW() WHERE id = $1
          `, [questionId]);

          await pool.query(`
            INSERT INTO notifications (user_id, title, message, notification_type, reference_id, is_read)
            VALUES ($1, $2, $3, 'system_alert', $4, FALSE)
          `, [
            q.citizen_id,
            `Question Answered: ${q.activity_title}`,
            `The Community Head has answered your question regarding "${q.activity_title}": "${responseText.slice(0, 100)}..."`,
            q.activity_id
          ]).catch(() => {});

          const r = res.rows[0];
          savedResp = {
            id: r.id,
            question_id: r.question_id,
            suggestion_id: r.suggestion_id,
            responder_id: r.responder_id,
            response_text: r.response_text,
            ai_assisted: r.ai_assisted,
            created_at: r.created_at
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - respondToQuestion]:', err.message);
      }
    }

    if (!savedResp) {
      savedResp = {
        id: `resp-${Date.now()}`,
        question_id: questionId,
        suggestion_id: suggestionId,
        responder_id: validResponder,
        responder_name: 'Community Head',
        response_text: responseText.trim(),
        ai_assisted: Boolean(suggestionId),
        created_at: new Date().toISOString()
      };
    }

    // Update in-memory store question & notify citizen
    const memQ = (store.activityQuestions || []).find(q => q.id === questionId);
    if (memQ) {
      memQ.status = 'answered';
      memQ.response = savedResp;
      (memQ as any).response_text = savedResp.response_text;
      (memQ as any).answered_at = savedResp.created_at;
      memQ.updated_at = new Date().toISOString();

      if (!store.notifications) store.notifications = [];
      store.notifications.unshift({
        id: `notif-qa-${Date.now()}`,
        user_id: memQ.citizen_id,
        title: `Question Answered: ${memQ.activity_title || 'Cleanliness Drive'}`,
        message: `Community Head answered your question: "${savedResp.response_text.slice(0, 120)}"`,
        notification_type: 'system_alert',
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    return savedResp;
  }

  public static async updateQuestionStatus(questionId: string, status: string): Promise<boolean> {
    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        await pool.query('UPDATE activity_questions SET status = $1, updated_at = NOW() WHERE id = $2', [status, questionId]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateQuestionStatus]:', err.message);
      }
    }
    const memQ = (store.activityQuestions || []).find(q => q.id === questionId);
    if (memQ) {
      memQ.status = status as any;
      memQ.updated_at = new Date().toISOString();
      return true;
    }
    return true;
  }

  // =========================================================================
  // EVENT ANNOUNCEMENTS & TARGETED NOTIFICATIONS
  // =========================================================================

  public static async getActivityAnnouncements(communityId: string, activityId?: string): Promise<ActivityAnnouncement[]> {
    if (isDbConnected()) {
      try {
        let query = `
          SELECT an.*, a.title as activity_title
          FROM activity_announcements an
          JOIN community_activities a ON a.id = an.activity_id
          WHERE 1=1
        `;
        const values: any[] = [];
        let idx = 1;

        if (communityId && this.isValidUUID(communityId)) {
          query += ` AND an.community_id = $${idx++}`;
          values.push(communityId);
        }

        if (activityId && this.isValidUUID(activityId)) {
          query += ` AND an.activity_id = $${idx++}`;
          values.push(activityId);
        }

        query += ` ORDER BY an.created_at DESC`;
        const res = await pool.query(query, values);
        return res.rows.map(r => ({
          id: r.id,
          activity_id: r.activity_id,
          activity_title: r.activity_title,
          community_id: r.community_id,
          created_by: r.created_by,
          title: r.title,
          message: r.message,
          notification_category: r.notification_category,
          target_audience: r.target_audience,
          scheduled_at: r.scheduled_at,
          published_at: r.published_at,
          status: r.status,
          total_recipients: r.total_recipients,
          created_at: r.created_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityAnnouncements]:', err.message);
      }
    }
    return [];
  }

  public static async createActivityAnnouncement(data: {
    activity_id: string;
    community_id: string;
    created_by: string;
    title: string;
    message: string;
    notification_category?: string;
    target_audience?: string;
    scheduled_at?: string;
  }): Promise<ActivityAnnouncement> {
    const validCreator = this.isValidUUID(data.created_by) ? data.created_by : 'c0000000-0000-0000-0000-000000000099';

    if (isDbConnected()) {
      try {
        // Find recipient count for that specific event and target audience
        let targetFilter = "r.registration_status = 'registered'";
        if (data.target_audience === 'confirmed_participants') {
          targetFilter = "r.registration_status = 'registered'";
        } else if (data.target_audience === 'waitlisted') {
          targetFilter = "r.registration_status = 'waitlisted'";
        }

        const countRes = await pool.query(`
          SELECT COUNT(*) FROM activity_registrations r
          WHERE r.activity_id = $1 AND ${targetFilter}
        `, [data.activity_id]);
        const recipientCount = parseInt(countRes.rows[0]?.count || '0');

        const res = await pool.query(`
          INSERT INTO activity_announcements (
            activity_id, community_id, created_by, title, message,
            notification_category, target_audience, scheduled_at, published_at,
            status, total_recipients
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'sent', $9)
          RETURNING *
        `, [
          data.activity_id,
          data.community_id,
          validCreator,
          data.title.trim(),
          data.message.trim(),
          data.notification_category || 'General Announcement',
          data.target_audience || 'confirmed_participants',
          data.scheduled_at || null,
          recipientCount
        ]);

        const an = res.rows[0];

        // Fetch eligible citizens and dispatch notifications!
        const citizensRes = await pool.query(`
          SELECT r.id as reg_id, r.citizen_id
          FROM activity_registrations r
          WHERE r.activity_id = $1 AND ${targetFilter}
        `, [data.activity_id]);

        for (const cit of citizensRes.rows) {
          await pool.query(`
            INSERT INTO activity_announcement_recipients (announcement_id, citizen_id, registration_id, delivery_status)
            VALUES ($1, $2, $3, 'delivered')
            ON CONFLICT (announcement_id, citizen_id) DO NOTHING
          `, [an.id, cit.citizen_id, cit.reg_id]).catch(() => {});

          await pool.query(`
            INSERT INTO notifications (user_id, title, message, notification_type, reference_id, is_read)
            VALUES ($1, $2, $3, 'system_alert', $4, FALSE)
          `, [
            cit.citizen_id,
            `📢 ${data.title}`,
            data.message,
            data.activity_id
          ]).catch(() => {});
        }

        return {
          id: an.id,
          activity_id: an.activity_id,
          community_id: an.community_id,
          created_by: an.created_by,
          title: an.title,
          message: an.message,
          notification_category: an.notification_category,
          target_audience: an.target_audience,
          scheduled_at: an.scheduled_at,
          published_at: an.published_at,
          status: an.status,
          total_recipients: recipientCount,
          created_at: an.created_at
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - createActivityAnnouncement]:', err.message);
      }
    }

    return {
      id: `an-${Date.now()}`,
      activity_id: data.activity_id,
      community_id: data.community_id,
      created_by: validCreator,
      title: data.title,
      message: data.message,
      notification_category: data.notification_category || 'General Announcement',
      target_audience: (data.target_audience || 'confirmed_participants') as any,
      status: 'sent',
      total_recipients: 15,
      created_at: new Date().toISOString()
    };
  }

  // =========================================================================
  // EVENT EVIDENCE & APPROVAL TRACKING
  // =========================================================================

  public static async getActivityEvidence(activityId: string): Promise<ActivityEvidence[]> {
    const mergedMap = new Map<string, ActivityEvidence>();

    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        const res = await pool.query(`
          SELECT * FROM activity_evidence
          WHERE activity_id = $1
          ORDER BY created_at DESC
        `, [activityId]);

        for (const r of res.rows) {
          mergedMap.set(r.id, {
            id: r.id,
            activity_id: r.activity_id,
            uploaded_by: r.uploaded_by,
            evidence_type: r.evidence_type,
            stage: r.evidence_type,
            storage_path: r.storage_path,
            image_url: r.storage_path,
            caption: r.caption,
            description: r.description,
            latitude: r.latitude ? parseFloat(r.latitude) : undefined,
            longitude: r.longitude ? parseFloat(r.longitude) : undefined,
            image_hash: r.image_hash,
            evidence_version: r.evidence_version || 1,
            submission_status: r.submission_status,
            created_at: r.created_at
          });
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityEvidence]:', err.message);
      }
    }

    for (const ev of (store.activityEvidence || [])) {
      if (ev.activity_id === activityId && !mergedMap.has(ev.id)) {
        mergedMap.set(ev.id, {
          ...ev,
          stage: ev.stage || ev.evidence_type,
          image_url: ev.image_url || ev.storage_path
        });
      }
    }

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public static async createActivityEvidence(data: {
    activity_id: string;
    uploaded_by: string;
    evidence_type: 'before' | 'during' | 'after';
    storage_path: string;
    caption: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    image_hash?: string;
  }): Promise<ActivityEvidence> {
    const validUploader = this.isValidUUID(data.uploaded_by) ? data.uploaded_by : 'c0000000-0000-0000-0000-000000000099';
    let createdEv: ActivityEvidence | null = null;

    if (isDbConnected() && this.isValidUUID(data.activity_id)) {
      try {
        const res = await pool.query(`
          INSERT INTO activity_evidence (
            activity_id, uploaded_by, evidence_type, storage_path, caption, description, latitude, longitude, image_hash, submission_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
          RETURNING *
        `, [
          data.activity_id,
          validUploader,
          data.evidence_type,
          data.storage_path,
          data.caption.trim(),
          data.description || null,
          data.latitude || null,
          data.longitude || null,
          data.image_hash || null
        ]);

        const r = res.rows[0];
        createdEv = {
          id: r.id,
          activity_id: r.activity_id,
          uploaded_by: r.uploaded_by,
          evidence_type: r.evidence_type,
          stage: r.evidence_type,
          storage_path: r.storage_path,
          image_url: r.storage_path,
          caption: r.caption,
          description: r.description,
          latitude: r.latitude ? parseFloat(r.latitude) : undefined,
          longitude: r.longitude ? parseFloat(r.longitude) : undefined,
          image_hash: r.image_hash,
          evidence_version: r.evidence_version || 1,
          submission_status: r.submission_status,
          created_at: r.created_at
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - createActivityEvidence]:', err.message);
      }
    }

    if (!createdEv) {
      createdEv = {
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        activity_id: data.activity_id,
        uploaded_by: validUploader,
        evidence_type: data.evidence_type,
        stage: data.evidence_type,
        storage_path: data.storage_path,
        image_url: data.storage_path,
        caption: data.caption.trim(),
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        image_hash: data.image_hash,
        evidence_version: 1,
        submission_status: 'draft',
        created_at: new Date().toISOString()
      };
    }

    if (!store.activityEvidence) store.activityEvidence = [];
    store.activityEvidence.unshift(createdEv);
    return createdEv;
  }

  public static async submitActivityEvidence(activityId: string, submittedBy: string, notes?: string): Promise<boolean> {
    const validSubmitter = this.isValidUUID(submittedBy) ? submittedBy : 'c0000000-0000-0000-0000-000000000099';

    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        await pool.query(`
          UPDATE activity_evidence SET submission_status = 'submitted' WHERE activity_id = $1
        `, [activityId]).catch(() => {});

        const actCheck = await pool.query(`SELECT id FROM community_activities WHERE id = $1`, [activityId]);
        if (actCheck.rows.length > 0) {
          await pool.query(`
            INSERT INTO activity_evidence_submissions (activity_id, submitted_by, submission_status)
            VALUES ($1, $2, 'under_ward_review')
          `, [activityId, validSubmitter]).catch(() => {});

          await this.changeActivityStatus(
            activityId,
            { evidence_status: 'submitted', event_status: 'completed' },
            validSubmitter,
            notes || 'Evidence submitted for official Ward Officer & NMC Admin verification'
          );
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - submitActivityEvidence]:', err.message);
      }
    }

    // Update in-memory evidence items
    for (const ev of (store.activityEvidence || [])) {
      if (ev.activity_id === activityId) {
        ev.submission_status = 'submitted';
      }
    }

    // Update community_activities in memory if matching
    const memAct = (store.communityActivities || []).find(a => a.id === activityId);
    if (memAct) {
      memAct.evidence_status = 'submitted' as any;
      memAct.event_status = 'completed' as any;
      memAct.updated_at = new Date().toISOString();
    }

    // Update community_problems in memory if matching (Ward Officer-created drive!)
    const memProb = (store.communityProblems || []).find(p => p.id === activityId);
    if (memProb) {
      memProb.evidence_status = 'submitted';
      memProb.evidence_submitted_at = new Date().toISOString();
      memProb.status = 'in_progress';
      memProb.updated_at = new Date().toISOString();
      if (notes) {
        memProb.evidence_review_comments = notes;
      }
    }

    // Notify Ward Officer about completed work evidence review request
    const driveTitle = memAct?.title || memProb?.title || 'Cleanliness Drive';
    const wardNum = memAct?.ward_number || memProb?.ward_number || 3;
    const targetOfficerId = this.findWardOfficerUserId(wardNum);
    await this.createNotification(
      targetOfficerId,
      `Work Evidence Submitted for Review: ${driveTitle}`,
      `Community Head has uploaded completion evidence for "${driveTitle}" (Ward ${wardNum}) and requested your verification review.${notes ? ` Notes: ${notes}` : ''}`,
      activityId,
      'system_alert'
    );

    return true;
  }

  public static async reviewActivityEvidence(
    activityId: string,
    reviewerId: string,
    reviewerRole: 'ward_officer' | 'nmc_admin',
    decision: 'approved' | 'rejected' | 'changes_requested',
    comments: string
  ): Promise<boolean> {
    const validReviewer = this.isValidUUID(reviewerId) ? reviewerId : 'w0000000-0000-0000-0000-000000000003';
    const nextEvidenceStatus =
      decision === 'approved'
        ? (reviewerRole === 'nmc_admin' ? 'verified_complete' : 'verified_complete')
        : decision === 'rejected'
        ? 'rejected'
        : 'changes_requested';

    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        const actCheck = await pool.query(`SELECT id FROM community_activities WHERE id = $1`, [activityId]);
        if (actCheck.rows.length > 0) {
          await pool.query(`
            INSERT INTO activity_evidence_reviews (activity_id, reviewer_id, reviewer_role, decision, comments)
            VALUES ($1, $2, $3, $4, $5)
          `, [activityId, validReviewer, reviewerRole, decision, comments]).catch(() => {});

          await this.changeActivityStatus(
            activityId,
            { evidence_status: nextEvidenceStatus },
            validReviewer,
            `Evidence reviewed by ${reviewerRole}: ${decision.toUpperCase()}`
          );

          if (decision === 'approved') {
            await pool.query(`
              UPDATE activity_evidence SET submission_status = 'verified' WHERE activity_id = $1
            `, [activityId]).catch(() => {});
          }
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - reviewActivityEvidence]:', err.message);
      }
    }

    // Update in-memory evidence items
    for (const ev of (store.activityEvidence || [])) {
      if (ev.activity_id === activityId) {
        ev.submission_status = decision === 'approved' ? 'verified' : decision === 'rejected' ? 'rejected' : 'draft';
      }
    }

    // Update community_activities in memory
    const memAct = (store.communityActivities || []).find(a => a.id === activityId);
    if (memAct) {
      memAct.evidence_status = nextEvidenceStatus as any;
      if (decision === 'approved') {
        memAct.event_status = 'completed' as any;
      }
      memAct.updated_at = new Date().toISOString();
    }

    // Update community_problems in memory (Ward Officer-created drive)
    const memProb = (store.communityProblems || []).find(p => p.id === activityId);
    if (memProb) {
      memProb.evidence_status = nextEvidenceStatus as any;
      memProb.evidence_review_comments = comments;
      if (decision === 'approved') {
        memProb.status = 'resolved';
      }
      memProb.updated_at = new Date().toISOString();
    }

    // Update CleanlinessDrive status if completed & verified
    if (decision === 'approved') {
      const memDrive = (store.drives || []).find(d => d.id === activityId);
      if (memDrive) {
        memDrive.status = 'completed';
      }
    }

    // Notify Community Head(s)
    const driveTitle = memAct?.title || memProb?.title || 'Cleanliness Drive';
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift({
      id: `notif-ev-rev-${Date.now()}`,
      user_id: memAct?.created_by || 'c0000000-0000-0000-0000-000000000099',
      title: `Work Evidence ${decision === 'approved' ? 'Verified & Approved!' : decision === 'changes_requested' ? 'Changes Requested' : 'Rejected'}`,
      message: `Ward Officer reviewed completion evidence for "${driveTitle}": ${decision.toUpperCase()}.${comments ? ` Remarks: ${comments}` : ''}`,
      notification_type: 'system_alert',
      is_read: false,
      created_at: new Date().toISOString()
    });

    return true;
  }

  // =========================================================================
  // COMMUNITY HEAD DASHBOARD SUMMARY & METRICS
  // =========================================================================

  public static async getCommunityDashboardSummary(communityId: string): Promise<CommunityDashboardSummary> {
    const comm = await this.getCommunityByUserId(communityId);
    const validCommunityId = comm?.id || communityId;

    let stats = {
      total_activities_created: 0,
      activities_awaiting_approval: 0,
      approved_activities: 0,
      upcoming_activities: 0,
      completed_activities: 0,
      activities_awaiting_evidence: 0,
      total_citizen_registrations: 0,
      total_verified_participants: 0,
      unanswered_citizen_questions: 0
    };

    let upcomingActivities: CommunityActivity[] = [];
    let pendingEdits: CommunityActivity[] = [];
    let awaitingApproval: CommunityActivity[] = [];
    let unansweredQuestions: ActivityQuestion[] = [];
    let evidencePending: CommunityActivity[] = [];

    if (isDbConnected() && this.isValidUUID(validCommunityId)) {
      try {
        const [statsRes, actsRes, qsRes] = await Promise.all([
          pool.query(`
            SELECT
              COUNT(*) as total_acts,
              COUNT(*) FILTER (WHERE approval_status = 'ward_review' OR approval_status = 'nmc_admin_review' OR approval_status = 'submitted') as awaiting_approval,
              COUNT(*) FILTER (WHERE approval_status = 'nmc_admin_approved' OR approval_status = 'ward_approved') as approved,
              COUNT(*) FILTER (WHERE event_status = 'upcoming') as upcoming,
              COUNT(*) FILTER (WHERE event_status = 'completed') as completed,
              COUNT(*) FILTER (WHERE event_status = 'completed' AND evidence_status != 'verified_complete') as awaiting_evidence,
              (SELECT COUNT(*) FROM activity_registrations r JOIN community_activities ca ON ca.id = r.activity_id WHERE ca.community_id = $1) as total_regs,
              (SELECT COUNT(*) FROM activity_registrations r JOIN community_activities ca ON ca.id = r.activity_id WHERE ca.community_id = $1 AND r.attendance_status = 'present') as total_verified,
              (SELECT COUNT(*) FROM activity_questions q WHERE q.community_id = $1 AND q.status != 'answered' AND q.status != 'closed') as unanswered_qs
            FROM community_activities
            WHERE community_id = $1
          `, [validCommunityId]),
          pool.query(`
            SELECT a.*, c.community_name,
              (SELECT COUNT(*) FROM activity_registrations r WHERE r.activity_id = a.id AND r.registration_status = 'registered') as registered_count
            FROM community_activities a
            JOIN communities c ON c.id = a.community_id
            WHERE a.community_id = $1
            ORDER BY a.proposed_start_at DESC
          `, [validCommunityId]),
          pool.query(`
            SELECT q.*, a.title as activity_title, p.full_name as citizen_name
            FROM activity_questions q
            JOIN community_activities a ON a.id = q.activity_id
            JOIN profiles p ON p.id = q.citizen_id
            WHERE q.community_id = $1 AND q.status != 'answered' AND q.status != 'closed'
            ORDER BY q.created_at DESC
            LIMIT 5
          `, [validCommunityId])
        ]);

        const s = statsRes.rows[0];
        if (s) {
          stats = {
            total_activities_created: parseInt(s.total_acts || '0'),
            activities_awaiting_approval: parseInt(s.awaiting_approval || '0'),
            approved_activities: parseInt(s.approved || '0'),
            upcoming_activities: parseInt(s.upcoming || '0'),
            completed_activities: parseInt(s.completed || '0'),
            activities_awaiting_evidence: parseInt(s.awaiting_evidence || '0'),
            total_citizen_registrations: parseInt(s.total_regs || '0'),
            total_verified_participants: parseInt(s.total_verified || '0'),
            unanswered_citizen_questions: parseInt(s.unanswered_qs || '0')
          };
        }

        const allActs = actsRes.rows.map(r => this.mapActivityRow(r));
        upcomingActivities = allActs.filter(a => a.event_status === 'upcoming').slice(0, 4);
        pendingEdits = allActs.filter(a => a.approval_status === 'changes_requested');
        awaitingApproval = allActs.filter(a => a.approval_status === 'ward_review' || a.approval_status === 'nmc_admin_review');
        evidencePending = allActs.filter(a => a.event_status === 'completed' && a.evidence_status !== 'verified_complete');

        unansweredQuestions = qsRes.rows.map(r => ({
          id: r.id,
          activity_id: r.activity_id,
          activity_title: r.activity_title,
          community_id: r.community_id,
          citizen_id: r.citizen_id,
          citizen_name: r.citizen_name,
          question_text: r.question_text,
          question_language: r.question_language,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getCommunityDashboardSummary]:', err.message);
      }
    }

    const metrics = {
      total_activities: stats.total_activities_created,
      upcoming_activities: stats.upcoming_activities,
      completed_activities: stats.completed_activities,
      awaiting_evidence_activities: stats.activities_awaiting_evidence,
      total_registrations: stats.total_citizen_registrations,
      verified_participants: stats.total_verified_participants,
      volunteer_attendance_rate: stats.total_citizen_registrations > 0
        ? Math.round((stats.total_verified_participants / stats.total_citizen_registrations) * 1000) / 10
        : 0,
      unanswered_citizen_questions: stats.unanswered_citizen_questions
    };

    const effectiveComm = comm || {
      id: validCommunityId,
      community_name: 'Community Cleanliness Initiative',
      organisation_type: 'Resident Welfare Association',
      registration_number: 'NMC-RWA-2026-001',
      description: 'Citizen action group dedicated to civic cleanliness.',
      address: 'Navsari Civic Area',
      locality: 'Navsari',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      contact_phone: '+919825100000',
      contact_email: 'community@navsarimunicipal.gov.in',
      created_by: communityId,
      head_name: 'Community Leader',
      verification_status: 'verified',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return {
      community: effectiveComm,
      stats,
      metrics,
      upcoming_activities: upcomingActivities,
      pending_actions: {
        activities_requiring_edits: pendingEdits,
        activities_awaiting_approval: awaitingApproval,
        unanswered_questions: unansweredQuestions,
        evidence_pending: evidencePending
      },
      impact: {
        verified_activities_count: stats.completed_activities,
        verified_participants_count: stats.total_verified_participants,
        total_cleanliness_hours: stats.completed_activities * 3,
        monthly_trend: stats.completed_activities > 0 ? [
          { month: 'Oct 2026', activities: stats.completed_activities, volunteers: stats.total_verified_participants, waste_kg: stats.completed_activities * 120 }
        ] : [],
        ward_distribution: stats.total_activities_created > 0 ? [
          { ward_name: effectiveComm.ward_name || `Ward ${effectiveComm.ward_number || 3}`, count: stats.total_activities_created }
        ] : []
      }
    };
  }

  private static mapActivityRow(r: any): CommunityActivity {
    return {
      id: r.id,
      community_id: r.community_id,
      community_name: r.community_name,
      title: r.title,
      short_description: r.short_description,
      detailed_description: r.detailed_description,
      activity_category: r.activity_category,
      objectives: Array.isArray(r.objectives) ? r.objectives : (typeof r.objectives === 'string' ? JSON.parse(r.objectives) : []),
      expected_outcomes: Array.isArray(r.expected_outcomes) ? r.expected_outcomes : (typeof r.expected_outcomes === 'string' ? JSON.parse(r.expected_outcomes) : []),
      instructions: r.instructions,
      equipment_requirements: Array.isArray(r.equipment_requirements) ? r.equipment_requirements : (typeof r.equipment_requirements === 'string' ? JSON.parse(r.equipment_requirements) : []),
      safety_guidelines: r.safety_guidelines,
      faq: Array.isArray(r.faq) ? r.faq : (typeof r.faq === 'string' ? JSON.parse(r.faq) : []),
      cover_image_path: r.cover_image_path,
      ward_id: r.ward_id,
      ward_number: r.ward_number,
      ward_name: r.ward_name,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      address: r.address,
      landmark: r.landmark || undefined,
      proposed_start_at: r.proposed_start_at,
      proposed_end_at: r.proposed_end_at,
      registration_open_at: r.registration_open_at,
      registration_close_at: r.registration_close_at,
      maximum_participants: r.maximum_participants,
      minimum_participants: r.minimum_participants,
      waiting_list_enabled: r.waiting_list_enabled ?? true,
      registration_requires_approval: r.registration_requires_approval ?? false,
      publication_status: r.publication_status,
      approval_status: r.approval_status,
      registration_status: r.registration_status,
      event_status: r.event_status,
      evidence_status: r.evidence_status || 'not_submitted',
      registered_count: r.registered_count ? parseInt(r.registered_count) : 0,
      verified_participants_count: r.verified_participants_count ? parseInt(r.verified_participants_count) : 0,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  }

  // =========================================================================
  // HELPER: Map SQL Row to Complaint Type
  // =========================================================================

  private static mapComplaintRow(r: any): Complaint {
    return {
      id: r.id,
      complaint_number: r.complaint_number,
      citizen_id: r.citizen_id,
      citizen_name: r.citizen_name,
      category_id: r.category_id,
      category_name: r.category_name,
      location: {
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        address: r.address,
        landmark: r.landmark || undefined,
        ward_id: r.ward_id,
        ward_number: r.ward_number,
        ward_name: r.ward_name,
        assigned_officer_name: r.assigned_officer_name
      },
      description: r.description,
      original_language: r.original_language,
      image_url: r.image_url,
      resolved_image_url: r.resolved_image_url || undefined,
      confidence_score: parseFloat(r.confidence_score || '0.95'),
      ai_model_name: r.ai_model_name,
      ai_model_version: r.ai_model_version,
      status: r.status,
      priority: r.priority,
      is_urgent: r.is_urgent,
      is_duplicate: r.is_duplicate || false,
      upvotes_count: r.upvotes_count || 0,
      followers_count: r.followers_count || 0,
      submitted_at: r.submitted_at,
      resolved_at: r.resolved_at || undefined,
      updated_at: r.updated_at,
      activity_logs: []
    };
  }

  // =========================================================================
  // WORKER DASHBOARD & MUNICIPAL FIELD OPERATIONS
  // =========================================================================

  public static calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  public static async getWorkerProfileByUserId(userId: string): Promise<WorkerProfile | null> {
    if (isDbConnected() && this.isValidUUID(userId)) {
      try {
        const res = await pool.query(`
          SELECT wp.*, p.full_name, p.phone, p.email, p.avatar_url, p.address as user_address,
                 wd.designation_name, wd.designation_code,
                 COALESCE(
                   (SELECT json_agg(ws.skill_name)
                    FROM worker_profile_skills wps
                    JOIN worker_skills ws ON ws.id = wps.skill_id
                    WHERE wps.worker_id = wp.id),
                   '[]'::json
                 ) as skills
          FROM worker_profiles wp
          JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          WHERE wp.user_id = $1 OR wp.id = $1
        `, [userId]);

        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            user_id: r.user_id,
            worker_code: r.worker_code,
            full_name: r.full_name,
            phone: r.phone,
            email: r.email,
            avatar_url: r.avatar_url,
            primary_designation_id: r.primary_designation_id,
            designation_name: r.designation_name || 'Sanitation Worker',
            designation_code: r.designation_code || 'sanitation_worker',
            ward_id: r.ward_id,
            ward_number: r.ward_number || 3,
            ward_name: r.ward_name || 'Ward 3 - Dudhiya Talao',
            employment_status: r.employment_status || 'permanent',
            joining_date: r.joining_date ? r.joining_date.toISOString().split('T')[0] : '2024-01-15',
            experience_years: parseFloat(r.experience_years || '3.5'),
            availability_status: r.availability_status || 'available',
            emergency_contact_name: r.emergency_contact_name,
            emergency_contact_phone: r.emergency_contact_phone,
            language_preference: r.language_preference || 'gu',
            skills: Array.isArray(r.skills) ? r.skills : ['Drainage Desilting', 'Debris Clearing'],
            created_at: r.created_at,
            updated_at: r.updated_at
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkerProfileByUserId]:', err.message);
      }
    }

    // Resilient Fallback - check in-memory store for newly registered workers first
    const fromStore = (store.workers || []).find(w => w.user_id === userId || w.id === userId);
    if (fromStore) {
      return {
        id: fromStore.id,
        user_id: fromStore.user_id || userId,
        worker_code: fromStore.worker_code || 'NMC-WRK-099',
        full_name: fromStore.full_name,
        phone: fromStore.phone,
        email: fromStore.email || `${fromStore.full_name.toLowerCase().replace(/\s+/g, '.')}@navsarimunicipal.gov.in`,
        avatar_url: fromStore.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80',
        designation_name: fromStore.designation || 'Sanitation Worker',
        designation_code: fromStore.designation?.toLowerCase().replace(/\s+/g, '_') || 'sanitation_worker',
        ward_id: `ward-${String(fromStore.ward_number || 3).padStart(2, '0')}`,
        ward_number: fromStore.ward_number || 3,
        ward_name: fromStore.ward_name || `Ward ${fromStore.ward_number || 3}`,
        employment_status: 'permanent',
        joining_date: '2024-01-15',
        experience_years: fromStore.experience_years || 2.0,
        availability_status: fromStore.availability_status || 'available',
        emergency_contact_name: 'NMC Staff Operations',
        emergency_contact_phone: '+919825130003',
        language_preference: 'gu',
        skills: fromStore.skills || ['Litter Abatement', 'Bin Clearance'],
        created_at: fromStore.created_at || new Date().toISOString(),
        updated_at: fromStore.updated_at || new Date().toISOString()
      };
    }

    // Check profiles store for dynamically registered worker
    const userProfile = (store.profiles || []).find(p => p.id === userId || p.username === userId);
    if (userProfile && (userProfile.role === 'worker' || (userProfile as any).role === 'sanitation_worker')) {
      const wardNum = (userProfile as any).ward_number || 3;
      return {
        id: `wrk-${userProfile.id}`,
        user_id: userProfile.id,
        worker_code: userProfile.username?.startsWith('WRK') ? userProfile.username : `WRK-${userProfile.id.slice(0, 6)}`,
        full_name: userProfile.full_name,
        phone: userProfile.phone,
        email: userProfile.email || `${userProfile.full_name.toLowerCase().replace(/\s+/g, '.')}@navsarimunicipal.gov.in`,
        avatar_url: userProfile.avatar_url,
        designation_name: 'Sanitation Worker',
        designation_code: 'sanitation_worker',
        ward_id: `ward-${String(wardNum).padStart(2, '0')}`,
        ward_number: wardNum,
        ward_name: `Ward ${wardNum}`,
        employment_status: 'permanent',
        joining_date: userProfile.created_at ? userProfile.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        experience_years: 1.0,
        availability_status: 'available',
        emergency_contact_name: 'NMC Staff Operations',
        emergency_contact_phone: '+919825100000',
        language_preference: userProfile.preferred_language || 'gu',
        skills: ['Municipal Sanitation', 'Solid Waste Collection'],
        created_at: userProfile.created_at || new Date().toISOString()
      };
    }

    if (!userId || userId === 'f1000000-0000-0000-0000-000000000001') {
      return {
        id: 'f2000000-0000-0000-0000-000000000001',
        user_id: 'f1000000-0000-0000-0000-000000000001',
        worker_code: 'NMC-WRK-001',
        full_name: 'Kanti Solanki',
        phone: '+919825120001',
        email: 'kanti.solanki@navsarimunicipal.gov.in',
        avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80',
        designation_name: 'Drainage Cleaning Worker',
        designation_code: 'drainage_worker',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'permanent',
        joining_date: '2023-04-01',
        experience_years: 4.5,
        availability_status: 'on_duty',
        emergency_contact_name: 'Ramilaben Solanki (Wife)',
        emergency_contact_phone: '+919825199001',
        language_preference: 'gu',
        skills: ['Drainage Desilting', 'Equipment Operation', 'Culvert Flush'],
        created_at: new Date().toISOString()
      };
    }

    if (userId === 'f1000000-0000-0000-0000-000000000002') {
      return {
        id: 'f2000000-0000-0000-0000-000000000002',
        user_id: 'f1000000-0000-0000-0000-000000000002',
        worker_code: 'NMC-WRK-002',
        full_name: 'Suresh Vaghela',
        phone: '+919825120002',
        email: 'suresh.vaghela@navsarimunicipal.gov.in',
        avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
        designation_name: 'Sanitation Worker',
        designation_code: 'sanitation_worker',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'permanent',
        joining_date: '2023-04-01',
        experience_years: 2.0,
        availability_status: 'available',
        emergency_contact_name: 'Geetaben Vaghela (Wife)',
        emergency_contact_phone: '+919825199002',
        language_preference: 'gu',
        skills: ['Street Sweeping', 'Waste Collection'],
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  public static async getWorkerAssignments(workerId: string, filterStatus?: string): Promise<WorkAssignment[]> {
    let dbAssignments: WorkAssignment[] = [];
    if (isDbConnected()) {
      try {
        let query = `
          SELECT wa.*, wam.temporary_leader, wam.assignment_status as my_attendance_status,
                 (SELECT p.full_name
                  FROM work_assignment_members lm
                  JOIN worker_profiles lp ON lp.id = lm.worker_id
                  JOIN profiles p ON p.id = lp.user_id
                  WHERE lm.assignment_id = wa.id AND lm.temporary_leader = TRUE
                  LIMIT 1) as temporary_leader_name,
                 (SELECT lm.worker_id
                  FROM work_assignment_members lm
                  WHERE lm.assignment_id = wa.id AND lm.temporary_leader = TRUE
                  LIMIT 1) as temporary_leader_id,
                 EXISTS(SELECT 1 FROM work_evidence we WHERE we.assignment_id = wa.id AND we.evidence_type = 'before') as has_before_evidence,
                 EXISTS(SELECT 1 FROM work_evidence we WHERE we.assignment_id = wa.id AND we.evidence_type = 'after') as has_after_evidence
          FROM work_assignments wa
          JOIN work_assignment_members wam ON wam.assignment_id = wa.id
          WHERE (wam.worker_id = $1 OR wam.worker_id IN (SELECT id FROM worker_profiles WHERE user_id = $1) OR wam.worker_id IN (SELECT user_id FROM worker_profiles WHERE id = $1))
        `;
        const values: any[] = [workerId];
        if (filterStatus && filterStatus !== 'all') {
          query += ` AND wa.status = $2`;
          values.push(filterStatus);
        }
        query += ` ORDER BY wa.scheduled_date DESC, wa.scheduled_start_time ASC`;

        const res = await pool.query(query, values);

        dbAssignments = res.rows.map(r => ({
          id: r.id,
          task_code: r.task_code,
          title: r.title,
          description: r.description,
          category: r.category,
          priority: r.priority,
          ward_id: r.ward_id,
          ward_number: r.ward_number,
          ward_name: r.ward_name,
          location_name: r.location_name,
          address: r.address,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          scheduled_date: r.scheduled_date ? (r.scheduled_date instanceof Date ? r.scheduled_date.toISOString().split('T')[0] : String(r.scheduled_date)) : '2026-11-01',
          scheduled_start_time: r.scheduled_start_time ? (r.scheduled_start_time instanceof Date ? r.scheduled_start_time.toISOString() : String(r.scheduled_start_time)) : new Date().toISOString(),
          expected_end_time: r.expected_end_time ? (r.expected_end_time instanceof Date ? r.expected_end_time.toISOString() : String(r.expected_end_time)) : new Date().toISOString(),
          attendance_radius_meters: parseInt(r.attendance_radius_meters || '100', 10),
          evidence_radius_meters: parseInt(r.evidence_radius_meters || '150', 10),
          work_instructions: r.work_instructions,
          safety_instructions: r.safety_instructions,
          required_equipment: Array.isArray(r.required_equipment) ? r.required_equipment : [],
          emergency_contact_phone: r.emergency_contact_phone || '+919825110003',
          status: r.status,
          created_by: r.created_by,
          created_at: r.created_at,
          updated_at: r.updated_at,
          is_temporary_leader: Boolean(r.temporary_leader),
          temporary_leader_name: r.temporary_leader_name || (Boolean(r.temporary_leader) ? 'You (Temporary Leader)' : 'Kanti Solanki'),
          temporary_leader_id: r.temporary_leader_id,
          my_attendance_status: r.my_attendance_status,
          has_before_evidence: Boolean(r.has_before_evidence),
          has_after_evidence: Boolean(r.has_after_evidence)
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkerAssignments]:', err.message);
      }
    }

    // Also merge in-memory store so newly created tasks are never lost
    const allAssignments = store.workAssignments || [];
    const inMemoryMatches = allAssignments
      .filter(a => {
        const inTeam = (a.team_members || []).some(m => m.worker_id === workerId);
        const isLeader = a.temporary_leader_id === workerId;
        // Demo fallback for initial seed workers only
        if ((workerId === 'f2000000-0000-0000-0000-000000000001' || workerId === 'f2000000-0000-0000-0000-000000000002') && (a.team_members || []).length === 0) return true;
        return inTeam || isLeader;
      })
      .map(a => {
        const isLeader = a.temporary_leader_id === workerId || (a.team_members || []).some(m => m.worker_id === workerId && m.temporary_leader);
        return {
          ...a,
          is_temporary_leader: isLeader,
          temporary_leader_name: a.temporary_leader_name || (isLeader ? 'You (Temporary Leader)' : 'Team Leader'),
          my_attendance_status: a.my_attendance_status || 'assigned'
        };
      });

    // Deduplicate DB and store tasks
    const combined = [...dbAssignments];
    for (const mem of inMemoryMatches) {
      if (!combined.some(c => c.id === mem.id || (mem.task_code && c.task_code === mem.task_code))) {
        combined.push(mem);
      }
    }

    return combined;
  }

  public static async saveWorkAssignment(assignment: WorkAssignment, members: any[]): Promise<boolean> {
    const validAssignmentId = this.isValidUUID(assignment.id) ? assignment.id : randomUUID();
    assignment.id = validAssignmentId;

    if (isDbConnected()) {
      try {
        await pool.query(`
          INSERT INTO work_assignments (
            id, task_code, title, description, category, priority,
            ward_id, ward_number, ward_name, location_name, address,
            latitude, longitude, scheduled_date, scheduled_start_time,
            expected_end_time, attendance_radius_meters, evidence_radius_meters,
            work_instructions, safety_instructions, required_equipment,
            emergency_contact_phone, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18,
            $19, $20, $21,
            $22, $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            work_instructions = EXCLUDED.work_instructions,
            updated_at = CURRENT_TIMESTAMP
        `, [
          validAssignmentId,
          assignment.task_code || `TSK-${Date.now()}`,
          assignment.title,
          assignment.description || 'Assigned field sanitation task.',
          assignment.category || 'waste_collection',
          assignment.priority || 'high',
          assignment.ward_id || 'ward-03',
          assignment.ward_number || 3,
          assignment.ward_name || `Ward ${assignment.ward_number || 3}`,
          assignment.location_name || 'Navsari Work Area',
          assignment.address || 'Navsari Municipal Area',
          assignment.latitude || 20.9325,
          assignment.longitude || 72.9275,
          assignment.scheduled_date || new Date().toISOString().split('T')[0],
          assignment.scheduled_start_time || new Date().toISOString(),
          assignment.expected_end_time || assignment.deadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          assignment.attendance_radius_meters || 100,
          assignment.evidence_radius_meters || 150,
          assignment.work_instructions || 'Clean up assigned civic location.',
          assignment.safety_instructions || 'Wear boots, gloves, and reflective jacket.',
          JSON.stringify(assignment.required_equipment || ['Broom', 'Shovel', 'Gloves']),
          assignment.emergency_contact_phone || '+919825130003',
          assignment.status || 'assigned'
        ]);

        for (const m of members) {
          const rawWorkerId = m.id || m.worker_id;
          if (!rawWorkerId) continue;
          
          let resolvedWorkerId = rawWorkerId;
          const checkWp = await pool.query(`SELECT id FROM worker_profiles WHERE id = $1 OR user_id = $1 LIMIT 1`, [rawWorkerId]);
          if (checkWp.rows.length > 0) {
            resolvedWorkerId = checkWp.rows[0].id;
          }

          const memberId = this.isValidUUID(m.member_id) ? m.member_id : randomUUID();
          await pool.query(`
            INSERT INTO work_assignment_members (
              id, assignment_id, worker_id, temporary_leader, assignment_status, assigned_at
            ) VALUES ($1, $2, $3, $4, 'assigned', CURRENT_TIMESTAMP)
            ON CONFLICT (assignment_id, worker_id) DO UPDATE SET
              temporary_leader = EXCLUDED.temporary_leader,
              assignment_status = EXCLUDED.assignment_status
          `, [
            memberId,
            validAssignmentId,
            resolvedWorkerId,
            Boolean(m.temporary_leader || m.is_leader || rawWorkerId === assignment.temporary_leader_id)
          ]);
        }

        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveWorkAssignment]:', err.message);
      }
    }
    return false;
  }

  public static async getAssignmentById(assignmentId: string, workerId?: string): Promise<WorkAssignment | null> {
    const assignments = await this.getWorkerAssignments(workerId || 'f2000000-0000-0000-0000-000000000001');
    const match = assignments.find(a => a.id === assignmentId);
    if (match) {
      match.team_members = await this.getAssignmentTeamMembers(assignmentId);
      return match;
    }
    return null;
  }

  public static async getAssignmentTeamMembers(assignmentId: string): Promise<WorkAssignmentMember[]> {
    if (isDbConnected() && this.isValidUUID(assignmentId)) {
      try {
        const res = await pool.query(`
          SELECT wam.*, wp.worker_code, p.full_name as worker_name, p.phone as worker_phone,
                 wd.designation_name,
                 wa_att.attendance_timestamp, wa_att.validation_status, wa_att.distance_from_assignment_meters
          FROM work_assignment_members wam
          JOIN worker_profiles wp ON wp.id = wam.worker_id
          JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          LEFT JOIN worker_attendance wa_att ON wa_att.assignment_id = wam.assignment_id AND wa_att.worker_id = wam.worker_id
          WHERE wam.assignment_id = $1
          ORDER BY wam.temporary_leader DESC, p.full_name ASC
        `, [assignmentId]);

        return res.rows.map(r => ({
          id: r.id,
          assignment_id: r.assignment_id,
          worker_id: r.worker_id,
          worker_name: r.worker_name,
          worker_code: r.worker_code,
          worker_phone: r.worker_phone,
          designation_name: r.designation_name || 'Sanitation Worker',
          temporary_leader: Boolean(r.temporary_leader),
          assignment_status: r.assignment_status,
          attendance_timestamp: r.attendance_timestamp ? r.attendance_timestamp.toISOString() : undefined,
          validation_status: r.validation_status,
          distance_from_assignment_meters: r.distance_from_assignment_meters ? parseFloat(r.distance_from_assignment_meters) : undefined
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getAssignmentTeamMembers]:', err.message);
      }
    }

    const matchedAssignment = (store.workAssignments || []).find(a => a.id === assignmentId);
    if (matchedAssignment && matchedAssignment.team_members && matchedAssignment.team_members.length > 0) {
      return matchedAssignment.team_members;
    }

    return [
      {
        id: 'b1',
        assignment_id: assignmentId,
        worker_id: 'f2000000-0000-0000-0000-000000000001',
        worker_name: 'Kanti Solanki',
        worker_code: 'NMC-WRK-001',
        worker_phone: '+919825120001',
        designation_name: 'Drainage Cleaning Worker',
        temporary_leader: true,
        assignment_status: 'present',
        attendance_timestamp: new Date(Date.now() - 3600000).toISOString(),
        validation_status: 'verified_match',
        distance_from_assignment_meters: 17.4
      },
      {
        id: 'b2',
        assignment_id: assignmentId,
        worker_id: 'f2000000-0000-0000-0000-000000000002',
        worker_name: 'Suresh Vaghela',
        worker_code: 'NMC-WRK-002',
        worker_phone: '+919825120002',
        designation_name: 'Sanitation Worker',
        temporary_leader: false,
        assignment_status: 'present',
        attendance_timestamp: new Date(Date.now() - 3400000).toISOString(),
        validation_status: 'verified_match',
        distance_from_assignment_meters: 10.2
      },
      {
        id: 'b3',
        assignment_id: assignmentId,
        worker_id: 'f2000000-0000-0000-0000-000000000005',
        worker_name: 'Mahesh Chauhan',
        worker_code: 'NMC-WRK-005',
        worker_phone: '+919825120005',
        designation_name: 'Equipment Operator',
        temporary_leader: false,
        assignment_status: 'present',
        attendance_timestamp: new Date(Date.now() - 3500000).toISOString(),
        validation_status: 'verified_match',
        distance_from_assignment_meters: 22.0
      }
    ];
  }

  public static async acknowledgeAssignment(assignmentId: string, workerId: string): Promise<boolean> {
    if (isDbConnected() && this.isValidUUID(assignmentId) && this.isValidUUID(workerId)) {
      try {
        await pool.query(`
          UPDATE work_assignment_members
          SET assignment_status = 'acknowledged'
          WHERE assignment_id = $1 AND worker_id = $2
        `, [assignmentId, workerId]);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - acknowledgeAssignment]:', err.message);
      }
    }
    return true;
  }

  public static async recordWorkerAttendance(
    assignmentId: string,
    workerId: string,
    lat: number,
    lon: number,
    accuracy: number
  ): Promise<{ success: boolean; attendance: WorkerAttendance; message: string }> {
    let taskLat = 20.9485;
    let taskLon = 72.9260;
    let geofenceRadius = 100;

    if (isDbConnected() && this.isValidUUID(assignmentId)) {
      try {
        const taskRes = await pool.query(`
          SELECT latitude, longitude, attendance_radius_meters, title
          FROM work_assignments WHERE id = $1
        `, [assignmentId]);
        if (taskRes.rows.length > 0) {
          taskLat = parseFloat(taskRes.rows[0].latitude);
          taskLon = parseFloat(taskRes.rows[0].longitude);
          geofenceRadius = parseInt(taskRes.rows[0].attendance_radius_meters || '100', 10);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - fetch task coords]:', err.message);
      }
    }

    // 1. Calculate distance from assigned work location
    const distanceMeters = this.calculateHaversineDistanceMeters(lat, lon, taskLat, taskLon);

    // 2. Validate location and GPS accuracy
    let validationStatus: 'verified_match' | 'location_mismatch' | 'poor_accuracy' = 'verified_match';
    let validationReason = `GPS location matched within ${distanceMeters}m (radius: ${geofenceRadius}m).`;

    if (accuracy > 65) {
      validationStatus = 'poor_accuracy';
      validationReason = `GPS accuracy of ${accuracy}m is too poor to verify presence. Please move to an open area and retry.`;
    } else if (distanceMeters > geofenceRadius) {
      validationStatus = 'location_mismatch';
      validationReason = `You are ${distanceMeters}m away from the assigned site. Allowed radius is ${geofenceRadius}m. Please reach the site before marking attendance.`;
    }

    const isMatch = validationStatus === 'verified_match';

    const attendanceRecord: WorkerAttendance = {
      id: `att-${Date.now()}`,
      assignment_id: assignmentId,
      worker_id: workerId,
      attendance_timestamp: new Date().toISOString(),
      latitude: lat,
      longitude: lon,
      gps_accuracy: accuracy,
      distance_from_assignment_meters: distanceMeters,
      geofence_radius_meters: geofenceRadius,
      validation_status: validationStatus,
      validation_reason: validationReason,
      attendance_method: 'gps',
      created_at: new Date().toISOString()
    };

    if (isDbConnected() && this.isValidUUID(assignmentId) && this.isValidUUID(workerId)) {
      try {
        const ins = await pool.query(`
          INSERT INTO worker_attendance (
            assignment_id, worker_id, attendance_timestamp, latitude, longitude,
            gps_accuracy, distance_from_assignment_meters, geofence_radius_meters,
            validation_status, validation_reason, attendance_method
          )
          VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, 'gps')
          RETURNING *
        `, [
          assignmentId, workerId, lat, lon, accuracy,
          distanceMeters, geofenceRadius, validationStatus, validationReason
        ]);

        if (ins.rows.length > 0) {
          attendanceRecord.id = ins.rows[0].id;
        }

        if (isMatch) {
          await pool.query(`
            UPDATE work_assignment_members
            SET assignment_status = 'present'
            WHERE assignment_id = $1 AND worker_id = $2
          `, [assignmentId, workerId]);

          await pool.query(`
            UPDATE work_assignments
            SET status = 'in_progress', updated_at = NOW()
            WHERE id = $1 AND status = 'assigned'
          `, [assignmentId]);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - recordWorkerAttendance]:', err.message);
      }
    }

    if (!(store as any).workerAttendances) {
      (store as any).workerAttendances = [];
    }
    (store as any).workerAttendances.unshift(attendanceRecord);

    return {
      success: isMatch,
      attendance: attendanceRecord,
      message: isMatch
        ? `Attendance verified successfully! You are at the assigned work site (${distanceMeters}m away).`
        : validationReason
    };
  }

  public static async createAttendanceException(
    assignmentId: string,
    workerId: string,
    reason: string,
    supportingEvidence?: string
  ): Promise<AttendanceException> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000001';
    const validWorker = this.isValidUUID(workerId) ? workerId : 'f2000000-0000-0000-0000-000000000001';

    const exception: AttendanceException = {
      id: `exc-${Date.now()}`,
      assignment_id: validAssignment,
      worker_id: validWorker,
      reason: reason.trim(),
      supporting_evidence: supportingEvidence,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO attendance_exceptions (assignment_id, worker_id, reason, supporting_evidence, status)
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING *
        `, [validAssignment, validWorker, reason.trim(), supportingEvidence || null]);

        if (res.rows.length > 0) {
          exception.id = res.rows[0].id;
        }

        // Notify Ward 3 Officer
        await pool.query(`
          INSERT INTO notifications (user_id, title, message, notification_type, reference_id, is_read)
          VALUES (
            'd0000000-0000-0000-0000-000000000003',
            'GPS Attendance Exception Request',
            'A worker has submitted a manual attendance verification request due to GPS discrepancy. Review required.',
            'system_alert',
            $1,
            FALSE
          )
        `, [validAssignment]).catch(() => {});
      } catch (err: any) {
        console.error('[DB REPO ERROR - createAttendanceException]:', err.message);
      }
    }

    return exception;
  }

  public static async getWorkerAttendanceHistory(workerId: string): Promise<WorkerAttendance[]> {
    if (isDbConnected() && this.isValidUUID(workerId)) {
      try {
        const res = await pool.query(`
          SELECT wa.*
          FROM worker_attendance wa
          WHERE wa.worker_id = $1
          ORDER BY wa.attendance_timestamp DESC
        `, [workerId]);

        return res.rows.map(r => ({
          id: r.id,
          assignment_id: r.assignment_id,
          worker_id: r.worker_id,
          attendance_timestamp: r.attendance_timestamp.toISOString(),
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          gps_accuracy: parseFloat(r.gps_accuracy || '10'),
          distance_from_assignment_meters: parseFloat(r.distance_from_assignment_meters),
          geofence_radius_meters: parseInt(r.geofence_radius_meters, 10),
          validation_status: r.validation_status,
          validation_reason: r.validation_reason,
          attendance_method: r.attendance_method,
          created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString()
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkerAttendanceHistory]:', err.message);
      }
    }

    if (!(store as any).workerAttendances) {
      (store as any).workerAttendances = [];
    }
    return ((store as any).workerAttendances as WorkerAttendance[]).filter(
      a => a.worker_id === workerId
    );
  }

  public static async addWorkProgress(
    assignmentId: string,
    workerId: string,
    description: string,
    stage = 'ongoing',
    imageUrl?: string
  ): Promise<WorkProgressUpdate> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000001';
    const validWorker = this.isValidUUID(workerId) ? workerId : 'f2000000-0000-0000-0000-000000000001';

    const update: WorkProgressUpdate = {
      id: `prog-${Date.now()}`,
      assignment_id: validAssignment,
      submitted_by: validWorker,
      progress_description: description.trim(),
      progress_stage: stage,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO work_progress_updates (assignment_id, submitted_by, progress_description, progress_stage, image_url)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [validAssignment, validWorker, description.trim(), stage, imageUrl || null]);

        if (res.rows.length > 0) {
          update.id = res.rows[0].id;
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - addWorkProgress]:', err.message);
      }
    }

    return update;
  }

  public static async getWorkEvidence(assignmentId: string): Promise<WorkEvidence[]> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          SELECT we.*, p.full_name as worker_name
          FROM work_evidence we
          JOIN worker_profiles wp ON wp.id = we.submitted_by
          JOIN profiles p ON p.id = wp.user_id
          WHERE we.assignment_id = $1
          ORDER BY we.created_at ASC
        `, [validAssignment]);

        return res.rows.map(r => ({
          id: r.id,
          assignment_id: r.assignment_id,
          submitted_by: r.submitted_by,
          worker_name: r.worker_name,
          evidence_type: r.evidence_type,
          storage_path: r.storage_path,
          description: r.description,
          latitude: r.latitude ? parseFloat(r.latitude) : undefined,
          longitude: r.longitude ? parseFloat(r.longitude) : undefined,
          gps_accuracy: r.gps_accuracy ? parseFloat(r.gps_accuracy) : undefined,
          distance_from_assignment_meters: r.distance_from_assignment_meters ? parseFloat(r.distance_from_assignment_meters) : undefined,
          location_validation_status: r.location_validation_status,
          device_capture_timestamp: r.device_capture_timestamp ? r.device_capture_timestamp.toISOString() : new Date().toISOString(),
          server_upload_timestamp: r.server_upload_timestamp ? r.server_upload_timestamp.toISOString() : new Date().toISOString(),
          ai_analysis_status: r.ai_analysis_status,
          ai_analysis_result: r.ai_analysis_result,
          review_status: r.review_status,
          review_comments: r.review_comments,
          created_at: r.created_at.toISOString()
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkEvidence]:', err.message);
      }
    }

    return [
      {
        id: 'e2000000-0000-0000-0000-000000000001',
        assignment_id: validAssignment,
        submitted_by: 'f2000000-0000-0000-0000-000000000001',
        worker_name: 'Kanti Solanki',
        evidence_type: 'before',
        storage_path: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        description: 'Heavy silt and plastic debris clogged across storm drain mouth.',
        latitude: 20.94852,
        longitude: 72.92603,
        gps_accuracy: 6.2,
        distance_from_assignment_meters: 4.2,
        location_validation_status: 'location_matched',
        device_capture_timestamp: new Date(Date.now() - 3600000).toISOString(),
        server_upload_timestamp: new Date(Date.now() - 3500000).toISOString(),
        review_status: 'verified',
        created_at: new Date(Date.now() - 3500000).toISOString()
      }
    ];
  }

  public static async addWorkEvidence(
    assignmentId: string,
    workerId: string,
    evidenceType: 'before' | 'during' | 'after',
    storagePath: string,
    description: string,
    lat?: number,
    lon?: number,
    accuracy?: number
  ): Promise<WorkEvidence> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000001';
    const validWorker = this.isValidUUID(workerId) ? workerId : 'f2000000-0000-0000-0000-000000000001';

    let distanceMeters: number | undefined = undefined;
    let locationStatus: 'location_matched' | 'location_mismatch' | 'manual_upload' = 'manual_upload';

    if (lat && lon) {
      let taskLat = 20.9485;
      let taskLon = 72.9260;
      let evidenceRadius = 150;

      if (isDbConnected()) {
        try {
          const taskRes = await pool.query('SELECT latitude, longitude, evidence_radius_meters FROM work_assignments WHERE id = $1', [validAssignment]);
          if (taskRes.rows.length > 0) {
            taskLat = parseFloat(taskRes.rows[0].latitude);
            taskLon = parseFloat(taskRes.rows[0].longitude);
            evidenceRadius = parseInt(taskRes.rows[0].evidence_radius_meters || '150', 10);
          }
        } catch {}
      }

      distanceMeters = this.calculateHaversineDistanceMeters(lat, lon, taskLat, taskLon);
      locationStatus = distanceMeters <= evidenceRadius ? 'location_matched' : 'location_mismatch';
    }

    const evidence: WorkEvidence = {
      id: `ev-${Date.now()}`,
      assignment_id: validAssignment,
      submitted_by: validWorker,
      evidence_type: evidenceType,
      storage_path: storagePath,
      description: description.trim(),
      latitude: lat,
      longitude: lon,
      gps_accuracy: accuracy,
      distance_from_assignment_meters: distanceMeters,
      location_validation_status: locationStatus,
      device_capture_timestamp: new Date().toISOString(),
      server_upload_timestamp: new Date().toISOString(),
      review_status: 'submitted',
      created_at: new Date().toISOString()
    };

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO work_evidence (
            assignment_id, submitted_by, evidence_type, storage_path, description,
            latitude, longitude, gps_accuracy, distance_from_assignment_meters, location_validation_status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          validAssignment, validWorker, evidenceType, storagePath, description.trim(),
          lat || null, lon || null, accuracy || null, distanceMeters || null, locationStatus
        ]);

        if (res.rows.length > 0) {
          evidence.id = res.rows[0].id;
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - addWorkEvidence]:', err.message);
      }
    }

    return evidence;
  }

  public static async isWorkerTemporaryLeader(assignmentId: string, workerId: string): Promise<boolean> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000001';
    const validWorker = this.isValidUUID(workerId) ? workerId : 'f2000000-0000-0000-0000-000000000001';

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          SELECT temporary_leader
          FROM work_assignment_members
          WHERE assignment_id = $1 AND worker_id = $2
        `, [validAssignment, validWorker]);

        if (res.rows.length > 0) {
          return Boolean(res.rows[0].temporary_leader);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - isWorkerTemporaryLeader]:', err.message);
      }
    }

    // Check dynamically created assignments in store
    const assignment = (store.workAssignments || []).find(a => a.id === validAssignment || a.id === assignmentId);
    if (assignment) {
      if (assignment.temporary_leader_id === validWorker) return true;
      if (assignment.temporary_leader_id && assignment.temporary_leader_id !== validWorker) return false;
    }

    // Fallback: Kanti is leader for task 1 & 3; Suresh is leader for task 2
    if (validAssignment === 'a1000000-0000-0000-0000-000000000001' || validAssignment === 'a1000000-0000-0000-0000-000000000003') {
      return validWorker === 'f2000000-0000-0000-0000-000000000001';
    }
    if (validAssignment === 'a1000000-0000-0000-0000-000000000002') {
      return validWorker === 'f2000000-0000-0000-0000-000000000002';
    }
    return true;
  }

  public static async submitWorkCompletionReport(
    assignmentId: string,
    workerId: string,
    data: {
      completion_description: string;
      actual_start_time: string;
      actual_end_time: string;
      waste_quantity?: string;
      waste_disposal_destination?: string;
      equipment_used?: string[];
      issues_encountered?: string;
      pending_work?: string;
    }
  ): Promise<{ success: boolean; report?: WorkCompletionReport; error?: string }> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000001';
    const validWorker = this.isValidUUID(workerId) ? workerId : 'f2000000-0000-0000-0000-000000000001';

    // 1. Strict Authorization Rule: Verify authenticated worker is the temporary Team Leader for THIS task!
    const isLeader = await this.isWorkerTemporaryLeader(validAssignment, validWorker);
    if (!isLeader) {
      return {
        success: false,
        error: 'Permission Denied: Only the assigned Temporary Team Leader can submit the consolidated task completion report.'
      };
    }

    const report: WorkCompletionReport = {
      id: `rep-${Date.now()}`,
      assignment_id: validAssignment,
      submitted_by: validWorker,
      completion_description: data.completion_description.trim(),
      actual_start_time: data.actual_start_time,
      actual_end_time: data.actual_end_time,
      waste_quantity: data.waste_quantity || 'Unmeasured / Standard Load',
      waste_disposal_destination: data.waste_disposal_destination || 'Navsari Municipal Solid Waste Processing Plant, Junathana',
      equipment_used: data.equipment_used || [],
      issues_encountered: data.issues_encountered,
      pending_work: data.pending_work,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO work_completion_reports (
            assignment_id, submitted_by, completion_description, actual_start_time,
            actual_end_time, waste_quantity, waste_disposal_destination, equipment_used,
            issues_encountered, pending_work, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted')
          ON CONFLICT (assignment_id) DO UPDATE SET
            completion_description = EXCLUDED.completion_description,
            actual_start_time = EXCLUDED.actual_start_time,
            actual_end_time = EXCLUDED.actual_end_time,
            waste_quantity = EXCLUDED.waste_quantity,
            waste_disposal_destination = EXCLUDED.waste_disposal_destination,
            equipment_used = EXCLUDED.equipment_used,
            issues_encountered = EXCLUDED.issues_encountered,
            pending_work = EXCLUDED.pending_work,
            status = 'submitted',
            submitted_at = NOW()
          RETURNING *
        `, [
          validAssignment, validWorker, data.completion_description.trim(),
          data.actual_start_time, data.actual_end_time,
          data.waste_quantity || 'Standard Municipal Load',
          data.waste_disposal_destination || 'Navsari Municipal Solid Waste Processing Plant, Junathana',
          JSON.stringify(data.equipment_used || []),
          data.issues_encountered || null,
          data.pending_work || null
        ]);

        if (res.rows.length > 0) {
          report.id = res.rows[0].id;
        }

        // Update task status to completion_submitted
        await pool.query(`
          UPDATE work_assignments
          SET status = 'completion_submitted', updated_at = NOW()
          WHERE id = $1
        `, [validAssignment]);

        // In-app alert to Ward 3 Officer
        await pool.query(`
          INSERT INTO notifications (user_id, title, message, notification_type, reference_id, is_read)
          VALUES (
            'd0000000-0000-0000-0000-000000000003',
            'Task Completion Report Submitted',
            'Temporary Team Leader has submitted completion documentation with Before & After evidence for verification.',
            'system_alert',
            $1,
            FALSE
          )
        `, [validAssignment]).catch(() => {});
      } catch (err: any) {
        console.error('[DB REPO ERROR - submitWorkCompletionReport]:', err.message);
      }
    }

    return { success: true, report };
  }

  public static async verifyCompleteAssignment(assignmentOrComplaintId: string, categoryName?: string): Promise<void> {
    // 1. Update memory store
    (store.workAssignments || []).forEach(wa => {
      if (
        wa.id === assignmentOrComplaintId ||
        wa.task_code === assignmentOrComplaintId ||
        (categoryName && wa.title?.toLowerCase().includes(categoryName.toLowerCase()))
      ) {
        wa.status = 'verified_complete';
        (wa as any).verified_complete = true;
        wa.updated_at = new Date().toISOString();
      }
    });

    // 2. Update PostgreSQL database
    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE work_assignments
          SET status = 'verified_complete', updated_at = NOW()
          WHERE id = $1 OR task_code = $1 OR title ILIKE '%' || $2 || '%'
        `, [assignmentOrComplaintId, categoryName || '']);
      } catch (err: any) {
        console.error('[DB REPO ERROR - verifyCompleteAssignment]:', err.message);
      }
    }
  }

  public static async getWorkCompletionReport(assignmentId: string): Promise<WorkCompletionReport | null> {
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : 'a1000000-0000-0000-0000-000000000003';
    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          SELECT wcr.*, p.full_name as submitted_by_name, rev_p.full_name as reviewer_name, wa.title as assignment_title
          FROM work_completion_reports wcr
          JOIN work_assignments wa ON wa.id = wcr.assignment_id
          JOIN worker_profiles wp ON wp.id = wcr.submitted_by
          JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN profiles rev_p ON rev_p.id = wcr.reviewed_by
          WHERE wcr.assignment_id = $1
        `, [validAssignment]);

        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            assignment_id: r.assignment_id,
            assignment_title: r.assignment_title,
            submitted_by: r.submitted_by,
            submitted_by_name: r.submitted_by_name,
            completion_description: r.completion_description,
            actual_start_time: r.actual_start_time.toISOString(),
            actual_end_time: r.actual_end_time.toISOString(),
            waste_quantity: r.waste_quantity,
            waste_disposal_destination: r.waste_disposal_destination,
            equipment_used: Array.isArray(r.equipment_used) ? r.equipment_used : [],
            issues_encountered: r.issues_encountered,
            pending_work: r.pending_work,
            status: r.status,
            reviewed_by: r.reviewed_by,
            reviewer_name: r.reviewer_name,
            review_comments: r.review_comments,
            submitted_at: r.submitted_at.toISOString()
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkCompletionReport]:', err.message);
      }
    }

    return {
      id: 'r1',
      assignment_id: validAssignment,
      assignment_title: 'Ashapuri Temple Market Overflowing Bin Removal & Lime Powder Disinfection',
      submitted_by: 'f2000000-0000-0000-0000-000000000001',
      submitted_by_name: 'Kanti Solanki',
      completion_description: 'Successfully cleared festival waste overspill, washed cement apron with bleaching solution, and applied insecticidal lime boundary powder.',
      actual_start_time: new Date(Date.now() - 7200000).toISOString(),
      actual_end_time: new Date(Date.now() - 1800000).toISOString(),
      waste_quantity: 'Approx 420 kg (1 full dumper bin load)',
      waste_disposal_destination: 'Navsari Municipal Solid Waste Processing Plant, Junathana',
      equipment_used: ['1100L Hydraulic Dumper Bin', 'Pressure Wash Jet', '2 Bags Lime Powder', 'Safety Cones'],
      issues_encountered: 'Initial two-wheeler traffic congestion resolved with traffic police coordination.',
      pending_work: 'None. Site completely sanitized.',
      status: 'submitted',
      submitted_at: new Date(Date.now() - 1800000).toISOString()
    };
  }

  public static async getWorkerDashboardSummary(workerId: string): Promise<WorkerDashboardSummary> {
    const profile = await this.getWorkerProfileByUserId(workerId);
    const assignments = await this.getWorkerAssignments(profile?.id || workerId);

    const todayAssignments = assignments.filter(a => a.status !== 'verified_complete' && a.status !== 'closed');
    const upcomingAssignments = assignments.filter(a => a.status === 'assigned');
    const completedAssignments = assignments.filter(a => a.status === 'verified_complete' || a.status === 'completion_submitted');
    const inProgressAssignments = assignments.filter(a => a.status === 'in_progress');

    const isTemporaryLeaderToday = assignments.some(a => a.is_temporary_leader && a.status !== 'verified_complete' && a.status !== 'closed');

    const recentAttendance = await this.getWorkerAttendanceHistory(profile?.id || workerId);
    const attendanceStatus = recentAttendance.length > 0 && recentAttendance[0].validation_status === 'verified_match'
      ? 'Checked-in (GPS Verified)'
      : 'Attendance Pending';

    const onTimeRate = recentAttendance.length > 0
      ? Math.round((recentAttendance.filter(a => a.validation_status === 'verified_match').length / recentAttendance.length) * 100)
      : 0;

    const totalHistoricalTasks = completedAssignments.length + inProgressAssignments.length;
    const verifiedEvidenceRate = totalHistoricalTasks > 0
      ? Math.round((completedAssignments.length / totalHistoricalTasks) * 100)
      : 0;

    const dynamicTimeline: any[] = [];
    if (recentAttendance.length > 0) {
      recentAttendance.forEach((att, idx) => {
        dynamicTimeline.push({
          id: `t-att-${att.id || idx}`,
          timestamp: new Date(att.attendance_timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          title: att.validation_status === 'verified_match' ? 'GPS Attendance Verified' : 'Attendance Check Discrepancy',
          description: att.validation_reason || `Recorded distance: ${att.distance_from_assignment_meters}m`,
          stage: 'attendance',
          status: att.validation_status === 'verified_match' ? 'completed' : 'pending'
        });
      });
    }
    if (assignments.length > 0) {
      assignments.slice(0, 3).forEach((asgn, idx) => {
        dynamicTimeline.push({
          id: `t-asgn-${asgn.id || idx}`,
          timestamp: asgn.scheduled_date || 'Scheduled Shift',
          title: asgn.title,
          description: asgn.address || `Ward ${asgn.ward_number || 3}`,
          stage: asgn.status === 'verified_complete' ? 'completion' : 'execution',
          status: asgn.status === 'verified_complete' ? 'completed' : asgn.status === 'in_progress' ? 'in_progress' : 'pending'
        });
      });
    }

    return {
      worker: profile!,
      metrics: {
        today_tasks: todayAssignments.length,
        completed_tasks: completedAssignments.length,
        pending_tasks: upcomingAssignments.length,
        in_progress_tasks: inProgressAssignments.length,
        attendance_status: attendanceStatus,
        is_temporary_leader_today: isTemporaryLeaderToday,
        on_time_attendance_rate: onTimeRate,
        verified_evidence_rate: verifiedEvidenceRate
      },
      today_assignments: todayAssignments,
      upcoming_assignments: upcomingAssignments,
      recent_attendance: recentAttendance.slice(0, 5),
      timeline_events: dynamicTimeline
    };
  }

  public static async getWorkerDesignations(): Promise<WorkerDesignation[]> {
    if (isDbConnected()) {
      try {
        const res = await pool.query('SELECT * FROM worker_designations WHERE is_active = TRUE ORDER BY designation_name ASC');
        return res.rows;
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkerDesignations]:', err.message);
      }
    }

    return [
      { id: 'd1', designation_code: 'sanitation_worker', designation_name: 'Sanitation Worker', is_active: true },
      { id: 'd2', designation_code: 'street_cleaner', designation_name: 'Street Cleaning Worker', is_active: true },
      { id: 'd3', designation_code: 'waste_collector', designation_name: 'Waste Collection Worker', is_active: true },
      { id: 'd4', designation_code: 'vehicle_operator', designation_name: 'Garbage Vehicle Operator', is_active: true },
      { id: 'd5', designation_code: 'drainage_worker', designation_name: 'Drainage Cleaning Worker', is_active: true },
      { id: 'd6', designation_code: 'toilet_maintenance', designation_name: 'Public Toilet Maintenance Worker', is_active: true },
      { id: 'd7', designation_code: 'segregation_worker', designation_name: 'Waste Segregation Worker', is_active: true },
      { id: 'd8', designation_code: 'equipment_operator', designation_name: 'Equipment Operator', is_active: true }
    ];
  }

  public static async getWorkersDirectory(filters?: { ward_id?: string; designation_id?: string }): Promise<WorkerProfile[]> {
    if (isDbConnected()) {
      try {
        let query = `
          SELECT wp.*, p.full_name, p.phone, p.email, p.avatar_url,
                 wd.designation_name, wd.designation_code,
                 COALESCE(
                   (SELECT json_agg(ws.skill_name)
                    FROM worker_profile_skills wps
                    JOIN worker_skills ws ON ws.id = wps.skill_id
                    WHERE wps.worker_id = wp.id),
                   '[]'::json
                 ) as skills
          FROM worker_profiles wp
          JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          WHERE 1=1
        `;
        const values: any[] = [];
        if (filters?.ward_id) {
          values.push(filters.ward_id);
          query += ` AND wp.ward_id = $${values.length}`;
        }
        if (filters?.designation_id) {
          values.push(filters.designation_id);
          query += ` AND wp.primary_designation_id = $${values.length}`;
        }
        query += ` ORDER BY p.full_name ASC`;

        const res = await pool.query(query, values);
        return res.rows.map(r => ({
          id: r.id,
          user_id: r.user_id,
          worker_code: r.worker_code,
          full_name: r.full_name,
          phone: r.phone,
          email: r.email,
          avatar_url: r.avatar_url,
          primary_designation_id: r.primary_designation_id,
          designation_name: r.designation_name || 'Sanitation Worker',
          designation_code: r.designation_code || 'sanitation_worker',
          ward_id: r.ward_id,
          ward_number: r.ward_number || 3,
          ward_name: r.ward_name || 'Ward 3 - Dudhiya Talao',
          employment_status: r.employment_status || 'permanent',
          joining_date: r.joining_date ? r.joining_date.toISOString().split('T')[0] : '2024-01-15',
          experience_years: parseFloat(r.experience_years || '3.0'),
          availability_status: r.availability_status || 'available',
          emergency_contact_name: r.emergency_contact_name,
          emergency_contact_phone: r.emergency_contact_phone,
          language_preference: r.language_preference || 'gu',
          skills: Array.isArray(r.skills) ? r.skills : [],
          created_at: r.created_at,
          updated_at: r.updated_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkersDirectory]:', err.message);
      }
    }

    return [
      {
        id: 'f2000000-0000-0000-0000-000000000001',
        user_id: 'f1000000-0000-0000-0000-000000000001',
        worker_code: 'NMC-WRK-001',
        full_name: 'Kanti Solanki',
        phone: '+919825120001',
        designation_name: 'Drainage Cleaning Worker',
        designation_code: 'drainage_worker',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'permanent',
        joining_date: '2023-04-01',
        experience_years: 4.5,
        availability_status: 'on_duty',
        language_preference: 'gu',
        skills: ['Drainage Desilting', 'Equipment Operation']
      },
      {
        id: 'f2000000-0000-0000-0000-000000000002',
        user_id: 'f1000000-0000-0000-0000-000000000002',
        worker_code: 'NMC-WRK-002',
        full_name: 'Suresh Vaghela',
        phone: '+919825120002',
        designation_name: 'Sanitation Worker',
        designation_code: 'sanitation_worker',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'permanent',
        joining_date: '2024-02-15',
        experience_years: 2.0,
        availability_status: 'available',
        language_preference: 'gu',
        skills: ['Street Sweeping', 'Waste Collection']
      },
      {
        id: 'f2000000-0000-0000-0000-000000000003',
        user_id: 'f1000000-0000-0000-0000-000000000003',
        worker_code: 'NMC-WRK-003',
        full_name: 'Dinesh Rathod',
        phone: '+919825120003',
        designation_name: 'Waste Collection Worker',
        designation_code: 'waste_collector',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'contractual',
        joining_date: '2024-06-01',
        experience_years: 1.5,
        availability_status: 'available',
        language_preference: 'hi',
        skills: ['Waste Segregation']
      },
      {
        id: 'f2000000-0000-0000-0000-000000000004',
        user_id: 'f1000000-0000-0000-0000-000000000004',
        worker_code: 'NMC-WRK-004',
        full_name: 'Bhavna Parmar',
        phone: '+919825120004',
        designation_name: 'Public Toilet Maintenance Worker',
        designation_code: 'toilet_maintenance',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'permanent',
        joining_date: '2022-09-01',
        experience_years: 5.0,
        availability_status: 'available',
        language_preference: 'gu',
        skills: ['Chemical Disinfection']
      },
      {
        id: 'f2000000-0000-0000-0000-000000000005',
        user_id: 'f1000000-0000-0000-0000-000000000005',
        worker_code: 'NMC-WRK-005',
        full_name: 'Mahesh Chauhan',
        phone: '+919825120005',
        designation_name: 'Equipment Operator',
        designation_code: 'equipment_operator',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        employment_status: 'permanent',
        joining_date: '2021-11-15',
        experience_years: 6.0,
        availability_status: 'on_duty',
        language_preference: 'en',
        skills: ['Heavy Machinery', 'Suction Jetter Operation']
      }
    ];
  }

  // =========================================================================
  // WORKER, TEAM & COMMUNITY PERSISTENCE (POSTGRESQL FULL CRUD)
  // =========================================================================

  public static async initializeWorkerAndTeamTables(): Promise<void> {
    if (!isDbConnected()) {
      console.log('[DB REPO] DB offline, skipping initializeWorkerAndTeamTables');
      return;
    }
    try {
      console.log('[DB REPO] Initializing and verifying worker, team, and community tables...');

      // 1. Column enhancements
      await pool.query(`
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100);
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ward_number INTEGER DEFAULT 3;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'citizen';
        ALTER TABLE citizen_auth_profiles ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100);
        ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100);
        ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
        ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS attendance_today VARCHAR(150) DEFAULT 'Not Marked';
        ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS active_task_code VARCHAR(100);
      `);

      // 2. Ensure worker_teams table exists and has VARCHAR ids
      await pool.query(`
        CREATE TABLE IF NOT EXISTS worker_teams (
          id VARCHAR(100) PRIMARY KEY,
          team_name VARCHAR(150) NOT NULL,
          ward_number INTEGER DEFAULT 3,
          ward_name VARCHAR(150) DEFAULT 'Ward 3',
          temporary_leader_id VARCHAR(100),
          temporary_leader_name VARCHAR(150),
          worker_ids JSONB DEFAULT '[]'::jsonb,
          shift VARCHAR(50) DEFAULT 'Morning (06:00 - 14:00)',
          status VARCHAR(50) DEFAULT 'active',
          active_task_code VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE worker_teams ALTER COLUMN id TYPE VARCHAR(100);
        ALTER TABLE worker_teams ALTER COLUMN temporary_leader_id TYPE VARCHAR(100);
      `);

      // 3. Ensure communities enhancements
      await pool.query(`
        ALTER TABLE communities ALTER COLUMN created_by DROP NOT NULL;
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS head_name VARCHAR(150);
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS email VARCHAR(150);
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100);
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS active_drives_count INTEGER DEFAULT 0;
        ALTER TABLE community_activities ADD COLUMN IF NOT EXISTS linked_problem_id VARCHAR(100);

        CREATE TABLE IF NOT EXISTS community_problems (
          id VARCHAR(100) PRIMARY KEY,
          ward_number INT NOT NULL,
          ward_name VARCHAR(100),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          location_name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          latitude NUMERIC(10, 7) NOT NULL,
          longitude NUMERIC(10, 7) NOT NULL,
          action_plan TEXT NOT NULL,
          urgency VARCHAR(20) DEFAULT 'medium',
          estimated_volunteers_needed INT DEFAULT 15,
          suggested_equipment JSONB DEFAULT '[]'::jsonb,
          image_url TEXT,
          status VARCHAR(30) DEFAULT 'open',
          claimed_by_community_id VARCHAR(100),
          claimed_by_community_name VARCHAR(255),
          linked_activity_id VARCHAR(100),
          created_by VARCHAR(100),
          officer_name VARCHAR(100),
          drive_requests JSONB DEFAULT '[]'::jsonb,
          assigned_communities JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS drive_requests JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS assigned_communities JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS max_volunteers_per_community INTEGER DEFAULT 25;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS citizen_instructions TEXT;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS necessary_gears JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS meeting_point VARCHAR(255);
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS is_joint BOOLEAN DEFAULT FALSE;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS co_organisers JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS drive_type VARCHAR(20) DEFAULT 'single';
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS action_plan TEXT;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS suggested_equipment JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS max_volunteers_per_community INTEGER DEFAULT 25;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS citizen_instructions TEXT;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS necessary_gears JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS meeting_point VARCHAR(255);
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
        ALTER TABLE cleanliness_drives ADD COLUMN IF NOT EXISTS assigned_communities JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE drive_registrations ADD COLUMN IF NOT EXISTS community_id VARCHAR(100);
        ALTER TABLE drive_registrations ADD COLUMN IF NOT EXISTS community_name VARCHAR(255);
      `);

      // 4. Synchronize memory store from database on startup so state is 100% unified
      const workersFromDb = await this.getWorkersList();
      if (workersFromDb.length > 0) {
        store.workers = workersFromDb;
        console.log(`[DB REPO] Synchronized ${workersFromDb.length} workers from PostgreSQL into memory.`);
      }

      const teamsFromDb = await this.getTeamsList();
      if (teamsFromDb.length > 0) {
        store.teams = teamsFromDb;
        console.log(`[DB REPO] Synchronized ${teamsFromDb.length} teams from PostgreSQL into memory.`);
      }

      const commsFromDb = await this.getCommunitiesList();
      if (commsFromDb.length > 0) {
        store.communities = commsFromDb;
        console.log(`[DB REPO] Synchronized ${commsFromDb.length} communities from PostgreSQL into memory.`);
      }
    } catch (err: any) {
      console.error('[DB REPO ERROR - initializeWorkerAndTeamTables]:', err.message);
    }
  }

  public static async getWorkersList(filters?: { ward_number?: number; search?: string; availability?: string }): Promise<any[]> {
    if (isDbConnected()) {
      try {
        let sql = `
          SELECT wp.*, p.full_name, p.phone, p.email, p.avatar_url, p.address, p.locality,
                 COALESCE(wp.designation, wd.designation_name, 'Sanitation Worker') as designation_label,
                 COALESCE(wp.username, p.username, wp.worker_code) as worker_username,
                 COALESCE(wp.plain_password, p.plain_password, 'Worker@123') as worker_plain_password
          FROM worker_profiles wp
          JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          WHERE 1=1
        `;
        const values: any[] = [];

        if (filters?.ward_number) {
          values.push(filters.ward_number);
          sql += ` AND wp.ward_number = $${values.length}`;
        }
        if (filters?.availability && filters.availability !== 'all') {
          values.push(filters.availability);
          sql += ` AND wp.availability_status = $${values.length}`;
        }
        if (filters?.search && filters.search.trim()) {
          values.push(`%${filters.search.trim().toLowerCase()}%`);
          sql += ` AND (LOWER(p.full_name) LIKE $${values.length} OR LOWER(wp.worker_code) LIKE $${values.length} OR LOWER(COALESCE(wp.designation, '')) LIKE $${values.length})`;
        }

        sql += ` ORDER BY wp.created_at ASC`;
        const res = await pool.query(sql, values);

        return res.rows.map(r => {
          let parsedSkills: string[] = [];
          if (Array.isArray(r.skills)) {
            parsedSkills = r.skills;
          } else if (typeof r.skills === 'string') {
            try { parsedSkills = JSON.parse(r.skills); } catch { parsedSkills = [r.skills]; }
          } else {
            parsedSkills = ['Litter Abatement'];
          }

          return {
            id: r.id,
            user_id: r.user_id,
            worker_code: r.worker_code,
            username: r.worker_username,
            plain_password: r.worker_plain_password,
            full_name: r.full_name,
            phone: r.phone,
            email: r.email,
            designation: r.designation_label,
            primary_designation: r.designation_label,
            ward_number: r.ward_number || 3,
            ward_name: r.ward_name || `Ward ${r.ward_number || 3}`,
            availability_status: r.availability_status || 'available',
            active_task_code: r.active_task_code,
            experience_years: parseFloat(r.experience_years || '0'),
            skills: parsedSkills,
            attendance_today: r.attendance_today || 'Not Marked',
            avatar_url: r.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80',
            created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
        });
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkersList]:', err.message);
      }
    }

    // Fallback to in-memory store
    let workers = store.workers || [];
    if (filters?.availability && filters.availability !== 'all') {
      workers = workers.filter(w => w.availability_status === filters.availability);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      workers = workers.filter(w =>
        (w.full_name && w.full_name.toLowerCase().includes(q)) ||
        (w.worker_code && w.worker_code.toLowerCase().includes(q)) ||
        (w.designation && w.designation.toLowerCase().includes(q))
      );
    }
    return workers;
  }

  public static async saveWorkerProfile(worker: any, passwordHash?: string): Promise<any> {
    const validWorkerId = this.isValidUUID(worker.id) ? worker.id : randomUUID();
    let validUserId = this.isValidUUID(worker.user_id) ? worker.user_id : randomUUID();
    const workerPassword = worker.plain_password || 'Worker@123';
    const hash = passwordHash || await bcrypt.hash(workerPassword, 10);
    const workerCode = worker.worker_code || `WRK-2026-${Date.now().toString().slice(-3)}`;
    const effectiveUsername = worker.username || workerCode;

    if (isDbConnected()) {
      try {
        // 1. Check if profile exists with this phone
        const existingProfile = await pool.query(`SELECT id FROM profiles WHERE phone = $1`, [worker.phone]);
        if (existingProfile.rows.length > 0) {
          validUserId = existingProfile.rows[0].id;
        }

        // 2. Upsert profiles
        await pool.query(
          `INSERT INTO profiles (id, full_name, phone, username, plain_password, address, locality, ward_number, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'worker', TRUE)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             username = COALESCE(EXCLUDED.username, profiles.username),
             plain_password = COALESCE(EXCLUDED.plain_password, profiles.plain_password),
             ward_number = EXCLUDED.ward_number,
             updated_at = CURRENT_TIMESTAMP`,
          [
            validUserId,
            worker.full_name?.trim() || 'Municipal Worker',
            worker.phone?.trim(),
            effectiveUsername,
            workerPassword,
            worker.address || 'Navsari Municipal Staff Quarters',
            worker.locality || `Ward ${worker.ward_number || 3}`,
            worker.ward_number || 3
          ]
        );

        // 3. Upsert citizen_auth_profiles
        const authId = randomUUID();
        await pool.query(
          `INSERT INTO citizen_auth_profiles (id, user_id, mobile_number, password_hash, plain_password, mobile_verified, account_status)
           VALUES ($1, $2, $3, $4, $5, TRUE, 'active')
           ON CONFLICT (user_id) DO UPDATE SET
             mobile_number = EXCLUDED.mobile_number,
             password_hash = COALESCE(EXCLUDED.password_hash, citizen_auth_profiles.password_hash),
             plain_password = COALESCE(EXCLUDED.plain_password, citizen_auth_profiles.plain_password),
             updated_at = CURRENT_TIMESTAMP`,
          [
            authId,
            validUserId,
            worker.phone?.trim(),
            hash,
            workerPassword
          ]
        );

        // 4. Ensure user_roles
        await pool.query(
          `INSERT INTO user_roles (user_id, role)
           VALUES ($1, 'worker')
           ON CONFLICT (user_id, role) DO UPDATE SET role = 'worker'`,
          [validUserId]
        ).catch(() => {});

        // 5. Upsert worker_profiles
        const skillsJson = JSON.stringify(Array.isArray(worker.skills) ? worker.skills : [worker.skills || 'Litter Abatement']);
        await pool.query(
          `INSERT INTO worker_profiles (
             id, user_id, worker_code, username, plain_password, designation,
             ward_number, ward_name, availability_status, experience_years,
             skills, attendance_today, active_task_code
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (user_id) DO UPDATE SET
             worker_code = EXCLUDED.worker_code,
             username = EXCLUDED.username,
             plain_password = EXCLUDED.plain_password,
             designation = EXCLUDED.designation,
             ward_number = EXCLUDED.ward_number,
             ward_name = EXCLUDED.ward_name,
             availability_status = EXCLUDED.availability_status,
             experience_years = EXCLUDED.experience_years,
             skills = EXCLUDED.skills,
             attendance_today = EXCLUDED.attendance_today,
             active_task_code = EXCLUDED.active_task_code,
             updated_at = CURRENT_TIMESTAMP`,
          [
            validWorkerId,
            validUserId,
            workerCode,
            effectiveUsername,
            workerPassword,
            worker.designation?.trim() || 'Sanitation Worker',
            worker.ward_number || 3,
            worker.ward_name || `Ward ${worker.ward_number || 3}`,
            worker.availability_status || 'available',
            parseFloat(worker.experience_years || '0'),
            skillsJson,
            worker.attendance_today || 'Not Marked',
            worker.active_task_code || null
          ]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveWorkerProfile]:', err.message);
      }
    }

    const savedWorker = {
      ...worker,
      id: validWorkerId,
      user_id: validUserId,
      worker_code: workerCode,
      username: effectiveUsername,
      plain_password: workerPassword,
      created_at: new Date().toISOString()
    };

    return savedWorker;
  }

  public static async updateWorkerProfile(id: string, updates: any): Promise<any> {
    if (isDbConnected()) {
      try {
        const skillsJson = updates.skills ? JSON.stringify(Array.isArray(updates.skills) ? updates.skills : [updates.skills]) : undefined;
        
        let wpSql = `UPDATE worker_profiles SET updated_at = CURRENT_TIMESTAMP`;
        const wpVals: any[] = [];
        if (updates.designation) {
          wpVals.push(updates.designation.trim());
          wpSql += `, designation = $${wpVals.length}`;
        }
        if (updates.availability_status) {
          wpVals.push(updates.availability_status);
          wpSql += `, availability_status = $${wpVals.length}`;
        }
        if (skillsJson) {
          wpVals.push(skillsJson);
          wpSql += `, skills = $${wpVals.length}::jsonb`;
        }
        wpVals.push(id);
        wpSql += ` WHERE id = $${wpVals.length} RETURNING user_id`;
        const wpRes = await pool.query(wpSql, wpVals);

        const userId = wpRes.rows[0]?.user_id;

        if (userId && (updates.full_name || updates.phone)) {
          let pSql = `UPDATE profiles SET updated_at = CURRENT_TIMESTAMP`;
          const pVals: any[] = [];
          if (updates.full_name) {
            pVals.push(updates.full_name.trim());
            pSql += `, full_name = $${pVals.length}`;
          }
          if (updates.phone) {
            pVals.push(updates.phone.trim());
            pSql += `, phone = $${pVals.length}`;
          }
          pVals.push(userId);
          pSql += ` WHERE id = $${pVals.length}`;
          await pool.query(pSql, pVals);

          if (updates.phone) {
            await pool.query(
              `UPDATE citizen_auth_profiles SET mobile_number = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
              [updates.phone.trim(), userId]
            ).catch(() => {});
          }
        }
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateWorkerProfile]:', err.message);
      }
    }
    return false;
  }

  public static async deleteWorkerProfile(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        const res = await pool.query(`SELECT user_id FROM worker_profiles WHERE id = $1`, [id]);
        const userId = res.rows[0]?.user_id;

        await pool.query(`DELETE FROM worker_profiles WHERE id = $1`, [id]);

        const teams = await pool.query(`SELECT id, worker_ids FROM worker_teams`);
        for (const t of teams.rows) {
          let wIds = Array.isArray(t.worker_ids) ? t.worker_ids : (typeof t.worker_ids === 'string' ? JSON.parse(t.worker_ids) : []);
          if (wIds.includes(id)) {
            wIds = wIds.filter((w: string) => w !== id);
            await pool.query(`UPDATE worker_teams SET worker_ids = $1::jsonb WHERE id = $2`, [JSON.stringify(wIds), t.id]);
          }
        }

        if (userId) {
          await pool.query(`UPDATE profiles SET is_active = FALSE WHERE id = $1`, [userId]).catch(() => {});
        }
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteWorkerProfile]:', err.message);
      }
    }
    return false;
  }

  public static async getTeamsList(wardNumber?: number): Promise<any[]> {
    if (isDbConnected()) {
      try {
        let sql = `SELECT * FROM worker_teams WHERE 1=1`;
        const values: any[] = [];
        if (wardNumber) {
          values.push(wardNumber);
          sql += ` AND ward_number = $${values.length}`;
        }
        sql += ` ORDER BY created_at ASC`;
        const res = await pool.query(sql, values);
        return res.rows.map(r => {
          let parsedWorkerIds: string[] = [];
          if (Array.isArray(r.worker_ids)) {
            parsedWorkerIds = r.worker_ids;
          } else if (typeof r.worker_ids === 'string') {
            try { parsedWorkerIds = JSON.parse(r.worker_ids); } catch { parsedWorkerIds = []; }
          }
          return {
            id: r.id,
            team_name: r.team_name,
            ward_number: r.ward_number || 3,
            ward_name: r.ward_name || `Ward ${r.ward_number || 3}`,
            worker_ids: parsedWorkerIds,
            temporary_leader_id: r.temporary_leader_id,
            temporary_leader_name: r.temporary_leader_name,
            work_type: r.work_type || 'General Civic Sanitation Squad',
            shift: r.shift || 'Morning (06:00 - 14:00)',
            status: r.status || 'active',
            active_task_code: r.active_task_code,
            created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
        });
      } catch (err: any) {
        console.error('[DB REPO ERROR - getTeamsList]:', err.message);
      }
    }
    return store.teams || [];
  }

  public static async saveTeam(team: any): Promise<any> {
    if (isDbConnected()) {
      try {
        const teamId = team.id || `team-${Date.now()}`;
        const workerIdsJson = JSON.stringify(Array.isArray(team.worker_ids) ? team.worker_ids : []);
        await pool.query(
          `INSERT INTO worker_teams (
             id, team_name, ward_number, ward_name, temporary_leader_id, temporary_leader_name,
             worker_ids, shift, status, work_type
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             team_name = EXCLUDED.team_name,
             temporary_leader_id = EXCLUDED.temporary_leader_id,
             temporary_leader_name = EXCLUDED.temporary_leader_name,
             worker_ids = EXCLUDED.worker_ids,
             shift = EXCLUDED.shift,
             status = EXCLUDED.status,
             work_type = EXCLUDED.work_type,
             updated_at = CURRENT_TIMESTAMP`,
          [
            teamId,
            team.team_name?.trim() || 'New Sanitation Team',
            team.ward_number || 3,
            team.ward_name || `Ward ${team.ward_number || 3}`,
            team.temporary_leader_id,
            team.temporary_leader_name,
            workerIdsJson,
            team.shift || 'Morning (06:00 - 14:00)',
            team.status || 'active',
            team.work_type || 'General Civic Sanitation Squad'
          ]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveTeam]:', err.message);
      }
    }
    return team;
  }

  public static async updateTeam(id: string, updates: any): Promise<boolean> {
    if (isDbConnected()) {
      try {
        let sql = `UPDATE worker_teams SET updated_at = CURRENT_TIMESTAMP`;
        const vals: any[] = [];
        if (updates.team_name) {
          vals.push(updates.team_name.trim());
          sql += `, team_name = $${vals.length}`;
        }
        if (updates.temporary_leader_id) {
          vals.push(updates.temporary_leader_id);
          sql += `, temporary_leader_id = $${vals.length}`;
        }
        if (updates.temporary_leader_name) {
          vals.push(updates.temporary_leader_name);
          sql += `, temporary_leader_name = $${vals.length}`;
        }
        if (updates.worker_ids) {
          vals.push(JSON.stringify(Array.isArray(updates.worker_ids) ? updates.worker_ids : []));
          sql += `, worker_ids = $${vals.length}::jsonb`;
        }
        if (updates.status) {
          vals.push(updates.status);
          sql += `, status = $${vals.length}`;
        }
        vals.push(id);
        sql += ` WHERE id = $${vals.length}`;
        await pool.query(sql, vals);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateTeam]:', err.message);
      }
    }
    return false;
  }

  public static async deleteTeam(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query(`DELETE FROM worker_teams WHERE id = $1`, [id]);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteTeam]:', err.message);
      }
    }
    return false;
  }

  public static async getCommunitiesList(wardNumber?: number): Promise<any[]> {
    if (isDbConnected()) {
      try {
        let sql = `SELECT * FROM communities WHERE 1=1`;
        const values: any[] = [];
        if (wardNumber) {
          values.push(wardNumber);
          sql += ` AND ward_number = $${values.length}`;
        }
        sql += ` ORDER BY created_at ASC`;
        const res = await pool.query(sql, values);
        return res.rows.map(r => ({
          id: r.id,
          user_id: r.created_by,
          community_name: r.community_name,
          organisation_type: r.organisation_type || 'Resident Welfare Association',
          head_name: r.head_name || 'Community Leader',
          phone: r.contact_phone || r.phone,
          email: r.contact_email || r.email,
          username: r.username,
          plain_password: r.plain_password || 'Head@123',
          ward_number: r.ward_number || 3,
          ward_name: r.ward_name || `Ward ${r.ward_number || 3}`,
          address: r.address,
          locality: r.locality,
          active_drives_count: r.active_drives_count || 0,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getCommunitiesList]:', err.message);
      }
    }
    return store.communities || [];
  }

  public static async saveCommunityToDb(community: any, passwordHash?: string): Promise<any> {
    const validCommId = this.isValidUUID(community.id) ? community.id : randomUUID();
    let validUserId = this.isValidUUID(community.user_id) ? community.user_id : randomUUID();
    const headPassword = community.plain_password || 'Head@123';
    const hash = passwordHash || await bcrypt.hash(headPassword, 10);
    const effectivePhone = community.phone?.trim() || '+919825100000';
    const effectiveEmail = community.email?.trim() || `${(community.head_name || 'leader').toLowerCase().replace(/\s+/g, '.')}@community.org`;
    const effectiveUsername = community.username?.trim() || effectiveEmail;

    if (isDbConnected()) {
      try {
        const existingProfile = await pool.query(`SELECT id FROM profiles WHERE phone = $1`, [effectivePhone]);
        if (existingProfile.rows.length > 0) {
          validUserId = existingProfile.rows[0].id;
        }

        await pool.query(
          `INSERT INTO profiles (id, full_name, phone, email, username, plain_password, address, locality, ward_number, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'community_head', TRUE)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             username = COALESCE(EXCLUDED.username, profiles.username),
             plain_password = COALESCE(EXCLUDED.plain_password, profiles.plain_password),
             ward_number = EXCLUDED.ward_number,
             updated_at = CURRENT_TIMESTAMP`,
          [
            validUserId,
            community.head_name?.trim() || 'Community Leader',
            effectivePhone,
            effectiveEmail,
            effectiveUsername,
            headPassword,
            community.address || 'Navsari',
            community.locality || 'Dudhiya Talao',
            community.ward_number || 3
          ]
        );

        const authId = randomUUID();
        await pool.query(
          `INSERT INTO citizen_auth_profiles (id, user_id, mobile_number, password_hash, plain_password, mobile_verified, account_status)
           VALUES ($1, $2, $3, $4, $5, TRUE, 'active')
           ON CONFLICT (user_id) DO UPDATE SET
             mobile_number = EXCLUDED.mobile_number,
             password_hash = COALESCE(EXCLUDED.password_hash, citizen_auth_profiles.password_hash),
             plain_password = COALESCE(EXCLUDED.plain_password, citizen_auth_profiles.plain_password),
             updated_at = CURRENT_TIMESTAMP`,
          [
            authId,
            validUserId,
            effectivePhone,
            hash,
            headPassword
          ]
        );

        await pool.query(
          `INSERT INTO user_roles (user_id, role)
           VALUES ($1, 'community_head')
           ON CONFLICT (user_id, role) DO UPDATE SET role = 'community_head'`,
          [validUserId]
        ).catch(() => {});

        await pool.query(
          `INSERT INTO communities (
             id, community_name, organisation_type, address, locality,
             ward_number, ward_name, contact_email, contact_phone,
             verification_status, created_by, head_name, phone, email,
             username, plain_password, active_drives_count
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             community_name = EXCLUDED.community_name,
             organisation_type = EXCLUDED.organisation_type,
             address = EXCLUDED.address,
             locality = EXCLUDED.locality,
             contact_email = EXCLUDED.contact_email,
             contact_phone = EXCLUDED.contact_phone,
             head_name = EXCLUDED.head_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             username = EXCLUDED.username,
             plain_password = EXCLUDED.plain_password,
             active_drives_count = EXCLUDED.active_drives_count,
             updated_at = CURRENT_TIMESTAMP`,
          [
            validCommId,
            community.community_name?.trim() || 'Community Organization',
            community.organisation_type || 'Resident Welfare Association',
            community.address?.trim() || 'Navsari',
            community.locality?.trim() || 'Dudhiya Talao',
            community.ward_number || 3,
            community.ward_name || `Ward ${community.ward_number || 3}`,
            effectiveEmail,
            effectivePhone,
            'verified',
            validUserId,
            community.head_name?.trim() || 'Community Leader',
            effectivePhone,
            effectiveEmail,
            effectiveUsername,
            headPassword,
            community.active_drives_count || 0
          ]
        );

        await pool.query(
          `INSERT INTO community_members (id, community_id, user_id, membership_role)
           VALUES (gen_random_uuid(), $1, $2, 'community_head')
           ON CONFLICT (community_id, user_id) DO UPDATE SET membership_role = 'community_head'`,
          [validCommId, validUserId]
        ).catch(() => {});
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveCommunityToDb]:', err.message);
      }
    }

    return {
      ...community,
      id: validCommId,
      user_id: validUserId,
      created_at: new Date().toISOString()
    };
  }

  public static async updateCommunityInDb(id: string, updates: any): Promise<boolean> {
    if (isDbConnected()) {
      try {
        let sql = `UPDATE communities SET updated_at = CURRENT_TIMESTAMP`;
        const vals: any[] = [];
        if (updates.community_name) {
          vals.push(updates.community_name.trim());
          sql += `, community_name = $${vals.length}`;
        }
        if (updates.head_name) {
          vals.push(updates.head_name.trim());
          sql += `, head_name = $${vals.length}`;
        }
        if (updates.phone) {
          vals.push(updates.phone.trim());
          sql += `, phone = $${vals.length}, contact_phone = $${vals.length}`;
        }
        if (updates.email) {
          vals.push(updates.email.trim());
          sql += `, email = $${vals.length}, contact_email = $${vals.length}`;
        }
        if (updates.address) {
          vals.push(updates.address.trim());
          sql += `, address = $${vals.length}`;
        }
        if (updates.locality) {
          vals.push(updates.locality.trim());
          sql += `, locality = $${vals.length}`;
        }
        if (updates.organisation_type) {
          vals.push(updates.organisation_type.trim());
          sql += `, organisation_type = $${vals.length}`;
        }
        vals.push(id);
        sql += ` WHERE id = $${vals.length} RETURNING created_by`;
        const res = await pool.query(sql, vals);
        const userId = res.rows[0]?.created_by;

        if (userId && (updates.head_name || updates.phone || updates.email)) {
          let pSql = `UPDATE profiles SET updated_at = CURRENT_TIMESTAMP`;
          const pVals: any[] = [];
          if (updates.head_name) {
            pVals.push(updates.head_name.trim());
            pSql += `, full_name = $${pVals.length}`;
          }
          if (updates.phone) {
            pVals.push(updates.phone.trim());
            pSql += `, phone = $${pVals.length}`;
          }
          if (updates.email) {
            pVals.push(updates.email.trim());
            pSql += `, email = $${pVals.length}`;
          }
          pVals.push(userId);
          pSql += ` WHERE id = $${pVals.length}`;
          await pool.query(pSql, pVals);
        }
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateCommunityInDb]:', err.message);
      }
    }
    return false;
  }

  public static async deleteCommunityFromDb(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query(`DELETE FROM communities WHERE id = $1`, [id]);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteCommunityFromDb]:', err.message);
      }
    }
    return false;
  }

  // =========================================================================
  // COMMUNITY PROBLEMS (WARD OFFICER POSTS FOR COMMUNITY ACTION)
  // =========================================================================
  public static async getCommunityProblems(wardNumber?: number): Promise<CommunityProblem[]> {
    if (isDbConnected()) {
      try {
        let sql = `SELECT * FROM community_problems WHERE 1=1`;
        const vals: any[] = [];
        if (wardNumber) {
          vals.push(wardNumber);
          sql += ` AND ward_number = $${vals.length}`;
        }
        sql += ` ORDER BY created_at DESC`;
        const res = await pool.query(sql, vals);
        return res.rows.map(r => ({
          id: r.id,
          ward_number: r.ward_number,
          ward_name: r.ward_name,
          title: r.title,
          description: r.description,
          location_name: r.location_name,
          address: r.address,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          action_plan: r.action_plan,
          urgency: r.urgency,
          estimated_volunteers_needed: parseInt(r.estimated_volunteers_needed || '15', 10),
          suggested_equipment: Array.isArray(r.suggested_equipment) ? r.suggested_equipment : [],
          image_url: r.image_url,
          status: r.status,
          claimed_by_community_id: r.claimed_by_community_id,
          claimed_by_community_name: r.claimed_by_community_name,
          drive_requests: Array.isArray(r.drive_requests) ? r.drive_requests : (typeof r.drive_requests === 'string' ? JSON.parse(r.drive_requests) : []),
          assigned_communities: Array.isArray(r.assigned_communities) ? r.assigned_communities : (typeof r.assigned_communities === 'string' ? JSON.parse(r.assigned_communities) : []),
          linked_activity_id: r.linked_activity_id,
          created_by: r.created_by,
          officer_name: r.officer_name,
          start_time: r.start_time ? (r.start_time instanceof Date ? r.start_time.toISOString() : String(r.start_time)) : undefined,
          end_time: r.end_time ? (r.end_time instanceof Date ? r.end_time.toISOString() : String(r.end_time)) : undefined,
          max_volunteers_per_community: r.max_volunteers_per_community ? parseInt(r.max_volunteers_per_community, 10) : 25,
          citizen_instructions: r.citizen_instructions || undefined,
          necessary_gears: Array.isArray(r.necessary_gears) ? r.necessary_gears : (typeof r.necessary_gears === 'string' ? JSON.parse(r.necessary_gears) : []),
          meeting_point: r.meeting_point || undefined,
          emergency_contact: r.emergency_contact || undefined,
          created_at: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)) : new Date().toISOString(),
          updated_at: r.updated_at ? (r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)) : new Date().toISOString()
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getCommunityProblems]:', err.message);
      }
    }

    let problems = store.communityProblems || [];
    if (wardNumber) {
      problems = problems.filter(p => p.ward_number === wardNumber);
    }
    return problems;
  }

  public static async saveCommunityProblem(problem: any): Promise<CommunityProblem> {
    const validId = this.isValidUUID(problem.id) ? problem.id : randomUUID();
    const newProblem: CommunityProblem = {
      id: validId,
      ward_number: problem.ward_number || 3,
      ward_name: problem.ward_name || `Ward ${problem.ward_number || 3}`,
      title: problem.title.trim(),
      description: problem.description.trim(),
      location_name: problem.location_name?.trim() || 'Navsari Ward Area',
      address: problem.address?.trim() || 'Navsari Civic Area',
      latitude: parseFloat(problem.latitude || 20.9325),
      longitude: parseFloat(problem.longitude || 72.9275),
      action_plan: problem.action_plan?.trim() || 'Organize community cleanliness drive to clean and restore the area.',
      urgency: problem.urgency || 'medium',
      estimated_volunteers_needed: parseInt(problem.estimated_volunteers_needed || '15', 10),
      suggested_equipment: Array.isArray(problem.suggested_equipment) ? problem.suggested_equipment : ['Brooms', 'Gloves', 'Trash Bags'],
      image_url: problem.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
      status: problem.status || 'open',
      claimed_by_community_id: problem.claimed_by_community_id,
      claimed_by_community_name: problem.claimed_by_community_name,
      drive_requests: Array.isArray(problem.drive_requests) ? problem.drive_requests : [],
      assigned_communities: Array.isArray(problem.assigned_communities) ? problem.assigned_communities : [],
      linked_activity_id: problem.linked_activity_id,
      created_by: problem.created_by,
      officer_name: problem.officer_name || 'Ward Officer',
      start_time: problem.start_time || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] + 'T08:00:00Z',
      end_time: problem.end_time || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] + 'T11:30:00Z',
      max_volunteers_per_community: parseInt(problem.max_volunteers_per_community || '25', 10),
      citizen_instructions: problem.citizen_instructions || undefined,
      necessary_gears: Array.isArray(problem.necessary_gears) ? problem.necessary_gears : [],
      meeting_point: problem.meeting_point || undefined,
      emergency_contact: problem.emergency_contact || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isDbConnected()) {
      try {
        await pool.query(`
          INSERT INTO community_problems (
            id, ward_number, ward_name, title, description, location_name,
            address, latitude, longitude, action_plan, urgency,
            estimated_volunteers_needed, suggested_equipment, image_url,
            status, claimed_by_community_id, claimed_by_community_name,
            drive_requests, assigned_communities,
            linked_activity_id, created_by, officer_name,
            start_time, end_time, max_volunteers_per_community,
            citizen_instructions, necessary_gears, meeting_point, emergency_contact,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17,
            $18, $19,
            $20, $21, $22,
            $23, $24, $25,
            $26, $27, $28, $29,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            action_plan = EXCLUDED.action_plan,
            urgency = EXCLUDED.urgency,
            estimated_volunteers_needed = EXCLUDED.estimated_volunteers_needed,
            suggested_equipment = EXCLUDED.suggested_equipment,
            image_url = EXCLUDED.image_url,
            status = EXCLUDED.status,
            claimed_by_community_id = EXCLUDED.claimed_by_community_id,
            claimed_by_community_name = EXCLUDED.claimed_by_community_name,
            drive_requests = EXCLUDED.drive_requests,
            assigned_communities = EXCLUDED.assigned_communities,
            linked_activity_id = EXCLUDED.linked_activity_id,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            max_volunteers_per_community = EXCLUDED.max_volunteers_per_community,
            citizen_instructions = EXCLUDED.citizen_instructions,
            necessary_gears = EXCLUDED.necessary_gears,
            meeting_point = EXCLUDED.meeting_point,
            emergency_contact = EXCLUDED.emergency_contact,
            updated_at = CURRENT_TIMESTAMP
        `, [
          newProblem.id,
          newProblem.ward_number,
          newProblem.ward_name,
          newProblem.title,
          newProblem.description,
          newProblem.location_name,
          newProblem.address,
          newProblem.latitude,
          newProblem.longitude,
          newProblem.action_plan,
          newProblem.urgency,
          newProblem.estimated_volunteers_needed,
          JSON.stringify(newProblem.suggested_equipment),
          newProblem.image_url,
          newProblem.status,
          newProblem.claimed_by_community_id || null,
          newProblem.claimed_by_community_name || null,
          JSON.stringify(newProblem.drive_requests),
          JSON.stringify(newProblem.assigned_communities),
          newProblem.linked_activity_id || null,
          newProblem.created_by || null,
          newProblem.officer_name || null,
          newProblem.start_time,
          newProblem.end_time,
          newProblem.max_volunteers_per_community || 25,
          newProblem.citizen_instructions || null,
          JSON.stringify(newProblem.necessary_gears || []),
          newProblem.meeting_point || null,
          newProblem.emergency_contact || null
        ]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveCommunityProblem]:', err.message);
      }
    }

    if (!store.communityProblems) store.communityProblems = [];
    const idx = store.communityProblems.findIndex(p => p.id === newProblem.id);
    if (idx !== -1) {
      store.communityProblems[idx] = newProblem;
    } else {
      store.communityProblems.unshift(newProblem);
    }

    return newProblem;
  }

  public static async submitDriveRequest(
    problemId: string,
    requestData: {
      communityId: string;
      communityName: string;
      headName: string;
      contactPhone: string;
      proposedVolunteersCount: number;
      proposedDate: string;
      equipmentAvailable?: string[];
      notes?: string;
    }
  ): Promise<CommunityDriveRequest | null> {
    if (!store.communityProblems) store.communityProblems = [];
    const problem = store.communityProblems.find(p => p.id === problemId);
    if (!problem) return null;

    if (!problem.drive_requests) {
      problem.drive_requests = [];
    }

    const existingIndex = problem.drive_requests.findIndex(r => r.community_id === requestData.communityId);
    let driveReq: CommunityDriveRequest;

    if (existingIndex !== -1) {
      driveReq = {
        ...problem.drive_requests[existingIndex],
        head_name: requestData.headName || problem.drive_requests[existingIndex].head_name,
        contact_phone: requestData.contactPhone || problem.drive_requests[existingIndex].contact_phone,
        proposed_volunteers_count: Number(requestData.proposedVolunteersCount) || problem.drive_requests[existingIndex].proposed_volunteers_count,
        proposed_date: problem.start_time || requestData.proposedDate || problem.drive_requests[existingIndex].proposed_date,
        equipment_available: requestData.equipmentAvailable || problem.drive_requests[existingIndex].equipment_available || [],
        notes: requestData.notes !== undefined ? requestData.notes : problem.drive_requests[existingIndex].notes,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };
      problem.drive_requests[existingIndex] = driveReq;
    } else {
      driveReq = {
        id: `dreq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        problem_id: problemId,
        community_id: requestData.communityId,
        community_name: requestData.communityName,
        head_name: requestData.headName,
        contact_phone: requestData.contactPhone,
        proposed_volunteers_count: Number(requestData.proposedVolunteersCount) || 15,
        proposed_date: problem.start_time || requestData.proposedDate || new Date(Date.now() + 86400000 * 3).toISOString(),
        equipment_available: requestData.equipmentAvailable || [],
        notes: requestData.notes || '',
        status: 'pending',
        submitted_at: new Date().toISOString()
      };
      problem.drive_requests.push(driveReq);
    }

    if (problem.status === 'open') {
      problem.status = 'requests_received';
    }
    problem.updated_at = new Date().toISOString();

    // Create a notification for the Ward Officer of this problem's ward
    const targetOfficerId = problem.created_by || this.findWardOfficerUserId(problem.ward_number);
    await this.createNotification(
      targetOfficerId,
      'New Community Drive Proposal',
      `Community "${requestData.communityName}" submitted a proposal to organize a cleanliness drive for "${problem.title}".`,
      problemId,
      'system_alert'
    );

    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE community_problems
          SET drive_requests = $2,
              status = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [problemId, JSON.stringify(problem.drive_requests), problem.status]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - submitDriveRequest]:', err.message);
      }
    }

    return driveReq;
  }

  public static async getProblemDriveRequests(problemId: string): Promise<CommunityDriveRequest[]> {
    if (!store.communityProblems) store.communityProblems = [];
    const problem = store.communityProblems.find(p => p.id === problemId);
    return problem?.drive_requests || [];
  }

  public static async approveProblemCommunities(
    problemId: string,
    communityIds: string[],
    comments?: string,
    officerName?: string
  ): Promise<{ success: boolean; problem?: CommunityProblem; approvedCount: number }> {
    if (!store.communityProblems) store.communityProblems = [];
    const problem = store.communityProblems.find(p => p.id === problemId);
    if (!problem) {
      return { success: false, approvedCount: 0 };
    }

    if (!Array.isArray(communityIds) || communityIds.length === 0) {
      return { success: false, approvedCount: 0 };
    }

    if (!problem.drive_requests) {
      problem.drive_requests = [];
    }

    const assignedCommunities: AssignedCommunity[] = [];
    const approvedNames: string[] = [];

    // Update statuses on drive_requests
    problem.drive_requests.forEach(req => {
      if (communityIds.includes(req.community_id)) {
        req.status = 'approved';
        req.reviewed_at = new Date().toISOString();
        assignedCommunities.push({
          id: `ac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          community_id: req.community_id,
          community_name: req.community_name,
          head_name: req.head_name,
          contact_phone: req.contact_phone,
          assigned_at: new Date().toISOString()
        });
        approvedNames.push(req.community_name);
      } else if (req.status === 'pending') {
        req.status = 'rejected';
        req.reviewed_at = new Date().toISOString();
      }
    });

    // If any community was not in drive_requests but in communityIds (fallback)
    for (const cId of communityIds) {
      if (!assignedCommunities.some(ac => ac.community_id === cId)) {
        const comm = (store.communities || []).find(c => c.id === cId);
        const cName = comm?.community_name || 'Community';
        assignedCommunities.push({
          id: `ac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          community_id: cId,
          community_name: cName,
          head_name: comm?.head_name,
          contact_phone: comm?.phone || comm?.contact_phone,
          assigned_at: new Date().toISOString()
        });
        if (!approvedNames.includes(cName)) {
          approvedNames.push(cName);
        }
      }
    }

    problem.status = 'claimed';
    problem.assigned_communities = assignedCommunities;
    problem.claimed_by_community_id = communityIds.join(',');
    problem.claimed_by_community_name = approvedNames.join(' & ') + (approvedNames.length > 1 ? ' (Joint Drive)' : '');
    problem.updated_at = new Date().toISOString();

    // Create / upsert into Cleanliness Drives so all citizens can discover and take part in this drive!
    if (!store.drives) store.drives = [];
    const isJoint = approvedNames.length > 1;
    const coOrganisersList = assignedCommunities.map(a => a.community_name);
    const maxVolsPerCommunity = problem.max_volunteers_per_community || 25;
    const totalMaxVolunteers = isJoint ? assignedCommunities.length * maxVolsPerCommunity : (problem.estimated_volunteers_needed || 30);

    const driveObj: CleanlinessDrive = {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      ward_id: `ward-${problem.ward_number < 10 ? '0' + problem.ward_number : problem.ward_number}`,
      ward_name: problem.ward_name || `Ward ${problem.ward_number}`,
      location_name: problem.meeting_point || problem.location_name || problem.address || 'Navsari',
      latitude: problem.latitude || 20.9470,
      longitude: problem.longitude || 72.9280,
      start_time: problem.start_time || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] + 'T08:00:00Z',
      end_time: problem.end_time || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] + 'T11:30:00Z',
      registration_deadline: problem.start_time || new Date(Date.now() + 86400000 * 3).toISOString(),
      organiser_name: problem.claimed_by_community_name || 'Community Volunteers',
      status: 'upcoming',
      banner_url: problem.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
      max_volunteers: totalMaxVolunteers,
      max_volunteers_per_community: maxVolsPerCommunity,
      registered_volunteers_count: 0,
      is_joint: isJoint,
      co_organisers: coOrganisersList,
      drive_type: isJoint ? 'joint' : 'single',
      action_plan: problem.action_plan,
      suggested_equipment: problem.suggested_equipment,
      citizen_instructions: problem.citizen_instructions,
      necessary_gears: problem.necessary_gears && problem.necessary_gears.length > 0 ? problem.necessary_gears : problem.suggested_equipment,
      meeting_point: problem.meeting_point,
      emergency_contact: problem.emergency_contact,
      assigned_communities: assignedCommunities
    };

    const existingDriveIdx = store.drives.findIndex(d => d.id === problem.id);
    if (existingDriveIdx >= 0) {
      store.drives[existingDriveIdx] = {
        ...store.drives[existingDriveIdx],
        ...driveObj,
        registered_volunteers_count: store.drives[existingDriveIdx].registered_volunteers_count || 0,
        is_registered: store.drives[existingDriveIdx].is_registered || false
      };
    } else {
      store.drives.unshift(driveObj);
    }

    // Send notifications and SMS to each approved community
    if (!store.notifications) store.notifications = [];
    if (!store.smsMessages) store.smsMessages = [];

    for (const comm of assignedCommunities) {
      const commRecord = (store.communities || []).find(c => c.id === comm.community_id);
      const recipientPhone = comm.contact_phone || commRecord?.phone || commRecord?.contact_phone || '+919825100099';
      const recipientName = comm.head_name || commRecord?.head_name || 'Community Leader';
      const partnersText = isJoint
        ? ` You are co-organizing this drive jointly with ${approvedNames.filter(n => n !== comm.community_name).join(', ')}.`
        : '';

      store.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: commRecord?.created_by || comm.community_id,
        title: isJoint ? 'Joint Cleanliness Drive Approved!' : 'Cleanliness Drive Proposal Approved!',
        message: `Ward Officer ${officerName || problem.officer_name || ''} has approved your community "${comm.community_name}" to organize the drive for "${problem.title}".${partnersText}${comments ? ` Officer Note: ${comments}` : ''}`,
        notification_type: 'system_alert',
        is_read: false,
        created_at: new Date().toISOString()
      });

      store.smsMessages.unshift({
        id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        phone: recipientPhone,
        sender: 'NMC-CIVIC',
        senderName: `${problem.officer_name || officerName || 'NMC Ward Officer'}`,
        body: `Congratulations! Your community "${comm.community_name}" has been approved to organize the cleanliness drive for "${problem.title}".${partnersText}${comments ? ` Note: ${comments}` : ''} Login to your portal to start planning.`,
        type: 'approval',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    }

    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE community_problems
          SET status = 'claimed',
              claimed_by_community_id = $2,
              claimed_by_community_name = $3,
              drive_requests = $4,
              assigned_communities = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [
          problemId,
          problem.claimed_by_community_id,
          problem.claimed_by_community_name,
          JSON.stringify(problem.drive_requests),
          JSON.stringify(problem.assigned_communities)
        ]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - approveProblemCommunities]:', err.message);
      }
    }

    return {
      success: true,
      problem,
      approvedCount: assignedCommunities.length
    };
  }

  public static async updateProblemDrivePlan(
    problemId: string,
    planData: {
      communityId?: string;
      citizenInstructions?: string;
      necessaryGears?: string[];
      meetingPoint?: string;
      emergencyContact?: string;
    }
  ): Promise<CommunityProblem | null> {
    if (!store.communityProblems) store.communityProblems = [];
    const problem = store.communityProblems.find(p => p.id === problemId);
    if (!problem) return null;

    if (planData.citizenInstructions !== undefined) {
      problem.citizen_instructions = planData.citizenInstructions;
    }
    if (planData.necessaryGears) {
      problem.necessary_gears = planData.necessaryGears;
      problem.suggested_equipment = planData.necessaryGears;
    }
    if (planData.meetingPoint) {
      problem.meeting_point = planData.meetingPoint;
    }
    if (planData.emergencyContact) {
      problem.emergency_contact = planData.emergencyContact;
    }
    problem.updated_at = new Date().toISOString();

    // Also update CleanlinessDrive if it exists in store
    if (!store.drives) store.drives = [];
    const drive = store.drives.find(d => d.id === problemId);
    if (drive) {
      if (planData.citizenInstructions !== undefined) drive.citizen_instructions = planData.citizenInstructions;
      if (planData.necessaryGears) {
        drive.necessary_gears = planData.necessaryGears;
        drive.suggested_equipment = planData.necessaryGears;
      }
      if (planData.meetingPoint) drive.meeting_point = planData.meetingPoint;
      if (planData.emergencyContact) drive.emergency_contact = planData.emergencyContact;
    }

    if (isDbConnected()) {
      try {
        await pool.query(
          `UPDATE community_problems SET citizen_instructions = $1, necessary_gears = $2, meeting_point = $3, emergency_contact = $4, updated_at = NOW() WHERE id = $5`,
          [problem.citizen_instructions || null, JSON.stringify(problem.necessary_gears || []), problem.meeting_point || null, problem.emergency_contact || null, problemId]
        );
        await pool.query(
          `UPDATE cleanliness_drives SET citizen_instructions = $1, necessary_gears = $2, meeting_point = $3, emergency_contact = $4, updated_at = NOW() WHERE id = $5`,
          [problem.citizen_instructions || null, JSON.stringify(problem.necessary_gears || []), problem.meeting_point || null, problem.emergency_contact || null, problemId]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateProblemDrivePlan]:', err.message);
      }
    }

    return problem;
  }

  public static async claimCommunityProblem(
    id: string,
    communityId: string,
    communityName: string,
    activityId?: string
  ): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE community_problems
          SET status = 'claimed',
              claimed_by_community_id = $2,
              claimed_by_community_name = $3,
              linked_activity_id = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [id, communityId, communityName, activityId || null]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - claimCommunityProblem]:', err.message);
      }
    }

    if (store.communityProblems) {
      const match = store.communityProblems.find(p => p.id === id);
      if (match) {
        match.status = 'claimed';
        match.claimed_by_community_id = communityId;
        match.claimed_by_community_name = communityName;
        match.linked_activity_id = activityId;
        match.assigned_communities = [
          {
            id: `ac-${Date.now()}`,
            community_id: communityId,
            community_name: communityName,
            assigned_at: new Date().toISOString()
          }
        ];
        match.updated_at = new Date().toISOString();
      }
    }
    return true;
  }

  public static async deleteCommunityProblem(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query(`DELETE FROM community_problems WHERE id = $1`, [id]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteCommunityProblem]:', err.message);
      }
    }
    if (store.communityProblems) {
      store.communityProblems = store.communityProblems.filter(p => p.id !== id);
    }
    return true;
  }

  public static async reopenCommunityProblem(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE community_problems
          SET status = 'open',
              claimed_by_community_id = NULL,
              claimed_by_community_name = NULL,
              linked_activity_id = NULL,
              assigned_communities = '[]'::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [id]);
      } catch (err: any) {
        console.error('[DB REPO ERROR - reopenCommunityProblem]:', err.message);
      }
    }
    if (store.communityProblems) {
      const match = store.communityProblems.find(p => p.id === id);
      if (match) {
        match.status = 'open';
        match.claimed_by_community_id = undefined;
        match.claimed_by_community_name = undefined;
        match.linked_activity_id = undefined;
        match.assigned_communities = [];
        if (match.drive_requests) {
          match.drive_requests.forEach(r => {
            if (r.status === 'approved') r.status = 'pending';
          });
        }
        match.updated_at = new Date().toISOString();
      }
    }
    return true;
  }

  // =========================================================================
  // APPROVAL QUEUE DECISIONS (WARD OFFICER APPROVES / REJECTS COMMUNITY DRIVES)
  // =========================================================================
  public static async getPendingActivitiesForOfficer(wardNumber?: number): Promise<WardApprovalItem[]> {
    if (isDbConnected()) {
      try {
        let sql = `
          SELECT 
            a.id, a.title, a.short_description, a.detailed_description, a.address, a.landmark,
            a.proposed_start_at, a.maximum_participants, a.safety_guidelines, a.cover_image_path,
            a.created_at, a.ward_number, a.community_id, a.created_by, a.linked_problem_id,
            c.community_name, c.head_name,
            cp.title as problem_title, cp.action_plan as problem_action_plan
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          LEFT JOIN community_problems cp ON (cp.id = a.linked_problem_id OR cp.linked_activity_id = a.id)
          WHERE a.approval_status IN ('pending_officer_review', 'ward_review', 'pending', 'changes_requested')
        `;
        const vals: any[] = [];
        if (wardNumber && wardNumber > 0) {
          vals.push(wardNumber);
          sql += ` AND (a.ward_number = $${vals.length} OR a.ward_number IS NULL)`;
        }
        sql += ` ORDER BY a.created_at DESC`;

        const res = await pool.query(sql, vals);
        return res.rows.map(r => ({
          id: r.id,
          type: 'activity',
          title: r.title,
          submitted_by_name: r.community_name ? `${r.community_name} (${r.head_name || 'Community Leader'})` : 'Community Head',
          submitted_by_role: 'Community Head',
          submission_time: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          ward_number: r.ward_number || 3,
          status: 'pending',
          details: {
            proposed_date: r.proposed_start_at ? new Date(r.proposed_start_at).toLocaleDateString() : 'Upcoming',
            location: r.address || r.landmark || 'Navsari',
            expected_volunteers: r.maximum_participants || 30,
            safety_plan: r.short_description || r.detailed_description || 'Volunteer tools and safety equipment planned.',
            linked_problem: r.problem_title ? `Flagged Problem: "${r.problem_title}"` : undefined
          },
          photos: r.cover_image_path ? [r.cover_image_path] : []
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getPendingActivitiesForOfficer]:', err.message);
      }
    }

    // In-memory fallback
    const pending = (store.communityActivities || []).filter(
      (a: any) => a.approval_status === 'ward_review' || a.approval_status === 'pending_officer_review' || a.approval_status === 'changes_requested' || a.approval_status === 'submitted'
    );
    return pending.map((a: any) => ({
      id: a.id,
      type: 'activity',
      title: a.title,
      submitted_by_name: 'Community Head',
      submitted_by_role: 'Community Head',
      submission_time: a.created_at || new Date().toISOString(),
      ward_number: a.ward_number || 3,
      status: 'pending',
      details: {
        proposed_date: a.proposed_start_at || 'Upcoming',
        location: a.address || a.landmark || a.target_area || 'Navsari',
        expected_volunteers: a.maximum_participants || a.target_volunteers || 30,
        safety_plan: a.short_description || a.detailed_description || 'Cleanliness drive'
      }
    }));
  }

  public static async getPendingEvidenceReviewActivities(wardNumber?: number): Promise<any[]> {
    const map = new Map<string, any>();

    if (isDbConnected()) {
      try {
        let sql = `
          SELECT a.*, c.community_name
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          WHERE a.evidence_status = 'submitted'
        `;
        const vals: any[] = [];
        if (wardNumber && wardNumber > 0) {
          vals.push(wardNumber);
          sql += ` AND (a.ward_number = $${vals.length} OR a.ward_number IS NULL)`;
        }
        sql += ` ORDER BY a.updated_at DESC`;
        const res = await pool.query(sql, vals);
        for (const r of res.rows) {
          map.set(r.id, r);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getPendingEvidenceReviewActivities]:', err.message);
      }
    }

    for (const act of (store.communityActivities || [])) {
      if (
        act.evidence_status === 'submitted' &&
        (!wardNumber || !act.ward_number || act.ward_number === wardNumber) &&
        !map.has(act.id)
      ) {
        map.set(act.id, act);
      }
    }

    return Array.from(map.values());
  }

  public static async officerReviewApproval(
    id: string,
    action: 'approve' | 'reject' | 'changes_requested',
    comments: string,
    officerWardNumber?: number
  ): Promise<{ success: boolean; message: string }> {
    // 1. Locate activity in database or memory
    let act: any = null;
    if (isDbConnected()) {
      try {
        const actRes = await pool.query('SELECT * FROM community_activities WHERE id = $1', [id]);
        if (actRes.rows.length > 0) {
          act = actRes.rows[0];
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - finding activity]:', err.message);
      }
    }
    if (!act) {
      act = (store.communityActivities || []).find(a => a.id === id);
    }

    if (act) {
      const isApproved = action === 'approve';
      const newApprovalStatus = isApproved ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
      const newPublicationStatus = isApproved ? 'published' : 'rejected';
      const newRegStatus = isApproved ? 'open' : 'not_open';

      if (isDbConnected()) {
        try {
          await pool.query(`
            UPDATE community_activities
            SET approval_status = $1,
                publication_status = $2,
                registration_status = $3,
                updated_at = NOW()
            WHERE id = $4
          `, [newApprovalStatus, newPublicationStatus, newRegStatus, id]);

          // If approved, insert into cleanliness_drives so citizen dashboard shows it
          if (isApproved) {
            const wardId = act.ward_id || `ward-0${act.ward_number || 3}`;
            const locName = act.address || act.landmark || 'Navsari Ward Area';
            const startTime = act.proposed_start_at || new Date().toISOString();
            const endTime = act.proposed_end_at || new Date(Date.now() + 10800000).toISOString();
            const deadline = act.registration_open_at || startTime;
            const orgName = 'Community Action Team';
            const banner = act.cover_image_path || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';
            const maxVol = act.maximum_participants || 50;

            await pool.query(`
              INSERT INTO cleanliness_drives (
                id, title, description, ward_id, location_name, start_time, end_time,
                registration_deadline, organiser_name, status, banner_path, max_volunteers
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'upcoming', $10, $11)
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                status = 'upcoming',
                updated_at = NOW()
            `, [
              id, act.title, act.short_description || act.detailed_description,
              wardId, locName, startTime, endTime, deadline, orgName, banner, maxVol
            ]);

            // Update linked problem status to claimed
            await pool.query(`
              UPDATE community_problems
              SET status = 'claimed', linked_activity_id = $1, updated_at = NOW()
              WHERE id = $2 OR linked_activity_id = $1
            `, [id, act.linked_problem_id || id]);
          } else if (action === 'reject') {
            await pool.query(`DELETE FROM cleanliness_drives WHERE id = $1`, [id]);
          }
        } catch (err: any) {
          console.error('[DB REPO ERROR - officerReviewApproval SQL]:', err.message);
        }
      }

      // Memory store sync
      const memAct = (store.communityActivities || []).find(a => a.id === id);
      if (memAct) {
        memAct.approval_status = newApprovalStatus as any;
        memAct.publication_status = newPublicationStatus as any;
        memAct.registration_status = newRegStatus as any;
      }
      if (isApproved) {
        if (!store.drives) store.drives = [];
        const existingDrive = store.drives.find(d => d.id === id);
        if (!existingDrive) {
          store.drives.push({
            id,
            title: act.title,
            description: act.short_description || act.detailed_description || '',
            ward_id: act.ward_id || `ward-0${act.ward_number || 3}`,
            ward_name: act.ward_name || `Ward ${act.ward_number || 3}`,
            location_name: act.address || act.landmark || 'Navsari',
            start_time: act.proposed_start_at || new Date().toISOString(),
            end_time: act.proposed_end_at || new Date(Date.now() + 10800000).toISOString(),
            registration_deadline: act.proposed_start_at || new Date().toISOString(),
            organiser_name: 'Community Organization',
            status: 'upcoming',
            banner_url: act.cover_image_path || '',
            max_volunteers: act.maximum_participants || 50,
            registered_volunteers_count: 0
          });
        }
      }

      // 4. Send Notification to Community Head!
      const targetUserId = act.created_by || 'c0000000-0000-0000-0000-000000000099';
      if (isApproved) {
        await this.createNotification(
          targetUserId,
          'Cleanliness Drive Approved! 🎉',
          `Your cleanliness drive "${act.title}" has been APPROVED by the Ward ${act.ward_number || 3} Officer. Citizen registration is now open across all citizen dashboards!`,
          id,
          'drive_approved'
        );
      } else if (action === 'reject') {
        await this.createNotification(
          targetUserId,
          'Cleanliness Drive Rejected ⚠️',
          `Your cleanliness drive "${act.title}" was REJECTED by Ward ${act.ward_number || 3} Officer. Reason: ${comments || 'Did not meet cleanliness guidelines.'}`,
          id,
          'drive_rejected'
        );
      } else {
        await this.createNotification(
          targetUserId,
          'Changes Requested for Cleanliness Drive 📝',
          `Ward ${act.ward_number || 3} Officer requested adjustments for "${act.title}": ${comments}`,
          id,
          'drive_changes_requested'
        );
      }

      return {
        success: true,
        message: `Activity ${id} marked as ${action}. Notification dispatched to Community Head.`
      };
    }

    return {
      success: true,
      message: `Item ${id} processed as ${action}.`
    };
  }
}
