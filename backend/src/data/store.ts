import {
  Profile,
  CitizenAuthProfile,
  OtpSession,
  Ward,
  ComplaintCategory,
  Complaint,
  CleanlinessDrive,
  Challenge,
  RewardDefinition,
  AppNotification,
  SupportTicket,
  CommunityRecognitionPost,
  CommunityActivity,
  WorkAssignment,
  CommunityProblem,
  WardOfficerRecord,
  AdminBoundarySettings
} from '../types/index.js';
import { NAVSARI_WARDS, DEFAULT_NAVSARI_CITY_BOUNDARY } from '../utils/postgis.js';

export interface DataStore {
  profiles: Profile[];
  authProfiles: CitizenAuthProfile[];
  otpSessions: OtpSession[];
  loginLogs: any[];
  wards: Ward[];
  categories: ComplaintCategory[];
  complaints: Complaint[];
  drives: CleanlinessDrive[];
  driveRegistrations: { drive_id: string; citizen_id: string; registered_at: string }[];
  challenges: Challenge[];
  challengeParticipants: { challenge_id: string; citizen_id: string; progress: number }[];
  rewards: RewardDefinition[];
  citizenRewards: { citizen_id: string; reward_id: string; awarded_at: string }[];
  notifications: AppNotification[];
  supportTickets: SupportTicket[];
  teams: any[];
  workers: any[];
  workAssignments: WorkAssignment[];
  communities: any[];
  communityActivities: CommunityActivity[];
  recognitionPosts: CommunityRecognitionPost[];
  communityProblems: CommunityProblem[];
  wardOfficers: WardOfficerRecord[];
  adminBoundarySettings: AdminBoundarySettings;
}

// Initial seed categories
const initialCategories: ComplaintCategory[] = [
  {
    id: 'cat-01',
    category_name: 'Littering',
    category_name_gu: 'કચરો ફેંકવો',
    category_name_hi: 'कचरा फैलाना',
    description: 'Public litter on streets, sidewalks, and market areas',
    icon: 'Trash2',
    is_active: true,
    max_approval_days: 2,
    max_work_days: 3,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-02',
    category_name: 'Open Garbage Dumping',
    category_name_gu: 'ખુલ્લામાં કચરો ઠાલવવો',
    category_name_hi: 'खुले में कचरा डंपिंग',
    description: 'Unauthorized garbage dump heaps on vacant plots or roadside',
    icon: 'AlertTriangle',
    is_active: true,
    max_approval_days: 2,
    max_work_days: 4,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-03',
    category_name: 'Overflowing Dustbin',
    category_name_gu: 'ઉભરાતી કચરાપેટી',
    category_name_hi: 'कूड़ेदान का ओवरफ्लो',
    description: 'Community dustbins and municipal bins overflowing with waste',
    icon: 'Archive',
    is_active: true,
    max_approval_days: 1,
    max_work_days: 2,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-04',
    category_name: 'Roadside Garbage',
    category_name_gu: 'રસ્તા કિનારે કચરો',
    category_name_hi: 'सड़क किनारे कचरा',
    description: 'Accumulated debris, plastic packaging, and leaves along roads',
    icon: 'Truck',
    is_active: true,
    max_approval_days: 2,
    max_work_days: 3,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-05',
    category_name: 'Drainage / Waste Accumulation',
    category_name_gu: 'ગટર / કચરો જમા થવો',
    category_name_hi: 'नाली या जल जमाव और कचरा',
    description: 'Choked drains, sewage overflow, and stagnant filthy waste water',
    icon: 'Droplets',
    is_active: true,
    max_approval_days: 2,
    max_work_days: 5,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-06',
    category_name: 'Other Cleanliness Issues',
    category_name_gu: 'અન્ય સ્વચ્છતા સમસ્યાઓ',
    category_name_hi: 'अन्य स्वच्छता समस्याएं',
    description: 'Dead animal disposal, construction debris, or public toilet issues',
    icon: 'HelpCircle',
    is_active: true,
    max_approval_days: 3,
    max_work_days: 6,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-07',
    category_name: 'Potholes / Degraded Road',
    category_name_gu: 'ખાડા / તૂટેલો રસ્તો',
    category_name_hi: 'सड़क के गड्ढे / खराब सड़क',
    description: 'Potholes, cracks, and degraded road surface causing traffic hazards',
    icon: 'Road',
    is_active: true,
    max_approval_days: 3,
    max_work_days: 7,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-08',
    category_name: 'Fallen Tree / Blockage',
    category_name_gu: 'પડેલું ઝાડ / માર્ગ અવરોધ',
    category_name_hi: 'गिरा हुआ पेड़ / मार्ग अवरोध',
    description: 'Fallen branches, uprooted trees, or uncollected garden green waste',
    icon: 'TreePine',
    is_active: true,
    max_approval_days: 1,
    max_work_days: 2,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-09',
    category_name: 'Railing / Parapet Damaged',
    category_name_gu: 'રેલિંગ / પેરાપેટ નુકસાન',
    category_name_hi: 'क्षतिग्रस्त रेलिंग / संरचना',
    description: 'Damaged pedestrian railings, parapet walls, or culvert slabs',
    icon: 'ShieldAlert',
    is_active: true,
    max_approval_days: 3,
    max_work_days: 10,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cat-10',
    category_name: 'Road Overtopped / Waterlogging',
    category_name_gu: 'રસ્તા પર પાણી ભરાવું',
    category_name_hi: 'સડક પર જલભરાવ / ઓવરફ્લો',
    description: 'Severe waterlogging or flood water overtopping the road',
    icon: 'Waves',
    is_active: true,
    max_approval_days: 1,
    max_work_days: 2,
    created_at: '2026-10-01T08:00:00Z'
  }
];

// Initial default citizen profile for testing convenience
const defaultCitizenId = 'c0000000-0000-0000-0000-000000000001';
const initialProfiles: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'NMC Municipal Admin',
    phone: '+919825199999',
    email: 'admin@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: 'NMC Administrative Headquarters, Junathana, Navsari',
    locality: 'Navsari Municipal Corporation HQ',
    is_active: true,
    role: 'nmc_admin',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'w0000000-0000-0000-0000-000000000001',
    full_name: 'Bhavin Desai',
    phone: '+919825130001',
    email: 'bhavin.desai@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: 'NMC Ward 1 Administrative Office, Lunsikui, Navsari',
    locality: 'Lunsikui - Tower Road Ward 1',
    is_active: true,
    role: 'ward_officer',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'w0000000-0000-0000-0000-000000000004',
    full_name: 'Jignesh Shah',
    phone: '+919825130004',
    email: 'jignesh.shah@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: 'NMC Ward 4 Administrative Office, Kaliawadi, Navsari',
    locality: 'Kaliawadi - Sayaji Road Ward 4',
    is_active: true,
    role: 'ward_officer',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: defaultCitizenId,
    full_name: 'Harshil Mehta',
    phone: '+919876543210',
    email: 'harshil.mehta@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: 'B-402, Ashapuri Residency, Near Dudhiya Talao',
    locality: 'Dudhiya Talao Ward 3',
    is_active: true,
    role: 'citizen',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000099',
    full_name: 'Rajesh Varma',
    phone: '+919825100099',
    email: 'rajesh.varma@navsarigreen.org',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: '12, Green Avenue, Dudhiya Talao',
    locality: 'Dudhiya Talao Ward 3',
    is_active: true,
    role: 'community_head',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    full_name: 'Kanti Solanki',
    phone: '+919825120001',
    email: 'kanti.solanki@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'gu',
    address: 'Quarter 14, Municipal Staff Quarters, Dudhiya Talao',
    locality: 'Dudhiya Talao Ward 3',
    is_active: true,
    role: 'sanitation_worker',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'f1000000-0000-0000-0000-000000000002',
    full_name: 'Suresh Vaghela',
    phone: '+919825120002',
    email: 'suresh.vaghela@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'gu',
    address: 'B-12, Shanti Nagar, Near Railway Station',
    locality: 'Dudhiya Talao Ward 3',
    is_active: true,
    role: 'sanitation_worker',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'w0000000-0000-0000-0000-000000000003',
    full_name: 'Ramesh Patel',
    phone: '+919825130003',
    email: 'ramesh.patel@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: 'NMC Ward 3 Administrative Office, Dudhiya Talao',
    locality: 'Dudhiya Talao Ward 3',
    is_active: true,
    role: 'ward_officer',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  {
    id: 'w0000000-0000-0000-0000-000000000008',
    full_name: 'Cyrus Contractor',
    phone: '+919825130008',
    email: 'cyrus.contractor@navsarimunicipal.gov.in',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    preferred_language: 'en',
    address: 'NMC Ward 8 Administrative Office, Heritage Parsi Vad, Navsari',
    locality: 'Madhumati - Parsi Wad Ward 8',
    is_active: true,
    role: 'ward_officer',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  }
];

