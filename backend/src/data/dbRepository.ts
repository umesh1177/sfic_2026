import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, isDbConnected } from './db.js';
import { store } from './store.js';
import { PushService } from '../services/pushService.js';
import {
  Complaint, CleanlinessDrive, AppNotification, Profile, ComplaintCategory,
  CommunityRecognitionPost, RecognitionComment, CitizenAuthProfile,
  Community, CommunityActivity, ActivityRegistration, ActivityQuestion,
  ActivityAiSuggestion, ActivityQuestionResponse, ActivityAnnouncement,
  ActivityEvidence, ActivityApprovalLog, CommunityDashboardSummary,
  WorkerProfile, WorkerDesignation, WorkerSkill, WorkAssignment,
  WorkAssignmentMember, WorkerAttendance, AttendanceException,
  WorkProgressUpdate, WorkEvidence, WorkCompletionReport,
  WorkReviewLog, WorkerDashboardSummary, CommunityProblem, WardApprovalItem
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
           ON CONFLICT (id) DO NOTHING`,
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
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
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
  /**
   * Global case-insensitive username uniqueness check across ALL user types & formats:
   * profiles (citizens, ward officers, admins), worker_profiles (workers & worker codes),
   * communities (NGOs / organizations), and in-memory store.
   */
  public static async isUsernameTaken(
    rawUsername: string,
    exclude?: {
      userId?: string;
      communityId?: string;
      workerId?: string;
      officerId?: string;
    }
  ): Promise<{ taken: boolean; normalized: string; usedBy?: string }> {
    const normalized = String(rawUsername || '').trim().toLowerCase();
    if (!normalized) return { taken: false, normalized: '' };

    const exUserId = exclude?.userId || '';
    const exCommId = exclude?.communityId || '';
    const exWorkerId = exclude?.workerId || '';
    const exOfficerId = exclude?.officerId || '';

    if (isDbConnected()) {
      try {
        const profRes = await pool.query(
          `SELECT id, role FROM profiles
           WHERE LOWER(TRIM(COALESCE(username, ''))) = $1
             AND ($2 = '' OR id::text <> $2)
           LIMIT 1`,
          [normalized, exUserId]
        );
        if (profRes.rows.length > 0) {
          return { taken: true, normalized, usedBy: profRes.rows[0].role || 'user profile' };
        }

        const wpRes = await pool.query(
          `SELECT id, user_id FROM worker_profiles
           WHERE (LOWER(TRIM(COALESCE(username, ''))) = $1 OR LOWER(TRIM(COALESCE(worker_code, ''))) = $1)
             AND ($2 = '' OR id::text <> $2)
             AND ($3 = '' OR user_id::text <> $3)
           LIMIT 1`,
          [normalized, exWorkerId, exUserId]
        );
        if (wpRes.rows.length > 0) {
          return { taken: true, normalized, usedBy: 'sanitation worker' };
        }

        const commRes = await pool.query(
          `SELECT id, created_by FROM communities
           WHERE LOWER(TRIM(COALESCE(username, ''))) = $1
             AND ($2 = '' OR id::text <> $2)
             AND ($3 = '' OR created_by::text <> $3)
           LIMIT 1`,
          [normalized, exCommId, exUserId]
        );
        if (commRes.rows.length > 0) {
          return { taken: true, normalized, usedBy: 'community organization' };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - isUsernameTaken]:', err.message);
      }
    }

    // Check in-memory store across all roles & formats
    const dupProfile = (store.profiles || []).find(
      p => p.username && p.username.trim().toLowerCase() === normalized && p.id !== exUserId
    );
    if (dupProfile) {
      return { taken: true, normalized, usedBy: dupProfile.role || 'user profile' };
    }

    const dupWorker = (store.workers || []).find(
      w =>
        ((w.username && w.username.trim().toLowerCase() === normalized) ||
          (w.worker_code && w.worker_code.trim().toLowerCase() === normalized)) &&
        w.id !== exWorkerId &&
        w.user_id !== exUserId
    );
    if (dupWorker) {
      return { taken: true, normalized, usedBy: 'sanitation worker' };
    }

    const dupComm = (store.communities || []).find(
      c =>
        c.username &&
        c.username.trim().toLowerCase() === normalized &&
        c.id !== exCommId &&
        c.user_id !== exUserId
    );
    if (dupComm) {
      return { taken: true, normalized, usedBy: 'community organization' };
    }

    const dupOfficer = (store.wardOfficers || []).find(
      (o: any) =>
        o.username &&
        String(o.username).trim().toLowerCase() === normalized &&
        o.id !== exOfficerId &&
        o.user_id !== exUserId
    );
    if (dupOfficer) {
      return { taken: true, normalized, usedBy: 'ward officer' };
    }

    return { taken: false, normalized };
  }

  public static async findUserByIdentifier(identifier: string): Promise<{ profile: Profile; authProfile: CitizenAuthProfile } | null> {
    if (!identifier) return null;
    if (isDbConnected()) {
      try {
        const trimmed = identifier.trim();
        const lowerTrimmed = trimmed.toLowerCase();
        const cleanDigits = trimmed.replace(/\D/g, '');
        const tenDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

        const res = await pool.query(
          `SELECT p.*, a.password_hash, a.plain_password as auth_plain_password, a.account_status, a.mobile_verified,
                  (SELECT r.role FROM user_roles r WHERE r.user_id = p.id ORDER BY r.created_at DESC LIMIT 1) as latest_user_role,
                  wp.id as worker_profile_id, wp.worker_code, wp.username as worker_username, wp.plain_password as worker_plain_password,
                  c.id as community_id, c.username as comm_username, c.plain_password as comm_plain_password, c.approval_status as comm_approval_status
           FROM profiles p
           LEFT JOIN citizen_auth_profiles a ON a.user_id = p.id
           LEFT JOIN worker_profiles wp ON wp.user_id = p.id
           LEFT JOIN communities c ON c.created_by = p.id
           WHERE LOWER(TRIM(COALESCE(p.phone, ''))) = LOWER($1)
              OR ($2 <> '' AND RIGHT(REGEXP_REPLACE(COALESCE(p.phone, ''), '[^0-9]', '', 'g'), 10) = $2)
              OR LOWER(TRIM(COALESCE(p.email, ''))) = LOWER($1)
              OR LOWER(TRIM(COALESCE(p.username, ''))) = LOWER($1)
              OR LOWER(TRIM(COALESCE(wp.worker_code, ''))) = LOWER($1)
              OR LOWER(TRIM(COALESCE(wp.username, ''))) = LOWER($1)
              OR LOWER(TRIM(COALESCE(c.username, ''))) = LOWER($1)
           ORDER BY
              CASE
                WHEN LOWER(TRIM(COALESCE(c.username, ''))) = LOWER($1) THEN 1
                WHEN LOWER(TRIM(COALESCE(wp.username, ''))) = LOWER($1) OR LOWER(TRIM(COALESCE(wp.worker_code, ''))) = LOWER($1) THEN 1
                WHEN LOWER(TRIM(COALESCE(p.username, ''))) = LOWER($1) THEN 1
                WHEN LOWER(TRIM(COALESCE(p.email, ''))) = LOWER($1) THEN 2
                ELSE 3
              END ASC,
              p.updated_at DESC
           LIMIT 1`,
          [trimmed, tenDigits]
        );

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const matchedByCommUsername = row.comm_username && String(row.comm_username).trim().toLowerCase() === lowerTrimmed;
          const matchedByWorkerUsername =
            (row.worker_username && String(row.worker_username).trim().toLowerCase() === lowerTrimmed) ||
            (row.worker_code && String(row.worker_code).trim().toLowerCase() === lowerTrimmed);

          const resolvedRole = matchedByCommUsername
            ? 'community_head'
            : matchedByWorkerUsername
            ? 'worker'
            : (row.role || row.latest_user_role || 'citizen');

          const plainPass = matchedByCommUsername
            ? (row.auth_plain_password || row.comm_plain_password || row.plain_password)
            : matchedByWorkerUsername
            ? (row.auth_plain_password || row.worker_plain_password || row.plain_password)
            : (row.auth_plain_password || row.plain_password || row.comm_plain_password || row.worker_plain_password);

          const profile: any = {
            id: row.id,
            full_name: row.full_name,
            phone: row.phone,
            email: row.email,
            username: matchedByCommUsername
              ? row.comm_username
              : matchedByWorkerUsername
              ? (row.worker_username || row.worker_code)
              : (row.username || row.comm_username || row.worker_username || row.worker_code),
            plain_password: plainPass,
            avatar_url: row.avatar_url,
            preferred_language: row.preferred_language || 'en',
            address: row.address,
            locality: row.locality || 'Navsari',
            ward_number: row.ward_number || 3,
            role: resolvedRole,
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
    return null;
  }

  public static async findUserById(userId: string): Promise<{ profile: Profile; authProfile: CitizenAuthProfile } | null> {
    if (!userId || !this.isValidUUID(userId)) return null;
    if (isDbConnected()) {
      try {
        const res = await pool.query(
          `SELECT p.*, a.password_hash, a.plain_password as auth_plain_password, a.account_status, a.mobile_verified,
                  COALESCE(r.role, p.role, 'citizen') as resolved_role,
                  wp.worker_code, wp.username as worker_username, wp.ward_number as worker_ward_number
           FROM profiles p
           LEFT JOIN citizen_auth_profiles a ON a.user_id = p.id
           LEFT JOIN user_roles r ON r.user_id = p.id
           LEFT JOIN worker_profiles wp ON wp.user_id = p.id
           WHERE p.id = $1
           LIMIT 1`,
          [userId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const plainPass = row.plain_password || row.auth_plain_password;
          const profile: any = {
            id: row.id,
            full_name: row.full_name,
            phone: row.phone,
            email: row.email,
            username: row.username || row.worker_code || row.worker_username,
            plain_password: plainPass,
            avatar_url: row.avatar_url,
            preferred_language: row.preferred_language || 'en',
            address: row.address,
            locality: row.locality || `Ward ${row.worker_ward_number || row.ward_number || 3}`,
            ward_number: row.worker_ward_number || row.ward_number || 3,
            role: row.resolved_role || 'citizen',
            is_active: row.is_active ?? true,
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          const authProfile: any = {
            id: `auth-${row.id}`,
            user_id: row.id,
            mobile_number: row.phone,
            password_hash: row.password_hash || '',
            plain_password: plainPass,
            mobile_verified: row.mobile_verified ?? true,
            account_status: row.account_status || 'active',
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          return { profile, authProfile };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - findUserById]:', err.message);
      }
    }
    return null;
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
      citizen_phone: data.citizen_phone,
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
    citizen_phone?: string;
    citizen_name?: string;
    status?: string;
    category_id?: string;
    search?: string;
  } = {}): Promise<Complaint[]> {
    let dbMapped: Complaint[] = [];

    if (isDbConnected()) {
      try {
        let query = 'SELECT * FROM complaints WHERE 1=1';
        const values: any[] = [];
        let idx = 1;

        if (params.citizen_id || params.citizen_phone) {
          const conditions: string[] = [];
          if (params.citizen_id) {
            const validCitizenId = this.isValidUUID(params.citizen_id) ? params.citizen_id : 'c0000000-0000-0000-0000-000000000001';
            conditions.push(`citizen_id = $${idx++}`);
            values.push(validCitizenId);

            // Also match alias/demo IDs if demo citizen
            if (params.citizen_id === 'c0000000-0000-0000-0000-000000000001' || params.citizen_id === 'citizen-01') {
              conditions.push(`citizen_id = '4faa7a52-a5fc-4377-bbf1-46237299384a'`);
            }
          }
          if (params.citizen_phone) {
            conditions.push(`citizen_phone = $${idx++}`);
            values.push(params.citizen_phone);

            const cleanDigits = params.citizen_phone.replace(/\D/g, '');
            if (cleanDigits.length >= 10) {
              const last10 = cleanDigits.slice(-10);
              conditions.push(`RIGHT(REGEXP_REPLACE(citizen_phone, '\\D', '', 'g'), 10) = $${idx++}`);
              values.push(last10);
            }
          }
          query += ` AND (${conditions.join(' OR ')})`;
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
        dbMapped = res.rows.map(r => this.mapComplaintRow(r));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getComplaints]:', err.message);
      }
    }

    // Always merge in-memory store complaints so citizen newly submitted or offline-synced complaints are never missed
    const cleanUserPhone = params.citizen_phone ? params.citizen_phone.replace(/\D/g, '') : '';
    const userLast10 = cleanUserPhone.length >= 10 ? cleanUserPhone.slice(-10) : '';

    const matchingStore = (store.complaints || []).filter(c => {
      if (params.citizen_id || params.citizen_phone) {
        let matches = false;
        if (params.citizen_id) {
          if (c.citizen_id === params.citizen_id) matches = true;
          if (
            (params.citizen_id === 'c0000000-0000-0000-0000-000000000001' || params.citizen_id === 'citizen-01') &&
            (c.citizen_id === 'c0000000-0000-0000-0000-000000000001' || c.citizen_id === 'citizen-01' || c.citizen_id === '4faa7a52-a5fc-4377-bbf1-46237299384a')
          ) {
            matches = true;
          }
        }
        if (!matches && params.citizen_phone && (c as any).citizen_phone) {
          const scDigits = (c as any).citizen_phone.replace(/\D/g, '');
          if ((c as any).citizen_phone === params.citizen_phone || (userLast10 && scDigits.endsWith(userLast10))) {
            matches = true;
          }
        }
        if (!matches) return false;
      }

      if (params.status && params.status !== 'all' && c.status !== params.status) return false;
      if (params.category_id && params.category_id !== 'all' && c.category_id !== params.category_id) return false;
      if (params.search) {
        const q = params.search.toLowerCase();
        return (
          (c.complaint_number || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.location?.address || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    const mergedMap = new Map<string, Complaint>();
    for (const sc of matchingStore) {
      mergedMap.set(sc.complaint_number || sc.id, sc);
    }
    for (const dc of dbMapped) {
      mergedMap.set(dc.complaint_number || dc.id, dc);
    }

    const combined = Array.from(mergedMap.values()).sort(
      (a, b) => new Date((b as any).created_at || b.submitted_at || 0).getTime() - new Date((a as any).created_at || a.submitted_at || 0).getTime()
    );

    if (!params.citizen_id && !params.citizen_phone) {
      return combined.map(c => ({ ...c, citizen_name: 'Anonymous Citizen' }));
    }
    return combined;
  }

  public static async getComplaintById(id: string): Promise<Complaint | null> {
    if (isDbConnected()) {
      try {
        const res = this.isValidUUID(id)
          ? await pool.query('SELECT * FROM complaints WHERE id = $1 OR complaint_number = $2', [id, id])
          : await pool.query('SELECT * FROM complaints WHERE complaint_number = $1', [id]);
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
          // Also merge any feedback
          const fbRes = await pool.query('SELECT * FROM complaint_feedback WHERE complaint_id = $1 ORDER BY created_at DESC LIMIT 1', [comp.id]).catch(() => ({ rows: [] as any[] }));
          if (fbRes.rows.length > 0) {
            comp.feedback = fbRes.rows[0];
          }
          return comp;
        }
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
        const lookupId = complaint?.id || id;
        const lookupNum = complaint?.complaint_number || id;
        const isResolvedStatus = newStatus === 'resolved';
        const updateRes = this.isValidUUID(lookupId)
          ? await pool.query(
              `UPDATE complaints
               SET status = $1,
                   resolved_at = CASE WHEN $2::boolean THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END,
                   updated_at = NOW()
               WHERE id = $3 OR complaint_number = $4
               RETURNING id`,
              [newStatus, isResolvedStatus, lookupId, lookupNum]
            )
          : await pool.query(
              `UPDATE complaints
               SET status = $1,
                   resolved_at = CASE WHEN $2::boolean THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END,
                   updated_at = NOW()
               WHERE complaint_number = $3
               RETURNING id`,
              [newStatus, isResolvedStatus, lookupNum]
            );

        const dbComplaintId = updateRes.rows[0]?.id;
        if (actorInfo && dbComplaintId) {
          await pool.query(
            `INSERT INTO complaint_activity_logs (complaint_id, status, note, actor_name, actor_role)
             VALUES ($1, $2, $3, $4, $5)`,
            [dbComplaintId, newStatus, actorInfo.note, actorInfo.name, actorInfo.role]
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
          [validUserId, title, message, type, referenceId || null]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - createNotification]:', err.message);
      }
    }

    // Fire real Web Push notification to all subscribed PWA mobile/desktop devices of this user
    PushService.sendToUser(userId, {
      title,
      body: message,
      type,
      referenceId,
      tag: `swachhsetu-${type}-${referenceId || Date.now()}`
    }).catch(() => {});

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
        let attendedDriveIds: Set<string> = new Set();
        if (citizenId) {
          const regRes = await pool.query('SELECT drive_id FROM drive_registrations WHERE citizen_id = $1', [citizenId]);
          registeredDriveIds = new Set(regRes.rows.map(r => r.drive_id));
        }

        const standardDrives: CleanlinessDrive[] = res.rows.map(r => ({
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
          is_registered: registeredDriveIds.has(r.id),
          latitude: 20.9470,
          longitude: 72.9280,
          attendance_status: registeredDriveIds.has(r.id) ? 'registered' : undefined
        }));

        // Also retrieve published & approved community activities so citizens can discover and register
        const actRes = await pool.query(`
          SELECT 
            a.id, a.title, COALESCE(a.short_description, a.detailed_description, '') as description,
            a.ward_id, a.ward_name, COALESCE(a.address, a.landmark, 'Navsari') as location_name,
            a.latitude, a.longitude,
            a.proposed_start_at as start_time, a.proposed_end_at as end_time,
            a.proposed_start_at as registration_deadline,
            COALESCE(c.community_name, 'Community Organization') as organiser_name,
            COALESCE(c.head_name, 'Community Coordinator') as lead_person,
            COALESCE(c.contact_phone, c.phone, '') as contact_phone,
            CASE WHEN a.event_status = 'completed' OR a.evidence_status = 'verified_complete' THEN 'completed' ELSE 'upcoming' END as status,
            COALESCE(a.registration_status, 'open') as registration_status,
            COALESCE(a.cover_image_path, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80') as banner_url,
            COALESCE(a.maximum_participants, 50) as max_volunteers,
            COALESCE((SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id AND ar.registration_status <> 'cancelled'), 0) as registered_volunteers_count,
            (SELECT ar.attendance_status FROM activity_registrations ar WHERE ar.activity_id = a.id AND ar.citizen_id = $1 AND ar.registration_status <> 'cancelled' LIMIT 1) as my_attendance_status
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          WHERE a.approval_status IN ('approved', 'ward_approved', 'nmc_admin_approved') AND a.publication_status IN ('published', 'approved')
        `, [citizenId && this.isValidUUID(citizenId) ? citizenId : '00000000-0000-0000-0000-000000000000']);

        let registeredActIds: Set<string> = new Set();
        let presentActIds: Set<string> = new Set();
        if (citizenId && this.isValidUUID(citizenId)) {
          const actRegRes = await pool.query(
            `SELECT activity_id, attendance_status FROM activity_registrations WHERE citizen_id = $1 AND registration_status <> 'cancelled'`,
            [citizenId]
          );
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
          lead_person: r.lead_person,
          contact_phone: r.contact_phone,
          status: r.status,
          registration_status: r.registration_status,
          banner_url: r.banner_url,
          max_volunteers: parseInt(r.max_volunteers, 10) || 50,
          registered_volunteers_count: parseInt(r.registered_volunteers_count, 10) || 0,
          is_registered: registeredActIds.has(r.id) || registeredDriveIds.has(r.id),
          attendance_status: r.my_attendance_status || (presentActIds.has(r.id) ? 'present' : registeredActIds.has(r.id) ? 'registered' : undefined)
        } as any));

        const combined = [...communityDrives];
        for (const sd of standardDrives) {
          if (!combined.some(c => c.id === sd.id)) {
            combined.push(sd);
          }
        }
        return combined;
      } catch (err: any) {
        console.error('[DB REPO ERROR - getDrives]:', err.message);
      }
    }
    return store.drives;
  }

  public static async registerForDrive(
    driveId: string,
    citizenId: string,
    citizenInfo?: { fullName?: string; phone?: string; email?: string }
  ): Promise<{ success: boolean; error?: string; registeredCount?: number; maxVolunteers?: number; autoClosed?: boolean }> {
    const validCitizenId = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    const profileName = (citizenInfo?.fullName && citizenInfo.fullName.trim()) ? citizenInfo.fullName.trim() : 'Registered Citizen';
    const profilePhone = (citizenInfo?.phone && citizenInfo.phone.trim()) ? citizenInfo.phone.trim() : '';
    await this.ensureProfileExists(validCitizenId, profileName, profilePhone || '+91 98251 00000');

    if (isDbConnected()) {
      try {
        // 1. Check if driveId matches community_activities
        const actCheck = await pool.query(
          `SELECT id, community_id, title, maximum_participants, registration_status, event_status, evidence_status
           FROM community_activities WHERE id = $1`,
          [driveId]
        );
        if (actCheck.rows.length > 0) {
          const act = actCheck.rows[0];
          const maxCap = Math.max(1, parseInt(act.maximum_participants || '50', 10));

          if (act.event_status === 'completed' || act.evidence_status === 'verified_complete') {
            return { success: false, error: 'This cleanliness drive has already been completed.' };
          }

          // Check if citizen is already actively registered
          const alreadyRes = await pool.query(
            `SELECT id FROM activity_registrations WHERE activity_id = $1 AND citizen_id = $2 AND registration_status <> 'cancelled'`,
            [driveId, validCitizenId]
          );
          if (alreadyRes.rows.length > 0) {
            return { success: true, maxVolunteers: maxCap };
          }

          if (act.registration_status === 'closed' || act.registration_status === 'not_open') {
            return { success: false, error: 'Registrations for this cleanliness drive are currently closed by the organizer.' };
          }

          // Enforce max registration capacity!
          const countRes = await pool.query(
            `SELECT COUNT(*) FROM activity_registrations WHERE activity_id = $1 AND registration_status <> 'cancelled'`,
            [driveId]
          );
          const currentCount = parseInt(countRes.rows[0]?.count || '0', 10);
          if (currentCount >= maxCap) {
            await pool.query(
              `UPDATE community_activities SET registration_status = 'closed', updated_at = NOW() WHERE id = $1`,
              [driveId]
            ).catch(() => {});
            return {
              success: false,
              error: `Registration limit reached (${currentCount}/${maxCap} volunteers). Registrations are now closed.`,
              registeredCount: currentCount,
              maxVolunteers: maxCap,
              autoClosed: true
            };
          }

          const regNumber = `REG-NAV-${Math.floor(1000 + Math.random() * 9000)}`;
          await pool.query(`
            INSERT INTO activity_registrations (
              id, activity_id, citizen_id, registration_number, registration_status, attendance_status, registered_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, 'registered', 'registered', NOW()
            )
            ON CONFLICT (activity_id, citizen_id) DO UPDATE SET
              registration_status = 'registered',
              cancelled_at = NULL,
              registered_at = NOW()
          `, [driveId, validCitizenId, regNumber]);

          const newCount = currentCount + 1;
          const reachedLimit = newCount >= maxCap;
          if (reachedLimit) {
            await pool.query(
              `UPDATE community_activities SET registration_status = 'closed', updated_at = NOW() WHERE id = $1`,
              [driveId]
            ).catch(() => {});
          }

          await pool.query(
            `UPDATE cleanliness_drives SET registered_volunteers_count = $1 WHERE id = $2`,
            [newCount, driveId]
          ).catch(() => {});

          return {
            success: true,
            registeredCount: newCount,
            maxVolunteers: maxCap,
            autoClosed: reachedLimit
          };
        }

        // 2. Otherwise standard cleanliness_drives
        const sdCheck = await pool.query(
          `SELECT id, max_volunteers, registered_volunteers_count, status FROM cleanliness_drives WHERE id = $1`,
          [driveId]
        );
        if (sdCheck.rows.length > 0) {
          const sd = sdCheck.rows[0];
          const maxVol = parseInt(sd.max_volunteers || '100', 10);
          const curVol = parseInt(sd.registered_volunteers_count || '0', 10);
          if (sd.status === 'completed') {
            return { success: false, error: 'This cleanliness drive is already completed.' };
          }
          if (curVol >= maxVol) {
            return { success: false, error: `Registration limit reached (${curVol}/${maxVol} volunteers).` };
          }
        }

        await pool.query(
          `INSERT INTO drive_registrations (drive_id, citizen_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [driveId, validCitizenId]
        );
        await pool.query(
          `UPDATE cleanliness_drives SET registered_volunteers_count = registered_volunteers_count + 1 WHERE id = $1`,
          [driveId]
        );
        return { success: true };
      } catch (err: any) {
        console.error('[DB REPO ERROR - registerForDrive]:', err.message);
        return { success: false, error: err.message };
      }
    }

    // In-memory fallback
    const drive = store.drives.find(d => d.id === driveId);
    if (drive) {
      if (drive.registered_volunteers_count >= (drive.max_volunteers || 50)) {
        return { success: false, error: `Registration limit reached (${drive.max_volunteers} volunteers).` };
      }
      drive.is_registered = true;
      drive.registered_volunteers_count += 1;
    }
    const act = (store.communityActivities || []).find(a => a.id === driveId);
    if (act) {
      (act as any).is_registered = true;
      act.registered_count = (act.registered_count || 0) + 1;
    }
    if (!(store as any).activityRegistrations) (store as any).activityRegistrations = [];
    (store as any).activityRegistrations.push({
      id: `reg-${Date.now()}`,
      activity_id: driveId,
      citizen_id: validCitizenId,
      citizen_name: profileName,
      citizen_phone: profilePhone,
      registration_number: `REG-NAV-${Math.floor(1000 + Math.random() * 9000)}`,
      registration_status: 'registered',
      attendance_status: 'registered',
      registered_at: new Date().toISOString()
    });
    return { success: true };
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

    const drive = store.drives.find(d => d.id === driveId);
    if (drive) {
      drive.is_registered = false;
      drive.registered_volunteers_count = Math.max(0, drive.registered_volunteers_count - 1);
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

  public static async markDriveAttendance(driveId: string, citizenId: string, latitude?: number, longitude?: number): Promise<any> {
    const validCitizenId = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        await pool.query(`
          UPDATE activity_registrations
          SET attendance_status = 'present', checked_in_at = NOW()
          WHERE activity_id = $1 AND citizen_id = $2
        `, [driveId, validCitizenId]).catch(() => {});
      } catch (err: any) {
        console.error('[DB REPO ERROR - markDriveAttendance]:', err.message);
      }
    }

    if ((store as any).activityRegistrations) {
      const reg = (store as any).activityRegistrations.find((r: any) => r.activity_id === driveId && r.citizen_id === validCitizenId);
      if (reg) {
        reg.attendance_status = 'present';
        reg.checked_in_at = new Date().toISOString();
      }
    }

    return {
      drive_id: driveId,
      citizen_id: validCitizenId,
      attendance_status: 'present',
      checked_in_at: new Date().toISOString(),
      karma_awarded: 150
    };
  }

  // =========================================================================
  // 3. NOTIFICATIONS: FETCH & UPDATE
  // =========================================================================

  public static async getNotifications(userId: string): Promise<AppNotification[]> {
    const validUserId = this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        const res = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [validUserId]);
        return res.rows.map(r => ({
          id: r.id,
          user_id: r.user_id,
          title: r.title,
          message: r.message,
          notification_type: r.notification_type,
          reference_id: r.reference_id,
          is_read: r.is_read,
          created_at: r.created_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getNotifications]:', err.message);
      }
    }
    return store.notifications.filter(n => n.user_id === userId);
  }

  public static async markNotificationRead(id: string): Promise<boolean> {
    if (isDbConnected()) {
      try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - markNotificationRead]:', err.message);
      }
    }
    const n = store.notifications.find(notif => notif.id === id);
    if (n) n.is_read = true;
    return true;
  }

  public static async markAllNotificationsRead(userId: string): Promise<boolean> {
    const validUserId = this.isValidUUID(userId) ? userId : 'c0000000-0000-0000-0000-000000000001';
    if (isDbConnected()) {
      try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [validUserId]);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - markAllNotificationsRead]:', err.message);
      }
    }
    store.notifications.filter(n => n.user_id === userId).forEach(n => { n.is_read = true; });
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

        return postsRes.rows.map(r => ({
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
          before_image_url: r.before_image_url || undefined,
          after_image_url: r.after_image_url || undefined,
          after_photos: r.after_photos ? (typeof r.after_photos === 'string' ? JSON.parse(r.after_photos) : r.after_photos) : undefined,
          likes_count: r.likes_count,
          comments_count: r.comments_count,
          is_liked: likedPostIds.has(r.id),
          created_at: r.created_at,
          comments: commentsByPost[r.id] || []
        }));
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
    if (isDbConnected()) {
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
        return { is_liked: isLiked, likes_count: countRes.rows[0]?.likes_count || 0 };
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
    if (isDbConnected()) {
      try {
        const res = await pool.query(
          `INSERT INTO recognition_post_comments (post_id, citizen_id, citizen_name, citizen_role, comment_text)
           VALUES ($1, $2, $3, 'Verified Citizen', $4)
           RETURNING *`,
          [postId, citizenId, citizenName, text]
        );
        await pool.query(
          `UPDATE community_recognition_posts SET comments_count = comments_count + 1 WHERE id = $1`,
          [postId]
        );

        const row = res.rows[0];
        return {
          id: row.id,
          post_id: row.post_id,
          citizen_id: row.citizen_id,
          citizen_name: row.citizen_name,
          citizen_role: row.citizen_role,
          comment_text: row.comment_text,
          created_at: row.created_at
        };
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
    if (isDbConnected()) {
      try {
        const afterPhotosJson = data.after_photos ? JSON.stringify(data.after_photos) : null;
        const verifiedFlag = data.is_verified_nmc !== undefined ? data.is_verified_nmc : true;
        const res = await pool.query(
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
            verifiedFlag,
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
        store.recognitionPosts.unshift(postObj);
        return postObj;
      } catch (err: any) {
        console.error('[DB REPO ERROR - createRecognitionPost]:', err.message);
      }
    }

    // Fallback store
    const newPost: CommunityRecognitionPost = {
      id: `post-${Date.now()}`,
      author_name: data.author_name,
      author_role: data.author_role,
      author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
      is_verified_nmc: data.is_verified_nmc !== undefined ? data.is_verified_nmc : true,
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
    const limit = Math.max(1, Math.min(100, params.limit || 50));
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
            registration_status, event_status, evidence_status, created_by, linked_problem_id
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23,
            $24, $25, $26,
            $27, $28, $29,
            $30, $31, $32, $33, $34
          ) RETURNING *
        `;

        const linkedProbRaw = (data as any).linked_problem_id;
        const linkedProblemId = this.isValidUUID(linkedProbRaw) ? linkedProbRaw : null;

        const values = [
          data.community_id || 'b0000000-0000-0000-0000-000000000001',
          data.title || 'Untitled Community Activity',
          data.short_description || 'Cleanliness drive in Navsari',
          data.detailed_description || 'Comprehensive cleanliness activity with volunteer participation.',
          data.activity_category || (data as any).activity_type || 'Public Area Cleaning',
          JSON.stringify(data.objectives || []),
          JSON.stringify(data.expected_outcomes || []),
          data.instructions || (data as any).volunteer_instructions || 'Report on time with safety gloves.',
          JSON.stringify(data.equipment_requirements || (data as any).equipment_needed || []),
          data.safety_guidelines || 'Follow team supervisor instructions.',
          JSON.stringify(data.faq || []),
          data.cover_image_path || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
          data.ward_id || `ward-${String(data.ward_number || 3).padStart(2, '0')}`,
          data.ward_number || 3,
          data.ward_name || `Ward ${data.ward_number || 3}`,
          data.latitude || 20.9470,
          data.longitude || 72.9280,
          data.address || (data as any).target_area || 'Navsari Municipal Area',
          data.landmark || (data as any).meeting_point || null,
          data.proposed_start_at || new Date(Date.now() + 86400000).toISOString(),
          data.proposed_end_at || new Date(Date.now() + 86400000 + 10800000).toISOString(),
          data.registration_open_at || new Date().toISOString(),
          data.registration_close_at || new Date(Date.now() + 86400000).toISOString(),
          data.maximum_participants || (data as any).max_capacity || 50,
          data.minimum_participants || 10,
          data.waiting_list_enabled ?? true,
          data.registration_requires_approval ?? false,
          data.publication_status || 'draft',
          data.approval_status || 'draft',
          data.registration_status || 'not_open',
          data.event_status || 'upcoming',
          data.evidence_status || 'not_submitted',
          this.isValidUUID(data.created_by) ? data.created_by : 'c0000000-0000-0000-0000-000000000099',
          linkedProblemId
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

  public static async updateCommunityActivity(id: string, data: Partial<CommunityActivity> & { max_capacity?: number }): Promise<CommunityActivity | null> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        const existing = await this.getActivityById(id);
        if (!existing) return null;

        const rawMax = data.maximum_participants ?? data.max_capacity;
        const parsedMax = rawMax !== undefined && rawMax !== null && !isNaN(Number(rawMax))
          ? Math.max(1, parseInt(String(rawMax), 10))
          : null;

        await pool.query(`
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
          parsedMax,
          data.proposed_start_at || null,
          data.proposed_end_at || null,
          data.address || null,
          data.landmark || null,
          id
        ]);

        // Sync max_volunteers & auto-close/reopen registration_status based on current count
        if (parsedMax !== null) {
          await pool.query(
            `UPDATE cleanliness_drives SET max_volunteers = $1 WHERE id = $2`,
            [parsedMax, id]
          ).catch(() => {});

          const cntRes = await pool.query(
            `SELECT COUNT(*) FROM activity_registrations WHERE activity_id = $1 AND registration_status <> 'cancelled'`,
            [id]
          ).catch(() => ({ rows: [{ count: '0' }] }));
          const activeCount = parseInt(cntRes.rows[0]?.count || '0', 10);

          if (activeCount >= parsedMax) {
            await pool.query(
              `UPDATE community_activities SET registration_status = 'closed', updated_at = NOW() WHERE id = $1`,
              [id]
            ).catch(() => {});
          } else if (existing.registration_status === 'closed' && existing.event_status !== 'completed') {
            // Reopen automatically if organizer raised the limit above current enrollment
            await pool.query(
              `UPDATE community_activities SET registration_status = 'open', updated_at = NOW() WHERE id = $1`,
              [id]
            ).catch(() => {});
          }
        }

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

    if (isDbConnected()) {
      try {
        let query = `
          SELECT r.*,
                 COALESCE(NULLIF(TRIM(p.full_name), ''), 'Registered Citizen') as citizen_name,
                 COALESCE(p.phone, '') as citizen_phone,
                 COALESCE(p.email, '') as citizen_email,
                 COALESCE(a.title, 'Cleanliness Drive') as activity_title
          FROM activity_registrations r
          LEFT JOIN profiles p ON p.id = r.citizen_id
          LEFT JOIN community_activities a ON a.id = r.activity_id
          WHERE r.registration_status <> 'cancelled'
        `;
        const values: any[] = [];
        let idx = 1;

        if (activityId && this.isValidUUID(activityId)) {
          query += ` AND r.activity_id = $${idx++}`;
          values.push(activityId);
        }

        if (params.status && params.status !== 'all') {
          query += ` AND r.registration_status = $${idx++}`;
          values.push(params.status);
        }

        if (params.attendance && params.attendance !== 'all') {
          query += ` AND r.attendance_status = $${idx++}`;
          values.push(params.attendance);
        }

        if (params.search && params.search.trim()) {
          query += ` AND (COALESCE(p.full_name, '') ILIKE $${idx} OR r.registration_number ILIKE $${idx} OR COALESCE(p.phone, '') ILIKE $${idx})`;
          values.push(`%${params.search.trim()}%`);
          idx++;
        }

        const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) q`, values);
        const total = parseInt(countRes.rows[0]?.count || '0');

        query += ` ORDER BY r.registered_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        values.push(limit, offset);

        const res = await pool.query(query, values);
        const registrations = res.rows.map(r => ({
          id: r.id,
          activity_id: r.activity_id,
          activity_title: r.activity_title,
          citizen_id: r.citizen_id,
          citizen_name: r.citizen_name,
          citizen_phone: r.citizen_phone,
          citizen_email: r.citizen_email,
          registration_number: r.registration_number,
          registration_status: r.registration_status,
          attendance_status: r.attendance_status,
          registered_at: r.registered_at,
          cancelled_at: r.cancelled_at
        }));

        if (registrations.length > 0 || total > 0) {
          return { registrations, total };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityRegistrations]:', err.message);
      }
    }

    let memRegs = (store as any).activityRegistrations || [];
    if (activityId) {
      memRegs = memRegs.filter((r: any) => r.activity_id === activityId);
    }
    if (params.status && params.status !== 'all') {
      memRegs = memRegs.filter((r: any) => r.registration_status === params.status);
    }
    if (params.attendance && params.attendance !== 'all') {
      memRegs = memRegs.filter((r: any) => r.attendance_status === params.attendance);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      memRegs = memRegs.filter((r: any) => (r.citizen_name || '').toLowerCase().includes(q) || (r.registration_number || '').toLowerCase().includes(q));
    }
    return {
      registrations: memRegs.slice(offset, offset + limit),
      total: memRegs.length
    };
  }

  public static async updateRegistrationAttendance(
    registrationId: string,
    attendanceStatus: string,
    registrationStatus?: string
  ): Promise<ActivityRegistration | null> {
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
          return {
            id: r.id,
            activity_id: r.activity_id,
            citizen_id: r.citizen_id,
            registration_number: r.registration_number,
            registration_status: r.registration_status,
            attendance_status: r.attendance_status,
            registered_at: r.registered_at,
            cancelled_at: r.cancelled_at
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateRegistrationAttendance]:', err.message);
      }
    }
    return null;
  }

  // =========================================================================
  // CITIZEN QUESTIONS & AI SUGGESTIONS
  // =========================================================================

  public static async createActivityQuestion(
    activityId: string,
    communityId: string,
    citizenId: string,
    questionText: string,
    lang: string = 'en',
    citizenInfo?: { fullName?: string; phone?: string }
  ): Promise<ActivityQuestion> {
    const validCitizen = this.isValidUUID(citizenId) ? citizenId : 'c0000000-0000-0000-0000-000000000001';
    await this.ensureProfileExists(
      validCitizen,
      citizenInfo?.fullName?.trim() || 'Citizen Volunteer',
      citizenInfo?.phone?.trim() || '+919876543210'
    );

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO activity_questions (activity_id, community_id, citizen_id, question_text, question_language, status)
          VALUES ($1, $2, $3, $4, $5, 'ai_suggestion_pending')
          RETURNING *
        `, [activityId, communityId, validCitizen, questionText.trim(), lang]);

        const r = res.rows[0];
        return {
          id: r.id,
          activity_id: r.activity_id,
          community_id: r.community_id,
          citizen_id: r.citizen_id,
          question_text: r.question_text,
          question_language: r.question_language,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      } catch (err: any) {
        console.error('[DB REPO ERROR - createActivityQuestion]:', err.message);
      }
    }

    return {
      id: `q-${Date.now()}`,
      activity_id: activityId,
      community_id: communityId,
      citizen_id: validCitizen,
      question_text: questionText,
      question_language: lang as any,
      status: 'ai_suggestion_pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  public static async getActivityQuestions(communityId: string, params: {
    activityId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ questions: ActivityQuestion[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 50));
    const offset = (page - 1) * limit;

    if (isDbConnected()) {
      try {
        let query = `
          SELECT q.*, COALESCE(NULLIF(TRIM(p.full_name), ''), 'Citizen Volunteer') as citizen_name, a.title as activity_title,
            s.id as s_id, s.suggested_answer, s.answerability_status, s.supporting_information, s.missing_information,
            resp.id as r_id, resp.response_text, resp.created_at as answered_at, COALESCE(NULLIF(TRIM(rp.full_name), ''), 'Community Head') as responder_name
          FROM activity_questions q
          LEFT JOIN profiles p ON p.id = q.citizen_id
          JOIN community_activities a ON a.id = q.activity_id
          LEFT JOIN activity_ai_answer_suggestions s ON s.question_id = q.id
          LEFT JOIN activity_question_responses resp ON resp.question_id = q.id
          LEFT JOIN profiles rp ON rp.id = resp.responder_id
          WHERE 1=1
        `;
        const values: any[] = [];
        let idx = 1;

        if (communityId && this.isValidUUID(communityId)) {
          query += ` AND q.community_id = $${idx++}`;
          values.push(communityId);
        }

        if (params.activityId && this.isValidUUID(params.activityId)) {
          query += ` AND q.activity_id = $${idx++}`;
          values.push(params.activityId);
        }

        if (params.status && params.status !== 'all') {
          query += ` AND q.status = $${idx++}`;
          values.push(params.status);
        }

        if (params.search && params.search.trim()) {
          query += ` AND (q.question_text ILIKE $${idx} OR a.title ILIKE $${idx} OR p.full_name ILIKE $${idx})`;
          values.push(`%${params.search.trim()}%`);
          idx++;
        }

        const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) c_q`, values);
        const total = parseInt(countRes.rows[0]?.count || '0');

        query += ` ORDER BY q.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        values.push(limit, offset);

        const res = await pool.query(query, values);
        const questions: ActivityQuestion[] = res.rows.map(r => ({
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
            answerability_status: r.answerability_status || 'high_confidence',
            supporting_information: r.supporting_information || [],
            missing_information: r.missing_information || [],
            generation_status: 'ready',
            created_at: r.created_at
          } : undefined,
          response_text: r.response_text || undefined,
          answered_at: r.answered_at || undefined,
          responder_name: r.r_id ? (r.responder_name || 'Community Head') : undefined,
          response: r.r_id ? {
            id: r.r_id,
            question_id: r.id,
            suggestion_id: r.s_id,
            responder_id: r.responder_id || r.citizen_id,
            responder_name: r.responder_name || 'Community Head',
            response_text: r.response_text,
            ai_assisted: true,
            created_at: r.answered_at
          } : undefined
        } as any));

        return { questions, total };
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityQuestions]:', err.message);
      }
    }

    return { questions: [], total: 0 };
  }

  public static async getQuestionById(questionId: string): Promise<ActivityQuestion | null> {
    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        const res = await pool.query(`
          SELECT q.*, p.full_name as citizen_name, a.title as activity_title,
            s.id as s_id, s.suggested_answer, s.answerability_status, s.supporting_information, s.missing_information,
            resp.id as r_id, resp.response_text, resp.created_at as answered_at, rp.full_name as responder_name
          FROM activity_questions q
          JOIN profiles p ON p.id = q.citizen_id
          JOIN community_activities a ON a.id = q.activity_id
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
    return null;
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
        return {
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

    return {
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

  public static async respondToQuestion(
    questionId: string,
    responderId: string,
    responseText: string,
    suggestionId?: string
  ): Promise<ActivityQuestionResponse> {
    const validResponder = this.isValidUUID(responderId) ? responderId : 'c0000000-0000-0000-0000-000000000099';

    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        const qRes = await pool.query(`
          SELECT q.*, a.title as activity_title, COALESCE(p.full_name, 'Citizen Volunteer') as citizen_name
          FROM activity_questions q
          JOIN community_activities a ON a.id = q.activity_id
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

          // Mark question as answered
          await pool.query(`
            UPDATE activity_questions SET status = 'answered', updated_at = NOW() WHERE id = $1
          `, [questionId]);

          // Create in-app notification for the citizen!
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
          return {
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

    return {
      id: `resp-${Date.now()}`,
      question_id: questionId,
      suggestion_id: suggestionId,
      responder_id: validResponder,
      response_text: responseText,
      ai_assisted: Boolean(suggestionId),
      created_at: new Date().toISOString()
    };
  }

  public static async updateQuestionStatus(questionId: string, status: string): Promise<boolean> {
    if (isDbConnected() && this.isValidUUID(questionId)) {
      try {
        await pool.query('UPDATE activity_questions SET status = $1, updated_at = NOW() WHERE id = $2', [status, questionId]);
        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - updateQuestionStatus]:', err.message);
      }
    }
    return false;
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
    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        const res = await pool.query(`
          SELECT * FROM activity_evidence
          WHERE activity_id = $1
          ORDER BY created_at ASC
        `, [activityId]);

        return res.rows.map(r => ({
          id: r.id,
          activity_id: r.activity_id,
          uploaded_by: r.uploaded_by,
          evidence_type: r.evidence_type,
          stage: r.evidence_type,
          storage_path: r.storage_path,
          caption: r.caption,
          description: r.description,
          latitude: r.latitude ? parseFloat(r.latitude) : undefined,
          longitude: r.longitude ? parseFloat(r.longitude) : undefined,
          image_hash: r.image_hash,
          review_metadata: r.review_metadata || {},
          evidence_version: r.evidence_version || 1,
          submission_status: r.submission_status,
          created_at: r.created_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getActivityEvidence]:', err.message);
      }
    }
    return [];
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
    review_metadata?: Record<string, any>;
  }): Promise<ActivityEvidence> {
    const validUploader = this.isValidUUID(data.uploaded_by) ? data.uploaded_by : 'c0000000-0000-0000-0000-000000000099';
    const meta = data.review_metadata || {};

    if (isDbConnected()) {
      try {
        const res = await pool.query(`
          INSERT INTO activity_evidence (
            activity_id, uploaded_by, evidence_type, storage_path, caption, description, latitude, longitude, image_hash, review_metadata, submission_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'submitted')
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
          data.image_hash || null,
          JSON.stringify(meta)
        ]);

        // Automatically sync activity status when evidence is uploaded
        if (this.isValidUUID(data.activity_id)) {
          if (data.evidence_type === 'after') {
            await pool.query(
              `UPDATE community_activities SET evidence_status = 'submitted', updated_at = NOW() WHERE id = $1 AND COALESCE(evidence_status, '') <> 'verified_complete'`,
              [data.activity_id]
            ).catch(() => {});
          } else {
            await pool.query(
              `UPDATE community_activities SET event_status = CASE WHEN event_status = 'upcoming' THEN 'ongoing' ELSE event_status END, updated_at = NOW() WHERE id = $1`,
              [data.activity_id]
            ).catch(() => {});
          }
        }

        const r = res.rows[0];
        return {
          id: r.id,
          activity_id: r.activity_id,
          uploaded_by: r.uploaded_by,
          evidence_type: r.evidence_type,
          stage: r.evidence_type,
          storage_path: r.storage_path,
          caption: r.caption,
          description: r.description,
          latitude: r.latitude ? parseFloat(r.latitude) : undefined,
          longitude: r.longitude ? parseFloat(r.longitude) : undefined,
          image_hash: r.image_hash,
          review_metadata: r.review_metadata || meta,
          evidence_version: r.evidence_version || 1,
          submission_status: r.submission_status,
          created_at: r.created_at
        } as any;
      } catch (err: any) {
        console.error('[DB REPO ERROR - createActivityEvidence]:', err.message);
      }
    }

    return {
      id: `ev-${Date.now()}`,
      activity_id: data.activity_id,
      uploaded_by: validUploader,
      evidence_type: data.evidence_type,
      stage: data.evidence_type,
      storage_path: data.storage_path,
      caption: data.caption,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      image_hash: data.image_hash,
      review_metadata: meta,
      evidence_version: 1,
      submission_status: 'submitted',
      created_at: new Date().toISOString()
    } as any;
  }

  public static async submitActivityEvidence(activityId: string, submittedBy: string): Promise<boolean> {
    const validSubmitter = this.isValidUUID(submittedBy) ? submittedBy : 'c0000000-0000-0000-0000-000000000099';

    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        await pool.query(`
          UPDATE activity_evidence SET submission_status = 'submitted' WHERE activity_id = $1
        `, [activityId]);

        await pool.query(`
          INSERT INTO activity_evidence_submissions (activity_id, submitted_by, submission_status)
          VALUES ($1, $2, 'under_ward_review')
        `, [activityId, validSubmitter]);

        await this.changeActivityStatus(
          activityId,
          { evidence_status: 'submitted', event_status: 'completed' },
          validSubmitter,
          'Evidence submitted for official Ward Officer & NMC Admin verification'
        );

        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - submitActivityEvidence]:', err.message);
      }
    }
    return false;
  }

  public static async reviewActivityEvidence(
    activityId: string,
    reviewerId: string,
    reviewerRole: 'ward_officer' | 'nmc_admin',
    decision: 'approved' | 'rejected' | 'changes_requested',
    comments: string
  ): Promise<boolean> {
    const validReviewer = this.isValidUUID(reviewerId) ? reviewerId : 'w0000000-0000-0000-0000-000000000003';

    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        await pool.query(`
          INSERT INTO activity_evidence_reviews (activity_id, reviewer_id, reviewer_role, decision, comments)
          VALUES ($1, $2, $3, $4, $5)
        `, [activityId, validReviewer, reviewerRole, decision, comments]);

        const nextEvidenceStatus =
          decision === 'approved'
            ? 'verified_complete'
            : decision === 'rejected'
            ? 'rejected'
            : 'changes_requested';

        const statusUpdates: Record<string, string> = { evidence_status: nextEvidenceStatus };
        if (decision === 'approved') {
          statusUpdates.event_status = 'completed';
          statusUpdates.registration_status = 'closed';
        }

        await this.changeActivityStatus(
          activityId,
          statusUpdates,
          validReviewer,
          `Evidence reviewed by ${reviewerRole}: ${decision.toUpperCase()}`
        );

        if (decision === 'approved') {
          await pool.query(`
            UPDATE activity_evidence SET submission_status = 'verified' WHERE activity_id = $1
          `, [activityId]).catch(() => {});
          await pool.query(`
            UPDATE cleanliness_drives SET status = 'completed' WHERE id = $1
          `, [activityId]).catch(() => {});
        }

        return true;
      } catch (err: any) {
        console.error('[DB REPO ERROR - reviewActivityEvidence]:', err.message);
      }
    }
    return false;
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
      max_capacity: r.maximum_participants,
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
    } as any;
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
      citizen_phone: r.citizen_phone || undefined,
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
                 COALESCE(wp.designation, wd.designation_name, 'Sanitation Worker') as resolved_designation,
                 wd.designation_code,
                 COALESCE(
                   (SELECT json_agg(ws.skill_name)
                    FROM worker_profile_skills wps
                    JOIN worker_skills ws ON ws.id = wps.skill_id
                    WHERE wps.worker_id = wp.id),
                   '[]'::json
                 ) as relation_skills
          FROM worker_profiles wp
          LEFT JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          WHERE wp.user_id = $1 OR wp.id = $1
          LIMIT 1
        `, [userId]);

        if (res.rows.length > 0) {
          const r = res.rows[0];
          let parsedSkills: string[] = [];
          if (Array.isArray(r.skills) && r.skills.length > 0) {
            parsedSkills = r.skills;
          } else if (typeof r.skills === 'string' && r.skills.trim() && r.skills !== '[]') {
            try { parsedSkills = JSON.parse(r.skills); } catch { parsedSkills = []; }
          } else if (Array.isArray(r.relation_skills) && r.relation_skills.length > 0) {
            parsedSkills = r.relation_skills;
          }
          const createdDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          return {
            id: r.id,
            user_id: r.user_id,
            worker_code: r.worker_code,
            full_name: r.full_name || r.username || r.worker_code,
            phone: r.phone || '',
            email: r.email || undefined,
            avatar_url: r.avatar_url || undefined,
            primary_designation_id: r.primary_designation_id,
            designation_name: r.resolved_designation || 'Sanitation Worker',
            designation_code: r.designation_code || 'sanitation_worker',
            ward_id: r.ward_id || `ward-${String(r.ward_number || 3).padStart(2, '0')}`,
            ward_number: r.ward_number || 3,
            ward_name: r.ward_name || `Ward ${r.ward_number || 3}`,
            employment_status: r.employment_status || 'permanent',
            joining_date: r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : createdDate,
            experience_years: r.experience_years !== null && r.experience_years !== undefined ? parseFloat(r.experience_years) : 0,
            availability_status: r.availability_status || 'available',
            emergency_contact_name: r.emergency_contact_name || undefined,
            emergency_contact_phone: r.emergency_contact_phone || undefined,
            language_preference: r.language_preference || 'gu',
            skills: parsedSkills,
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
        worker_code: fromStore.worker_code || 'NMC-WRK',
        full_name: fromStore.full_name,
        phone: fromStore.phone,
        email: fromStore.email,
        avatar_url: fromStore.avatar_url,
        designation_name: fromStore.designation || 'Sanitation Worker',
        designation_code: fromStore.designation?.toLowerCase().replace(/\s+/g, '_') || 'sanitation_worker',
        ward_id: `ward-${String(fromStore.ward_number || 3).padStart(2, '0')}`,
        ward_number: fromStore.ward_number || 3,
        ward_name: fromStore.ward_name || `Ward ${fromStore.ward_number || 3}`,
        employment_status: 'permanent',
        joining_date: fromStore.created_at ? fromStore.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        experience_years: fromStore.experience_years || 0,
        availability_status: fromStore.availability_status || 'available',
        language_preference: 'gu',
        skills: Array.isArray(fromStore.skills) ? fromStore.skills : [],
        created_at: fromStore.created_at || new Date().toISOString(),
        updated_at: fromStore.updated_at || new Date().toISOString()
      };
    }

    // Check profiles store for dynamically registered worker
    const userProfile = (store.profiles || []).find(p => p.id === userId || p.username === userId);
    if (userProfile && (userProfile.role === 'worker' || (userProfile as any).role === 'sanitation_worker')) {
      const wardNum = (userProfile as any).ward_number || 3;
      return {
        id: userProfile.id,
        user_id: userProfile.id,
        worker_code: userProfile.username?.startsWith('WRK') ? userProfile.username : `WRK-${userProfile.id.slice(0, 6).toUpperCase()}`,
        full_name: userProfile.full_name,
        phone: userProfile.phone,
        email: userProfile.email,
        avatar_url: userProfile.avatar_url,
        designation_name: 'Sanitation Worker',
        designation_code: 'sanitation_worker',
        ward_id: `ward-${String(wardNum).padStart(2, '0')}`,
        ward_number: wardNum,
        ward_name: `Ward ${wardNum}`,
        employment_status: 'permanent',
        joining_date: userProfile.created_at ? userProfile.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        experience_years: 0,
        availability_status: 'available',
        language_preference: userProfile.preferred_language || 'gu',
        skills: [],
        created_at: userProfile.created_at || new Date().toISOString()
      };
    }

    return null;
  }

  public static async getWorkerAssignments(workerId: string, filterStatus?: string): Promise<WorkAssignment[]> {
    let dbAssignments: WorkAssignment[] = [];
    if (isDbConnected() && this.isValidUUID(workerId)) {
      try {
        let query = `
          SELECT wa.*, wam.temporary_leader, wam.assignment_status as my_attendance_status,
                 (SELECT COALESCE(p.full_name, lp.username, lp.worker_code)
                  FROM work_assignment_members lm
                  JOIN worker_profiles lp ON lp.id = lm.worker_id
                  LEFT JOIN profiles p ON p.id = lp.user_id
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
          WHERE (
            wam.worker_id = $1
            OR wam.worker_id IN (SELECT id FROM worker_profiles WHERE user_id = $1)
          )
        `;
        const values: any[] = [workerId];
        if (filterStatus && filterStatus !== 'all') {
          query += ` AND wa.status = $2`;
          values.push(filterStatus);
        }
        query += ` ORDER BY wa.created_at DESC, wa.scheduled_date DESC`;

        const res = await pool.query(query, values);

        dbAssignments = await Promise.all(res.rows.map(async r => {
          const members = await this.getAssignmentTeamMembers(r.id);
          return {
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
            scheduled_date: r.scheduled_date ? (r.scheduled_date instanceof Date ? r.scheduled_date.toISOString().split('T')[0] : String(r.scheduled_date)) : new Date().toISOString().split('T')[0],
            scheduled_start_time: r.scheduled_start_time ? (r.scheduled_start_time instanceof Date ? r.scheduled_start_time.toISOString() : String(r.scheduled_start_time)) : new Date().toISOString(),
            expected_end_time: r.expected_end_time ? (r.expected_end_time instanceof Date ? r.expected_end_time.toISOString() : String(r.expected_end_time)) : new Date().toISOString(),
            deadline: r.expected_end_time ? (r.expected_end_time instanceof Date ? r.expected_end_time.toISOString() : String(r.expected_end_time)) : undefined,
            attendance_radius_meters: parseInt(r.attendance_radius_meters || '150', 10),
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
            temporary_leader_name: r.temporary_leader_name || (Boolean(r.temporary_leader) ? 'You (Team Leader)' : 'Team Leader'),
            temporary_leader_id: r.temporary_leader_id,
            my_attendance_status: r.my_attendance_status,
            has_before_evidence: Boolean(r.has_before_evidence),
            has_after_evidence: Boolean(r.has_after_evidence),
            team_members: members,
            complaint_id: r.complaint_id || undefined,
            complaint_number: r.complaint_number || undefined,
            team_id: r.team_id || undefined,
            team_name: r.team_name || undefined
          } as any;
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkerAssignments]:', err.message);
      }
    }

    // Also merge in-memory store so newly created tasks are never lost
    const allAssignments = store.workAssignments || [];
    const matchingWorker = (store.workers || []).find(w => w.id === workerId || w.user_id === workerId);
    const idCandidates = new Set([workerId, matchingWorker?.id, matchingWorker?.user_id].filter(Boolean));

    const inMemoryMatches = allAssignments
      .filter(a => {
        const inTeam = (a.team_members || []).some(m => idCandidates.has(m.worker_id) || idCandidates.has((m as any).user_id));
        const isLeader = Boolean(a.temporary_leader_id && idCandidates.has(a.temporary_leader_id));
        return inTeam || isLeader;
      })
      .map(a => {
        const isLeader = Boolean(
          (a.temporary_leader_id && idCandidates.has(a.temporary_leader_id)) ||
          (a.team_members || []).some(m => (idCandidates.has(m.worker_id) || idCandidates.has((m as any).user_id)) && m.temporary_leader)
        );
        return {
          ...a,
          is_temporary_leader: isLeader,
          temporary_leader_name: a.temporary_leader_name || (isLeader ? 'You (Team Leader)' : 'Team Leader'),
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
            emergency_contact_phone, status, complaint_id, complaint_number,
            team_id, team_name, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18,
            $19, $20, $21,
            $22, $23, $24, $25,
            $26, $27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            work_instructions = EXCLUDED.work_instructions,
            complaint_id = COALESCE(EXCLUDED.complaint_id, work_assignments.complaint_id),
            complaint_number = COALESCE(EXCLUDED.complaint_number, work_assignments.complaint_number),
            team_id = COALESCE(EXCLUDED.team_id, work_assignments.team_id),
            team_name = COALESCE(EXCLUDED.team_name, work_assignments.team_name),
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
          assignment.attendance_radius_meters || 150,
          assignment.evidence_radius_meters || 150,
          assignment.work_instructions || 'Clean up assigned civic location.',
          assignment.safety_instructions || 'Wear boots, gloves, and reflective jacket.',
          JSON.stringify(assignment.required_equipment || ['Broom', 'Shovel', 'Gloves']),
          assignment.emergency_contact_phone || '+919825130003',
          assignment.status || 'assigned',
          (assignment as any).complaint_id || null,
          (assignment as any).complaint_number || null,
          (assignment as any).team_id || null,
          (assignment as any).team_name || null
        ]);

        for (const m of members) {
          const rawWorkerId = m.worker_id || m.id;
          if (!rawWorkerId || !this.isValidUUID(rawWorkerId)) continue;

          let resolvedWorkerId = rawWorkerId;
          const checkWp = await pool.query(`SELECT id FROM worker_profiles WHERE id = $1 OR user_id = $1 LIMIT 1`, [rawWorkerId]);
          if (checkWp.rows.length > 0) {
            resolvedWorkerId = checkWp.rows[0].id;
          } else {
            // Skip if not present in worker_profiles to avoid FK violation
            continue;
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
            Boolean(m.temporary_leader || m.is_leader || rawWorkerId === assignment.temporary_leader_id || resolvedWorkerId === assignment.temporary_leader_id)
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
    if (workerId) {
      const assignments = await this.getWorkerAssignments(workerId);
      const match = assignments.find(a => a.id === assignmentId);
      if (match) {
        match.team_members = await this.getAssignmentTeamMembers(assignmentId);
        return match;
      }
    }
    if (isDbConnected() && this.isValidUUID(assignmentId)) {
      try {
        const res = await pool.query(`SELECT * FROM work_assignments WHERE id = $1 LIMIT 1`, [assignmentId]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          const members = await this.getAssignmentTeamMembers(assignmentId);
          return {
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
            scheduled_date: r.scheduled_date ? String(r.scheduled_date) : new Date().toISOString().split('T')[0],
            scheduled_start_time: r.scheduled_start_time ? new Date(r.scheduled_start_time).toISOString() : new Date().toISOString(),
            expected_end_time: r.expected_end_time ? new Date(r.expected_end_time).toISOString() : new Date().toISOString(),
            attendance_radius_meters: parseInt(r.attendance_radius_meters || '150', 10),
            evidence_radius_meters: parseInt(r.evidence_radius_meters || '150', 10),
            work_instructions: r.work_instructions,
            safety_instructions: r.safety_instructions,
            required_equipment: Array.isArray(r.required_equipment) ? r.required_equipment : [],
            emergency_contact_phone: r.emergency_contact_phone || '+919825110003',
            status: r.status,
            created_at: r.created_at,
            updated_at: r.updated_at,
            team_members: members,
            complaint_id: r.complaint_id || undefined,
            complaint_number: r.complaint_number || undefined,
            team_id: r.team_id || undefined,
            team_name: r.team_name || undefined
          } as any;
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getAssignmentById]:', err.message);
      }
    }
    const mem = (store.workAssignments || []).find(a => a.id === assignmentId);
    return mem || null;
  }

  public static async getAssignmentTeamMembers(assignmentId: string): Promise<WorkAssignmentMember[]> {
    if (isDbConnected() && this.isValidUUID(assignmentId)) {
      try {
        const res = await pool.query(`
          SELECT wam.*, wp.worker_code, wp.user_id,
                 COALESCE(p.full_name, wp.username, wp.worker_code) as worker_name,
                 COALESCE(p.phone, '') as worker_phone,
                 COALESCE(wp.designation, wd.designation_name, 'Sanitation Worker') as designation_name,
                 wa_att.attendance_timestamp, wa_att.validation_status, wa_att.distance_from_assignment_meters
          FROM work_assignment_members wam
          JOIN worker_profiles wp ON wp.id = wam.worker_id
          LEFT JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          LEFT JOIN LATERAL (
            SELECT attendance_timestamp, validation_status, distance_from_assignment_meters
            FROM worker_attendance
            WHERE assignment_id = wam.assignment_id AND worker_id = wam.worker_id
            ORDER BY attendance_timestamp DESC
            LIMIT 1
          ) wa_att ON TRUE
          WHERE wam.assignment_id = $1
          ORDER BY wam.temporary_leader DESC, worker_name ASC
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
          attendance_timestamp: r.attendance_timestamp ? new Date(r.attendance_timestamp).toISOString() : undefined,
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

    return [];
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
    if (isDbConnected() && this.isValidUUID(assignmentId)) {
      try {
        const res = await pool.query(`
          SELECT we.*, COALESCE(p.full_name, wp.username, wp.worker_code, 'Field Team Leader') as worker_name
          FROM work_evidence we
          LEFT JOIN worker_profiles wp ON wp.id = we.submitted_by
          LEFT JOIN profiles p ON p.id = wp.user_id
          WHERE we.assignment_id = $1
          ORDER BY we.created_at ASC
        `, [assignmentId]);

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
          device_capture_timestamp: r.device_capture_timestamp ? new Date(r.device_capture_timestamp).toISOString() : new Date().toISOString(),
          server_upload_timestamp: r.server_upload_timestamp ? new Date(r.server_upload_timestamp).toISOString() : new Date().toISOString(),
          ai_analysis_status: r.ai_analysis_status,
          ai_analysis_result: r.ai_analysis_result,
          review_status: r.review_status,
          review_comments: r.review_comments,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkEvidence]:', err.message);
      }
    }

    const memEvidences = ((store as any).workEvidence || []).filter((e: any) => e.assignment_id === assignmentId);
    return memEvidences;
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
    const validAssignment = this.isValidUUID(assignmentId) ? assignmentId : randomUUID();
    let validWorker = this.isValidUUID(workerId) ? workerId : 'f2000000-0000-0000-0000-000000000001';
    let workerName = 'Team Leader';

    let distanceMeters: number | undefined = undefined;
    let locationStatus: 'location_matched' | 'location_mismatch' | 'manual_upload' = 'manual_upload';

    if (isDbConnected()) {
      try {
        const wpRes = await pool.query(
          `SELECT wp.id, COALESCE(p.full_name, wp.username, wp.worker_code) as full_name
           FROM worker_profiles wp
           LEFT JOIN profiles p ON p.id = wp.user_id
           WHERE wp.id = $1 OR wp.user_id = $1
           LIMIT 1`,
          [validWorker]
        );
        if (wpRes.rows.length > 0) {
          validWorker = wpRes.rows[0].id;
          workerName = wpRes.rows[0].full_name || workerName;
        }
      } catch {}
    }

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

    const nowIso = new Date().toISOString();
    const evidence: WorkEvidence = {
      id: `ev-${Date.now()}`,
      assignment_id: validAssignment,
      submitted_by: validWorker,
      worker_name: workerName,
      evidence_type: evidenceType,
      storage_path: storagePath,
      description: description.trim(),
      latitude: lat,
      longitude: lon,
      gps_accuracy: accuracy,
      distance_from_assignment_meters: distanceMeters,
      location_validation_status: locationStatus,
      device_capture_timestamp: nowIso,
      server_upload_timestamp: nowIso,
      review_status: 'submitted',
      created_at: nowIso
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
          evidence.created_at = res.rows[0].created_at ? new Date(res.rows[0].created_at).toISOString() : nowIso;
          evidence.device_capture_timestamp = res.rows[0].device_capture_timestamp ? new Date(res.rows[0].device_capture_timestamp).toISOString() : nowIso;
          evidence.server_upload_timestamp = res.rows[0].server_upload_timestamp ? new Date(res.rows[0].server_upload_timestamp).toISOString() : nowIso;
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - addWorkEvidence]:', err.message);
      }
    }

    if (!(store as any).workEvidence) (store as any).workEvidence = [];
    (store as any).workEvidence.push(evidence);

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

  public static async verifyCompleteAssignment(assignmentOrComplaintId: string, complaintNumber?: string): Promise<void> {
    // 1. Update memory store
    (store.workAssignments || []).forEach(wa => {
      if (
        wa.id === assignmentOrComplaintId ||
        wa.task_code === assignmentOrComplaintId ||
        (wa as any).complaint_id === assignmentOrComplaintId ||
        (complaintNumber && (wa as any).complaint_number === complaintNumber)
      ) {
        wa.status = 'verified_complete';
        (wa as any).verified_complete = true;
        wa.updated_at = new Date().toISOString();
      }
    });

    // 2. Update PostgreSQL database
    if (isDbConnected()) {
      try {
        if (this.isValidUUID(assignmentOrComplaintId)) {
          await pool.query(`
            UPDATE work_assignments
            SET status = 'verified_complete', updated_at = NOW()
            WHERE id = $1 OR complaint_id = $2 OR ($3 <> '' AND complaint_number = $3)
          `, [assignmentOrComplaintId, assignmentOrComplaintId, complaintNumber || '']);
        } else {
          await pool.query(`
            UPDATE work_assignments
            SET status = 'verified_complete', updated_at = NOW()
            WHERE task_code = $1 OR complaint_id = $1 OR ($2 <> '' AND complaint_number = $2)
          `, [assignmentOrComplaintId, complaintNumber || '']);
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - verifyCompleteAssignment]:', err.message);
      }
    }
  }

  public static async getAssignmentsAndEvidenceForComplaint(complaintId: string, complaintNumber?: string): Promise<any[]> {
    if (!isDbConnected()) return [];
    try {
      const res = await pool.query(`
        SELECT *
        FROM work_assignments
        WHERE complaint_id = $1
           OR ($2 <> '' AND complaint_number = $2)
        ORDER BY created_at ASC
      `, [complaintId, complaintNumber || '']);

      const results: any[] = [];
      for (let i = 0; i < res.rows.length; i++) {
        const wa = res.rows[i];
        const [members, attRes, evidence, completionReport] = await Promise.all([
          this.getAssignmentTeamMembers(wa.id),
          pool.query(`SELECT * FROM worker_attendance WHERE assignment_id = $1 ORDER BY attendance_timestamp ASC`, [wa.id]).catch(() => ({ rows: [] as any[] })),
          this.getWorkEvidence(wa.id),
          this.getWorkCompletionReport(wa.id)
        ]);

        const leader = members.find(m => m.temporary_leader) || members[0];
        results.push({
          id: `att-db-${wa.id}`,
          complaint_id: complaintId,
          attempt_number: i + 1,
          assignment_id: wa.id,
          task_code: wa.task_code,
          team_name: wa.team_name || undefined,
          assigned_date: wa.created_at ? new Date(wa.created_at).toISOString() : new Date().toISOString(),
          deadline: wa.expected_end_time ? new Date(wa.expected_end_time).toISOString() : undefined,
          team_leader_id: leader?.worker_id || null,
          team_leader_name: leader?.worker_name || 'Assigned Leader',
          team_members: members.map(m => ({
            worker_id: m.worker_id,
            worker_code: m.worker_code,
            name: m.worker_name,
            full_name: m.worker_name,
            worker_name: m.worker_name,
            phone: m.worker_phone,
            designation: m.designation_name,
            is_temporary_leader: m.temporary_leader
          })),
          attendance_records: attRes.rows.map(a => ({
            id: a.id,
            assignment_id: a.assignment_id,
            worker_id: a.worker_id,
            attendance_timestamp: a.attendance_timestamp ? new Date(a.attendance_timestamp).toISOString() : new Date().toISOString(),
            latitude: parseFloat(a.latitude),
            longitude: parseFloat(a.longitude),
            gps_accuracy: parseFloat(a.gps_accuracy || '10'),
            distance_from_assignment_meters: parseFloat(a.distance_from_assignment_meters || '0'),
            geofence_radius_meters: parseInt(a.geofence_radius_meters || '150', 10),
            validation_status: a.validation_status,
            attendance_method: a.attendance_method || 'gps',
            created_at: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString()
          })),
          evidence,
          completion_report: completionReport || undefined,
          status: wa.status,
          created_at: wa.created_at ? new Date(wa.created_at).toISOString() : new Date().toISOString()
        });
      }
      return results;
    } catch (err: any) {
      console.error('[DB REPO ERROR - getAssignmentsAndEvidenceForComplaint]:', err.message);
      return [];
    }
  }

  public static async getWorkCompletionReport(assignmentId: string): Promise<WorkCompletionReport | null> {
    if (isDbConnected() && this.isValidUUID(assignmentId)) {
      try {
        const res = await pool.query(`
          SELECT wcr.*, COALESCE(p.full_name, wp.username, wp.worker_code, 'Team Leader') as submitted_by_name,
                 rev_p.full_name as reviewer_name, wa.title as assignment_title
          FROM work_completion_reports wcr
          JOIN work_assignments wa ON wa.id = wcr.assignment_id
          LEFT JOIN worker_profiles wp ON wp.id = wcr.submitted_by
          LEFT JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN profiles rev_p ON rev_p.id = wcr.reviewed_by
          WHERE wcr.assignment_id = $1
        `, [assignmentId]);

        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            assignment_id: r.assignment_id,
            assignment_title: r.assignment_title,
            submitted_by: r.submitted_by,
            submitted_by_name: r.submitted_by_name,
            completion_description: r.completion_description,
            actual_start_time: r.actual_start_time ? new Date(r.actual_start_time).toISOString() : new Date().toISOString(),
            actual_end_time: r.actual_end_time ? new Date(r.actual_end_time).toISOString() : new Date().toISOString(),
            waste_quantity: r.waste_quantity,
            waste_disposal_destination: r.waste_disposal_destination,
            equipment_used: Array.isArray(r.equipment_used) ? r.equipment_used : [],
            issues_encountered: r.issues_encountered,
            pending_work: r.pending_work,
            status: r.status,
            reviewed_by: r.reviewed_by,
            reviewer_name: r.reviewer_name,
            review_comments: r.review_comments,
            submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : new Date().toISOString()
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWorkCompletionReport]:', err.message);
      }
    }

    return null;
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
    const isVerifiedRec = (a: any) =>
      ['verified_match', 'present', 'verified', 'manual_approved'].includes(String(a.validation_status || '').toLowerCase());

    const verifiedAssignmentIds = new Set<string>();
    for (const att of recentAttendance) {
      if (isVerifiedRec(att) && att.assignment_id) {
        verifiedAssignmentIds.add(String(att.assignment_id));
      }
    }
    for (const asgn of assignments) {
      if (['verified', 'present', 'verified_match'].includes(String(asgn.my_attendance_status || '').toLowerCase())) {
        verifiedAssignmentIds.add(String(asgn.id));
      }
    }

    const attendanceStatus = recentAttendance.length > 0 && isVerifiedRec(recentAttendance[0])
      ? 'Checked-in (GPS Verified)'
      : verifiedAssignmentIds.size > 0
      ? 'Checked-in (Verified)'
      : 'Attendance Pending';

    let onTimeRate = 0;
    if (assignments.length > 0) {
      onTimeRate = Math.min(100, Math.round((verifiedAssignmentIds.size / assignments.length) * 100));
    } else if (recentAttendance.length > 0) {
      onTimeRate = Math.min(100, Math.round((recentAttendance.filter(isVerifiedRec).length / recentAttendance.length) * 100));
    }

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

      // 2. Ensure worker_teams table exists and has VARCHAR ids + work_type
      await pool.query(`
        CREATE TABLE IF NOT EXISTS worker_teams (
          id VARCHAR(100) PRIMARY KEY,
          team_name VARCHAR(150) NOT NULL,
          ward_number INTEGER DEFAULT 3,
          ward_name VARCHAR(150) DEFAULT 'Ward 3',
          temporary_leader_id VARCHAR(100),
          temporary_leader_name VARCHAR(150),
          worker_ids JSONB DEFAULT '[]'::jsonb,
          work_type VARCHAR(150) DEFAULT 'General Civic Sanitation Squad',
          shift VARCHAR(50) DEFAULT 'Morning (06:00 - 14:00)',
          status VARCHAR(50) DEFAULT 'active',
          active_task_code VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE worker_teams ALTER COLUMN id TYPE VARCHAR(100);
        ALTER TABLE worker_teams ALTER COLUMN temporary_leader_id TYPE VARCHAR(100);
        ALTER TABLE worker_teams ADD COLUMN IF NOT EXISTS work_type VARCHAR(150) DEFAULT 'General Civic Sanitation Squad';
        ALTER TABLE work_assignments ADD COLUMN IF NOT EXISTS complaint_id VARCHAR(100);
        ALTER TABLE work_assignments ADD COLUMN IF NOT EXISTS complaint_number VARCHAR(60);
        ALTER TABLE work_assignments ADD COLUMN IF NOT EXISTS team_id VARCHAR(100);
        ALTER TABLE work_assignments ADD COLUMN IF NOT EXISTS team_name VARCHAR(150);
      `);

      // 2B. Auto-heal any worker profiles whose profiles row exists (role='worker') without a worker_profiles row
      const missingWorkersRes = await pool.query(`
        SELECT p.id, p.full_name, p.phone, p.username, p.plain_password, COALESCE(p.ward_number, 3) as ward_number
        FROM profiles p
        LEFT JOIN worker_profiles wp ON wp.user_id = p.id
        WHERE p.role = 'worker' AND COALESCE(p.is_active, TRUE) = TRUE AND wp.id IS NULL
      `).catch(() => ({ rows: [] as any[] }));

      for (const mw of missingWorkersRes.rows) {
        const nextCode = await this.generateUniqueWorkerCode();
        await pool.query(`
          INSERT INTO worker_profiles (
            id, user_id, worker_code, username, plain_password, designation,
            ward_number, ward_name, availability_status, experience_years,
            skills, attendance_today
          ) VALUES ($1, $2, $3, $4, $5, 'Sanitation Worker', $6, $7, 'available', 0, '["Litter Abatement","Bin Clearance"]'::jsonb, 'Not Marked')
          ON CONFLICT (user_id) DO NOTHING
        `, [
          randomUUID(),
          mw.id,
          nextCode,
          mw.username || nextCode,
          mw.plain_password || 'Worker@123',
          mw.ward_number,
          `Ward ${mw.ward_number}`
        ]).catch(() => {});
      }

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
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3.5 Ward Officer Assignments persistence table (for Admin-created & updated Ward Officers)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ward_officer_assignments (
          id VARCHAR(100) PRIMARY KEY,
          user_id UUID UNIQUE NOT NULL,
          full_name VARCHAR(200) NOT NULL,
          phone VARCHAR(30) NOT NULL,
          email VARCHAR(200),
          designation VARCHAR(150) DEFAULT 'Ward Officer',
          assigned_wards JSONB DEFAULT '[1]'::jsonb,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3.6 Schema upgrades for Community Self-Registration, Verification Docs, Multi-Org Problem Policy, Evidence Metadata & Drive Certificates
      await pool.query(`
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS verification_document_url TEXT;
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS verification_document_name VARCHAR(255);
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS registered_via VARCHAR(50) DEFAULT 'ward_officer';
        ALTER TABLE communities ADD COLUMN IF NOT EXISTS description TEXT;
      `).catch(() => {});

      await pool.query(`
        ALTER TABLE community_problems ADD COLUMN IF NOT EXISTS allow_multiple_orgs BOOLEAN DEFAULT TRUE;
      `).catch(() => {});

      await pool.query(`
        ALTER TABLE activity_evidence ADD COLUMN IF NOT EXISTS review_metadata JSONB DEFAULT '{}'::jsonb;
      `).catch(() => {});

      await pool.query(`
        CREATE TABLE IF NOT EXISTS drive_certificates (
          id UUID PRIMARY KEY,
          certificate_code VARCHAR(80) UNIQUE NOT NULL,
          activity_id VARCHAR(100) NOT NULL,
          drive_title VARCHAR(255) NOT NULL,
          community_id VARCHAR(100),
          community_name VARCHAR(255),
          ward_number INT DEFAULT 3,
          ward_name VARCHAR(255),
          drive_date VARCHAR(100),
          location_name VARCHAR(255),
          waste_cleared VARCHAR(100),
          recipient_user_id VARCHAR(100),
          recipient_name VARCHAR(255) NOT NULL,
          recipient_role VARCHAR(50) NOT NULL,
          recipient_phone VARCHAR(40),
          issued_by_officer VARCHAR(200),
          verification_url TEXT,
          issued_at TIMESTAMPTZ DEFAULT NOW()
        );
      `).catch(() => {});

      // 4. Synchronize memory store from database on startup so state is 100% unified
      await this.syncWardOfficersFromDb();

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

      // Sync PostgreSQL complaints into memory store so Ward Officer & Citizen views always share identical state
      const dbComplaints = await this.getComplaints({});
      if (dbComplaints.length > 0) {
        for (const dbComp of dbComplaints) {
          const idx = store.complaints.findIndex(c => c.id === dbComp.id || c.complaint_number === dbComp.complaint_number);
          if (idx !== -1) {
            store.complaints[idx] = { ...store.complaints[idx], ...dbComp };
          } else {
            store.complaints.unshift(dbComp);
          }
        }
        console.log(`[DB REPO] Synchronized ${dbComplaints.length} complaints from PostgreSQL into memory.`);
      }
    } catch (err: any) {
      console.error('[DB REPO ERROR - initializeWorkerAndTeamTables]:', err.message);
    }
  }

  public static async syncWardOfficersFromDb(): Promise<void> {
    if (!isDbConnected()) return;
    try {
      await pool.query(`ALTER TABLE ward_officer_assignments ADD COLUMN IF NOT EXISTS allowed_tabs JSONB`).catch(() => {});

      const res = await pool.query(`
        SELECT woa.*, a.password_hash, a.plain_password
        FROM ward_officer_assignments woa
        LEFT JOIN citizen_auth_profiles a ON a.user_id = woa.user_id
        ORDER BY woa.updated_at ASC, woa.created_at ASC
      `);
      for (const row of res.rows) {
        const assignedWards: number[] = Array.isArray(row.assigned_wards)
          ? row.assigned_wards.map(Number).filter((n: number) => !isNaN(n))
          : [1];
        const allowedTabs: string[] | undefined =
          Array.isArray(row.allowed_tabs) && row.allowed_tabs.length > 0
            ? row.allowed_tabs.map(String)
            : undefined;
        const primaryWardNum = assignedWards[0] || 1;
        const primaryWardObj = store.wards.find(w => w.ward_number === primaryWardNum);

        const rec: any = {
          id: row.id,
          user_id: row.user_id,
          full_name: row.full_name,
          phone: row.phone,
          email: row.email || '',
          designation: row.designation || 'Ward Officer',
          assigned_wards: assignedWards,
          allowed_tabs: allowedTabs,
          is_active: row.is_active !== false,
          cleanliness_score: 90.0,
          total_resolved: 0,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
        };

        const idx = store.wardOfficers.findIndex(o => o.id === rec.id || o.user_id === rec.user_id || o.phone === rec.phone);
        if (idx !== -1) store.wardOfficers[idx] = { ...store.wardOfficers[idx], ...rec };
        else store.wardOfficers.push(rec);

        const pIdx = store.profiles.findIndex(p => p.id === rec.user_id || p.phone === rec.phone);
        const profilePayload: any = {
          id: rec.user_id,
          full_name: rec.full_name,
          phone: rec.phone,
          email: rec.email,
          preferred_language: 'en',
          address: `NMC Ward ${assignedWards.join(', ')} Office, Navsari`,
          locality: primaryWardObj ? `Ward ${primaryWardObj.ward_number} - ${primaryWardObj.ward_name}` : `Ward ${primaryWardNum}`,
          ward_number: primaryWardNum,
          assigned_wards: assignedWards,
          allowed_tabs: allowedTabs,
          is_active: rec.is_active,
          role: 'ward_officer',
          created_at: rec.created_at,
          updated_at: rec.updated_at
        };
        if (pIdx !== -1) store.profiles[pIdx] = { ...store.profiles[pIdx], ...profilePayload };
        else store.profiles.push(profilePayload);

        if (row.password_hash || row.plain_password) {
          const aIdx = store.authProfiles.findIndex(a => a.user_id === rec.user_id);
          const authPayload: any = {
            id: `auth-${rec.user_id.slice(0, 8)}`,
            user_id: rec.user_id,
            mobile_number: rec.phone,
            password_hash: row.password_hash || '',
            plain_password: row.plain_password || undefined,
            mobile_verified: true,
            account_status: rec.is_active ? 'active' : 'suspended',
            created_at: rec.created_at,
            updated_at: rec.updated_at
          };
          if (aIdx !== -1) store.authProfiles[aIdx] = { ...store.authProfiles[aIdx], ...authPayload };
          else store.authProfiles.push(authPayload);
        }

        if (rec.is_active) {
          for (const wNum of assignedWards) {
            const w = store.wards.find(w => w.ward_number === wNum);
            if (w) {
              w.ward_officer_name = rec.full_name;
              w.contact_phone = rec.phone;
            }
          }
        }
      }
      if (res.rows.length > 0) {
        console.log(`[DB REPO] Synchronized ${res.rows.length} ward officers from PostgreSQL into memory.`);
      }
    } catch (err: any) {
      console.error('[DB REPO ERROR - syncWardOfficersFromDb]:', err.message);
    }
  }

  public static async saveWardOfficerToDb(
    officer: {
      id: string;
      user_id: string;
      full_name: string;
      phone: string;
      email?: string;
      designation?: string;
      assigned_wards: number[];
      allowed_tabs?: string[];
      is_active?: boolean;
    },
    passwordHash?: string,
    plainPassword?: string
  ): Promise<void> {
    if (!isDbConnected()) return;
    try {
      const primaryWardNum = officer.assigned_wards[0] || 1;
      const primaryWardObj = store.wards.find(w => w.ward_number === primaryWardNum);
      const locality = primaryWardObj ? `Ward ${primaryWardObj.ward_number} - ${primaryWardObj.ward_name}` : `Ward ${primaryWardNum}`;
      const address = `NMC Ward ${officer.assigned_wards.join(', ')} Office, Navsari`;

      // 1. Upsert into profiles (by id so separate roles never overwrite each other)
      const profRes = await pool.query(
        `INSERT INTO profiles (id, full_name, phone, email, username, role, locality, address, ward_number, preferred_language, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'ward_officer', $6, $7, $8, 'en', $9, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone,
           email = COALESCE(EXCLUDED.email, profiles.email),
           username = COALESCE(EXCLUDED.username, profiles.username),
           role = 'ward_officer',
           locality = EXCLUDED.locality,
           address = EXCLUDED.address,
           ward_number = EXCLUDED.ward_number,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
         RETURNING id`,
        [
          officer.user_id,
          officer.full_name,
          officer.phone,
          officer.email || null,
          (officer as any).username || null,
          locality,
          address,
          primaryWardNum,
          officer.is_active !== false
        ]
      );
      const resolvedUserId = profRes.rows[0]?.id || officer.user_id;

      // 2. Upsert into user_roles if table exists
      await pool.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, 'ward_officer') ON CONFLICT (user_id) DO UPDATE SET role = 'ward_officer'`,
        [resolvedUserId]
      ).catch(() => {});

      // 3. Upsert password in citizen_auth_profiles if provided
      if (passwordHash) {
        await pool.query(
          `INSERT INTO citizen_auth_profiles (user_id, mobile_number, password_hash, plain_password, mobile_verified, account_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, 'active', NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             mobile_number = EXCLUDED.mobile_number,
             password_hash = EXCLUDED.password_hash,
             plain_password = COALESCE(EXCLUDED.plain_password, citizen_auth_profiles.plain_password),
             updated_at = NOW()`,
          [resolvedUserId, officer.phone, passwordHash, plainPassword || null]
        ).catch(() => {});
      }

      // 4. Upsert into ward_officer_assignments (including allowed_tabs RBAC)
      await pool.query(`ALTER TABLE ward_officer_assignments ADD COLUMN IF NOT EXISTS allowed_tabs JSONB`).catch(() => {});
      const allowedTabsJson =
        Array.isArray(officer.allowed_tabs) && officer.allowed_tabs.length > 0
          ? JSON.stringify(officer.allowed_tabs)
          : null;

      await pool.query(
        `INSERT INTO ward_officer_assignments (id, user_id, full_name, phone, email, designation, assigned_wards, allowed_tabs, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           designation = EXCLUDED.designation,
           assigned_wards = EXCLUDED.assigned_wards,
           allowed_tabs = EXCLUDED.allowed_tabs,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()`,
        [
          officer.id,
          resolvedUserId,
          officer.full_name,
          officer.phone,
          officer.email || null,
          officer.designation || 'Ward Officer',
          JSON.stringify(officer.assigned_wards),
          allowedTabsJson,
          officer.is_active !== false
        ]
      );
    } catch (err: any) {
      console.error('[DB REPO ERROR - saveWardOfficerToDb]:', err.message);
    }
  }

  // =========================================================================
  // BOUNDARY HISTORY PERSISTENCE (NAVSARI CITY & WARD BOUNDARIES)
  // =========================================================================
  private static memBoundaryHistory: Array<{
    id: string;
    boundary_type: 'city' | 'ward';
    ward_id?: string | null;
    ward_number?: number | null;
    ward_name?: string | null;
    coordinates: [number, number][];
    location_summary?: string;
    saved_by?: string;
    created_at: string;
  }> = [];

  private static async ensureBoundaryHistoryTable(): Promise<void> {
    if (!isDbConnected()) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS boundary_history (
        id UUID PRIMARY KEY,
        boundary_type VARCHAR(20) NOT NULL,
        ward_id VARCHAR(64),
        ward_number INT,
        ward_name VARCHAR(255),
        coordinates JSONB NOT NULL,
        location_summary TEXT,
        saved_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
  }

  public static async recordBoundaryHistory(entry: {
    boundary_type: 'city' | 'ward';
    ward_id?: string | null;
    ward_number?: number | null;
    ward_name?: string | null;
    coordinates: [number, number][];
    location_summary?: string;
    saved_by?: string;
  }): Promise<any> {
    const record = {
      id: randomUUID(),
      boundary_type: entry.boundary_type,
      ward_id: entry.ward_id || null,
      ward_number: entry.ward_number ?? null,
      ward_name: entry.ward_name || null,
      coordinates: entry.coordinates,
      location_summary: entry.location_summary || '',
      saved_by: entry.saved_by || 'Super Admin',
      created_at: new Date().toISOString()
    };

    this.memBoundaryHistory.unshift(record);

    if (isDbConnected()) {
      try {
        await this.ensureBoundaryHistoryTable();
        await pool.query(
          `INSERT INTO boundary_history (id, boundary_type, ward_id, ward_number, ward_name, coordinates, location_summary, saved_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW())`,
          [
            record.id,
            record.boundary_type,
            record.ward_id,
            record.ward_number,
            record.ward_name,
            JSON.stringify(record.coordinates),
            record.location_summary,
            record.saved_by
          ]
        );
      } catch (err: any) {
        console.error('[DB REPO ERROR - recordBoundaryHistory]:', err.message);
      }
    }
    return record;
  }

  public static async getBoundaryHistory(
    boundaryType?: 'city' | 'ward',
    wardNumber?: number
  ): Promise<any[]> {
    if (isDbConnected()) {
      try {
        await this.ensureBoundaryHistoryTable();
        const conds: string[] = [];
        const vals: any[] = [];
        if (boundaryType) {
          vals.push(boundaryType);
          conds.push(`boundary_type = $${vals.length}`);
        }
        if (wardNumber !== undefined && !isNaN(wardNumber)) {
          vals.push(Number(wardNumber));
          conds.push(`ward_number = $${vals.length}`);
        }
        const whereClause = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
        const res = await pool.query(
          `SELECT * FROM boundary_history ${whereClause} ORDER BY created_at DESC LIMIT 50`,
          vals
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          boundary_type: r.boundary_type,
          ward_id: r.ward_id,
          ward_number: r.ward_number,
          ward_name: r.ward_name,
          coordinates: Array.isArray(r.coordinates) ? r.coordinates : [],
          location_summary: r.location_summary || '',
          saved_by: r.saved_by || 'Super Admin',
          created_at: r.created_at
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getBoundaryHistory]:', err.message);
      }
    }

    return this.memBoundaryHistory.filter(h => {
      if (boundaryType && h.boundary_type !== boundaryType) return false;
      if (wardNumber !== undefined && !isNaN(wardNumber) && Number(h.ward_number) !== Number(wardNumber)) return false;
      return true;
    });
  }

  public static async getBoundaryHistoryById(id: string): Promise<any | null> {
    if (isDbConnected() && this.isValidUUID(id)) {
      try {
        await this.ensureBoundaryHistoryTable();
        const res = await pool.query(`SELECT * FROM boundary_history WHERE id = $1 LIMIT 1`, [id]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            boundary_type: r.boundary_type,
            ward_id: r.ward_id,
            ward_number: r.ward_number,
            ward_name: r.ward_name,
            coordinates: Array.isArray(r.coordinates) ? r.coordinates : [],
            location_summary: r.location_summary || '',
            saved_by: r.saved_by || 'Super Admin',
            created_at: r.created_at
          };
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - getBoundaryHistoryById]:', err.message);
      }
    }
    return this.memBoundaryHistory.find(h => h.id === id) || null;
  }

  public static async deleteComplaintCascade(id: string): Promise<boolean> {
    let deleted = false;
    const compInStore = store.complaints.find(c => c.id === id || c.complaint_number === id);
    const compId = compInStore?.id || id;
    const compNum = compInStore?.complaint_number || id;

    if (isDbConnected()) {
      try {
        // Delete linked work assignments & evidence
        const assignRes = await pool.query(
          `SELECT id FROM work_assignments WHERE complaint_id = $1 OR complaint_number = $2`,
          [compId, compNum]
        ).catch(() => ({ rows: [] as any[] }));

        for (const a of assignRes.rows) {
          await pool.query(`DELETE FROM work_evidence WHERE assignment_id = $1`, [a.id]).catch(() => {});
          await pool.query(`DELETE FROM work_attendance WHERE assignment_id = $1`, [a.id]).catch(() => {});
          await pool.query(`DELETE FROM work_completion_reports WHERE assignment_id = $1`, [a.id]).catch(() => {});
          await pool.query(`DELETE FROM assignment_team_members WHERE assignment_id = $1`, [a.id]).catch(() => {});
          await pool.query(`DELETE FROM work_assignments WHERE id = $1`, [a.id]).catch(() => {});
        }

        if (this.isValidUUID(compId)) {
          await pool.query(`DELETE FROM complaint_activity_logs WHERE complaint_id = $1`, [compId]).catch(() => {});
          await pool.query(`DELETE FROM complaint_feedback WHERE complaint_id = $1`, [compId]).catch(() => {});
          await pool.query(`DELETE FROM notifications WHERE related_id = $1`, [compId]).catch(() => {});
          const delRes = await pool.query(
            `DELETE FROM complaints WHERE id = $1 OR complaint_number = $2`,
            [compId, compNum]
          );
          if ((delRes.rowCount || 0) > 0) deleted = true;
        } else {
          const delRes = await pool.query(
            `DELETE FROM complaints WHERE complaint_number = $1`,
            [compNum]
          );
          if ((delRes.rowCount || 0) > 0) deleted = true;
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - deleteComplaintCascade]:', err.message);
      }
    }

    // Remove from in-memory store
    const beforeLen = store.complaints.length;
    store.complaints = store.complaints.filter(c => c.id !== compId && c.complaint_number !== compNum);
    if (store.complaints.length < beforeLen) deleted = true;

    return deleted;
  }

  public static async generateUniqueWorkerCode(): Promise<string> {
    if (isDbConnected()) {
      try {
        const res = await pool.query(`SELECT worker_code FROM worker_profiles`);
        const existing = new Set(res.rows.map(r => String(r.worker_code || '').toUpperCase()));
        let maxNum = 0;
        for (const code of existing) {
          const m = code.match(/(\d+)$/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
          }
        }
        let candidateNum = maxNum + 1;
        let candidate = `WRK-2026-${String(candidateNum).padStart(3, '0')}`;
        while (existing.has(candidate.toUpperCase())) {
          candidateNum++;
          candidate = `WRK-2026-${String(candidateNum).padStart(3, '0')}`;
        }
        return candidate;
      } catch (err: any) {
        console.error('[DB REPO ERROR - generateUniqueWorkerCode]:', err.message);
      }
    }
    return `WRK-2026-${Math.floor(100 + Math.random() * 900)}`;
  }

  public static async getWorkersList(filters?: { ward_number?: number; search?: string; availability?: string }): Promise<any[]> {
    if (isDbConnected()) {
      try {
        let sql = `
          SELECT wp.*, p.full_name, p.phone, p.email, p.avatar_url, p.address, p.locality,
                 COALESCE(wp.designation, wd.designation_name, 'Sanitation Worker') as designation_label,
                 COALESCE(wp.username, p.username, wp.worker_code) as worker_username,
                 COALESCE(wp.plain_password, p.plain_password, 'Worker@123') as worker_plain_password,
                 (SELECT wa.task_code
                  FROM work_assignment_members wam
                  JOIN work_assignments wa ON wa.id = wam.assignment_id
                  WHERE wam.worker_id = wp.id AND wa.status NOT IN ('verified_complete', 'closed')
                  ORDER BY wa.created_at DESC
                  LIMIT 1) as live_active_task_code
          FROM worker_profiles wp
          JOIN profiles p ON p.id = wp.user_id
          LEFT JOIN worker_designations wd ON wd.id = wp.primary_designation_id
          WHERE COALESCE(p.is_active, TRUE) = TRUE
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

        sql += ` ORDER BY wp.created_at DESC`;
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
            active_task_code: r.live_active_task_code || r.active_task_code || undefined,
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
    let validWorkerId = this.isValidUUID(worker.id) ? worker.id : randomUUID();
    let validUserId = this.isValidUUID(worker.user_id) ? worker.user_id : randomUUID();
    const workerPassword = worker.plain_password || 'Worker@123';
    const hash = passwordHash || await bcrypt.hash(workerPassword, 10);
    let workerCode = await this.generateUniqueWorkerCode();
    const effectiveUsername = worker.username && String(worker.username).trim() ? String(worker.username).trim() : workerCode;

    if (isDbConnected()) {
      try {
        // 1. Only reuse existing worker profile if this exact user_id already has a worker_profile
        const existingWp = await pool.query(`SELECT id, worker_code FROM worker_profiles WHERE user_id = $1`, [validUserId]);
        if (existingWp.rows.length > 0) {
          validWorkerId = existingWp.rows[0].id;
          workerCode = existingWp.rows[0].worker_code;
        }

        // 2. Upsert profiles by id (never hijack another role's profile via phone collision)
        const profRes = await pool.query(
          `INSERT INTO profiles (id, full_name, phone, username, plain_password, address, locality, ward_number, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'worker', TRUE)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             username = COALESCE(EXCLUDED.username, profiles.username),
             plain_password = COALESCE(EXCLUDED.plain_password, profiles.plain_password),
             ward_number = EXCLUDED.ward_number,
             role = 'worker',
             is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
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
        if (profRes.rows.length > 0) {
          validUserId = profRes.rows[0].id;
        }

        // 3. Upsert citizen_auth_profiles
        const authId = randomUUID();
        await pool.query(
          `INSERT INTO citizen_auth_profiles (id, user_id, mobile_number, password_hash, plain_password, mobile_verified, account_status)
           VALUES ($1, $2, $3, $4, $5, TRUE, 'active')
           ON CONFLICT (user_id) DO UPDATE SET
             mobile_number = EXCLUDED.mobile_number,
             password_hash = COALESCE(EXCLUDED.password_hash, citizen_auth_profiles.password_hash),
             plain_password = COALESCE(EXCLUDED.plain_password, citizen_auth_profiles.plain_password),
             account_status = 'active',
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

        // 5. Upsert worker_profiles with guaranteed unique worker_code and RETURNING actual DB id
        const skillsJson = JSON.stringify(Array.isArray(worker.skills) ? worker.skills : [worker.skills || 'Litter Abatement']);
        const wpRes = await pool.query(
          `INSERT INTO worker_profiles (
             id, user_id, worker_code, username, plain_password, designation,
             ward_number, ward_name, availability_status, experience_years,
             skills, attendance_today, active_task_code
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
           ON CONFLICT (user_id) DO UPDATE SET
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
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, worker_code, created_at`,
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

        if (wpRes.rows.length > 0) {
          validWorkerId = wpRes.rows[0].id;
          workerCode = wpRes.rows[0].worker_code;
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - saveWorkerProfile]:', err.message);
        throw err;
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

  public static async getCommunitiesList(wardNumbers?: number | number[], includePending: boolean = false): Promise<any[]> {
    if (isDbConnected()) {
      try {
        let sql = `SELECT * FROM communities WHERE 1=1`;
        const values: any[] = [];
        const wardArr = Array.isArray(wardNumbers)
          ? wardNumbers.filter(n => !isNaN(Number(n))).map(Number)
          : (wardNumbers ? [Number(wardNumbers)] : []);

        if (wardArr.length > 0) {
          values.push(wardArr);
          sql += ` AND ward_number = ANY($${values.length}::int[])`;
        }
        if (!includePending) {
          sql += ` AND COALESCE(approval_status, 'approved') = 'approved'`;
        }
        sql += ` ORDER BY created_at DESC`;
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
          description: r.description || '',
          verification_document_url: r.verification_document_url || null,
          verification_document_name: r.verification_document_name || null,
          approval_status: r.approval_status || 'approved',
          rejection_reason: r.rejection_reason || null,
          registered_via: r.registered_via || 'ward_officer',
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
    const approvalStatus = community.approval_status || 'approved';
    const isApproved = approvalStatus === 'approved';
    const registeredVia = community.registered_via || 'ward_officer';

    if (isDbConnected()) {
      try {
        // Only reuse existing profile if it is ALREADY a community_head profile for this community (never hijack worker/citizen/officer profiles)
        const existingComm = await pool.query(`SELECT created_by FROM communities WHERE id = $1`, [validCommId]);
        if (existingComm.rows.length > 0 && existingComm.rows[0].created_by) {
          validUserId = existingComm.rows[0].created_by;
        }

        await pool.query(
          `INSERT INTO profiles (id, full_name, phone, email, username, plain_password, address, locality, ward_number, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'community_head', $10)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             username = COALESCE(EXCLUDED.username, profiles.username),
             plain_password = COALESCE(EXCLUDED.plain_password, profiles.plain_password),
             ward_number = EXCLUDED.ward_number,
             role = 'community_head',
             is_active = EXCLUDED.is_active,
             updated_at = CURRENT_TIMESTAMP`,
          [
            validUserId,
            community.head_name?.trim() || 'Community Leader',
            effectivePhone,
            effectiveEmail,
            effectiveUsername,
            headPassword,
            community.address || 'Navsari',
            community.locality || `Ward ${community.ward_number || 3}`,
            community.ward_number || 3,
            isApproved
          ]
        );

        const authId = randomUUID();
        await pool.query(
          `INSERT INTO citizen_auth_profiles (id, user_id, mobile_number, password_hash, plain_password, mobile_verified, account_status)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6)
           ON CONFLICT (user_id) DO UPDATE SET
             mobile_number = EXCLUDED.mobile_number,
             password_hash = COALESCE(EXCLUDED.password_hash, citizen_auth_profiles.password_hash),
             plain_password = COALESCE(EXCLUDED.plain_password, citizen_auth_profiles.plain_password),
             account_status = EXCLUDED.account_status,
             updated_at = CURRENT_TIMESTAMP`,
          [
            authId,
            validUserId,
            effectivePhone,
            hash,
            headPassword,
            isApproved ? 'active' : 'pending_approval'
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
             username, plain_password, active_drives_count,
             verification_document_url, verification_document_name,
             approval_status, registered_via, description
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
           ON CONFLICT (id) DO UPDATE SET
             community_name = EXCLUDED.community_name,
             organisation_type = EXCLUDED.organisation_type,
             address = EXCLUDED.address,
             locality = EXCLUDED.locality,
             ward_number = EXCLUDED.ward_number,
             ward_name = EXCLUDED.ward_name,
             contact_email = EXCLUDED.contact_email,
             contact_phone = EXCLUDED.contact_phone,
             head_name = EXCLUDED.head_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             username = EXCLUDED.username,
             plain_password = EXCLUDED.plain_password,
             active_drives_count = EXCLUDED.active_drives_count,
             verification_document_url = COALESCE(EXCLUDED.verification_document_url, communities.verification_document_url),
             verification_document_name = COALESCE(EXCLUDED.verification_document_name, communities.verification_document_name),
             approval_status = EXCLUDED.approval_status,
             registered_via = EXCLUDED.registered_via,
             description = COALESCE(EXCLUDED.description, communities.description),
             updated_at = CURRENT_TIMESTAMP`,
          [
            validCommId,
            community.community_name?.trim() || 'Community Organization',
            community.organisation_type || 'Resident Welfare Association',
            community.address?.trim() || 'Navsari',
            community.locality?.trim() || `Ward ${community.ward_number || 3}`,
            community.ward_number || 3,
            community.ward_name || `Ward ${community.ward_number || 3}`,
            effectiveEmail,
            effectivePhone,
            isApproved ? 'verified' : 'pending',
            validUserId,
            community.head_name?.trim() || 'Community Leader',
            effectivePhone,
            effectiveEmail,
            effectiveUsername,
            headPassword,
            community.active_drives_count || 0,
            community.verification_document_url || null,
            community.verification_document_name || null,
            approvalStatus,
            registeredVia,
            community.description || null
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
      approval_status: approvalStatus,
      registered_via: registeredVia,
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
  public static async getCommunityProblems(wardNumber?: number | number[]): Promise<CommunityProblem[]> {
    const wardList = Array.isArray(wardNumber)
      ? wardNumber.map(Number).filter(n => !isNaN(n) && n > 0)
      : (wardNumber ? [Number(wardNumber)] : []);
    if (isDbConnected()) {
      try {
        let sql = `SELECT * FROM community_problems WHERE 1=1`;
        const vals: any[] = [];
        if (wardList.length > 0) {
          vals.push(wardList);
          sql += ` AND ward_number = ANY($${vals.length}::int[])`;
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
          allow_multiple_orgs: r.allow_multiple_orgs !== false,
          claimed_by_community_id: r.claimed_by_community_id,
          claimed_by_community_name: r.claimed_by_community_name,
          linked_activity_id: r.linked_activity_id,
          created_by: r.created_by,
          officer_name: r.officer_name,
          created_at: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)) : new Date().toISOString(),
          updated_at: r.updated_at ? (r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)) : new Date().toISOString()
        } as any));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getCommunityProblems]:', err.message);
      }
    }

    let problems = store.communityProblems || [];
    if (wardList.length > 0) {
      problems = problems.filter(p => wardList.includes(Number(p.ward_number)));
    }
    return problems;
  }

  public static async saveCommunityProblem(problem: any): Promise<CommunityProblem> {
    const validId = this.isValidUUID(problem.id) ? problem.id : randomUUID();
    const allowMultipleOrgs = problem.allow_multiple_orgs !== undefined ? Boolean(problem.allow_multiple_orgs) : true;
    const newProblem: any = {
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
      allow_multiple_orgs: allowMultipleOrgs,
      claimed_by_community_id: problem.claimed_by_community_id,
      claimed_by_community_name: problem.claimed_by_community_name,
      linked_activity_id: problem.linked_activity_id,
      created_by: problem.created_by,
      officer_name: problem.officer_name || 'Ward Officer',
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
            status, allow_multiple_orgs, claimed_by_community_id, claimed_by_community_name,
            linked_activity_id, created_by, officer_name, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17, $18,
            $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
            allow_multiple_orgs = EXCLUDED.allow_multiple_orgs,
            claimed_by_community_id = EXCLUDED.claimed_by_community_id,
            claimed_by_community_name = EXCLUDED.claimed_by_community_name,
            linked_activity_id = EXCLUDED.linked_activity_id,
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
          allowMultipleOrgs,
          newProblem.claimed_by_community_id || null,
          newProblem.claimed_by_community_name || null,
          newProblem.linked_activity_id || null,
          newProblem.created_by || null,
          newProblem.officer_name || null
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
          SET status = CASE WHEN COALESCE(allow_multiple_orgs, TRUE) = TRUE THEN 'open' ELSE 'claimed' END,
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
        match.updated_at = new Date().toISOString();
      }
    }
    return true;
  }

  // =========================================================================
  // APPROVAL QUEUE DECISIONS (1. COMMUNITY REGISTRATIONS  2. CLEANLINESS DRIVES)
  // =========================================================================
  public static async getPendingCommunityRegistrations(wardNumbers?: number[]): Promise<any[]> {
    if (isDbConnected()) {
      try {
        let sql = `
          SELECT * FROM communities
          WHERE COALESCE(approval_status, 'approved') = 'pending_approval'
        `;
        const vals: any[] = [];
        const wardArr = (wardNumbers || []).map(Number).filter(n => !isNaN(n) && n > 0);
        if (wardArr.length > 0) {
          vals.push(wardArr);
          sql += ` AND ward_number = ANY($${vals.length}::int[])`;
        }
        sql += ` ORDER BY created_at DESC`;
        const res = await pool.query(sql, vals);
        return res.rows.map(r => ({
          id: r.id,
          type: 'community_registration',
          title: r.community_name,
          submitted_by_name: r.head_name || 'Community Head',
          submitted_by_role: r.organisation_type || 'Community Organization',
          submission_time: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          ward_number: r.ward_number || 3,
          ward_name: r.ward_name || `Ward ${r.ward_number || 3}`,
          status: 'pending',
          verification_document_url: r.verification_document_url || null,
          verification_document_name: r.verification_document_name || 'Verification Certificate',
          details: {
            organization_name: r.community_name,
            organization_type: r.organisation_type || 'Resident Welfare Association',
            head_name: r.head_name,
            phone: r.contact_phone || r.phone,
            email: r.contact_email || r.email,
            username: r.username,
            ward: `Ward ${r.ward_number || 3} (${r.ward_name || `Ward ${r.ward_number || 3}`})`,
            locality: r.locality || '',
            address: r.address || '',
            description: r.description || ''
          }
        }));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getPendingCommunityRegistrations]:', err.message);
      }
    }
    return [];
  }

  public static async reviewCommunityRegistration(
    communityId: string,
    action: 'approve' | 'reject',
    comments: string = ''
  ): Promise<{ success: boolean; message: string; community?: any }> {
    const isApprove = action === 'approve';
    const nextStatus = isApprove ? 'approved' : 'rejected';
    let commRow: any = null;

    if (isDbConnected() && this.isValidUUID(communityId)) {
      try {
        const res = await pool.query(
          `UPDATE communities
           SET approval_status = $1,
               verification_status = $2,
               rejection_reason = $3,
               updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [nextStatus, isApprove ? 'verified' : 'rejected', isApprove ? null : (comments || 'Rejected by Ward Officer'), communityId]
        );
        commRow = res.rows[0];
        if (commRow?.created_by) {
          await pool.query(
            `UPDATE profiles SET is_active = $1, updated_at = NOW() WHERE id = $2`,
            [isApprove, commRow.created_by]
          ).catch(() => {});
          await pool.query(
            `UPDATE citizen_auth_profiles SET account_status = $1, updated_at = NOW() WHERE user_id = $2`,
            [isApprove ? 'active' : 'suspended', commRow.created_by]
          ).catch(() => {});

          await this.createNotification(
            commRow.created_by,
            isApprove ? 'Community Registration Approved!' : 'Community Registration Rejected',
            isApprove
              ? `Your organization "${commRow.community_name}" has been verified and approved by the Ward ${commRow.ward_number} Officer. You can now log in to your Community Head Dashboard.`
              : `Your registration for "${commRow.community_name}" was not approved. Reason: ${comments || 'Verification document could not be validated.'}`,
            communityId,
            isApprove ? 'community_approved' : 'community_rejected'
          );
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - reviewCommunityRegistration]:', err.message);
      }
    }

    // Sync in-memory store
    if (commRow) {
      const pIdx = (store.profiles || []).findIndex(p => p.id === commRow.created_by || p.phone === (commRow.contact_phone || commRow.phone));
      if (pIdx !== -1) {
        store.profiles[pIdx].is_active = isApprove;
      }
      const aIdx = (store.authProfiles || []).findIndex(a => a.user_id === commRow.created_by);
      if (aIdx !== -1) {
        store.authProfiles[aIdx].account_status = isApprove ? 'active' : 'suspended';
      }
      const cIdx = (store.communities || []).findIndex(c => c.id === communityId);
      if (cIdx !== -1) {
        store.communities[cIdx].approval_status = nextStatus;
        store.communities[cIdx].rejection_reason = isApprove ? null : comments;
      } else if (isApprove) {
        store.communities.push({
          id: commRow.id,
          user_id: commRow.created_by,
          community_name: commRow.community_name,
          organisation_type: commRow.organisation_type,
          head_name: commRow.head_name,
          phone: commRow.contact_phone || commRow.phone,
          email: commRow.contact_email || commRow.email,
          username: commRow.username,
          plain_password: commRow.plain_password,
          ward_number: commRow.ward_number || 3,
          ward_name: commRow.ward_name || `Ward ${commRow.ward_number || 3}`,
          address: commRow.address,
          locality: commRow.locality,
          verification_document_url: commRow.verification_document_url,
          verification_document_name: commRow.verification_document_name,
          approval_status: 'approved',
          created_at: commRow.created_at
        });
      }
    }

    return {
      success: true,
      community: commRow,
      message: isApprove
        ? `Organization "${commRow?.community_name || 'Community'}" approved! Community Head can now log in.`
        : `Organization "${commRow?.community_name || 'Community'}" registration rejected.`
    };
  }

  public static async getPendingActivitiesForOfficer(wardNumbers?: number | number[]): Promise<WardApprovalItem[]> {
    const wardArr = Array.isArray(wardNumbers)
      ? wardNumbers.map(Number).filter(n => !isNaN(n) && n > 0)
      : (wardNumbers && Number(wardNumbers) > 0 ? [Number(wardNumbers)] : []);

    if (isDbConnected()) {
      try {
        let sql = `
          SELECT 
            a.id, a.title, a.short_description, a.detailed_description, a.address, a.landmark,
            a.proposed_start_at, a.proposed_end_at, a.maximum_participants, a.safety_guidelines, a.cover_image_path,
            a.created_at, a.ward_number, a.ward_name, a.community_id, a.created_by, a.linked_problem_id,
            a.approval_status,
            c.community_name, c.head_name, c.contact_phone as community_phone,
            cp.id as problem_id, cp.title as problem_title, cp.action_plan as problem_action_plan,
            COALESCE(cp.allow_multiple_orgs, TRUE) as problem_allow_multiple_orgs,
            cp.status as problem_status,
            (SELECT COUNT(*) FROM community_activities ca2 WHERE ca2.linked_problem_id::text = a.linked_problem_id::text AND ca2.linked_problem_id IS NOT NULL AND ca2.approval_status IN ('pending_officer_review', 'ward_review', 'pending', 'changes_requested')) as sibling_pending_count,
            (SELECT COUNT(*) FROM community_activities ca3 WHERE ca3.linked_problem_id::text = a.linked_problem_id::text AND ca3.linked_problem_id IS NOT NULL AND ca3.approval_status IN ('approved', 'ward_approved')) as sibling_approved_count
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          LEFT JOIN community_problems cp ON (cp.id::text = a.linked_problem_id::text OR cp.linked_activity_id::text = a.id::text)
          WHERE a.approval_status IN ('pending_officer_review', 'ward_review', 'pending', 'changes_requested')
        `;
        const vals: any[] = [];
        if (wardArr.length > 0) {
          vals.push(wardArr);
          sql += ` AND a.ward_number = ANY($${vals.length}::int[])`;
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
          linked_problem_id: r.linked_problem_id || r.problem_id || null,
          problem_title: r.problem_title || null,
          problem_allow_multiple_orgs: r.problem_allow_multiple_orgs !== false,
          problem_status: r.problem_status || null,
          sibling_pending_count: Number(r.sibling_pending_count || 0),
          sibling_approved_count: Number(r.sibling_approved_count || 0),
          community_name: r.community_name || 'Community Organization',
          details: {
            organization: r.community_name || 'Community Organization',
            proposed_date: r.proposed_start_at ? new Date(r.proposed_start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Upcoming',
            location: r.address || r.landmark || `Ward ${r.ward_number || 3}, Navsari`,
            expected_volunteers: r.maximum_participants || 30,
            safety_plan: r.short_description || r.detailed_description || 'Volunteer tools and safety equipment planned.',
            linked_problem: r.problem_title ? `Flagged Problem: "${r.problem_title}"` : undefined
          },
          photos: r.cover_image_path ? [r.cover_image_path] : []
        } as any));
      } catch (err: any) {
        console.error('[DB REPO ERROR - getPendingActivitiesForOfficer]:', err.message);
      }
    }

    // In-memory fallback (strictly scoped to wardArr)
    const pending = (store.communityActivities || []).filter((a: any) => {
      const isPending = ['ward_review', 'pending_officer_review', 'changes_requested', 'submitted', 'pending'].includes(a.approval_status);
      const matchesWard = wardArr.length === 0 || wardArr.includes(Number(a.ward_number || 3));
      return isPending && matchesWard;
    });
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

  public static async officerReviewApproval(
    id: string,
    action: 'approve' | 'reject' | 'changes_requested',
    comments: string,
    officerWardNumber?: number,
    options?: { allow_multiple_orgs?: boolean; approval_type?: string }
  ): Promise<{ success: boolean; message: string }> {
    // Auto-detect if this ID belongs to a pending community registration
    if (options?.approval_type === 'community_registration') {
      return this.reviewCommunityRegistration(id, action === 'approve' ? 'approve' : 'reject', comments);
    }
    if (isDbConnected() && this.isValidUUID(id)) {
      const commCheck = await pool.query(`SELECT id FROM communities WHERE id = $1`, [id]).catch(() => ({ rows: [] as any[] }));
      if (commCheck.rows.length > 0) {
        return this.reviewCommunityRegistration(id, action === 'approve' ? 'approve' : 'reject', comments);
      }
    }

    // 1. Locate activity in database or memory
    let act: any = null;
    let orgName = 'Community Action Team';
    if (isDbConnected()) {
      try {
        const actRes = await pool.query(`
          SELECT a.*, c.community_name
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          WHERE a.id = $1
        `, [id]);
        if (actRes.rows.length > 0) {
          act = actRes.rows[0];
          if (act.community_name) orgName = act.community_name;
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
      const allowMultipleOrgs = options?.allow_multiple_orgs !== undefined ? Boolean(options.allow_multiple_orgs) : true;

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

          if (isApproved) {
            const wardId = act.ward_id || `ward-0${act.ward_number || 3}`;
            const locName = act.address || act.landmark || 'Navsari Ward Area';
            const startTime = act.proposed_start_at || new Date().toISOString();
            const endTime = act.proposed_end_at || new Date(Date.now() + 10800000).toISOString();
            const deadline = act.registration_open_at || startTime;
            const banner = act.cover_image_path || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';
            const maxVol = act.maximum_participants || 50;

            await pool.query(`
              INSERT INTO cleanliness_drives (
                id, title, description, ward_id, ward_name, location_name, latitude, longitude,
                start_time, end_time, registration_deadline, organiser_name, lead_person, contact_phone,
                status, banner_url, max_volunteers
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'upcoming', $15, $16)
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                ward_name = EXCLUDED.ward_name,
                organiser_name = EXCLUDED.organiser_name,
                status = 'upcoming'
            `, [
              id, act.title, act.short_description || act.detailed_description,
              wardId, act.ward_name || `Ward ${act.ward_number || 3}`, locName,
              Number(act.latitude) || 20.9470, Number(act.longitude) || 72.9280,
              startTime, endTime, deadline, orgName, act.head_name || orgName,
              act.contact_phone || '+919825100000', banner, maxVol
            ]).catch(err => console.warn('[DB REPO NOTICE - cleanliness_drives sync]:', err.message));

            // Handle Multi-Org vs Exclusive Single-Org policy on linked community problem!
            if (act.linked_problem_id) {
              if (allowMultipleOrgs) {
                // Keep problem open so multiple organizations can also run cleanliness drives on this same problem
                await pool.query(`
                  UPDATE community_problems
                  SET allow_multiple_orgs = TRUE,
                      status = 'open',
                      updated_at = NOW()
                  WHERE id::text = $1::text
                `, [act.linked_problem_id]).catch(() => {});
              } else {
                // Exclusive single organization: lock problem to this org & close competing pending drives on the same problem
                await pool.query(`
                  UPDATE community_problems
                  SET allow_multiple_orgs = FALSE,
                      status = 'claimed',
                      claimed_by_community_id = $1,
                      claimed_by_community_name = $2,
                      linked_activity_id = $3,
                      updated_at = NOW()
                  WHERE id::text = $4::text
                `, [act.community_id, orgName, id, act.linked_problem_id]).catch(() => {});

                // Reject other pending proposals on the same problem and notify their community heads
                const otherPending = await pool.query(`
                  UPDATE community_activities
                  SET approval_status = 'rejected',
                      publication_status = 'rejected',
                      registration_status = 'not_open',
                      updated_at = NOW()
                  WHERE linked_problem_id::text = $1::text
                    AND id::text <> $2::text
                    AND approval_status IN ('pending_officer_review', 'ward_review', 'pending', 'changes_requested')
                  RETURNING id, title, created_by
                `, [act.linked_problem_id, id]).catch(() => ({ rows: [] as any[] }));

                for (const other of otherPending.rows) {
                  if (other.created_by) {
                    await this.createNotification(
                      other.created_by,
                      'Drive Proposal Closed (Exclusive Assignment)',
                      `The Ward Officer assigned this ward problem exclusively to "${orgName}". Your proposal "${other.title}" has been closed.`,
                      other.id,
                      'drive_rejected'
                    );
                  }
                }
              }
            }
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
            organiser_name: orgName,
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
        const modeLabel = act.linked_problem_id
          ? (allowMultipleOrgs ? ' (Multi-Organization Collaborative Drive allowed on this problem)' : ' (Exclusive Single-Organization assignment)')
          : '';
        await this.createNotification(
          targetUserId,
          'Cleanliness Drive Approved!',
          `Your cleanliness drive "${act.title}" has been APPROVED by the Ward ${act.ward_number || 3} Officer${modeLabel}. Citizen registration is now open!`,
          id,
          'drive_approved'
        );
      } else if (action === 'reject') {
        await this.createNotification(
          targetUserId,
          'Cleanliness Drive Rejected',
          `Your cleanliness drive "${act.title}" was REJECTED by Ward ${act.ward_number || 3} Officer. Reason: ${comments || 'Did not meet cleanliness guidelines.'}`,
          id,
          'drive_rejected'
        );
      } else {
        await this.createNotification(
          targetUserId,
          'Changes Requested for Cleanliness Drive',
          `Ward ${act.ward_number || 3} Officer requested adjustments for "${act.title}": ${comments}`,
          id,
          'drive_changes_requested'
        );
      }

      return {
        success: true,
        message: isApproved
          ? `Cleanliness Drive "${act.title}" approved${act.linked_problem_id ? (allowMultipleOrgs ? ' (Multiple organizations allowed on problem)' : ' (Exclusive single organization assigned)') : ''}!`
          : `Activity marked as ${action}. Notification dispatched to Community Head.`
      };
    }

    return {
      success: true,
      message: `Item ${id} processed as ${action}.`
    };
  }

  // =========================================================================
  // ORGANIZATION DRIVES (ACTIVE DRIVES, COMPLETE HISTORY, ATTENDANCE & CERTIFICATES)
  // =========================================================================
  public static async getWardOrganizationDrives(wardNumbers?: number[]): Promise<any[]> {
    const wardArr = (wardNumbers || []).map(Number).filter(n => !isNaN(n) && n > 0);
    if (isDbConnected()) {
      try {
        let sql = `
          SELECT
            a.*,
            c.community_name,
            c.head_name,
            c.contact_phone as community_phone,
            c.contact_email as community_email,
            cp.title as linked_problem_title,
            (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id AND ar.registration_status <> 'cancelled') as registered_count,
            (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id AND ar.attendance_status = 'present') as present_count,
            (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id AND ar.attendance_status = 'absent') as absent_count,
            (SELECT COUNT(*) FROM activity_evidence ae WHERE ae.activity_id = a.id) as evidence_count,
            (SELECT COUNT(*) FROM drive_certificates dc WHERE dc.activity_id = a.id::text) as certificates_count
          FROM community_activities a
          LEFT JOIN communities c ON c.id = a.community_id
          LEFT JOIN community_problems cp ON cp.id::text = a.linked_problem_id::text
          WHERE a.approval_status IN ('approved', 'ward_approved', 'nmc_admin_approved')
        `;
        const vals: any[] = [];
        if (wardArr.length > 0) {
          vals.push(wardArr);
          sql += ` AND a.ward_number = ANY($${vals.length}::int[])`;
        }
        sql += ` ORDER BY a.created_at DESC`;

        const res = await pool.query(sql, vals);
        return res.rows.map(r => {
          const isCompleted = r.event_status === 'completed' || r.evidence_status === 'verified_complete';
          return {
            id: r.id,
            community_id: r.community_id,
            community_name: r.community_name || 'Community Organization',
            head_name: r.head_name || 'Community Head',
            community_phone: r.community_phone || '',
            community_email: r.community_email || '',
            created_by: r.created_by,
            title: r.title,
            activity_category: r.activity_category || 'Cleanliness Drive',
            short_description: r.short_description,
            detailed_description: r.detailed_description,
            ward_number: r.ward_number || 3,
            ward_name: r.ward_name || `Ward ${r.ward_number || 3}`,
            address: r.address,
            landmark: r.landmark,
            latitude: r.latitude ? parseFloat(r.latitude) : 20.9470,
            longitude: r.longitude ? parseFloat(r.longitude) : 72.9280,
            proposed_start_at: r.proposed_start_at,
            proposed_end_at: r.proposed_end_at,
            maximum_participants: r.maximum_participants || 50,
            cover_image_path: r.cover_image_path,
            safety_guidelines: r.safety_guidelines,
            equipment_list: r.equipment_list || [],
            approval_status: r.approval_status,
            publication_status: r.publication_status,
            registration_status: r.registration_status,
            event_status: isCompleted ? 'completed' : (r.event_status || 'upcoming'),
            evidence_status: r.evidence_status || 'not_submitted',
            linked_problem_id: r.linked_problem_id || null,
            linked_problem_title: r.linked_problem_title || null,
            registered_count: Number(r.registered_count || 0),
            present_count: Number(r.present_count || 0),
            absent_count: Number(r.absent_count || 0),
            evidence_count: Number(r.evidence_count || 0),
            certificates_count: Number(r.certificates_count || 0),
            created_at: r.created_at,
            updated_at: r.updated_at
          };
        });
      } catch (err: any) {
        console.error('[DB REPO ERROR - getWardOrganizationDrives]:', err.message);
      }
    }
    return [];
  }

  public static async completeOrganizationDrive(
    activityId: string,
    officerId: string,
    officerName: string,
    comments: string = 'Evidence verified and cleanliness drive marked complete by Ward Officer.'
  ): Promise<{ success: boolean; message: string; drive?: any }> {
    let act: any = null;
    if (isDbConnected() && this.isValidUUID(activityId)) {
      try {
        const res = await pool.query(
          `UPDATE community_activities
           SET event_status = 'completed',
               evidence_status = 'verified_complete',
               registration_status = 'closed',
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [activityId]
        );
        act = res.rows[0];

        await pool.query(
          `UPDATE activity_evidence SET submission_status = 'verified' WHERE activity_id = $1`,
          [activityId]
        ).catch(() => {});

        await pool.query(
          `UPDATE cleanliness_drives SET status = 'completed' WHERE id = $1`,
          [activityId]
        ).catch(() => {});

        if (act?.linked_problem_id) {
          await pool.query(
            `UPDATE community_problems SET status = 'completed', updated_at = NOW() WHERE id::text = $1::text OR linked_activity_id::text = $2::text`,
            [act.linked_problem_id, activityId]
          ).catch(() => {});
        } else {
          await pool.query(
            `UPDATE community_problems SET status = 'completed', updated_at = NOW() WHERE linked_activity_id::text = $1::text`,
            [activityId]
          ).catch(() => {});
        }
        if (store.communityProblems) {
          for (const p of store.communityProblems) {
            if ((act?.linked_problem_id && p.id === act.linked_problem_id) || p.linked_activity_id === activityId) {
              p.status = 'completed' as any;
              p.updated_at = new Date().toISOString();
            }
          }
        }

        const validReviewer = this.isValidUUID(officerId) ? officerId : 'd0000000-0000-0000-0000-000000000003';
        await pool.query(
          `INSERT INTO activity_evidence_reviews (activity_id, reviewer_id, reviewer_role, decision, comments)
           VALUES ($1, $2, 'ward_officer', 'approved', $3)`,
          [activityId, validReviewer, comments]
        ).catch(() => {});

        if (act?.created_by) {
          await this.createNotification(
            act.created_by,
            'Cleanliness Drive Verified & Completed!',
            `Ward Officer ${officerName} verified your evidence and marked "${act.title}" as COMPLETE. Official certificates can now be issued!`,
            activityId,
            'drive_completed'
          );
        }
      } catch (err: any) {
        console.error('[DB REPO ERROR - completeOrganizationDrive]:', err.message);
      }
    }

    const memAct = (store.communityActivities || []).find(a => a.id === activityId);
    if (memAct) {
      memAct.event_status = 'completed' as any;
      memAct.evidence_status = 'verified_complete' as any;
    }

    return {
      success: true,
      drive: act,
      message: `Cleanliness drive "${act?.title || activityId}" verified and marked complete!`
    };
  }

  public static async issueDriveCertificates(
    activityId: string,
    issuedByOfficer: string
  ): Promise<{ success: boolean; certificates: any[]; message: string }> {
    if (!isDbConnected() || !this.isValidUUID(activityId)) {
      return { success: false, certificates: [], message: 'Database connection and valid drive ID required.' };
    }

    const actRes = await pool.query(`
      SELECT a.*, c.community_name, c.head_name, c.contact_phone as community_phone, c.created_by as head_user_id
      FROM community_activities a
      LEFT JOIN communities c ON c.id = a.community_id
      WHERE a.id = $1
    `, [activityId]);

    if (actRes.rows.length === 0) {
      return { success: false, certificates: [], message: 'Cleanliness drive not found.' };
    }

    const act = actRes.rows[0];
    const wardNum = act.ward_number || 3;
    const wardObj = (store.wards || []).find(w => w.ward_number === wardNum);
    const wardName = wardObj ? `Ward ${wardObj.ward_number} - ${wardObj.ward_name}` : (act.ward_name || `Ward ${wardNum}`);
    const driveDate = act.proposed_start_at
      ? new Date(act.proposed_start_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const locationName = act.address || act.landmark || wardName;

    // Extract waste cleared from 'after' evidence review_metadata if available
    const evRes = await pool.query(
      `SELECT review_metadata FROM activity_evidence WHERE activity_id = $1 AND evidence_type = 'after' ORDER BY created_at DESC LIMIT 1`,
      [activityId]
    ).catch(() => ({ rows: [] as any[] }));
    const wasteKg = evRes.rows[0]?.review_metadata?.waste_collected_kg;
    const wasteCleared = wasteKg ? `${wasteKg} kg` : 'Verified Cleanliness Impact';

    // Collect recipients: Community Head + participated citizens (prefer present; fallback to all registered)
    const regRes = await pool.query(
      `SELECT ar.*, p.full_name as profile_name, p.phone as profile_phone
       FROM activity_registrations ar
       LEFT JOIN profiles p ON p.id = ar.citizen_id
       WHERE ar.activity_id = $1 AND ar.registration_status <> 'cancelled'`,
      [activityId]
    ).catch(() => ({ rows: [] as any[] }));

    const presentRegs = regRes.rows.filter(r => r.attendance_status === 'present');
    const participantRegs = presentRegs.length > 0 ? presentRegs : regRes.rows;

    const existingCertsRes = await pool.query(
      `SELECT * FROM drive_certificates WHERE activity_id = $1`,
      [activityId]
    );
    const existingByUser = new Map<string, any>();
    for (const c of existingCertsRes.rows) {
      const key = `${c.recipient_role}::${c.recipient_user_id || c.recipient_name}`;
      existingByUser.set(key, c);
    }

    const recipients: Array<{ userId: string | null; name: string; role: 'community_head' | 'citizen'; phone: string }> = [
      {
        userId: act.head_user_id || act.created_by || null,
        name: act.head_name || act.community_name || 'Community Head',
        role: 'community_head',
        phone: act.community_phone || ''
      }
    ];

    for (const reg of participantRegs) {
      recipients.push({
        userId: reg.citizen_id || null,
        name: reg.citizen_name || reg.profile_name || 'Citizen Volunteer',
        role: 'citizen',
        phone: reg.citizen_phone || reg.profile_phone || ''
      });
    }

    const issued: any[] = [];
    for (const rec of recipients) {
      const key = `${rec.role}::${rec.userId || rec.name}`;
      if (existingByUser.has(key)) {
        issued.push(existingByUser.get(key));
        continue;
      }

      const certId = randomUUID();
      const shortCode = `${Date.now().toString(36).toUpperCase().slice(-4)}${certId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
      const certCode = `NMC-CERT-${new Date().getFullYear()}-${shortCode}`;
      const verificationUrl = `https://swachhsetu.navsari.gov.in/verify/${certCode}`;

      const ins = await pool.query(
        `INSERT INTO drive_certificates (
           id, certificate_code, activity_id, drive_title, community_id, community_name,
           ward_number, ward_name, drive_date, location_name, waste_cleared,
           recipient_user_id, recipient_name, recipient_role, recipient_phone,
           issued_by_officer, verification_url
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          certId, certCode, activityId, act.title, act.community_id || null, act.community_name || 'Community Organization',
          wardNum, wardName, driveDate, locationName, wasteCleared,
          rec.userId, rec.name, rec.role, rec.phone,
          issuedByOfficer, verificationUrl
        ]
      );
      const savedCert = ins.rows[0];
      issued.push(savedCert);

      if (rec.userId) {
        await this.createNotification(
          rec.userId,
          'Official NMC Cleanliness Certificate Issued!',
          `Congratulations ${rec.name}! Your verified certificate (${certCode}) for "${act.title}" has been issued by ${issuedByOfficer}. View it in your Certificates section!`,
          activityId,
          'certificate_issued'
        );
      }
    }

    return {
      success: true,
      certificates: issued,
      message: `Issued ${issued.length} official QR-verified certificate${issued.length === 1 ? '' : 's'} (Community Head + ${Math.max(0, issued.length - 1)} participant${issued.length - 1 === 1 ? '' : 's'})!`
    };
  }

  public static async getDriveCertificates(activityId: string): Promise<any[]> {
    if (!isDbConnected()) return [];
    try {
      const res = await pool.query(
        `SELECT * FROM drive_certificates WHERE activity_id = $1 ORDER BY (recipient_role = 'community_head') DESC, issued_at ASC`,
        [activityId]
      );
      return res.rows;
    } catch (err: any) {
      console.error('[DB REPO ERROR - getDriveCertificates]:', err.message);
      return [];
    }
  }

  public static async getCertificatesForUser(userId: string, phone?: string, role?: string): Promise<any[]> {
    if (!isDbConnected()) return [];
    try {
      const comm = role === 'community_head' ? await this.getCommunityByUserId(userId).catch(() => null) : null;
      const res = await pool.query(
        `SELECT * FROM drive_certificates
         WHERE recipient_user_id = $1
            OR ($2::text IS NOT NULL AND $2::text <> '' AND recipient_phone = $2::text)
            OR ($3::text IS NOT NULL AND community_id = $3::text AND recipient_role = 'community_head')
         ORDER BY issued_at DESC`,
        [userId, phone || null, comm?.id || null]
      );
      return res.rows;
    } catch (err: any) {
      console.error('[DB REPO ERROR - getCertificatesForUser]:', err.message);
      return [];
    }
  }

  public static async verifyCertificateByCode(code: string): Promise<any | null> {
    if (!isDbConnected()) return null;
    try {
      const res = await pool.query(
        `SELECT * FROM drive_certificates WHERE UPPER(certificate_code) = UPPER($1) LIMIT 1`,
        [code.trim()]
      );
      return res.rows[0] || null;
    } catch {
      return null;
    }
  }
}
