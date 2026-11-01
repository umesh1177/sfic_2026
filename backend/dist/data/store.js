"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const postgis_js_1 = require("../utils/postgis.js");
// Initial seed categories
const initialCategories = [
    {
        id: 'cat-01',
        category_name: 'Littering',
        category_name_gu: 'કચરો ફેંકવો',
        category_name_hi: 'कचरा फैलाना',
        description: 'Public litter on streets, sidewalks, and market areas',
        icon: 'Trash2',
        is_active: true
    },
    {
        id: 'cat-02',
        category_name: 'Open Garbage Dumping',
        category_name_gu: 'ખુલ્લામાં કચરો ઠાલવવો',
        category_name_hi: 'खुले में कचरा डंपिंग',
        description: 'Unauthorized garbage dump heaps on vacant plots or roadside',
        icon: 'AlertTriangle',
        is_active: true
    },
    {
        id: 'cat-03',
        category_name: 'Overflowing Dustbin',
        category_name_gu: 'ઉભરાતી કચરાપેટી',
        category_name_hi: 'कूड़ेदान का ओवरफ्लो',
        description: 'Community dustbins and municipal bins overflowing with waste',
        icon: 'Archive',
        is_active: true
    },
    {
        id: 'cat-04',
        category_name: 'Roadside Garbage',
        category_name_gu: 'રસ્તા કિનારે કચરો',
        category_name_hi: 'सड़क किनारे कचरा',
        description: 'Accumulated debris, plastic packaging, and leaves along roads',
        icon: 'Truck',
        is_active: true
    },
    {
        id: 'cat-05',
        category_name: 'Drainage / Waste Accumulation',
        category_name_gu: 'ગટર / કચરો જમા થવો',
        category_name_hi: 'नाली या जल जमाव और कचरा',
        description: 'Choked drains, sewage overflow, and stagnant filthy waste water',
        icon: 'Droplets',
        is_active: true
    },
    {
        id: 'cat-06',
        category_name: 'Other Cleanliness Issues',
        category_name_gu: 'અન્ય સ્વચ્છતા સમસ્યાઓ',
        category_name_hi: 'अन्य स्वच्छता समस्याएं',
        description: 'Dead animal disposal, construction debris, or public toilet issues',
        icon: 'HelpCircle',
        is_active: true
    }
];
// Initial default citizen profile for testing convenience
const defaultCitizenId = 'c0000000-0000-0000-0000-000000000001';
const initialProfiles = [
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
    }
];
// Seed sample complaints in Navsari
const initialComplaints = [
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
const initialDrives = [
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
const initialChallenges = [
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
const initialRewards = [
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
const initialNotifications = [
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
const initialSupportTickets = [
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
exports.store = {
    profiles: initialProfiles,
    authProfiles: [
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
        }
    ],
    otpSessions: [],
    loginLogs: [],
    wards: postgis_js_1.NAVSARI_WARDS,
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
    supportTickets: initialSupportTickets
};
