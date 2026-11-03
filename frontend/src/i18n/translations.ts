export type Language = 'en' | 'gu' | 'hi';

export interface AppTranslations {
  // App brand
  app_title: string;
  app_subtitle: string;
  tagline: string;
  nmc_label: string;
  ward_officer_portal: string;
  field_worker_portal: string;
  community_head_portal: string;
  citizen_portal: string;

  // Navigation (Citizen)
  nav_home: string;
  nav_report: string;
  nav_complaints: string;
  nav_map: string;
  nav_more: string;
  nav_drives: string;
  nav_challenges: string;
  nav_rewards: string;
  nav_support: string;
  nav_notifications: string;
  nav_profile: string;
  nav_login: string;
  nav_logout: string;

  // Navigation (Ward Officer)
  wo_nav_overview: string;
  wo_nav_complaints: string;
  wo_nav_hotspots: string;
  wo_nav_workers: string;
  wo_nav_teams: string;
  wo_nav_activities: string;
  wo_nav_approvals: string;
  wo_nav_posts: string;
  wo_nav_community_problems: string;
  wo_nav_cleanliness_score: string;
  wo_nav_reports: string;
  wo_nav_notifications: string;
  wo_nav_settings: string;
  wo_nav_more: string;

  // Navigation (Worker)
  wrk_nav_home: string;
  wrk_nav_assign_work: string;
  wrk_nav_work_history: string;
  wrk_nav_notifications: string;
  wrk_nav_profile: string;

  // Navigation (Community Head)
  ch_nav_overview: string;
  ch_nav_activities: string;
  ch_nav_ward_problems: string;
  ch_nav_community: string;
  ch_nav_analytics: string;
  ch_nav_notifications: string;
  ch_nav_settings: string;

  // Home (Citizen)
  welcome_back: string;
  greeting_morning?: string;
  greeting_afternoon?: string;
  greeting_evening?: string;
  citizen?: string;
  ward_badge?: string;
  civic_monitoring?: string;
  nav_report_short?: string;
  hero_card_title?: string;
  hero_card_desc?: string;
  hero_karma?: string;
  hero_level?: string;
  action_map_title?: string;
  action_map_sub?: string;
  action_drives_title?: string;
  action_drives_sub?: string;
  action_challenges_title?: string;
  action_challenges_sub?: string;
  action_rewards_title?: string;
  action_rewards_sub?: string;
  stats_total_sub?: string;
  stats_pending_sub?: string;
  stats_in_progress_sub?: string;
  stats_resolved_sub?: string;
  quick_actions: string;
  action_report: string;
  action_track: string;
  action_map: string;
  action_drives: string;
  stats_total: string;
  stats_pending: string;
  stats_in_progress: string;
  stats_resolved: string;
  nearby_issues_title: string;
  ward_scores_title: string;
  community_impact_title: string;
  points_earned: string;

  // Report Flow
  report_title: string;
  flow_step_1?: string;
  flow_step_2?: string;
  flow_step_3?: string;
  select_complaint_type?: string;
  select_complaint_sub?: string;
  tap_to_select?: string;
  step_1: string;
  step_2: string;
  step_3: string;
  step_4: string;
  step_5: string;
  step_6: string;
  step_7: string;
  step_8: string;
  upload_photo: string;
  select_category: string;
  describe_issue: string;
  record_voice: string;
  recording: string;
  location_detected: string;
  outside_nmc_error: string;
  ai_predicted: string;
  confidence: string;
  submit_report: string;
  complaint_success: string;
  complaint_id: string;

  // Complaints & Status Tabs
  tab_all: string;
  tab_submitted: string;
  tab_under_review: string;
  tab_assigned: string;
  tab_in_progress: string;
  tab_awaiting_verification: string;
  tab_resolved: string;
  tab_rejected: string;
  tab_reopened: string;
  view_details: string;
  timeline_title: string;
  activity_history: string;
  reopen_btn: string;
  feedback_btn: string;

  // Map & Hotspots
  map_title: string;
  map_subtitle: string;
  filter_all_wards: string;
  toggle_hotspots: string;
  toggle_complaints: string;
  ward_info: string;
  hotspots_title: string;
  hotspots_subtitle: string;
  hotspots_all_cats: string;
  hotspots_all_freq: string;
  hotspots_high_freq: string;
  hotspots_med_freq: string;
  hotspots_low_freq: string;
  hotspots_category: string;
  hotspots_frequency: string;
  hotspots_total_incidents: string;
  hotspots_active_now: string;
  hotspots_resolved: string;
  hotspots_reopen_count: string;
  hotspots_ai_pattern: string;
  hotspots_linked_complaints: string;
  hotspots_inspect_dossier: string;

  // Ward Officer Overview KPIs
  kpi_total_complaints: string;
  kpi_pending_triage: string;
  kpi_active_field: string;
  kpi_pending_verification: string;
  kpi_resolved_rate: string;
  kpi_critical_sla: string;
  kpi_total_desc: string;
  kpi_pending_desc: string;
  kpi_active_desc: string;
  kpi_verification_desc: string;
  kpi_resolved_desc: string;
  kpi_critical_desc: string;
  ward_command_title: string;
  telemetry_online: string;
  operational_metrics: string;
  live_indicators: string;

  // Actions & Buttons
  action_inspect: string;
  action_assign_team: string;
  action_view_team: string;
  action_approve: string;
  action_reject: string;
  action_submit_evidence: string;
  action_live_photo: string;
  action_description: string;
  action_deadline: string;
  action_track_status: string;
  action_switch_citizen: string;
  action_refresh: string;
  action_edit: string;
  action_delete: string;

  // Community
  drives_title: string;
  drives_desc: string;
  register_btn: string;
  cancel_reg_btn: string;
  registered_badge: string;
  challenges_title: string;
  join_challenge: string;
  rewards_title: string;
  leaderboard_title: string;

