/**
 * Mock data for demonstrating the UI without a live backend.
 * Contains 3 sample chats with messages, sources, and graph data.
 */

const now = new Date();
const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

// ── Sample Chats ────────────────────────────────────────────────────────────

export const MOCK_CHATS = [
  {
    id: 'meeting_a1b2c3d4',
    title: 'Q3 Product Roadmap Review',
    audioFile: 'q3_roadmap_review.mp3',
    status: 'ready',
    duration: 2712, // 45:12
    createdAt: hoursAgo(2),
    messages: [
      {
        id: 'msg_001',
        role: 'user',
        content: 'Who were the speakers in this meeting?',
        createdAt: hoursAgo(1.9),
      },
      {
        id: 'msg_002',
        role: 'assistant',
        content: 'There were three speakers identified in this meeting:\n\n1. **Sarah Chen** — Product Lead, who drove most of the agenda and presented the Q3 roadmap priorities.\n2. **Marcus Thompson** — Engineering Manager, who provided technical feasibility assessments and timeline estimates.\n3. **Priya Patel** — Design Lead, who discussed the UX research findings and proposed design direction for the new dashboard.',
        sources: [
          { speaker: 'SPEAKER_00', timestamp: 12, label: 'Sarah Chen' },
          { speaker: 'SPEAKER_01', timestamp: 145, label: 'Marcus Thompson' },
          { speaker: 'SPEAKER_02', timestamp: 287, label: 'Priya Patel' },
        ],
        createdAt: hoursAgo(1.85),
      },
      {
        id: 'msg_003',
        role: 'user',
        content: 'What were the key decisions made?',
        createdAt: hoursAgo(1.5),
      },
      {
        id: 'msg_004',
        role: 'assistant',
        content: 'Three key decisions were made during this meeting:\n\n1. **Dashboard Redesign Priority**: The team agreed to prioritize the analytics dashboard redesign over the notification system overhaul, moving it to Sprint 14.\n\n2. **API Migration Timeline**: Marcus confirmed the GraphQL migration can be completed by end of August, but requires hiring one additional backend engineer.\n\n3. **User Research Extension**: Priya requested and received approval to extend the UX research phase by two weeks to include accessibility testing with screen reader users.',
        sources: [
          { speaker: 'SPEAKER_00', timestamp: 890, label: 'Sarah Chen' },
          { speaker: 'SPEAKER_01', timestamp: 1230, label: 'Marcus Thompson' },
          { speaker: 'SPEAKER_02', timestamp: 1567, label: 'Priya Patel' },
          { speaker: 'SPEAKER_00', timestamp: 1890, label: 'Sarah Chen' },
        ],
        createdAt: hoursAgo(1.45),
      },
      {
        id: 'msg_005',
        role: 'user',
        content: 'What did Marcus say about the API migration risks?',
        createdAt: hoursAgo(1.2),
      },
      {
        id: 'msg_006',
        role: 'assistant',
        content: 'Marcus raised several concerns about the API migration:\n\n- **Breaking Changes**: The GraphQL migration will introduce breaking changes for 3 external API consumers. He recommended a 4-week deprecation window.\n- **Performance Testing**: Load testing hasn\'t been completed yet. He flagged that the current GraphQL resolver implementation may have N+1 query issues under heavy load.\n- **Rollback Plan**: He insisted on maintaining the REST endpoints in parallel for at least 2 sprints after the migration, as a safety net.\n\nHe estimated the total risk as "moderate" but manageable if the team gets the additional backend engineer by mid-August.',
        sources: [
          { speaker: 'SPEAKER_01', timestamp: 1230, label: 'Marcus Thompson' },
          { speaker: 'SPEAKER_01', timestamp: 1345, label: 'Marcus Thompson' },
          { speaker: 'SPEAKER_01', timestamp: 1490, label: 'Marcus Thompson' },
        ],
        createdAt: hoursAgo(1.15),
      },
      {
        id: 'msg_007',
        role: 'user',
        content: 'Summarize the action items.',
        createdAt: hoursAgo(0.8),
      },
      {
        id: 'msg_008',
        role: 'assistant',
        content: 'Here are the action items from the meeting:\n\n| Owner | Action Item | Deadline |\n|-------|------------|----------|\n| Sarah Chen | Finalize Q3 roadmap document and share with stakeholders | Aug 9 |\n| Marcus Thompson | Draft API migration plan with deprecation schedule | Aug 12 |\n| Marcus Thompson | Submit hiring request for backend engineer | Aug 7 |\n| Priya Patel | Complete accessibility testing protocol and recruit participants | Aug 15 |\n| Priya Patel | Present updated dashboard wireframes at next design review | Aug 11 |\n| Sarah Chen | Schedule follow-up meeting with external API consumers | Aug 10 |',
        sources: [
          { speaker: 'SPEAKER_00', timestamp: 2400, label: 'Sarah Chen' },
          { speaker: 'SPEAKER_01', timestamp: 2510, label: 'Marcus Thompson' },
          { speaker: 'SPEAKER_02', timestamp: 2600, label: 'Priya Patel' },
        ],
        createdAt: hoursAgo(0.75),
      },
    ],
  },
  {
    id: 'meeting_e5f6g7h8',
    title: 'Engineering Standup Aug 4',
    audioFile: 'eng_standup_aug4.wav',
    status: 'ready',
    duration: 923, // 15:23
    createdAt: daysAgo(2),
    messages: [
      {
        id: 'msg_009',
        role: 'user',
        content: 'What blockers were mentioned?',
        createdAt: daysAgo(1.9),
      },
      {
        id: 'msg_010',
        role: 'assistant',
        content: 'Two blockers were discussed:\n\n1. **CI Pipeline Failures**: Alex mentioned that the CI pipeline has been flaky for the past 2 days due to a Docker image caching issue. DevOps is investigating.\n\n2. **Database Schema Conflict**: Jordan reported a migration conflict on the `users` table between the auth refactor branch and the profile feature branch. They need to coordinate with the auth team to resolve merge conflicts.',
        sources: [
          { speaker: 'SPEAKER_00', timestamp: 120, label: 'Alex Rivera' },
          { speaker: 'SPEAKER_03', timestamp: 340, label: 'Jordan Kim' },
        ],
        createdAt: daysAgo(1.85),
      },
      {
        id: 'msg_011',
        role: 'user',
        content: 'Who is working on what this sprint?',
        createdAt: daysAgo(1.7),
      },
      {
        id: 'msg_012',
        role: 'assistant',
        content: 'Sprint assignments mentioned in the standup:\n\n- **Alex Rivera** — Finishing the notification service refactor (80% complete)\n- **Jordan Kim** — User profile page redesign with new avatar system\n- **Taylor Brooks** — API rate limiting implementation and load testing\n- **Sam Ogunyemi** — Mobile push notification integration with Firebase\n- **Casey Wong** — Bug fixes from QA backlog (12 tickets remaining)',
        sources: [
          { speaker: 'SPEAKER_00', timestamp: 60, label: 'Alex Rivera' },
          { speaker: 'SPEAKER_03', timestamp: 180, label: 'Jordan Kim' },
          { speaker: 'SPEAKER_01', timestamp: 240, label: 'Taylor Brooks' },
          { speaker: 'SPEAKER_02', timestamp: 420, label: 'Sam Ogunyemi' },
          { speaker: 'SPEAKER_04', timestamp: 540, label: 'Casey Wong' },
        ],
        createdAt: daysAgo(1.65),
      },
    ],
  },
  {
    id: 'meeting_i9j0k1l2',
    title: 'Client Onboarding Call — Acme Corp',
    audioFile: 'client_onboarding_acme.m4a',
    status: 'ready',
    duration: 1920, // 32:00
    createdAt: daysAgo(5),
    messages: [
      {
        id: 'msg_013',
        role: 'user',
        content: 'What are the client\'s main requirements?',
        createdAt: daysAgo(4.8),
      },
      {
        id: 'msg_014',
        role: 'assistant',
        content: 'Acme Corp outlined the following key requirements:\n\n1. **Single Sign-On (SSO)**: Integration with their existing Okta setup is mandatory before go-live.\n2. **Data Residency**: All data must be stored in EU data centers (Frankfurt region preferred) due to GDPR compliance.\n3. **Custom Branding**: They need white-label capabilities — custom logo, color scheme, and email templates.\n4. **Bulk Import**: Ability to import 50,000+ existing customer records from their legacy CRM (Salesforce export as CSV).\n5. **Reporting**: Weekly automated reports sent to their ops team, with PDF export capability.',
        sources: [
          { speaker: 'SPEAKER_01', timestamp: 180, label: 'David Chen (Acme)' },
          { speaker: 'SPEAKER_01', timestamp: 450, label: 'David Chen (Acme)' },
          { speaker: 'SPEAKER_01', timestamp: 720, label: 'David Chen (Acme)' },
        ],
        createdAt: daysAgo(4.75),
      },
      {
        id: 'msg_015',
        role: 'user',
        content: 'What timeline did we commit to?',
        createdAt: daysAgo(4.5),
      },
      {
        id: 'msg_016',
        role: 'assistant',
        content: 'The agreed timeline:\n\n- **Week 1-2**: SSO integration and environment provisioning\n- **Week 3**: Data migration (bulk import + validation)\n- **Week 4**: Custom branding setup and UAT\n- **Week 5**: Go-live with 2 weeks of hyper-care support\n\nTotal: **5 weeks** from contract signing. Our account manager, Lisa, committed to having the SOW finalized by end of this week.',
        sources: [
          { speaker: 'SPEAKER_00', timestamp: 1100, label: 'Lisa Park (Us)' },
          { speaker: 'SPEAKER_01', timestamp: 1250, label: 'David Chen (Acme)' },
        ],
        createdAt: daysAgo(4.45),
      },
      {
        id: 'msg_017',
        role: 'user',
        content: 'Were there any concerns raised by the client?',
        createdAt: daysAgo(4.2),
      },
      {
        id: 'msg_018',
        role: 'assistant',
        content: 'David raised two concerns:\n\n1. **Data Security Audit**: Acme\'s security team wants to conduct a penetration test before go-live. They need our staging environment details and API documentation at least 2 weeks ahead.\n\n2. **Support SLA**: They want a guaranteed 4-hour response time for P1 issues during business hours, which is tighter than our standard 8-hour SLA. Lisa said she would escalate this to our VP of Customer Success for approval.',
        sources: [
          { speaker: 'SPEAKER_01', timestamp: 1500, label: 'David Chen (Acme)' },
          { speaker: 'SPEAKER_00', timestamp: 1650, label: 'Lisa Park (Us)' },
        ],
        createdAt: daysAgo(4.15),
      },
    ],
  },
];