// Seed sample complaints in Navsari

export const initialCommunityProblems: CommunityProblem[] = [
  {
    id: 'prob-01',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    title: 'Plastic Chokepoint & Waste Accumulation at Ashapuri Lake Outflow',
    description: 'Severe build-up of single-use plastics, beverage bottles, and non-biodegradable debris near the lake water overflow weir. Threatens local aquatic bird sanctuary and smells.',
    location_name: 'Dudhiya Talao South Outflow Sluice',
    address: 'South Lake Promenade, Near Ashapuri Mandir Garden Gate, Navsari',
    latitude: 20.9298,
    longitude: 72.9275,
    action_plan: 'Deploy 25 volunteer grabbers with safety waders to clear 400kg plastic, place segregation net barriers, and install permanent warning signs.',
    urgency: 'high',
    estimated_volunteers_needed: 25,
    suggested_equipment: ['Heavy-duty Rubber Gumboots', 'Biohazard Trash Bags', 'Litter Grabber Sticks', 'Protective Cotton Gloves', 'First-Aid Kit'],
    image_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    status: 'open',
    created_by: 'd0000000-0000-0000-0000-000000000003',
    officer_name: 'Rajesh Patel (Ward 3 Officer)',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'prob-02',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    title: 'Overgrown Weeds, Dry Leaves & Paper Litter at Sayaji Library Lawn',
    description: 'Historic library perimeter garden has overgrown invasive shrubs and wind-blown wrappers spoiling the scenic heritage reading atmosphere.',
    location_name: 'Sayaji Vaibhav Public Library Compound',
    address: 'Tower Road Heritage Enclave, Dudhiya Talao, Ward 3, Navsari',
    latitude: 20.9325,
    longitude: 72.9302,
    action_plan: 'Conduct pruning, rake dry leaf foliage into municipal compost trenches, and sweep paved reading walkways.',
    urgency: 'medium',
    estimated_volunteers_needed: 20,
    suggested_equipment: ['Garden Rakes', 'Compost Collection Sacks', 'Hand Pruners', 'Brooms', 'Reflective Jackets'],
    image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    status: 'claimed',
    claimed_by_community_id: 'b0000000-0000-0000-0000-000000000001',
    claimed_by_community_name: 'Navsari Green Warriors RWA',
    linked_activity_id: 'act-02',
    created_by: 'd0000000-0000-0000-0000-000000000003',
    officer_name: 'Rajesh Patel (Ward 3 Officer)',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'prob-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    title: 'Old Textile Market Commercial Back Alley Debris Dump',
    description: 'Discarded commercial packing sacks, fabric remnants, and cardboard cartons piled up along Lane 4 behind wholesale textile shops.',
    location_name: 'Cloth Market Lane 4',
    address: 'Near Ganeshsish Commercial Complex, Ward 3, Navsari',
    latitude: 20.9305,
    longitude: 72.9268,
    action_plan: 'Segregate dry recyclables with local scrap traders and clear passage for municipal sweeping tractors.',
    urgency: 'high',
    estimated_volunteers_needed: 15,
    suggested_equipment: ['Heavy-duty Brooms', 'Wheelbarrows', 'Cotton Face Masks', 'Recycling Bags'],
    image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    status: 'open',
    created_by: 'd0000000-0000-0000-0000-000000000003',
    officer_name: 'Rajesh Patel (Ward 3 Officer)',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 'prob-04',
    ward_number: 8,
    ward_name: 'Ward 8 - Madhumati - Parsi Wad',
    title: 'Heritage Parsi Wad Street Beautification & Anti-Littering Drive',
    description: 'Historic colonial architectural street corners near Sohrab Baug accumulate tourist beverage cups and dried foliage.',
    location_name: 'Sohrab Baug Heritage Gate',
    address: 'Opposite Parsi Agiary Gate, Madhumati, Ward 8, Navsari',
    latitude: 20.9620,
    longitude: 72.9300,
    action_plan: 'Install hand-painted terracotta dustbins, remove roadside plastic, and engage local heritage shopkeepers in zero-waste pledge.',
    urgency: 'medium',
    estimated_volunteers_needed: 30,
    suggested_equipment: ['Color-coded Bins', 'Sanitizing Spray', 'Brooms', 'Gardening Trowels'],
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    status: 'open',
    created_by: 'd0000000-0000-0000-0000-000000000008',
    officer_name: 'Sunita Desai (Ward 8 Officer)',
    created_at: new Date(Date.now() - 345600000).toISOString(),
    updated_at: new Date(Date.now() - 345600000).toISOString()
  },
  {
    id: 'prob-05',
    ward_number: 8,
    ward_name: 'Ward 8 - Madhumati - Parsi Wad',
    title: 'Madhumati Creek Plastic Waste Barrier & Silt Interception',
    description: 'Creek embankment accumulates plastic wrappers and plastic polythene carrying into river mouth during heavy rains.',
    location_name: 'Madhumati Creek Bridge',
    address: 'Near Madhumati River Embankment, Ward 8, Navsari',
    latitude: 20.9580,
    longitude: 72.9250,
    action_plan: 'Install floating trash booms and mobilize community volunteers on embankment cleaning.',
    urgency: 'critical',
    estimated_volunteers_needed: 35,
    suggested_equipment: ['Floating Net Boom', 'Long Hook Poles', 'Safety Harnesses', 'Heavy Gloves'],
    image_url: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
    status: 'claimed',
    claimed_by_community_id: 'b0000000-0000-0000-0000-000000000002',
    claimed_by_community_name: 'Rotary Club of Navsari Heritage',
    created_by: 'd0000000-0000-0000-0000-000000000008',
    officer_name: 'Sunita Desai (Ward 8 Officer)',
    created_at: new Date(Date.now() - 432000000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString()
  }
];

const initialComplaints: Complaint[] = [

  {
    id: 'c0000000-0000-0000-0000-000000000010',
    complaint_number: 'NMC-2026-30001',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-01',
    category_name: 'Open Garbage Dumping',
    location: {
      id: 'loc-cit-01',
      latitude: 20.9312,
      longitude: 72.9284,
      address: 'North Lake Promenade, Opposite Lake View Garden, Dudhiya Talao',
      landmark: 'Near Ashapuri Garden Gate',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      is_inside_nmc_boundary: true
    },
    description: 'Overflowing garbage bins with plastic bags and household waste scattered across the promenade.',
    original_language: 'en',
    status: 'resolved',
    priority: 'high',
    image_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    resolved_image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    confidence_score: 98.5,
    is_duplicate: false,
    submitted_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    upvotes_count: 14,
    followers_count: 5,
    activity_logs: [
      {
        id: 'act-c1-1',
        complaint_id: 'c0000000-0000-0000-0000-000000000010',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Submitted',
        new_status: 'submitted',
        description: 'Citizen lodged report with geo-tagged photo evidence.',
        created_at: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: 'act-c1-2',
        complaint_id: 'c0000000-0000-0000-0000-000000000010',
        actor_user_id: 'w0000000-0000-0000-0000-000000000003',
        actor_name: 'Rajesh Patel',
        actor_role: 'ward_officer',
        action: 'Assigned',
        new_status: 'assigned',
        description: 'Sanitation squad led by Kanti Solanki deployed for cleanup.',
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'act-c1-3',
        complaint_id: 'c0000000-0000-0000-0000-000000000010',
        actor_user_id: 'w0000000-0000-0000-0000-000000000003',
        actor_name: 'Rajesh Patel',
        actor_role: 'ward_officer',
        action: 'Verified & Resolved',
        new_status: 'resolved',
        description: '380 kg waste cleared. Pavement disinfected with bleaching powder. Verified and closed.',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    feedback: {
      id: 'fb-cit-01',
      complaint_id: 'c0000000-0000-0000-0000-000000000010',
      citizen_id: defaultCitizenId,
      rating: 5,
      feedback_text: 'Remarkable prompt action by NMC Ward 3 squad! Within 3 hours the waste was cleared and bleaching powder disinfected the spot. Thank you!',
      resolution_satisfactory: true,
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  },
  {
    id: 'c0000000-0000-0000-0000-000000000020',
    complaint_number: 'NMC-2026-30002',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-02',
    category_name: 'Broken Dustbin & Waste Spillage',
    location: {
      id: 'loc-cit-02',
      latitude: 20.9302,
      longitude: 72.9291,
      address: 'Ashapuri Mandir Approach Road, Ward 3, Navsari',
      landmark: 'Near North Temple Gate',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      is_inside_nmc_boundary: true
    },
    description: 'Broken municipal dustbin leaking organic waste and plastic cups onto pedestrian walkway.',
    original_language: 'en',
    status: 'awaiting_verification',
    priority: 'medium',
    image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    resolved_image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    confidence_score: 94.2,
    is_duplicate: false,
    submitted_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
    upvotes_count: 8,
    followers_count: 3,
    activity_logs: [
      {
        id: 'act-c2-1',
        complaint_id: 'c0000000-0000-0000-0000-000000000020',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Submitted',
        new_status: 'submitted',
        description: 'Littering and broken dustbin reported near temple entrance.',
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'act-c2-2',
        complaint_id: 'c0000000-0000-0000-0000-000000000020',
        actor_user_id: 'f1000000-0000-0000-0000-000000000001',
        actor_name: 'Kanti Solanki (Team Leader)',
        actor_role: 'sanitation_worker',
        action: 'Evidence Submitted',
        new_status: 'awaiting_verification',
        description: 'Area cleaned, new dustbin deployed and after-cleanup photo submitted for review.',
        created_at: new Date(Date.now() - 14400000).toISOString()
      }
    ]
  },
  {
    id: 'c0000000-0000-0000-0000-000000000030',
    complaint_number: 'NMC-2026-30003',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-03',
    category_name: 'Choked Gutter / Open Drainage',
    location: {
      id: 'loc-cit-03',
      latitude: 20.9328,
      longitude: 72.9308,
      address: 'Sayaji Vaibhav Library Back Lane, Ward 3, Navsari',
      landmark: 'Behind Library Reading Hall',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      is_inside_nmc_boundary: true
    },
    description: 'Stagnant drain water and mixed waste choking open stormwater drainage gutter.',
    original_language: 'en',
    status: 'in_progress',
    priority: 'high',
    image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    confidence_score: 96.0,
    is_duplicate: false,
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    upvotes_count: 11,
    followers_count: 4,
    activity_logs: [
      {
        id: 'act-c3-1',
        complaint_id: 'c0000000-0000-0000-0000-000000000030',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Submitted',
        new_status: 'submitted',
        description: 'Choked open gutter reported with photo.',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'act-c3-2',
        complaint_id: 'c0000000-0000-0000-0000-000000000030',
        actor_user_id: 'f1000000-0000-0000-0000-000000000001',
        actor_name: 'Kanti Solanki (Team Leader)',
        actor_role: 'sanitation_worker',
        action: 'Work Started',
        new_status: 'in_progress',
        description: 'Field squad checked in on-site. Drainage suction equipment deployed.',
        created_at: new Date(Date.now() - 7200000).toISOString()
      }
    ]
  },
  {
    id: 'c0000000-0000-0000-0000-000000000040',
    complaint_number: 'NMC-2026-30004',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-04',
    category_name: 'Commercial Packaging Waste',
    location: {
      id: 'loc-cit-04',
      latitude: 20.9335,
      longitude: 72.9315,
      address: 'Tower Road Commercial Market, Ward 3, Navsari',
      landmark: 'Near Ganeshsish Complex',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      is_inside_nmc_boundary: true
    },
    description: 'Cardboard packaging boxes and commercial vegetable refuse scattered behind market shops.',
    original_language: 'en',
    status: 'assigned',
    priority: 'medium',
    image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    confidence_score: 92.8,
    is_duplicate: false,
    submitted_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    upvotes_count: 5,
    followers_count: 2,
    activity_logs: [
      {
        id: 'act-c4-1',
        complaint_id: 'c0000000-0000-0000-0000-000000000040',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Submitted',
        new_status: 'submitted',
        description: 'Packaging waste behind shops reported.',
        created_at: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: 'act-c4-2',
        complaint_id: 'c0000000-0000-0000-0000-000000000040',
        actor_user_id: 'w0000000-0000-0000-0000-000000000003',
        actor_name: 'Rajesh Patel',
        actor_role: 'ward_officer',
        action: 'Assigned',
        new_status: 'assigned',
        description: 'Task dispatched to Ward 3 Market Sweeping Team.',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
  {
    id: 'c0000000-0000-0000-0000-000000000050',
    complaint_number: 'NMC-2026-30005',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-01',
    category_name: 'Littering & Discarded Plastic',
    location: {
      id: 'loc-cit-05',
      latitude: 20.9340,
      longitude: 72.9260,
      address: 'Lunsikui Ground East Corner, Ward 3, Navsari',
      landmark: 'Next to Cricket Pavilion',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      is_inside_nmc_boundary: true
    },
    description: 'Discarded water bottles and snack packets after weekend sports event.',
    original_language: 'en',
    status: 'submitted',
    priority: 'low',
    image_url: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
    confidence_score: 95.1,
    is_duplicate: false,
    submitted_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
    upvotes_count: 2,
    followers_count: 1,
    activity_logs: [
      {
        id: 'act-c5-1',
        complaint_id: 'c0000000-0000-0000-0000-000000000050',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Submitted',
        new_status: 'submitted',
        description: 'Littering near cricket pavilion submitted by citizen.',
        created_at: new Date(Date.now() - 10800000).toISOString()
      }
    ]
  },

  {
    id: 'comp-w8-01',
    complaint_number: 'NMC-2026-80012',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-01',
    category_name: 'Open Garbage Dumping',
    location: {
      id: 'loc-w8-01',
      latitude: 20.9620,
      longitude: 72.9300,
      address: 'Heritage Parsi Vad, Near Sohrab Baug, Navsari',
      landmark: 'Opposite Parsi Agiary Gate',
      ward_id: 'ward-08',
      ward_number: 8,
      ward_name: 'Madhumati - Parsi Wad',
      is_inside_nmc_boundary: true
    },
    description: 'Accumulation of garden waste and dry tree branches near heritage street corner.',
    original_language: 'en',
    status: 'submitted',
    priority: 'medium',
    image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    confidence_score: 96.0,
    ai_model_name: 'NavsariWasteClassifier-PyTorch-ResNet50',
    ai_model_version: 'v1.3.0',
    is_duplicate: false,
    submitted_at: '2026-11-01T09:15:00Z',
    updated_at: '2026-11-01T09:15:00Z',
    upvotes_count: 3,
    followers_count: 2,
    activity_logs: [
      {
        id: 'log-w8-01',
        complaint_id: 'comp-w8-01',
        status: 'submitted',
        note: 'Complaint lodged by citizen with location and photo evidence.',
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        created_at: '2026-11-01T09:15:00Z'
      }
    ]
  },
  {
    id: 'comp-01',
    complaint_number: 'NMC-2026-10021',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-03',
    category_name: 'Overflowing Dustbin',
    location: {
      id: 'loc-01',
      latitude: 20.9312,
      longitude: 72.9284,
      address: 'North Lake Promonade, Dudhiya Talao, Ward 3',
      landmark: 'Near Ashapuri Mandir Garden Gate',
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Dudhiya Talao - Ashapuri',
      is_inside_nmc_boundary: true
    },
    description: 'Community dustbin is overflowing onto the pedestrian promenade. Stray animals are scattering plastic waste.',
    original_language: 'en',
    status: 'in_progress',
    priority: 'high',
    image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    confidence_score: 94.6,
    ai_model_name: 'NavsariWasteClassifier-PyTorch-ResNet50',
    ai_model_version: 'v1.2.0',
    is_duplicate: false,
    submitted_at: '2026-10-28T08:15:00Z',
    reviewed_at: '2026-10-28T10:00:00Z',
    followers_count: 8,
    is_following: true,
    activity_logs: [
      {
        id: 'act-01',
        complaint_id: 'comp-01',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Complaint Submitted',
        new_status: 'submitted',
        description: 'Citizen lodged report with AI category verification.',
        created_at: '2026-10-28T08:15:00Z'
      },
      {
        id: 'act-02',
        complaint_id: 'comp-01',
        actor_user_id: 'officer-03',
        actor_name: 'Bhavesh Solanki (Ward 3 Officer)',
        actor_role: 'ward_officer',
        action: 'Review Completed & Assigned',
        previous_status: 'submitted',
        new_status: 'assigned',
        description: 'Verified by Ward Officer. Assigned to Sanitation Unit 4B.',
        created_at: '2026-10-28T10:00:00Z'
      },
      {
        id: 'act-03',
        complaint_id: 'comp-01',
        actor_user_id: 'worker-12',
        actor_name: 'Rameshbhai Rathod (Sanitation Lead)',
        actor_role: 'sanitation_worker',
        action: 'Cleanup In Progress',
        previous_status: 'assigned',
        new_status: 'in_progress',
        description: 'Vehicle GJ-21-N-4421 dispatched to clear bin and sanitize perimeter.',
        created_at: '2026-10-29T09:30:00Z'
      }
    ]
  },
  {
    id: 'comp-02',
    complaint_number: 'NMC-2026-10018',
    citizen_id: defaultCitizenId,
    citizen_name: 'Harshil Mehta',
    category_id: 'cat-05',
    category_name: 'Drainage / Waste Accumulation',
    location: {
      id: 'loc-02',
      latitude: 20.9482,
      longitude: 72.9421,
      address: 'Near Station Road Vegetable Market, Ward 2',
      landmark: 'Opposite State Bank ATM',
      ward_id: 'ward-02',
      ward_number: 2,
      ward_name: 'Station Road - Fuwara',
      is_inside_nmc_boundary: true
    },
    description: 'Choked open gutter causing stagnant black water and foul smell near food stalls.',
    original_language: 'en',
    status: 'resolved',
    priority: 'urgent',
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    resolved_image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    confidence_score: 96.1,
    ai_model_name: 'NavsariWasteClassifier-PyTorch-ResNet50',
    ai_model_version: 'v1.2.0',
    is_duplicate: false,
    submitted_at: '2026-10-24T11:20:00Z',
    reviewed_at: '2026-10-24T12:00:00Z',
    resolved_at: '2026-10-25T16:45:00Z',
    followers_count: 14,
    is_following: false,
    feedback: {
      id: 'fb-01',
      complaint_id: 'comp-02',
      citizen_id: defaultCitizenId,
      rating: 5,
      feedback_text: 'Excellent rapid action by Ward 2 municipal team! Cleaned and disinfected within 24 hours.',
      resolution_satisfactory: true,
      created_at: '2026-10-26T09:00:00Z'
    },
    activity_logs: [
      {
        id: 'act-04',
        complaint_id: 'comp-02',
        actor_user_id: defaultCitizenId,
        actor_name: 'Harshil Mehta',
        actor_role: 'citizen',
        action: 'Complaint Submitted',
        new_status: 'submitted',
        description: 'Complaint registered.',
        created_at: '2026-10-24T11:20:00Z'
      },
      {
        id: 'act-05',
        complaint_id: 'comp-02',
        actor_user_id: 'officer-02',
        actor_name: 'Dinesh Desai',
        actor_role: 'ward_officer',
        action: 'Drainage Jetting Unit Dispatched',
        previous_status: 'submitted',
        new_status: 'in_progress',
        description: 'Super-sucker vacuum machine sent to de-silt drain line.',
        created_at: '2026-10-24T14:30:00Z'
      },
      {
        id: 'act-06',
        complaint_id: 'comp-02',
        actor_user_id: 'officer-02',
        actor_name: 'Dinesh Desai',
        actor_role: 'ward_officer',
        action: 'Resolution Verified & Closed',
        previous_status: 'awaiting_verification',
        new_status: 'resolved',
        description: 'Drain unblocked, treated with bleaching powder. Photo proof submitted.',
        created_at: '2026-10-25T16:45:00Z'
      }
    ]
  },
  {
    id: 'comp-03',
    complaint_number: 'NMC-2026-10034',
    citizen_id: 'c0000000-0000-0000-0000-000000000002',
    citizen_name: 'Ananya Patel',
    category_id: 'cat-02',
    category_name: 'Open Garbage Dumping',
    location: {
      id: 'loc-03',
      latitude: 20.9440,
      longitude: 72.9300,
      address: 'Lunsikui Ground East Corner, Ward 1',
      landmark: 'Near Cricket Pavilion Wall',
      ward_id: 'ward-01',
      ward_number: 1,
      ward_name: 'Lunsikui - Tower Road',
      is_inside_nmc_boundary: true
    },
    description: 'Empty plot having dumping of construction debris and household garbage bag heaps.',
    original_language: 'en',
    status: 'under_review',
    priority: 'medium',
    image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    confidence_score: 91.2,
    ai_model_name: 'NavsariWasteClassifier-PyTorch-ResNet50',
    ai_model_version: 'v1.2.0',
    is_duplicate: false,
    submitted_at: '2026-10-30T07:10:00Z',
    followers_count: 3,
    is_following: false,
    activity_logs: [
      {
        id: 'act-07',
        complaint_id: 'comp-03',
        actor_user_id: 'c0000000-0000-0000-0000-000000000002',
        actor_name: 'Ananya Patel',
        actor_role: 'citizen',
        action: 'Submitted',
        new_status: 'submitted',
        description: 'Initial citizen report.',
        created_at: '2026-10-30T07:10:00Z'
      }
    ]
  }
];

// Seed Cleanliness Drives
const initialDrives: CleanlinessDrive[] = [
  {
    id: 'drive-01',
    title: 'Dudhiya Talao Lakefront Mega Swachhata Drive',
    description: 'Join Navsari municipal staff and civic youth in deep-cleaning the lake walking track, seating benches, and flowerbeds.',
    ward_id: 'ward-03',
    ward_name: 'Dudhiya Talao - Ashapuri',
    location_name: 'Dudhiya Talao North Gate, Navsari',
    start_time: '2026-11-02T07:00:00+05:30',
    end_time: '2026-11-02T10:30:00+05:30',
    registration_deadline: '2026-11-01T20:00:00+05:30',
    organiser_name: 'Navsari Municipal Youth Taskforce & NMC',
    status: 'upcoming',
    banner_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    max_volunteers: 150,
    registered_volunteers_count: 94,
    is_registered: true
  },
  {
    id: 'drive-02',
    title: 'Lunsikui Ground & Sports Complex Cleanup',
    description: 'Post-festival cleaning and plastic segregator bin installation drive around Lunsikui circle.',
    ward_id: 'ward-01',
    ward_name: 'Lunsikui - Tower Road',
    location_name: 'Lunsikui Ground Pavilion, Navsari',
    start_time: '2026-11-05T06:30:00+05:30',
    end_time: '2026-11-05T09:30:00+05:30',
    registration_deadline: '2026-11-04T18:00:00+05:30',
    organiser_name: 'Navsari Green Club',
    status: 'upcoming',
    banner_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    max_volunteers: 80,
    registered_volunteers_count: 42,
    is_registered: false
  },
  {
    id: 'drive-03',
    title: 'Historic Dandi Beach Heritage Cleanliness Action',
    description: 'Preserving the Father of the Nation Mahatma Gandhi heritage path: cleanup along coastal road approaching Dandi.',
    ward_id: 'ward-13',
    ward_name: 'Dandi Coastal Corridor',
    location_name: 'Dandi Salt Memorial Entrance',
    start_time: '2026-11-08T07:00:00+05:30',
    end_time: '2026-11-08T11:00:00+05:30',
    registration_deadline: '2026-11-07T21:00:00+05:30',
    organiser_name: 'NMC Swachhata Cell & Gujarat Tourism',
    status: 'upcoming',
    banner_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    max_volunteers: 200,
    registered_volunteers_count: 168,
    is_registered: false
  }
];

// Seed Challenges
const initialChallenges: Challenge[] = [
  {
    id: 'ch-01',
    title: 'Navsari Zero-Litter Week 2026',
    description: 'Citizens collaborate to report and verify clean spots across all 13 wards to achieve 100% waste clearance.',
    challenge_type: 'zero_litter',
    start_date: '2026-10-25',
    end_date: '2026-11-05',
    target_value: 200,
    current_value: 142,
    status: 'active',
    banner_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    participants_count: 530,
    is_joined: true
  },
  {
    id: 'ch-02',
    title: 'Dudhiya Talao Plastic-Free Drive',
    description: 'Lakefront heritage preservation mission: pledge to keep Ward 3 lake perimeter free of single-use plastics.',
    challenge_type: 'ward_cleanliness',
    start_date: '2026-10-28',
    end_date: '2026-11-15',
    target_value: 500,
    current_value: 310,
    status: 'active',
    banner_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    participants_count: 320,
    is_joined: false
  }
];

// Seed Rewards
const initialRewards: RewardDefinition[] = [
  {
    id: 'rew-01',
    name: 'Cleanliness Champion',
    description: 'Awarded for 5 verified resolved complaints with top citizen satisfaction rating.',
    icon: 'Award',
    tier: 'gold',
    points: 500,
    is_earned: true,
    awarded_at: '2026-10-26T09:05:00Z'
  },
  {
    id: 'rew-02',
    name: 'Active Community Member',
    description: 'Active contributor who participated in municipal cleanliness drives.',
    icon: 'Users',
    tier: 'silver',
    points: 250,
    is_earned: true,
    awarded_at: '2026-10-20T14:00:00Z'
  },
  {
    id: 'rew-03',
    name: 'Clean-up Volunteer',
    description: 'Attended first verified cleanliness drive in Navsari.',
    icon: 'HeartHandshake',
    tier: 'bronze',
    points: 100,
    is_earned: true,
    awarded_at: '2026-10-16T11:00:00Z'
  },
  {
    id: 'rew-04',
    name: 'Responsible Reporter',
    description: 'Submitted accurate, high-quality civic reports with precise GPS coordinates.',
    icon: 'ShieldCheck',
    tier: 'platinum',
    points: 750,
    is_earned: false
  }
];

// Seed Notifications
const initialNotifications: AppNotification[] = [

  {
    id: 'notif-cit-01',
    user_id: defaultCitizenId,
    title: 'Work Done Update: Cleanliness Restored!',
    message: 'Your complaint NMC-2026-30001 at Dudhiya Talao has been successfully verified & resolved with before and after photo proof.',
    notification_type: 'complaint_status',
    reference_id: 'c0000000-0000-0000-0000-000000000010',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'notif-cit-02',
    user_id: defaultCitizenId,
    title: 'Worker Squad Assigned',
    message: 'Sanitation Squad led by Kanti Solanki has been deployed for complaint NMC-2026-30003.',
    notification_type: 'complaint_status',
    reference_id: 'c0000000-0000-0000-0000-000000000030',
    is_read: false,
    created_at: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: 'notif-cit-03',
    user_id: defaultCitizenId,
    title: 'Drive Registration Confirmed',
    message: 'You are registered for Dudhiya Talao Lakefront Mega Swachhata Drive on Sunday. Report at 07:00 AM!',
    notification_type: 'drive_reminder',
    reference_id: 'act-01',
    is_read: true,
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'notif-cit-04',
    user_id: defaultCitizenId,
    title: '50 Green Points Earned',
    message: 'You earned 50 Green Points for rating and verifying the resolution of your civic report.',
    notification_type: 'reward_earned',
    reference_id: 'rew-01',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'notif-wrd-01',
    user_id: 'w0000000-0000-0000-0000-000000000003',
    title: 'Community Drive Submitted for Approval',
    message: 'Navsari Green Warriors RWA submitted "Ashapuri Temple Area Cleanliness Drive" for Ward 3 approval.',
    notification_type: 'drive_reminder',
    reference_id: 'act-02',
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'notif-wrk-01',
    user_id: 'f1000000-0000-0000-0000-000000000001',
    title: 'New Task Dispatched',
    message: 'Task TSK-NAV-2026-101 at North Lake Promenade assigned to your squad. Reporting time: 08:30 AM.',
    notification_type: 'complaint_status',
    reference_id: 'a1000000-0000-0000-0000-000000000001',
    is_read: false,
    created_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'notif-com-01',
    user_id: 'c0000000-0000-0000-0000-000000000099',
    title: 'Drive Approved by Ward 3 Officer',
    message: 'Lakeside Eco-Cleanliness Drive 2026 has been approved! Citizen registrations are now officially live.',
    notification_type: 'drive_reminder',
    reference_id: 'act-01',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },

  {
    id: 'notif-01',
    user_id: defaultCitizenId,
    title: 'Complaint In Progress',
    message: 'Your report NMC-2026-10021 at Dudhiya Talao has been assigned to Sanitation Unit 4B.',
    notification_type: 'complaint_status',
    reference_id: 'comp-01',
    is_read: false,
    created_at: '2026-10-29T09:30:00Z'
  },
  {
    id: 'notif-02',
    user_id: defaultCitizenId,
    title: 'Drive RSVP Confirmed',
    message: 'You are registered for Dudhiya Talao Lakefront Mega Swachhata Drive on Nov 2nd!',
    notification_type: 'drive_reminder',
    reference_id: 'drive-01',
    is_read: true,
    created_at: '2026-10-28T14:10:00Z'
  },
  {
    id: 'notif-03',
    user_id: defaultCitizenId,
    title: 'Badge Earned: Cleanliness Champion',
    message: 'Congratulations! You earned the Gold Cleanliness Champion badge +500 points.',
    notification_type: 'reward_earned',
    reference_id: 'rew-01',
    is_read: true,
    created_at: '2026-10-26T09:05:00Z'
  }
];

// Support Tickets
const initialSupportTickets: SupportTicket[] = [
  {
    id: 'tkt-01',
    ticket_number: 'TKT-2026-0042',
    citizen_id: defaultCitizenId,
    subject: 'Request for additional garbage bins near Ashapuri Garden',
    description: 'Due to morning walkers, the existing single bin gets full by 9 AM. Requesting one more segregated bin.',
    category: 'garbage_collection',
    status: 'in_progress',
    created_at: '2026-10-26T14:00:00Z',
    updated_at: '2026-10-27T10:30:00Z',
    messages: [
      {
        id: 'msg-01',
        sender_id: defaultCitizenId,
        sender_name: 'Harshil Mehta',
        is_staff: false,
        message: 'Hello, please place another dustbin near the east entrance of the garden.',
        created_at: '2026-10-26T14:00:00Z'
      },
      {
        id: 'msg-02',
        sender_id: 'officer-03',
        sender_name: 'Ward 3 Helpdesk Desk Officer',
        is_staff: true,
        message: 'Thank you for your suggestion. Ward 3 inspection officer has approved a twin wet/dry bin installation scheduled for Thursday.',
        created_at: '2026-10-27T10:30:00Z'
      }
    ]
  }
];

// Initial Ward 3 Field Workers
const initialWorkers = [
  {
    id: 'f2000000-0000-0000-0000-000000000001',
    user_id: 'f1000000-0000-0000-0000-000000000001',
    worker_code: 'WRK-2026-001',
    full_name: 'Kanti Solanki',
    phone: '+919825120001',
    designation: 'Sanitation Worker',
    primary_designation: 'Sanitation Worker',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    availability_status: 'available',
    active_task_code: 'TSK-NAV-2026-101',
    experience_years: 5.5,
    skills: ['Bin Clearance', 'Lakeside Sanitation', 'Debris Lifting'],
    attendance_today: 'Present - Location Verified (14.8m)',
    avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80',
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'f2000000-0000-0000-0000-000000000002',
    user_id: 'f1000000-0000-0000-0000-000000000002',
    worker_code: 'WRK-2026-042',
    full_name: 'Suresh Vaghela',
    phone: '+919825120002',
    designation: 'Waste Collection Worker',
    primary_designation: 'Waste Collection Worker',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    availability_status: 'available',
    active_task_code: 'TSK-NAV-2026-101',
    experience_years: 3.2,
    skills: ['Door-to-door Collection', 'Waste Segregation'],
    attendance_today: 'Present - Location Verified (22.1m)',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'f2000000-0000-0000-0000-000000000003',
    user_id: 'f1000000-0000-0000-0000-000000000003',
    worker_code: 'WRK-2026-015',
    full_name: 'Rameshbhai Rathod',
    phone: '+919825120003',
    designation: 'Drainage Jetting Operator',
    primary_designation: 'Drainage Jetting Operator',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    availability_status: 'available',
    active_task_code: undefined,
    experience_years: 6.0,
    skills: ['High Pressure Jetting', 'Sewer Maintenance'],
    attendance_today: 'Present (Standby)',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'f2000000-0000-0000-0000-000000000004',
    user_id: 'f1000000-0000-0000-0000-000000000004',
    worker_code: 'WRK-2026-027',
    full_name: 'Mahesh Parmar',
    phone: '+919825120004',
    designation: 'Road Sweeper',
    primary_designation: 'Road Sweeper',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    availability_status: 'available',
    active_task_code: undefined,
    experience_years: 4.1,
    skills: ['Mechanical Sweeping', 'Litter Abatement'],
    attendance_today: 'Present (Standby)',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'f2000000-0000-0000-0000-000000000005',
    user_id: 'f1000000-0000-0000-0000-000000000005',
    worker_code: 'WRK-2026-033',
    full_name: 'Dilip Chauhan',
    phone: '+919825120005',
    designation: 'Waste Collection Worker',
    primary_designation: 'Waste Collection Worker',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    availability_status: 'available',
    active_task_code: undefined,
    experience_years: 2.8,
    skills: ['Commercial Waste Removal', 'Segregation'],
    attendance_today: 'Present (Standby)',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'f2000000-0000-0000-0000-000000000006',
    user_id: 'f1000000-0000-0000-0000-000000000006',
    worker_code: 'WRK-2026-008',
    full_name: 'Hitesh Makwana',
    phone: '+919825120006',
    designation: 'Tipper Truck Driver',
    primary_designation: 'Tipper Truck Driver',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    availability_status: 'available',
    active_task_code: undefined,
    experience_years: 7.0,
    skills: ['Heavy Vehicle Driving', 'GPS Route Navigation'],
    attendance_today: 'Present (Standby)',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    created_at: '2026-10-15T09:00:00Z'
  }
];

// Initial Ward 3 & 8 Formed Teams
const initialTeams = [
  {
    id: 'team-01',
    team_name: 'Sanitation Unit 4B',
    ward_number: 3,
    worker_ids: [
      'f2000000-0000-0000-0000-000000000001',
      'f2000000-0000-0000-0000-000000000002'
    ],
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000001',
    temporary_leader_name: 'Kanti Solanki',
    created_at: '2026-10-25T08:00:00Z',
    status: 'active'
  },
  {
    id: 'team-02',
    team_name: 'Rapid Cleanliness Squad 3A',
    ward_number: 3,
    worker_ids: [
      'f2000000-0000-0000-0000-000000000003',
      'f2000000-0000-0000-0000-000000000004'
    ],
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000003',
    temporary_leader_name: 'Paresh Parmar',
    created_at: '2026-10-26T09:00:00Z',
    status: 'active'
  },
  {
    id: 'team-03',
    team_name: 'Drainage & Desilting Taskforce 3C',
    ward_number: 3,
    worker_ids: [
      'f2000000-0000-0000-0000-000000000005',
      'f2000000-0000-0000-0000-000000000006'
    ],
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000005',
    temporary_leader_name: 'Dilip Chauhan',
    created_at: '2026-10-27T08:30:00Z',
    status: 'active'
  },
  {
    id: 'team-04',
    team_name: 'Ward 8 Heritage & Lake Clean Squad',
    ward_number: 8,
    worker_ids: [
      'f2000000-0000-0000-0000-000000000001',
      'f2000000-0000-0000-0000-000000000002',
      'f2000000-0000-0000-0000-000000000004'
    ],
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000001',
    temporary_leader_name: 'Kanti Solanki',
    created_at: '2026-10-28T09:00:00Z',
    status: 'active'
  }
];

// Initial Ward 3 Communities & RWAs
const initialCommunities = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    community_name: 'Navsari Green Warriors RWA',
    organisation_type: 'Resident Welfare Association',
    head_name: 'Rajesh Varma',
    phone: '+919825100099',
    email: 'rajesh.varma@navsarigreen.org',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao & Ashapuri',
    address: '12, Green Avenue, Dudhiya Talao Road, Navsari',
    locality: 'Dudhiya Talao',
    active_drives_count: 2,
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    community_name: 'Dudhiya Talao Paryavaran Mitra Mandal',
    organisation_type: 'Environmental NGO',
    head_name: 'Sanjay Desai',
    phone: '+919825100102',
    email: 'sanjay.desai@paryavaran.org',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    address: 'Opp. Lake Garden, Dudhiya Talao',
    locality: 'Dudhiya Talao',
    active_drives_count: 1,
    created_at: '2026-10-18T10:00:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    community_name: 'Ashapuri Swachhata Abhiyan Samiti',
    organisation_type: 'Citizen Action Group',
    head_name: 'Meena Patel',
    phone: '+919825100103',
    email: 'meena.patel@ashapuricivic.in',
    ward_number: 3,
    ward_name: 'Ward 3 - Ashapuri',
    address: 'B-10, Ashapuri Society Gate, Navsari',
    locality: 'Ashapuri',
    active_drives_count: 1,
    created_at: '2026-10-20T11:00:00Z'
  }
];

// Initial Work Assignments (linked with Ward 3 workers & complaints)
const initialWorkAssignments: WorkAssignment[] = [

  {
    id: 'a1000000-0000-0000-0000-000000000002',
    task_code: 'TSK-NAV-2026-102',
    title: 'Ashapuri Mandir Approach Road Sweeping & Litter Clearing',
    description: 'Manual sweeping of approach path, clearing discarded plastic and dry leaves before evening prayers.',
    category: 'street_sweeping',
    priority: 'medium',
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    location_name: 'Ashapuri Mandir North Gate',
    address: 'Ashapuri Mandir Road, Ward 3, Navsari',
    latitude: 20.9302,
    longitude: 72.9291,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_start_time: '14:00:00',
    expected_end_time: '17:30:00',
    attendance_radius_meters: 100,
    evidence_radius_meters: 150,
    work_instructions: 'Sweep the full 300-meter temple approach road. Empty all side litter bins into waste rickshaw.',
    safety_instructions: 'Wear fluorescent safety jackets and dust mask.',
    required_equipment: ['Heavy Sweeping Brooms', 'Waste Pushcart', 'Dust Mask', 'Gloves'],
    emergency_contact_phone: '+919825130003',
    status: 'assigned',
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
    is_temporary_leader: true,
    temporary_leader_name: 'Kanti Solanki',
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000001',
    team_members: [
      {
        id: 'wam-03',
        assignment_id: 'a1000000-0000-0000-0000-000000000002',
        worker_id: 'f2000000-0000-0000-0000-000000000001',
        worker_code: 'WRK-2026-001',
        worker_name: 'Kanti Solanki',
        worker_phone: '+919825120001',
        designation_name: 'Sanitation Worker',
        temporary_leader: true,
        assignment_status: 'assigned'
      },
      {
        id: 'wam-04',
        assignment_id: 'a1000000-0000-0000-0000-000000000002',
        worker_id: 'f2000000-0000-0000-0000-000000000002',
        worker_code: 'WRK-2026-042',
        worker_name: 'Suresh Vaghela',
        worker_phone: '+919825120002',
        designation_name: 'Waste Collection Worker',
        temporary_leader: false,
        assignment_status: 'assigned'
      }
    ],
    my_attendance_status: 'Attendance Pending',
    has_before_evidence: false,
    has_after_evidence: false
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    task_code: 'TSK-NAV-2026-098',
    title: 'Sayaji Road Bus Stop Cluster Deep Clean & Disinfection',
    description: 'Deep cleaning, power wash of passenger benches and anti-bacterial spraying at bus terminus.',
    category: 'waste_collection',
    priority: 'high',
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    location_name: 'Sayaji Road Main Bus Shelter',
    address: 'Near Old Tower Road, Ward 3, Navsari',
    latitude: 20.9330,
    longitude: 72.9310,
    scheduled_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    scheduled_start_time: '07:00:00',
    expected_end_time: '11:00:00',
    attendance_radius_meters: 100,
    evidence_radius_meters: 150,
    work_instructions: 'Complete thorough power spray and clear drain silt behind bus shelter.',
    safety_instructions: 'Protective goggles, gumboots, and chemical-resistant gloves mandatory.',
    required_equipment: ['Bleaching Powder', 'Pressure Hose', 'Gumboots', 'Safety Goggles'],
    emergency_contact_phone: '+919825130003',
    status: 'verified_complete',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    is_temporary_leader: true,
    temporary_leader_name: 'Kanti Solanki',
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000001',
    team_members: [
      {
        id: 'wam-05',
        assignment_id: 'a1000000-0000-0000-0000-000000000003',
        worker_id: 'f2000000-0000-0000-0000-000000000001',
        worker_code: 'WRK-2026-001',
        worker_name: 'Kanti Solanki',
        worker_phone: '+919825120001',
        designation_name: 'Sanitation Worker',
        temporary_leader: true,
        assignment_status: 'present',
        attendance_timestamp: new Date(Date.now() - 86400000).toISOString(),
        validation_status: 'verified_match',
        distance_from_assignment_meters: 16.2
      }
    ],
    my_attendance_status: 'Completed & Verified',
    has_before_evidence: true,
    has_after_evidence: true
  },

  {
    id: 'a1000000-0000-0000-0000-000000000001',
    task_code: 'TSK-NAV-2026-101',
    title: 'Overflowing Dustbin Clearance & Disinfection',
    description: 'Clear overflowing waste and wash pavement with bleaching powder. Report by 11:30 AM.',
    category: 'waste_collection',
    priority: 'high',
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    location_name: 'North Lake Promenade, Dudhiya Talao',
    address: 'Near Ashapuri Mandir Entrance, North Gate, Navsari',
    latitude: 20.9312,
    longitude: 72.9284,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_start_time: new Date(Date.now() - 3600000).toISOString(),
    expected_end_time: new Date(Date.now() + 10800000).toISOString(),
    attendance_radius_meters: 100,
    evidence_radius_meters: 150,
    work_instructions: 'Clear overflowing garbage bin and wash pavement with bleaching powder. Ensure waste is loaded into tipper GJ-21-N-4421.',
    safety_instructions: 'Wear heavy-duty rubber gloves, safety mask, and reflective vest.',
    required_equipment: ['Heavy Duty Gloves', 'Safety Boots', 'Bleaching Powder', 'Shovel', 'Broom'],
    emergency_contact_phone: '+919825130003',
    status: 'assigned',
    created_at: '2026-10-28T09:30:00Z',
    updated_at: '2026-10-28T09:30:00Z',
    is_temporary_leader: true,
    temporary_leader_name: 'Kanti Solanki',
    temporary_leader_id: 'f2000000-0000-0000-0000-000000000001',
    team_members: [
      {
        id: 'wam-01',
        assignment_id: 'a1000000-0000-0000-0000-000000000001',
        worker_id: 'f2000000-0000-0000-0000-000000000001',
        worker_code: 'WRK-2026-001',
        worker_name: 'Kanti Solanki',
        worker_phone: '+919825120001',
        designation_name: 'Sanitation Worker',
        temporary_leader: true,
        assignment_status: 'present',
        attendance_timestamp: new Date().toISOString(),
        validation_status: 'verified_match',
        distance_from_assignment_meters: 14.8
      },
      {
        id: 'wam-02',
        assignment_id: 'a1000000-0000-0000-0000-000000000001',
        worker_id: 'f2000000-0000-0000-0000-000000000002',
        worker_code: 'WRK-2026-042',
        worker_name: 'Suresh Vaghela',
        worker_phone: '+919825120002',
        designation_name: 'Waste Collection Worker',
        temporary_leader: false,
        assignment_status: 'present',
        attendance_timestamp: new Date().toISOString(),
        validation_status: 'verified_match',
        distance_from_assignment_meters: 22.1
      }
    ],
    my_attendance_status: 'Checked-in (GPS Verified)',
    has_before_evidence: true,
    has_after_evidence: false
  }
];

// Initial Community Activities (Cleanliness Drives)
const initialCommunityActivities: CommunityActivity[] = [
  {
    id: 'act-01',
    community_id: 'b0000000-0000-0000-0000-000000000001',
    community_name: 'Navsari Green Warriors RWA',
    title: 'Lakeside Eco-Cleanliness Drive 2026',
    short_description: 'Citizen-led plastic collection and lake promenade cleaning along Dudhiya Talao.',
    detailed_description: 'Join hands with fellow citizens and NMC officers to clear non-biodegradable waste from the shores of Dudhiya Talao lake. Safety gear provided on spot.',
    activity_category: 'Lake & Waterbody Cleaning',
    objectives: ['Collect 300+ kg of shoreline plastic', 'Clean pedestrian pathway', 'Promote source segregation'],
    expected_outcomes: ['Zero litter on lakeside path', 'Increased citizen awareness'],
    instructions: 'Report at North Gate Garden Entrance by 7:00 AM. Bring reusable water bottle.',
    equipment_requirements: ['Cotton Gloves', 'Biodegradable Trash Bags', 'Grabber Sticks'],
    safety_guidelines: 'Stay 2 meters away from water edge. Supervised by NMC ward team.',
    faq: [{ q: 'Is transportation provided?', a: 'Please reach directly at Dudhiya Talao North Gate.' }],
    cover_image_path: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    latitude: 20.9315,
    longitude: 72.9280,
    address: 'Dudhiya Talao North Promenade, Navsari',
    landmark: 'Near Ashapuri Garden Gate',
    proposed_start_at: '2026-11-08T07:00:00Z',
    proposed_end_at: '2026-11-08T10:30:00Z',
    registration_open_at: '2026-10-25T00:00:00Z',
    registration_close_at: '2026-11-07T20:00:00Z',
    maximum_participants: 100,
    minimum_participants: 20,
    waiting_list_enabled: true,
    registration_requires_approval: false,
    publication_status: 'published',
    approval_status: 'ward_approved',
    registration_status: 'open',
    event_status: 'upcoming',
    evidence_status: 'not_submitted',
    registered_count: 48,
    verified_participants_count: 0,
    created_by: 'c0000000-0000-0000-0000-000000000099',
    created_at: '2026-10-25T10:00:00Z',
    updated_at: '2026-10-28T12:00:00Z'
  },
  {
    id: 'act-02',
    community_id: 'b0000000-0000-0000-0000-000000000001',
    community_name: 'Navsari Green Warriors RWA',
    title: 'Ashapuri Temple Area Cleanliness Drive',
    short_description: 'Post-festival cleaning and flower composting drive near Ashapuri Mata Mandir.',
    detailed_description: 'Segregation of biodegradable floral offerings from plastic wrappers. Creating organic compost pits with NMC assistance.',
    activity_category: 'Religious & Heritage Site Cleaning',
    objectives: ['Divert organic temple waste into compost', 'Clean approach roads'],
    expected_outcomes: ['100% segregated floral waste'],
    instructions: 'Meet in front of Temple parking area at 6:30 AM.',
    equipment_requirements: ['Compost bags', 'Brooms', 'Rakes'],
    safety_guidelines: 'Follow footwear norms in temple compound.',
    faq: [],
    cover_image_path: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    latitude: 20.9300,
    longitude: 72.9295,
    address: 'Ashapuri Temple Road, Ward 3, Navsari',
    landmark: 'Ashapuri Mata Mandir Complex',
    proposed_start_at: '2026-11-15T06:30:00Z',
    proposed_end_at: '2026-11-15T09:30:00Z',
    registration_open_at: '2026-10-30T00:00:00Z',
    registration_close_at: '2026-11-14T18:00:00Z',
    maximum_participants: 60,
    minimum_participants: 15,
    waiting_list_enabled: true,
    registration_requires_approval: false,
    publication_status: 'draft',
    approval_status: 'submitted',
    registration_status: 'not_open',
    event_status: 'upcoming',
    evidence_status: 'not_submitted',
    registered_count: 12,
    verified_participants_count: 0,
    created_by: 'c0000000-0000-0000-0000-000000000099',
    created_at: '2026-10-30T11:00:00Z',
    updated_at: '2026-10-30T11:00:00Z'
  }
];

// Initial LinkedIn-style Recognition Wall Posts (Shared across Citizen, Officer, Community, Worker)
const initialRecognitionPosts: CommunityRecognitionPost[] = [
  {
    id: 'post-01',
    author_name: 'Ramesh Patel',
    author_role: 'Chief Sanitary Inspector · NMC Ward 3',
    author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    is_verified_nmc: true,
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    hero_name: 'Sanitation Unit 4B (Kanti Solanki & Suresh Vaghela)',
    hero_role: 'NMC Field Sanitation Heroes',
    badge_title: 'Excellence in Rapid Civic Action',
    title: 'Outstanding Turnaround: Dudhiya Talao Overflowing Dustbin Resolved in 1.8 Hours! 🏆',
    description: 'Special recognition to our frontline warriors Kanti Solanki and Suresh Vaghela for completing the desilting and thorough sanitization at the North Lake Promenade within record time. Navsari shines brighter because of their tireless dedication!',
    achievement_stats: 'Pavement Sanitized · 420 kg waste cleared · 100m geofence verified',
    image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
    likes_count: 42,
    comments_count: 5,
    is_liked: false,
    created_at: '2026-10-30T12:00:00Z',
    comments: [
      {
        id: 'com-01',
        post_id: 'post-01',
        citizen_id: 'c0000000-0000-0000-0000-000000000001',
        citizen_name: 'Harshil Mehta',
        citizen_role: 'Citizen · Ward 3',
        comment_text: 'I reported this issue in the morning and by afternoon the entire lakeside walk was spotlessly clean! Kudos to Kanti bhai and Suresh bhai!',
        created_at: '2026-10-30T13:15:00Z'
      },
      {
        id: 'com-02',
        post_id: 'post-01',
        citizen_id: 'c0000000-0000-0000-0000-000000000099',
        citizen_name: 'Rajesh Varma',
        citizen_role: 'Community Head · Navsari Green Warriors',
        comment_text: 'Superb coordination between NMC Ward 3 team and citizens. Let us keep our heritage lake clean!',
        created_at: '2026-10-30T14:00:00Z'
      }
    ]
  },
  {
    id: 'post-02',
    author_name: 'Rajesh Varma',
    author_role: 'Community Head · Navsari Green Warriors RWA',
    author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    is_verified_nmc: true,
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    hero_name: 'Navsari Youth Volunteers Team',
    hero_role: 'Volunteer Cleanliness Squad',
    badge_title: 'Swachhata Ratna Award',
    title: '380 Kilograms of Single-Use Plastic Segregated at Dudhiya Talao! 🌿',
    description: 'Over 48 enthusiastic citizens and youth joined our Sunday morning cleanliness drive along Dudhiya Talao. Together we cleared 380 kg of waste, sorted recyclables, and educated 120 visitors about avoiding plastic litter.',
    achievement_stats: '48 Active Volunteers · 380 kg Plastic Cleared · 100% Segregated',
    image_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
    likes_count: 57,
    comments_count: 3,
    is_liked: true,
    created_at: '2026-10-29T16:00:00Z',
    comments: [
      {
        id: 'com-03',
        post_id: 'post-02',
        citizen_id: 'w0000000-0000-0000-0000-000000000003',
        citizen_name: 'Ramesh Patel',
        citizen_role: 'Chief Sanitary Inspector · Ward 3',
        comment_text: 'Proud to see the proactive citizen participation from Navsari Green Warriors! NMC team will collect all segregated bags for scientific processing.',
        created_at: '2026-10-29T17:10:00Z'
      }
    ]
  }
];


export const initialWardOfficers: WardOfficerRecord[] = [
  {
    id: 'wo-01',
    user_id: 'w0000000-0000-0000-0000-000000000003',
    full_name: 'Ramesh Patel',
    phone: '+919825130003',
    email: 'ramesh.patel@navsarimunicipal.gov.in',
    designation: 'Senior Ward Officer',
    assigned_wards: [3],
    is_active: true,
    cleanliness_score: 91.4,
    total_resolved: 42,
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'wo-02',
    user_id: 'w0000000-0000-0000-0000-000000000008',
    full_name: 'Cyrus Contractor',
    phone: '+919825130008',
    email: 'cyrus.contractor@navsarimunicipal.gov.in',
    designation: 'Ward Officer',
    assigned_wards: [8],
    is_active: true,
    cleanliness_score: 88.7,
    total_resolved: 38,
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'wo-03',
    user_id: 'w0000000-0000-0000-0000-000000000001',
    full_name: 'Bhavin Desai',
    phone: '+919825130001',
    email: 'bhavin.desai@navsarimunicipal.gov.in',
    designation: 'Ward Officer',
    assigned_wards: [1, 2],
    is_active: true,
    cleanliness_score: 93.1,
    total_resolved: 29,
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'wo-04',
    user_id: 'w0000000-0000-0000-0000-000000000004',
    full_name: 'Jignesh Shah',
    phone: '+919825130004',
    email: 'jignesh.shah@navsarimunicipal.gov.in',
    designation: 'Ward Officer',
    assigned_wards: [4, 5],
    is_active: true,
    cleanliness_score: 89.5,
    total_resolved: 33,
    created_at: '2026-10-15T09:00:00Z'
  }
];

export const store: DataStore = {
  wardOfficers: initialWardOfficers,
  adminBoundarySettings: {
    city_name: 'Navsari Municipal Corporation',
    city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
    ward_boundary_overrides: {},
    allow_outside_complaints: false,
    last_updated: new Date().toISOString()
  },
  profiles: initialProfiles,
  authProfiles: [
    {
      id: 'auth-admin-01',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      mobile_number: '+919825199999',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', // Admin@123
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-w1-desai',
      user_id: 'w0000000-0000-0000-0000-000000000001',
      mobile_number: '+919825130001',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-w4-shah',
      user_id: 'w0000000-0000-0000-0000-000000000004',
      mobile_number: '+919825130004',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-01',
      user_id: defaultCitizenId,
      mobile_number: '+919876543210',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', // Default hashed pass 'Admin@123'
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-99',
      user_id: 'c0000000-0000-0000-0000-000000000099',
      mobile_number: '+919825100099',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-w1',
      user_id: 'f1000000-0000-0000-0000-000000000001',
      mobile_number: '+919825120001',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-w2',
      user_id: 'f1000000-0000-0000-0000-000000000002',
      mobile_number: '+919825120002',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-w3',
      user_id: 'w0000000-0000-0000-0000-000000000003',
      mobile_number: '+919825130003',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    },
    {
      id: 'auth-w8',
      user_id: 'w0000000-0000-0000-0000-000000000008',
      mobile_number: '+919825130008',
      password_hash: '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s',
      mobile_verified: true,
      verification_completed_at: '2026-10-15T09:00:00Z',
      account_status: 'active',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z'
    }
  ],
  otpSessions: [],
  loginLogs: [],
  wards: NAVSARI_WARDS,
  categories: initialCategories,
  complaints: initialComplaints,
  drives: initialDrives,
  driveRegistrations: [
    { drive_id: 'drive-01', citizen_id: defaultCitizenId, registered_at: '2026-10-28T14:10:00Z' }
  ],
  challenges: initialChallenges,
  challengeParticipants: [
    { challenge_id: 'ch-01', citizen_id: defaultCitizenId, progress: 3 }
  ],
  rewards: initialRewards,
  citizenRewards: [
    { citizen_id: defaultCitizenId, reward_id: 'rew-01', awarded_at: '2026-10-26T09:05:00Z' },
    { citizen_id: defaultCitizenId, reward_id: 'rew-02', awarded_at: '2026-10-20T14:00:00Z' },
    { citizen_id: defaultCitizenId, reward_id: 'rew-03', awarded_at: '2026-10-16T11:00:00Z' }
  ],
  notifications: initialNotifications,
  supportTickets: initialSupportTickets,
  teams: initialTeams,
  workers: initialWorkers,
  workAssignments: initialWorkAssignments,
  communities: initialCommunities,
  communityActivities: initialCommunityActivities,
  recognitionPosts: initialRecognitionPosts,
  communityProblems: initialCommunityProblems
};