  // Support
  support_title: string;
  create_ticket: string;
  rate_resolution: string;

  // Profile & Accessibility
  profile_title: string;
  accessibility_title: string;
  read_aloud: string;
  font_size: string;
  high_contrast: string;
  change_mobile: string;
  change_pass: string;

  // Common
  loading: string;
  empty: string;
  cancel: string;
  save: string;
  close: string;
  error: string;
  skip: string;
}

export const translations: Record<Language, AppTranslations> = {
  en: {
    app_title: 'Swachh Setu',
    app_subtitle: 'Navsari Municipal Corporation (NMC)',
    tagline: 'Connecting Citizens & Navsari Municipal Corporation for a Cleaner City',
    nmc_label: 'NMC',
    ward_officer_portal: 'WARD OFFICER PORTAL',
    field_worker_portal: 'FIELD WORKER PORTAL',
    community_head_portal: 'COMMUNITY HEAD PORTAL',
    citizen_portal: 'CITIZEN PORTAL',

    // Navigation (Citizen)
    nav_home: 'Home',
    nav_report: 'Report',
    nav_complaints: 'My Complaints',
    nav_map: 'Map',
    nav_more: 'More',
    nav_drives: 'Cleanliness Drives',
    nav_challenges: 'Community Challenges',
    nav_rewards: 'Posts',
    nav_support: 'Feedback & Support',
    nav_notifications: 'Notifications',
    nav_profile: 'My Profile',
    nav_login: 'Login / Register',
    nav_logout: 'Sign Out',

    // Navigation (Ward Officer)
    wo_nav_overview: 'Overview',
    wo_nav_complaints: 'Complaint Catalogue',
    wo_nav_hotspots: 'Hotspots Map',
    wo_nav_workers: 'Worker Management',
    wo_nav_teams: 'Team Management',
    wo_nav_activities: 'Community Activities',
    wo_nav_approvals: 'Approval Management',
    wo_nav_posts: 'Community & Citizen Posts',
    wo_nav_community_problems: 'Add Problem for Community',
    wo_nav_cleanliness_score: 'Ward Cleanliness Score',
    wo_nav_reports: 'Reports & Analytics',
    wo_nav_notifications: 'Notifications',
    wo_nav_settings: 'Settings',
    wo_nav_more: 'More',

    // Navigation (Worker)
    wrk_nav_home: 'Home',
    wrk_nav_assign_work: 'Assign Work',
    wrk_nav_work_history: 'Work History',
    wrk_nav_notifications: 'Notifications',
    wrk_nav_profile: 'Profile & Settings',

    // Navigation (Community Head)
    ch_nav_overview: 'Overview',
    ch_nav_activities: 'Activity Management',
    ch_nav_ward_problems: 'Ward Problems for Action',
    ch_nav_community: 'My Community',
    ch_nav_analytics: 'Reports & Analytics',
    ch_nav_notifications: 'Notifications',
    ch_nav_settings: 'Settings',

    // Home
    welcome_back: 'Welcome back,',
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    citizen: 'Citizen',
    ward_badge: 'Ward 3 Dudhiya Talao',
    civic_monitoring: 'Navsari 13-Ward Civic Monitoring',
    nav_report_short: 'Report',
    hero_card_title: 'Keep Navsari Clean & Green',
    hero_card_desc: 'Spot garbage, overflowing bins, or open drains? Report instantly for 24-hr resolution.',
    hero_karma: 'Civic Karma',
    hero_level: 'Level 2 Active Citizen',
    quick_actions: 'Quick Actions',
    action_report: 'Report Issue',
    action_track: 'Track Complaints',
    action_map: 'Cleanliness Map',
    action_drives: 'Join a Drive',
    stats_total: 'Total Reports',
    stats_total_sub: 'All submitted issues',
    stats_pending: 'Pending',
    stats_pending_sub: 'Awaiting officer review',
    stats_in_progress: 'In Progress',
    stats_in_progress_sub: 'Sanitation crew on site',
    stats_resolved: 'Resolved',
    stats_resolved_sub: 'Verified cleaned spots',
    action_map_title: 'Cleanliness Map',
    action_map_sub: '13 Ward GIS & Hotspots',
    action_drives_title: 'Cleanliness Drives',
    action_drives_sub: 'Join Volunteer Action',
    action_challenges_title: 'Civic Challenges',
    action_challenges_sub: 'Earn Karma & Badges',
    nearby_issues_title: 'Recent Reports in Navsari',
    ward_scores_title: 'Ward Cleanliness Leaderboard',
    community_impact_title: 'Your Civic Impact',
    points_earned: 'Civic Karma Points',

    // Report
    report_title: 'Report a Cleanliness Issue',
    flow_step_1: 'Select Type',
    flow_step_2: 'Capture Image',
    flow_step_3: 'Mention Details',
    select_complaint_type: 'Select Complaint Type',
    select_complaint_sub: 'Tap a visual category symbol below to easily identify your issue',
    tap_to_select: 'Tap to select',
    step_1: '1. Photo & Category',
    step_2: '2. AI Classification',
    step_3: '3. Content Moderation',
    step_4: '4. Voice Transcript',
    step_5: '5. Location & Ward',
    step_6: '6. Duplicate Check',
    step_7: '7. Quality Check',
    step_8: '8. Confirmation',
    upload_photo: 'Upload Photo or Take Picture',
    select_category: 'Select Category',
    describe_issue: 'Describe the cleanliness problem...',
    record_voice: 'Hold to Record Voice',
    recording: 'Recording... Speak now',
    location_detected: 'Location verified inside Navsari',
    outside_nmc_error: 'Selected location is outside Navsari Municipal limits.',
    ai_predicted: 'AI Classification Prediction',
    confidence: 'Confidence',
    submit_report: 'Submit Official Complaint',
    complaint_success: 'Complaint Submitted Successfully!',
    complaint_id: 'Complaint ID',

    // Complaints
    tab_all: 'All',
    tab_submitted: 'Submitted',
    tab_under_review: 'Under Review',
    tab_assigned: 'Assigned',
    tab_in_progress: 'In Progress',
    tab_awaiting_verification: 'Awaiting Verification',
    tab_resolved: 'Resolved',
    tab_rejected: 'Rejected',
    tab_reopened: 'Reopened',
    view_details: 'View Details',
    timeline_title: 'Official Resolution Timeline',
    activity_history: 'Activity Log',
    reopen_btn: 'Reopen Unresolved Issue',
    feedback_btn: 'Rate Resolution',

    // Map & Hotspots
    map_title: 'Navsari Civic Cleanliness Map',
    map_subtitle: 'Explore live reports and official ward boundaries in Navsari',
    filter_all_wards: 'All 13 Wards',
    toggle_hotspots: 'Show Hotspots',
    toggle_complaints: 'Show Complaints',
    ward_info: 'Ward Information',
    hotspots_title: 'Recurring Cleanliness Hotspots Map',
    hotspots_subtitle: 'Navsari Municipal Problem Area Tracking',
    hotspots_all_cats: 'All Categories',
    hotspots_all_freq: 'All Frequencies',
    hotspots_high_freq: 'High Frequency (5+ Reports)',
    hotspots_med_freq: 'Medium Frequency (2-4 Reports)',
    hotspots_low_freq: 'Low / Emerging (1 Report)',
    hotspots_category: 'Category',
    hotspots_frequency: 'Repeat Frequency',
    hotspots_total_incidents: 'Total Incidents',
    hotspots_active_now: 'Active Right Now',
    hotspots_resolved: 'Resolved',
    hotspots_reopen_count: 'Reopen Count',
    hotspots_ai_pattern: 'AI Pattern Analysis (SQL & Geospatial Clustered)',
    hotspots_linked_complaints: 'Linked Complaints at this Site',
    hotspots_inspect_dossier: 'Inspect Dossier',

    // Ward Officer Overview KPIs
    kpi_total_complaints: 'Total Complaints',
    kpi_pending_triage: 'Pending Triage & Unassigned',
    kpi_active_field: 'Active Field Operations',
    kpi_pending_verification: 'Pending Officer Verification',
    kpi_resolved_rate: 'Resolved & Cleanliness Rate',
    kpi_critical_sla: 'Critical & SLA Overdue',
    kpi_total_desc: 'All registered complaints in ward',
    kpi_pending_desc: 'Submitted and awaiting assignment',
    kpi_active_desc: 'Field teams currently executing tasks',
    kpi_verification_desc: 'Evidence submitted awaiting sign-off',
    kpi_resolved_desc: 'Closed with confirmed before/after proof',
    kpi_critical_desc: 'Urgent attention and SLA breach follow-ups',
    ward_command_title: 'Ward Command Overview',
    telemetry_online: 'Field Telemetry Online',
    operational_metrics: 'Key Operational Indicators',
    live_indicators: 'Live Operational Focus',

    // Actions
    action_inspect: 'Inspect',
    action_assign_team: 'Assign Team',
    action_view_team: 'View Full Team',
    action_approve: 'Approve & Assign',
    action_reject: 'Reject',
    action_submit_evidence: 'Submit Evidence',
    action_live_photo: 'Capture Live Photo',
    action_description: 'Add Description',
    action_deadline: 'Task Deadline',
    action_track_status: 'Track Progress',
    action_switch_citizen: 'Switch to Citizen View',
    action_refresh: 'Refresh',
    action_edit: 'Edit',
    action_delete: 'Delete',

    // Community
    drives_title: 'NMC Swachhata Cleanliness Drives',
    drives_desc: 'Volunteer alongside fellow citizens and municipal sanitation staff',
    register_btn: 'Register as Volunteer',
    cancel_reg_btn: 'Cancel Registration',
    registered_badge: 'Registered',
    challenges_title: 'City Cleanliness Challenges',
    join_challenge: 'Join Challenge',
    rewards_title: 'Civic & Ward Cleanliness Posts',
    leaderboard_title: 'Navsari Cleanliness Champions',

    // Support
    support_title: 'Feedback & Citizen Support',
    create_ticket: 'Open Helpdesk Ticket',
    rate_resolution: 'How satisfied are you with recent cleanup?',

    // Profile & Accessibility
    profile_title: 'Citizen Profile',
    accessibility_title: 'Accessibility & Display',
    read_aloud: 'Read Aloud (Text-to-Speech)',
    font_size: 'Text Size',
    high_contrast: 'High Contrast Mode',
    change_mobile: 'Change Mobile Number (via OTP)',
    change_pass: 'Change Password',

    // Common
    loading: 'Loading...',
    empty: 'No items found',
    cancel: 'Cancel',
    save: 'Save Changes',
    close: 'Close',
    error: 'An error occurred',
    skip: 'Skip'
  },

  gu: {
    app_title: 'મારું સ્વચ્છ નવસારી',
    app_subtitle: 'નવસારી મહાનગરપાલિકા (NMC)',
    tagline: 'સ્વચ્છ નવસારી માટે નાગરિક અને પાલિકા વચ્ચેનો ડિજિટલ સેતુ',
    nmc_label: 'NMC',
    ward_officer_portal: 'વોર્ડ ઓફિસર પોર્ટલ',
    field_worker_portal: 'ફીલ્ડ વર્કર પોર્ટલ',
    community_head_portal: 'કમ્યુનિટી હેડ પોર્ટલ',
    citizen_portal: 'નાગરિક પોર્ટલ',

    // Navigation (Citizen)
    nav_home: 'મુખ્ય પૃષ્ઠ',
    nav_report: 'ફરિયાદ નોંધાવો',
    nav_complaints: 'મારી ફરિયાદો',
    nav_map: 'નવસારી નકશો',
    nav_more: 'વધુ સેવાઓ',
    nav_drives: 'સફાઈ અભિયાન',
    nav_challenges: 'સામુદાયિક પડકારો',
    nav_rewards: 'સ્વચ્છતા પોસ્ટ્સ',
    nav_support: 'પ્રતિસાદ અને સહાય',
    nav_notifications: 'સૂચનાઓ',
    nav_profile: 'મારી પ્રોફાઇલ',
    nav_login: 'પ્રવેશ / નોંધણી',
    nav_logout: 'લૉગ આઉટ',

    // Navigation (Ward Officer)
    wo_nav_overview: 'ડેશબોર્ડ ઝાંખી',
    wo_nav_complaints: 'ફરિયાદ સૂચિ',
    wo_nav_hotspots: 'કચરાના હોટસ્પોટ્સ',
    wo_nav_workers: 'કર્મચારી સંચાલન',
    wo_nav_teams: 'ટીમ સંચાલન',
    wo_nav_activities: 'સામુદાયિક પ્રવૃત્તિઓ',
    wo_nav_approvals: 'મંજૂરી સંચાલન',
    wo_nav_posts: 'નાગરિક પોસ્ટ્સ',
    wo_nav_community_problems: 'સમુદાય માટે સમસ્યા ઉમેરો',
    wo_nav_cleanliness_score: 'વોર્ડ સ્વચ્છતા સ્કોર',
    wo_nav_reports: 'અહેવાલો અને આંકડા',
    wo_nav_notifications: 'સૂચનાઓ',
    wo_nav_settings: 'સેટિંગ્સ',
    wo_nav_more: 'વધુ મેનુ',

    // Navigation (Worker)
    wrk_nav_home: 'મુખ્ય પૃષ્ઠ',
    wrk_nav_assign_work: 'સોંપાયેલ કામ',
    wrk_nav_work_history: 'કામનો ઇતિહાસ',
    wrk_nav_notifications: 'સૂચનાઓ',
    wrk_nav_profile: 'પ્રોફાઇલ અને સેટિંગ્સ',

    // Navigation (Community Head)
    ch_nav_overview: 'ઝાંખી',
    ch_nav_activities: 'પ્રવૃત્તિ સંચાલન',
    ch_nav_ward_problems: 'કાર્યવાહી માટે વોર્ડ સમસ્યાઓ',
    ch_nav_community: 'મારી સંસ્થા',
    ch_nav_analytics: 'અહેવાલો અને આંકડા',
    ch_nav_notifications: 'સૂચનાઓ',
    ch_nav_settings: 'સેટિંગ્સ',

    // Home
    welcome_back: 'સ્વાગત છે,',
    greeting_morning: 'સુપ્રભાત',
    greeting_afternoon: 'શુભ બપોર',
    greeting_evening: 'શુભ સંધ્યા',
    citizen: 'નાગરિક',
    ward_badge: 'વોર્ડ ૩ દૂધિયા તળાવ',
    civic_monitoring: 'નવસારી ૧૩-વોર્ડ નાગરિક મોનિટરિંગ',
    nav_report_short: 'ફરિયાદ',
    hero_card_title: 'નવસારીને સ્વચ્છ અને સુંદર બનાવો',
    hero_card_desc: 'કચરાના ઢગલા કે ગટર ઉભરાવાની સમસ્યા? ૨૪ કલાકમાં નિકાલ માટે તુરંત ફરિયાદ નોંધાવો.',
    hero_karma: 'નાગરિક કર્મ',
    hero_level: 'લેવલ ૨ સક્રિય નાગરિક',
    quick_actions: 'ઝડપી સેવાઓ',
    action_report: 'સ્વચ્છતા ફરિયાદ કરો',
    action_track: 'ફરિયાદ સ્થિતિ તપાસો',
    action_map: 'નકશો જુઓ',
    action_drives: 'અભિયાનમાં જોડાઓ',
    stats_total: 'કુલ ફરિયાદો',
    stats_total_sub: 'તમામ નોંધાયેલ ફરિયાદો',
    stats_pending: 'બાકી / સમીક્ષા',
    stats_pending_sub: 'અધિકારી સમીક્ષા હેઠળ',
    stats_in_progress: 'કામગીરી ચાલુ',
    stats_in_progress_sub: 'સફાઈ ટીમ સ્થળ પર કાર્યરત',
    stats_resolved: 'ઉકેલાયેલ',
    stats_resolved_sub: 'ચકાસાયેલ સ્વચ્છ સ્થળો',
    action_map_title: 'સ્વચ્છતા નકશો',
    action_map_sub: '૧૩ વોર્ડ GIS અને હોટસ્પોટ્સ',
    action_drives_title: 'સફાઈ અભિયાન',
    action_drives_sub: 'સ્વયંસેવક તરીકે જોડાઓ',
    action_challenges_title: 'નાગરિક પડકારો',
    action_challenges_sub: 'કર્મ પોઇન્ટ્સ અને બેજ મેળવો',
    nearby_issues_title: 'નવસારીમાં તાજેતરની ફરિયાદો',
    ward_scores_title: 'વોર્ડ સ્વચ્છતા રેન્કિંગ',
    community_impact_title: 'તમારું નાગરિક યોગદાન',
    points_earned: 'સ્વચ્છતા પોઈન્ટ્સ',

    // Report
    report_title: 'સ્વચ્છતા સમસ્યાની ફરિયાદ નોંધાવો',
    flow_step_1: 'પ્રકાર પસંદ કરો',
    flow_step_2: 'ફોટો પાડો',
    flow_step_3: 'વિગતો અને સ્થળ',
    select_complaint_type: 'ફરિયાદનો પ્રકાર પસંદ કરો',
    select_complaint_sub: 'તમારી સમસ્યા ઝડપથી ઓળખવા નીચે આપેલ ચિહ્ન પસંદ કરો',
    tap_to_select: 'પસંદ કરવા દબાવો',
    step_1: '૧. ફોટો અને કેટેગરી',
    step_2: '૨. AI વર્ગીકરણ',
    step_3: '૩. સામગ્રી ચકાસણી',
    step_4: '૪. અવાજ ટ્રાન્સક્રિપ્ટ',
    step_5: '૫. સ્થળ અને વોર્ડ',
    step_6: '૬. ડુપ્લિકેટ તપાસ',
    step_7: '૭. ગુણવત્તા તપાસ',
    step_8: '૮. પુષ્ટિકરણ',
    upload_photo: 'ફોટો અપલોડ કરો અથવા કેમેરા ખોલો',
    select_category: 'સમસ્યાની શ્રેણી પસંદ કરો',
    describe_issue: 'સમસ્યાનું વર્ણન લખો...',
    record_voice: 'અવાજ રેકોર્ડ કરવા માટે દબાવી રાખો',
    recording: 'રેકોર્ડિંગ ચાલુ છે... બોલો',
    location_detected: 'નવસારી હદમાં સ્થળ ચકાસાયેલ છે',
    outside_nmc_error: 'પસંદ કરેલ સ્થળ નવસારી મહાનગરપાલિકા હદની બહાર છે.',
    ai_predicted: 'AI દ્વારા અનુમાનિત કેટેગરી',
    confidence: 'વિશ્વાસ સ્તર',
    submit_report: 'સત્તાવાર ફરિયાદ સબમિટ કરો',
    complaint_success: 'ફરિયાદ સફળતાપૂર્વક નોંધાઈ ગઈ!',
    complaint_id: 'ફરિયાદ ક્રમાંક',

    // Complaints
    tab_all: 'બધી',
    tab_submitted: 'નોંધાયેલ',
    tab_under_review: 'સમીક્ષા હેઠળ',
    tab_assigned: 'સોંપાયેલ',
    tab_in_progress: 'પ્રગતિમાં',
    tab_awaiting_verification: 'ચકાસણી બાકી',
    tab_resolved: 'ઉકેલાયેલ',
    tab_rejected: 'અસ્વીકૃત',
    tab_reopened: 'પુનઃ ખોલેલ',
    view_details: 'વિગત જુઓ',
    timeline_title: 'સત્તાવાર નિવારણ સમયરેખા',
    activity_history: 'ક્રિયા ઇતિહાસ',
    reopen_btn: 'સમસ્યા ફરીથી ખોલો',
    feedback_btn: 'રેટિંગ આપો',

    // Map & Hotspots
    map_title: 'નવસારી સ્વચ્છતા નકશો',
    map_subtitle: 'વોર્ડ સીમાઓ અને જીવંત ફરિયાદોનું ભૌગોલિક દર્શન',
    filter_all_wards: 'બધા ૧૩ વોર્ડ',
    toggle_hotspots: 'કચરાના હોટસ્પોટ્સ',
    toggle_complaints: 'ફરિયાદો દર્શાવો',
    ward_info: 'વોર્ડ વિગત',
    hotspots_title: 'કચરાના પુનરાવર્તિત હોટસ્પોટ્સ નકશો',
    hotspots_subtitle: 'નવસારી નગરપાલિકા સમસ્યા વિસ્તાર મોનિટરિંગ',
    hotspots_all_cats: 'બધી કેટેગરીઓ',
    hotspots_all_freq: 'બધી આવર્તન',
    hotspots_high_freq: 'ઉચ્ચ આવર્તન (૫+ ફરિયાદો)',
    hotspots_med_freq: 'મધ્યમ આવર્તન (૨-૪ ફરિયાદો)',
    hotspots_low_freq: 'નવા / ઓછા (૧ ફરિયાદ)',
    hotspots_category: 'કેટેગરી',
    hotspots_frequency: 'પુનરાવર્તન આવર્તન',
    hotspots_total_incidents: 'કુલ બનાવો',
    hotspots_active_now: 'હાલમાં સક્રિય',
    hotspots_resolved: 'ઉકેલાયેલ',
    hotspots_reopen_count: 'ફરી ખોલેલ',
    hotspots_ai_pattern: 'AI પેટર્ન વિશ્લેષણ (ભૌગોલિક ક્લસ્ટર્ડ)',
    hotspots_linked_complaints: 'આ સ્થળ પર નોંધાયેલી ફરિયાદો',
    hotspots_inspect_dossier: 'તપાસ કરો',

    // Ward Officer Overview KPIs
    kpi_total_complaints: 'કુલ ફરિયાદો',
    kpi_pending_triage: 'વિભાજન અને સોંપણી બાકી',
    kpi_active_field: 'ફીલ્ડ કામગીરી ચાલુ',
    kpi_pending_verification: 'અધિકારી ચકાસણી બાકી',
    kpi_resolved_rate: 'ઉકેલાયેલ અને સ્વચ્છતા દર',
    kpi_critical_sla: 'તાકીદનું અને સમયમર્યાદા બહાર',
    kpi_total_desc: 'વોર્ડમાં નોંધાયેલ તમામ ફરિયાદો',
    kpi_pending_desc: 'નવી નોંધાયેલ જે ટીમ સોંપણીની રાહ જુએ છે',
    kpi_active_desc: 'ફીલ્ડ ટીમો હાલમાં કામ કરી રહી છે',
    kpi_verification_desc: 'પુરાવા સબમિટ થયા છે જે મંજૂરી બાકી છે',
    kpi_resolved_desc: 'પહેલા અને પછીના ફોટા સાથે બંધ થયેલ',
    kpi_critical_desc: 'તાત્કાલિક ધ્યાન અને SLA અનુસરણ જરૂરી',
    ward_command_title: 'વોર્ડ કમાન્ડ ઝાંખી',
    telemetry_online: 'ફીલ્ડ ટેલિમેટ્રી ઓનલાઇન',
    operational_metrics: 'મુખ્ય કામગીરી સૂચકાંકો',
    live_indicators: 'જીવંત કામગીરી કેન્દ્રબિંદુ',

    // Actions
    action_inspect: 'તપાસો',
    action_assign_team: 'ટીમ સોંપો',
    action_view_team: 'આખી ટીમ જુઓ',
    action_approve: 'મંજૂર કરી ટીમ સોંપો',
    action_reject: 'અસ્વીકાર કરો',
    action_submit_evidence: 'પુરાવા સબમિટ કરો',
    action_live_photo: 'લાઈવ ફોટો પાડો',
    action_description: 'વર્ણન ઉમેરો',
    action_deadline: 'કામની અંતિમ તારીખ',
    action_track_status: 'પ્રગતિ ટ્રેક કરો',
    action_switch_citizen: 'નાગરિક વ્યુ પર જાઓ',
    action_refresh: 'રીફ્રેશ કરો',
    action_edit: 'સુધારો',
    action_delete: 'કાઢી નાખો',

    // Community
    drives_title: 'નવસારી મહાનગરપાલિકા સ્વચ્છતા ડ્રાઇવ્સ',
    drives_desc: 'નવસારીને સ્વચ્છ બનાવવા માટે સ્વયંસેવક તરીકે ભાગ લો',
    register_btn: 'સ્વયંસેવક તરીકે જોડાઓ',
    cancel_reg_btn: 'નોંધણી રદ કરો',
    registered_badge: 'નોંધાયેલ',
    challenges_title: 'શહેર સ્વચ્છતા પડકારો',
    join_challenge: 'પડકારમાં જોડાઓ',
    rewards_title: 'સ્વચ્છતા અને વોર્ડ પોસ્ટ્સ',
    leaderboard_title: 'સ્વચ્છતા ચેમ્પિયન લીડરબોર્ડ',

    // Support
    support_title: 'પ્રતિસાદ અને નાગરિક હેલ્પડેસ્ક',
    create_ticket: 'નવી સહાય ટિકિટ બનાવો',
    rate_resolution: 'સફાઈ કામગીરીથી તમે કેટલા સંતુષ્ટ છો?',

    // Profile & Accessibility
    profile_title: 'નાગરિક પ્રોફાઇલ',
    accessibility_title: 'સુલભતા સેટિંગ્સ',
    read_aloud: 'વાંચી સંભળાવો (ટેક્સ્ટ-ટુ-સ્પીચ)',
    font_size: 'અક્ષરનું કદ',
    high_contrast: 'હાઈ કોન્ટ્રાસ્ટ મોડ',
    change_mobile: 'મોબાઇલ નંબર બદલો (OTP દ્વારા)',
    change_pass: 'પાસવર્ડ બદલો',

    // Common
    loading: 'લોડ થઈ રહ્યું છે...',
    empty: 'કોઈ માહિતી મળી નથી',
    cancel: 'રદ કરો',
    save: 'સાચવો',
    close: 'બંધ કરો',
    error: 'ભૂલ આવી છે',
    skip: 'છોડી દો'
  },

  hi: {
    app_title: 'माय क्लीन नवसारी',
    app_subtitle: 'नवसारी नगर निगम (NMC)',
    tagline: 'स्वच्छ शहर के लिए नागरिकों और नवसारी नगर निगम का डिजिटल मंच',
    nmc_label: 'NMC',
    ward_officer_portal: 'वार्ड अधिकारी पोर्टल',
    field_worker_portal: 'फील्ड कार्यकर्ता पोर्टल',
    community_head_portal: 'कम्युनिटी प्रमुख पोर्टल',
    citizen_portal: 'नागरिक पोर्टल',

    // Navigation (Citizen)
    nav_home: 'होम',
    nav_report: 'शिकायत दर्ज करें',
    nav_complaints: 'मेरी शिकायतें',
    nav_map: 'नवसारी नक्शा',
    nav_more: 'अधिक सेवाएं',
    nav_drives: 'स्वच्छता अभियान',
    nav_challenges: 'सामुदायिक चुनौतियां',
    nav_rewards: 'स्वच्छता पोस्ट्स',
    nav_support: 'प्रतिक्रिया व सहायता',
    nav_notifications: 'सूचनाएं',
    nav_profile: 'मेरी प्रोफ़ाइल',
    nav_login: 'लॉग इन / रजिस्टर',
    nav_logout: 'लॉग आउट',

    // Navigation (Ward Officer)
    wo_nav_overview: 'डैशबोर्ड अवलोकन',
    wo_nav_complaints: 'शिकायत सूची',
    wo_nav_hotspots: 'कचरा हॉटस्पॉट नक्शा',
    wo_nav_workers: 'कर्मचारी प्रबंधन',
    wo_nav_teams: 'टीम प्रबंधन',
    wo_nav_activities: 'सामुदायिक गतिविधियां',
    wo_nav_approvals: 'स्वीकृति प्रबंधन',
    wo_nav_posts: 'नागरिक पोस्ट्स',
    wo_nav_community_problems: 'समुदाय के लिए समस्या जोड़ें',
    wo_nav_cleanliness_score: 'वार्ड स्वच्छता स्कोर',
    wo_nav_reports: 'रिपोर्ट और विश्लेषण',
    wo_nav_notifications: 'सूचनाएं',
    wo_nav_settings: 'सेटिंग्स',
    wo_nav_more: 'अधिक मेनू',

    // Navigation (Worker)
    wrk_nav_home: 'होम',
    wrk_nav_assign_work: 'आवंटित कार्य',
    wrk_nav_work_history: 'कार्य इतिहास',
    wrk_nav_notifications: 'सूचनाएं',
    wrk_nav_profile: 'प्रोफ़ाइल एवं सेटिंग्स',

    // Navigation (Community Head)
    ch_nav_overview: 'अवलोकन',
    ch_nav_activities: 'गतिविधि प्रबंधन',
    ch_nav_ward_problems: 'कार्रवाई हेतु वार्ड समस्याएं',
    ch_nav_community: 'मेरी संस्था',
    ch_nav_analytics: 'रिपोर्ट और विश्लेषण',
    ch_nav_notifications: 'सूचनाएं',
    ch_nav_settings: 'सेटिंग्स',

    // Home
    welcome_back: 'स्वागत है,',
    greeting_morning: 'सुप्रभात',
    greeting_afternoon: 'शुभ दोपहर',
    greeting_evening: 'शुभ संध्या',
    citizen: 'नागरिक',
    ward_badge: 'वार्ड ३ दूधिया तालाब',
    civic_monitoring: 'नवसारी १३-वार्ड नागरिक निगरानी',
    nav_report_short: 'रिपोर्ट',
    hero_card_title: 'नवसारी को स्वच्छ और सुंदर बनाएं',
    hero_card_desc: 'कचरे के ढेर या जलभराव की समस्या? २४ घंटे में समाधान के लिए तुरंत शिकायत दर्ज करें।',
    hero_karma: 'नागरिक कर्म',
    hero_level: 'लेवल २ सक्रिय नागरिक',
    quick_actions: 'त्वरित कार्य',
    action_report: 'स्वच्छता समस्या दर्ज करें',
    action_track: 'शिकायत ट्रैक करें',
    action_map: 'नक्शा देखें',
    action_drives: 'अभियान में शामिल हों',
    stats_total: 'कुल रिपोर्ट',
    stats_total_sub: 'सभी दर्ज शिकायतें',
    stats_pending: 'लंबित',
    stats_pending_sub: 'अधिकारी समीक्षा प्रतीक्षारत',
    stats_in_progress: 'प्रगति पर',
    stats_in_progress_sub: 'सफाई दल मौके पर कार्यरत',
    stats_resolved: 'निस्तारित',
    stats_resolved_sub: 'सत्यापित स्वच्छ स्थल',
    action_map_title: 'स्वच्छता नक्शा',
    action_map_sub: '१३ वार्ड GIS और हॉटस्पॉट',
    action_drives_title: 'स्वच्छता अभियान',
    action_drives_sub: 'स्वयंसेवक के रूप में जुड़ें',
    action_challenges_title: 'नागरिक चुनौतियां',
    action_challenges_sub: 'अंक और बैज अर्जित करें',
    nearby_issues_title: 'नवसारी में हालिया शिकायतें',
    ward_scores_title: 'वार्ड स्वच्छता रैंकिंग',
    community_impact_title: 'आपका नागरिक योगदान',
    points_earned: 'स्वच्छता पॉइंट्स',

    // Report
    report_title: 'स्वच्छता समस्या की रिपोर्ट दर्ज करें',
    flow_step_1: 'प्रकार चुनें',
    flow_step_2: 'फोटो लें',
    flow_step_3: 'विवरण और स्थान',
    select_complaint_type: 'शिकायत का प्रकार चुनें',
    select_complaint_sub: 'अपनी समस्या आसानी से पहचानने के लिए नीचे दिए गए प्रतीक चुनें',
    tap_to_select: 'चुनने के लिए टैप करें',
    step_1: '१. फोटो और श्रेणी',
    step_2: '२. AI वर्गीकरण',
    step_3: '३. सामग्री सुरक्षा जांच',
    step_4: '४. वॉयस ट्रांसक्रिप्ट',
    step_5: '५. स्थान और वार्ड',
    step_6: '६. डुप्लिकेट जांच',
    step_7: '७. फोटो गुणवत्ता जांच',
    step_8: '८. पुष्टि',
    upload_photo: 'फोटो अपलोड करें या कैमरा खोलें',
    select_category: 'समस्या की श्रेणी चुनें',
    describe_issue: 'समस्या का विवरण लिखें...',
    record_voice: 'आवाज रिकॉर्ड करने के लिए दबाए रखें',
    recording: 'रिकॉर्डिंग जारी है... बोलिए',
    location_detected: 'नवसारी सीमा के भीतर स्थान सत्यापित',
    outside_nmc_error: 'चयनित स्थान नवसारी नगर निगम सीमा से बाहर है।',
    ai_predicted: 'AI द्वारा अनुमानित श्रेणी',
    confidence: 'सटीकता',
    submit_report: 'आधिकारिक शिकायत जमा करें',
    complaint_success: 'शिकायत सफलतापूर्वक दर्ज हो गई!',
    complaint_id: 'शिकायत क्रमांक',

    // Complaints
    tab_all: 'सभी',
    tab_submitted: 'दर्ज',
    tab_under_review: 'समीक्षाधीन',
    tab_assigned: 'आबंटित',
    tab_in_progress: 'प्रगति पर',
    tab_awaiting_verification: 'सत्यापन प्रतीक्षारत',
    tab_resolved: 'निस्तारित',
    tab_rejected: 'अस्वीकृत',
    tab_reopened: 'पुनः खुली',
    view_details: 'विवरण देखें',
    timeline_title: 'आधिकारिक निस्तारण समयरेखा',
    activity_history: 'कार्य इतिहास',
    reopen_btn: 'अनसुलझी समस्या पुनः खोलें',
    feedback_btn: 'रेटिंग दें',

    // Map & Hotspots
    map_title: 'नवसारी स्वच्छता नक्शा',
    map_subtitle: 'वार्ड सीमाएं और लाइव नागरिक शिकायतें',
    filter_all_wards: 'सभी १३ वार्ड',
    toggle_hotspots: 'कचरा हॉटस्पॉट',
    toggle_complaints: 'शिकायतें दिखाएं',
    ward_info: 'वार्ड विवरण',
    hotspots_title: 'कचरा हॉटस्पॉट नक्शा',
    hotspots_subtitle: 'नवसारी नगर निगम समस्या क्षेत्र ट्रैकिंग',
    hotspots_all_cats: 'सभी श्रेणियां',
    hotspots_all_freq: 'सभी आवृत्तियां',
    hotspots_high_freq: 'उच्च आवृत्ति (५+ शिकायतें)',
    hotspots_med_freq: 'मध्यम आवृत्ति (२-४ शिकायतें)',
    hotspots_low_freq: 'कम / उभरती (१ शिकायत)',
    hotspots_category: 'श्रेणी',
    hotspots_frequency: 'पुनरावृत्ति आवृत्ति',
    hotspots_total_incidents: 'कुल घटनाएं',
    hotspots_active_now: 'वर्तमान में सक्रिय',
    hotspots_resolved: 'निस्तारित',
    hotspots_reopen_count: 'पुनः खुली',
    hotspots_ai_pattern: 'AI पैटर्न विश्लेषण (भू-स्थानिक क्लस्टर्ड)',
    hotspots_linked_complaints: 'इस स्थान से जुड़ी शिकायतें',
    hotspots_inspect_dossier: 'जांच करें',

    // Ward Officer Overview KPIs
    kpi_total_complaints: 'कुल शिकायतें',
    kpi_pending_triage: 'समीक्षा व आवंटन लंबित',
    kpi_active_field: 'फील्ड कार्य प्रगति पर',
    kpi_pending_verification: 'अधिकारी सत्यापन प्रतीक्षारत',
    kpi_resolved_rate: 'निस्तारित व स्वच्छता दर',
    kpi_critical_sla: 'अति-महत्वपूर्ण व समय सीमा पार',
    kpi_total_desc: 'वार्ड में दर्ज सभी शिकायतें',
    kpi_pending_desc: 'नई शिकायतें जो टीम आवंटन की प्रतीक्षा में हैं',
    kpi_active_desc: 'फील्ड टीमें वर्तमान में कार्य कर रही हैं',
    kpi_verification_desc: 'साक्ष्य प्रस्तुत हो चुका है, स्वीकृति लंबित',
    kpi_resolved_desc: 'सत्यापित पूर्व/पश्चात फोटो के साथ पूर्ण',
    kpi_critical_desc: 'तत्काल ध्यान और SLA अनुवर्ती कार्यवाही योग्य',
    ward_command_title: 'वार्ड कमान अवलोकन',
    telemetry_online: 'फील्ड टेलीमेट्री ऑनलाइन',
    operational_metrics: 'प्रमुख परिचालन संकेतक',
    live_indicators: 'सक्रिय परिचालन फोकस',

    // Actions
    action_inspect: 'जांचें',
    action_assign_team: 'टीम आवंटित करें',
    action_view_team: 'पूरी टीम देखें',
    action_approve: 'स्वीकार करें व टीम लगाएं',
    action_reject: 'अस्वीकार करें',
    action_submit_evidence: 'साक्ष्य प्रस्तुत करें',
    action_live_photo: 'लाइव फोटो खींचें',
    action_description: 'विवरण लिखें',
    action_deadline: 'कार्य अंतिम तिथि',
    action_track_status: 'प्रगति ट्रैक करें',
    action_switch_citizen: 'नागरिक दृश्य पर जाएं',
    action_refresh: 'रिफ्रेश करें',
    action_edit: 'संपादित करें',
    action_delete: 'हटाएं',

    // Community
    drives_title: 'नवसारी नगर निगम स्वच्छता अभियान',
    drives_desc: 'स्वच्छ नवसारी के लिए स्वयंसेवक के रूप में भाग लें',
    register_btn: 'स्वयंसेवक बनें',
    cancel_reg_btn: 'पंजीकरण रद्द करें',
    registered_badge: 'पंजीकृत',
    challenges_title: 'शहर स्वच्छता चुनौतियां',
    join_challenge: 'चुनौती में शामिल हों',
    rewards_title: 'सामुदायिक एवं वार्ड स्वच्छता पोस्ट्स',
    leaderboard_title: 'स्वच्छता चैंपियंस लीडरबोर्ड',

    // Support
    support_title: 'प्रतिक्रिया एवं नागरिक सहायता',
    create_ticket: 'नई सहायता टिकट बनाएं',
    rate_resolution: 'सफाई कार्य से आप कितने संतुष्ट हैं?',

    // Profile & Accessibility
    profile_title: 'नागरिक प्रोफ़ाइल',
    accessibility_title: 'सुलभता सेटिंग्स',
    read_aloud: 'पढ़कर सुनाएं (टेक्स्ट-टू-स्पीच)',
    font_size: 'अक्षर का आकार',
    high_contrast: 'उच्च कंट्रास्ट मोड',
    change_mobile: 'मोबाइल नंबर बदलें (OTP द्वारा)',
    change_pass: 'पासवर्ड बदलें',

    // Common
    loading: 'लोड हो रहा है...',
    empty: 'कोई डेटा नहीं मिला',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    close: 'बंद करें',
    error: 'त्रुटि हुई',
    skip: 'छोड़ें'
  }
};