// ── Sample Graph Data ───────────────────────────────────────────────────────

export const MOCK_GRAPHS = {
  meeting_a1b2c3d4: {
    nodes: [
      { id: 'sarah_chen', label: 'Sarah Chen', type: 'Person', group: 'person' },
      { id: 'marcus_thompson', label: 'Marcus Thompson', type: 'Person', group: 'person' },
      { id: 'priya_patel', label: 'Priya Patel', type: 'Person', group: 'person' },
      { id: 'q3_roadmap', label: 'Q3 Roadmap', type: 'Topic', group: 'topic' },
      { id: 'dashboard_redesign', label: 'Dashboard Redesign', type: 'Decision', group: 'decision' },
      { id: 'api_migration', label: 'GraphQL Migration', type: 'Topic', group: 'topic' },
      { id: 'ux_research', label: 'UX Research', type: 'Topic', group: 'topic' },
      { id: 'accessibility_testing', label: 'Accessibility Testing', type: 'Task', group: 'task' },
      { id: 'sprint_14', label: 'Sprint 14', type: 'Timeline', group: 'timeline' },
      { id: 'backend_engineer', label: 'New Backend Engineer', type: 'Resource', group: 'resource' },
      { id: 'breaking_changes', label: 'Breaking Changes', type: 'Risk', group: 'risk' },
      { id: 'deprecation_window', label: '4-Week Deprecation', type: 'Decision', group: 'decision' },
      { id: 'analytics_dashboard', label: 'Analytics Dashboard', type: 'Feature', group: 'feature' },
      { id: 'notification_system', label: 'Notification System', type: 'Feature', group: 'feature' },
    ],
    links: [
      { source: 'sarah_chen', target: 'q3_roadmap', label: 'presented' },
      { source: 'sarah_chen', target: 'dashboard_redesign', label: 'approved' },
      { source: 'marcus_thompson', target: 'api_migration', label: 'owns' },
      { source: 'marcus_thompson', target: 'breaking_changes', label: 'flagged' },
      { source: 'marcus_thompson', target: 'backend_engineer', label: 'requested' },
      { source: 'marcus_thompson', target: 'deprecation_window', label: 'recommended' },
      { source: 'priya_patel', target: 'ux_research', label: 'leads' },
      { source: 'priya_patel', target: 'accessibility_testing', label: 'proposed' },
      { source: 'dashboard_redesign', target: 'sprint_14', label: 'scheduled_for' },
      { source: 'dashboard_redesign', target: 'analytics_dashboard', label: 'targets' },
      { source: 'q3_roadmap', target: 'dashboard_redesign', label: 'includes' },
      { source: 'q3_roadmap', target: 'api_migration', label: 'includes' },
      { source: 'api_migration', target: 'breaking_changes', label: 'causes' },
      { source: 'api_migration', target: 'backend_engineer', label: 'requires' },
      { source: 'ux_research', target: 'accessibility_testing', label: 'extended_for' },
      { source: 'dashboard_redesign', target: 'notification_system', label: 'deprioritized_over' },
    ],
  },
  meeting_e5f6g7h8: {
    nodes: [
      { id: 'alex_rivera', label: 'Alex Rivera', type: 'Person', group: 'person' },
      { id: 'jordan_kim', label: 'Jordan Kim', type: 'Person', group: 'person' },
      { id: 'taylor_brooks', label: 'Taylor Brooks', type: 'Person', group: 'person' },
      { id: 'sam_ogunyemi', label: 'Sam Ogunyemi', type: 'Person', group: 'person' },
      { id: 'casey_wong', label: 'Casey Wong', type: 'Person', group: 'person' },
      { id: 'notification_refactor', label: 'Notification Refactor', type: 'Task', group: 'task' },
      { id: 'profile_redesign', label: 'Profile Redesign', type: 'Task', group: 'task' },
      { id: 'rate_limiting', label: 'API Rate Limiting', type: 'Task', group: 'task' },
      { id: 'ci_pipeline', label: 'CI Pipeline Issue', type: 'Blocker', group: 'risk' },
      { id: 'schema_conflict', label: 'DB Schema Conflict', type: 'Blocker', group: 'risk' },
      { id: 'push_notifications', label: 'Push Notifications', type: 'Task', group: 'task' },
    ],
    links: [
      { source: 'alex_rivera', target: 'notification_refactor', label: 'working_on' },
      { source: 'alex_rivera', target: 'ci_pipeline', label: 'reported' },
      { source: 'jordan_kim', target: 'profile_redesign', label: 'working_on' },
      { source: 'jordan_kim', target: 'schema_conflict', label: 'reported' },
      { source: 'taylor_brooks', target: 'rate_limiting', label: 'working_on' },
      { source: 'sam_ogunyemi', target: 'push_notifications', label: 'working_on' },
      { source: 'casey_wong', target: 'profile_redesign', label: 'bug_fixes' },
      { source: 'schema_conflict', target: 'profile_redesign', label: 'blocks' },
    ],
  },
  meeting_i9j0k1l2: {
    nodes: [
      { id: 'lisa_park', label: 'Lisa Park', type: 'Person', group: 'person' },
      { id: 'david_chen', label: 'David Chen', type: 'Person', group: 'person' },
      { id: 'acme_corp', label: 'Acme Corp', type: 'Organization', group: 'organization' },
      { id: 'sso_integration', label: 'SSO / Okta Integration', type: 'Requirement', group: 'feature' },
      { id: 'data_residency', label: 'EU Data Residency', type: 'Requirement', group: 'feature' },
      { id: 'custom_branding', label: 'White-Label Branding', type: 'Requirement', group: 'feature' },
      { id: 'bulk_import', label: 'Bulk Import (50K+)', type: 'Requirement', group: 'feature' },
      { id: 'reporting', label: 'Automated Reports', type: 'Requirement', group: 'feature' },
      { id: 'pen_test', label: 'Penetration Test', type: 'Risk', group: 'risk' },
      { id: 'support_sla', label: '4hr P1 SLA', type: 'Decision', group: 'decision' },
      { id: 'go_live', label: '5-Week Go-Live', type: 'Timeline', group: 'timeline' },
    ],
    links: [
      { source: 'david_chen', target: 'acme_corp', label: 'represents' },
      { source: 'lisa_park', target: 'go_live', label: 'committed_to' },
      { source: 'acme_corp', target: 'sso_integration', label: 'requires' },
      { source: 'acme_corp', target: 'data_residency', label: 'requires' },
      { source: 'acme_corp', target: 'custom_branding', label: 'requires' },
      { source: 'acme_corp', target: 'bulk_import', label: 'requires' },
      { source: 'acme_corp', target: 'reporting', label: 'requires' },
      { source: 'david_chen', target: 'pen_test', label: 'requested' },
      { source: 'david_chen', target: 'support_sla', label: 'requested' },
      { source: 'lisa_park', target: 'support_sla', label: 'escalating' },
      { source: 'sso_integration', target: 'go_live', label: 'blocks' },
      { source: 'pen_test', target: 'go_live', label: 'blocks' },
    ],
  },
};

/**
 * Get all mock chats sorted by creation date (newest first).
 */
export function getMockChats() {
  return [...MOCK_CHATS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get mock graph data for a specific chat.
 */
export function getMockGraph(chatId) {
  return MOCK_GRAPHS[chatId] || { nodes: [], links: [] };
}
