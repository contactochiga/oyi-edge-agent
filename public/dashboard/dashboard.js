(function () {
  const ADMIN_EMAIL_STORAGE = "ochiga_lead_desk_admin_email";
  const LEFT_COLLAPSED_STORAGE = "ochiga_lead_desk_left_collapsed";
  const DETAIL_COLLAPSED_STORAGE = "ochiga_lead_desk_detail_collapsed";

  const state = {
    adminEmail: window.localStorage.getItem(ADMIN_EMAIL_STORAGE) || "",
    session: null,
    leads: [],
    filteredLeads: [],
    activeQueue: "all",
    activeFilter: "all",
	    workspaceTab: "overview",
	    overviewFocus: "summary",
	    crmOfficeView: "crm",
	    selectedOfficeEstateId: "",
    selectedLeadId: "",
    selectedLead: null,
    selectedLeadIds: new Set(),
    conversations: [],
    demos: [],
    memory: null,
    traces: [],
    notifications: [],
    report: null,
    channelOverview: null,
    officeStats: null,
    officeData: null,
    integrations: null,
    aiOperations: null,
    mapConfig: null,
    googleMapsPromise: null,
    allDemos: [],
    proposals: [],
    allProposals: [],
    audit: [],
    timeline: [],
    adminUsers: [],
    channelState: null,
    traceQuery: "",
    notificationFilter: "open",
    auditQuery: "",
    documentQuery: "",
    crmIntegrationsExpanded: false,
    aiOpsView: "dashboard",
    adminSection: "dashboard",
    moduleFacet: {},
    estatePortfolioView: "map",
    liveInfraMode: "map",
    liveInfraPanel: "",
    liveInfraZoom: 1,
    liveInfraLayers: {
      devices: true,
      cameras: true,
      alerts: true,
      access: true,
      utilities: true,
      residents: false,
      visitors: true,
      security: true,
      maintenance: true,
      edge: true,
      twin: true,
      network: true,
    },
    dataRevision: 0,
    officeEventSource: null,
    officeEventRefreshTimer: null,
    leftCollapsed: window.localStorage.getItem(LEFT_COLLAPSED_STORAGE) === "1",
    detailCollapsed: window.localStorage.getItem(DETAIL_COLLAPSED_STORAGE) === "1",
    centerMode: "browser",
  };

  const DOMAIN_ICONS = {
    summary:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h8V3H3z"></path><path d="M13 21h8v-6h-8z"></path><path d="M13 10h8V3h-8z"></path><path d="M3 21h8v-4H3z"></path></svg>',
    facility:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path></svg>',
    smart_buildings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path><path d="M9 13h.01"></path><path d="M15 13h.01"></path></svg>',
    web_presence:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>',
    support:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
    crm_agents:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-6"></path></svg>',
    ai_operations:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><circle cx="12" cy="12" r="4"></circle></svg>',
    staff_roles:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    governance:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"></path><path d="M9 12l2 2 4-4"></path></svg>',
    infrastructure_intelligence:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"></path><path d="M12 7v5l3 2"></path><path d="M19 3v5h-5"></path></svg>',
    platform_infrastructure:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path><path d="M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"></path></svg>',
  };

  const derivedCache = {
    revision: -1,
    value: null,
  };

  const auditSearchCache = new WeakMap();
  const traceSearchCache = new WeakMap();

  const OFFICE_MODULE_REGISTRY = [
    { key: "overview", focus: "summary", permissions: ["view_office", "view_reports"] },
    { key: "facilities", focus: "facilities", permissions: ["view_estates", "view_reports"] },
    { key: "consumers", focus: "consumers", permissions: ["view_reports"] },
    { key: "crm", focus: "crm", permissions: ["manage_leads", "view_reports"] },
    { key: "projects", focus: "projects", permissions: ["view_reports"] },
    { key: "deployments", focus: "deployments", permissions: ["view_reports"] },
    { key: "documents", focus: "documents", permissions: ["documents.generate", "manage_commercial", "view_reports"] },
    { key: "finance", focus: "finance", permissions: ["view_reports"] },
    { key: "agents", focus: "agents", permissions: ["manage_leads", "view_reports", "view_traces"] },
    { key: "edge", focus: "edge", permissions: ["view_devices", "view_reports"] },
    { key: "digital_twin", focus: "digital_twin", permissions: ["view_reports"] },
    { key: "reports", focus: "reports", permissions: ["view_reports"] },
    { key: "team", focus: "team", permissions: ["view_users", "manage_users", "change_password"] },
    { key: "settings", focus: "settings", permissions: ["view_integrations", "view_users", "view_reports"] },
    { key: "intelligence", focus: "intelligence", permissions: ["manage_leads", "view_reports", "view_traces"] },
  ];

  function invalidateDerivedData() {
    state.dataRevision += 1;
    derivedCache.revision = -1;
    derivedCache.value = null;
  }

  function incrementCount(map, key, amount) {
    const safeKey = String(key || "unknown");
    map[safeKey] = (map[safeKey] || 0) + (amount || 1);
  }

  const rankEntries = function (map, limit) {
    return Object.entries(map || {})
      .sort(function (a, b) {
        return Number(b[1] || 0) - Number(a[1] || 0);
      })
      .slice(0, limit || 5)
      .map(function (entry) {
        return { label: entry[0], value: entry[1] };
      });
  };

  function sourceMatches(source, pattern) {
    return pattern.test(String(source || ""));
  }

  function getSearchText(cache, item) {
    if (!item || typeof item !== "object") return "";
    const cached = cache.get(item);
    if (cached) return cached;
    const text = JSON.stringify(item).toLowerCase();
    cache.set(item, text);
    return text;
  }

  function debounce(fn, delay) {
    let timer = 0;
    return function () {
      const args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  function getDerivedData() {
    if (derivedCache.revision === state.dataRevision && derivedCache.value) {
      return derivedCache.value;
    }

    const data = {
      leadsById: new Map(),
      notificationsByLeadId: new Map(),
      ownerCounts: {},
      statusCounts: {},
      stageCounts: {},
      roleCounts: {},
      userStatusCounts: {},
      auditActionCounts: {},
      traceAgentCounts: {},
      projectTypeCounts: {},
      notificationTypeCounts: {},
      notificationStatusCounts: {},
      channelCounts: {
        website: 0,
        whatsapp: 0,
        instagram: 0,
        facebook: 0,
        linkedin: 0,
        tiktok: 0,
        google: 0,
        appStore: 0,
        playStore: 0,
      },
      estateLikeRecords: [],
      estateKeys: [],
      smartBuildingRecords: [],
      webRecords: [],
      humanOwned: [],
      salesOwned: [],
      marketingLeads: [],
      hotRecords: [],
      marketingHot: 0,
      salesHot: 0,
      totalUnits: 0,
      buildingCount: 0,
      openNotifications: 0,
      openEscalations: 0,
      founderNotifications: 0,
      resolvedNotifications: 0,
      activeProposalCount: 0,
      wonCount: 0,
      lostCount: 0,
    };

    const estateKeySet = new Set();
    state.leads.forEach(function (lead) {
      const id = lead.id || "";
      const owner = lead.owner || "unknown";
      const status = lead.status || "unknown";
      const stage = lead.stage || lead.commercial_stage || "new";
      const source = lead.source || "";
      const project = String(lead.project_type || "").toLowerCase();
      const score = Number(lead.score || 0);
      const units = Number(lead.unit_count || 0);

      if (id) data.leadsById.set(id, lead);
      incrementCount(data.ownerCounts, owner);
      incrementCount(data.statusCounts, status);
      incrementCount(data.stageCounts, stage);

      if (owner === "human") data.humanOwned.push(lead);
      if (owner === "marketing_agent") data.marketingLeads.push(lead);
      if (owner === "sales_agent" || status === "sales" || status === "booked") data.salesOwned.push(lead);
      if (score >= 70) data.hotRecords.push(lead);
      if (owner === "marketing_agent" && score >= 70) data.marketingHot += 1;
      if ((owner === "sales_agent" || status === "sales" || status === "booked") && score >= 70) data.salesHot += 1;
      if (status === "closed") data.wonCount += 1;
      if (status === "lost") data.lostCount += 1;

      if (/estate|building|home|residen|villa|apartment|facility/.test(project) || Boolean(lead.company || lead.location)) {
        data.estateLikeRecords.push(lead);
        const key =
          String(lead.company || "").trim() ||
          String(lead.name || "").trim() ||
          String(lead.location || "").trim() ||
          String(lead.id || "").trim();
        if (key) estateKeySet.add(key);
      }
      if (units > 0 || /building|home|residen|estate|villa|apartment/.test(project)) {
        data.smartBuildingRecords.push(lead);
        data.totalUnits += units;
        if (units > 0) data.buildingCount += 1;
        incrementCount(data.projectTypeCounts, lead.project_type || "unspecified");
      }
      if (/web|site|widget|landing/.test(String(source).toLowerCase())) {
        data.webRecords.push(lead);
      }

      if (sourceMatches(source, /web|site|widget/i)) data.channelCounts.website += 1;
      if (sourceMatches(source, /whatsapp/i)) data.channelCounts.whatsapp += 1;
      if (sourceMatches(source, /instagram/i)) data.channelCounts.instagram += 1;
      if (sourceMatches(source, /facebook/i)) data.channelCounts.facebook += 1;
      if (sourceMatches(source, /linkedin/i)) data.channelCounts.linkedin += 1;
      if (sourceMatches(source, /tiktok/i)) data.channelCounts.tiktok += 1;
      if (sourceMatches(source, /google|ads/i)) data.channelCounts.google += 1;
      if (sourceMatches(source, /app store|ios/i)) data.channelCounts.appStore += 1;
      if (sourceMatches(source, /play store|android/i)) data.channelCounts.playStore += 1;
    });
    data.estateKeys = Array.from(estateKeySet);

    state.notifications.forEach(function (notification) {
      const status = notification.status || "open";
      const type = notification.type || "notification";
      incrementCount(data.notificationStatusCounts, status);
      incrementCount(data.notificationTypeCounts, type);
      if ((status || "open") === "open") data.openNotifications += 1;
      if (status === "resolved") data.resolvedNotifications += 1;
      if (type === "founder_escalation") {
        data.founderNotifications += 1;
        if ((status || "open") === "open") data.openEscalations += 1;
      }
      if (notification.lead_id) {
        const rows = data.notificationsByLeadId.get(notification.lead_id) || [];
        rows.push(notification);
        data.notificationsByLeadId.set(notification.lead_id, rows);
      }
    });

    state.adminUsers.forEach(function (user) {
      incrementCount(data.roleCounts, user.role || "viewer");
      incrementCount(data.userStatusCounts, user.status || "active");
    });

    state.audit.forEach(function (event) {
      incrementCount(data.auditActionCounts, event.action || "event");
    });
    state.traces.forEach(function (trace) {
      incrementCount(data.traceAgentCounts, trace.agent || "system");
    });
    state.allProposals.forEach(function (proposal) {
      if (["draft", "sent"].includes(String(proposal.status || "").toLowerCase())) {
        data.activeProposalCount += 1;
      }
    });

    derivedCache.revision = state.dataRevision;
    derivedCache.value = data;
    return data;
  }

  const el = {
    adminEmail: document.getElementById("adminEmail"),
    adminPassword: document.getElementById("adminPassword"),
    loginBtn: document.getElementById("loginBtn"),
    authStatus: document.getElementById("authStatus"),
    tokenActionCard: document.getElementById("tokenActionCard"),
    tokenActionTitle: document.getElementById("tokenActionTitle"),
    tokenDisplayName: document.getElementById("tokenDisplayName"),
    tokenPassword: document.getElementById("tokenPassword"),
    tokenActionBtn: document.getElementById("tokenActionBtn"),
    tokenActionStatus: document.getElementById("tokenActionStatus"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    accountMenuWrap: document.getElementById("accountMenuWrap"),
    accountButton: document.getElementById("accountButton"),
    messageInboxBtn: document.getElementById("messageInboxBtn"),
    messageInboxBadge: document.getElementById("messageInboxBadge"),
    notificationBtn: document.getElementById("notificationBtn"),
    notificationBadge: document.getElementById("notificationBadge"),
    accountAvatar: document.getElementById("accountAvatar"),
    accountName: document.getElementById("accountName"),
    accountSubtitle: document.getElementById("accountSubtitle"),
    accountEmailMenu: document.getElementById("accountEmailMenu"),
    queueGrid: document.getElementById("queueGrid"),
    officeNavButtons: document.querySelectorAll("[data-office-target]"),
    leftColumn: document.getElementById("leftColumn"),
    leftToggleBtn: document.getElementById("leftToggleBtn"),
    leftToggleGlyph: document.getElementById("leftToggleGlyph"),
    miniAllCount: document.getElementById("miniAllCount"),
    miniOmaCount: document.getElementById("miniOmaCount"),
    miniOsaCount: document.getElementById("miniOsaCount"),
    miniEscalatedCount: document.getElementById("miniEscalatedCount"),
    miniMetricLeads: document.getElementById("miniMetricLeads"),
    miniMetricDemos: document.getElementById("miniMetricDemos"),
    miniMetricHot: document.getElementById("miniMetricHot"),
    filterRow: document.getElementById("filterRow"),
    countAll: document.getElementById("countAll"),
    countOma: document.getElementById("countOma"),
    countOsa: document.getElementById("countOsa"),
    countEscalated: document.getElementById("countEscalated"),
    metricLeads: document.getElementById("metricLeads"),
    metricDemos: document.getElementById("metricDemos"),
    metricEscalations: document.getElementById("metricEscalations"),
    metricConversion: document.getElementById("metricConversion"),
    metricHotLeads: document.getElementById("metricHotLeads"),
    metricAverageScore: document.getElementById("metricAverageScore"),
    overviewRecordsMetric: document.getElementById("overviewRecordsMetric"),
    overviewDemosMetric: document.getElementById("overviewDemosMetric"),
    overviewEscalationsMetric: document.getElementById("overviewEscalationsMetric"),
    overviewConversionMetric: document.getElementById("overviewConversionMetric"),
    mothershipEstatesMetric: document.getElementById("mothershipEstatesMetric"),
    mothershipBuildingsMetric: document.getElementById("mothershipBuildingsMetric"),
    mothershipDevicesMetric: document.getElementById("mothershipDevicesMetric"),
    mothershipWalletMetric: document.getElementById("mothershipWalletMetric"),
    mothershipSupportMetric: document.getElementById("mothershipSupportMetric"),
    mothershipRevenueMetric: document.getElementById("mothershipRevenueMetric"),
    officeMobileProjectsMetric: document.getElementById("officeMobileProjectsMetric"),
    officeMobileClientsMetric: document.getElementById("officeMobileClientsMetric"),
    officeMobileTasksMetric: document.getElementById("officeMobileTasksMetric"),
    officeMobileDeploymentsMetric: document.getElementById("officeMobileDeploymentsMetric"),
    officeMobileFinanceMetric: document.getElementById("officeMobileFinanceMetric"),
    officeMobileRealtimeMetric: document.getElementById("officeMobileRealtimeMetric"),
    officeMobileStorageMetric: document.getElementById("officeMobileStorageMetric"),
    officeMobileApiMetric: document.getElementById("officeMobileApiMetric"),
    officeMobileSyncMetric: document.getElementById("officeMobileSyncMetric"),
    officeMobileChecksMetric: document.getElementById("officeMobileChecksMetric"),
    officeWelcomeTitle: document.getElementById("officeWelcomeTitle"),
    officeHealthMetric: document.getElementById("officeHealthMetric"),
    officeHealthLegend: document.getElementById("officeHealthLegend"),
    officeCityMap: document.getElementById("officeCityMap"),
    officeMapLabels: document.getElementById("officeMapLabels"),
    liveInfraEstateName: document.getElementById("liveInfraEstateName"),
    liveInfraLocation: document.getElementById("liveInfraLocation"),
    liveInfraOverlay: document.getElementById("liveInfraOverlay"),
    liveInfraPanel: document.getElementById("liveInfraPanel"),
    liveInfraHealthPanel: document.getElementById("liveInfraHealthPanel"),
    liveInfraActions: document.getElementById("liveInfraActions"),
    supportOverviewGraph: document.getElementById("supportOverviewGraph"),
    estateDistributionTotal: document.getElementById("estateDistributionTotal"),
    estateDistributionList: document.getElementById("estateDistributionList"),
    supportOverviewTiles: document.getElementById("supportOverviewTiles"),
    overviewTaskList: document.getElementById("overviewTaskList"),
    overviewActivityFeed: document.getElementById("overviewActivityFeed"),
    overviewAiInsights: document.getElementById("overviewAiInsights"),
    overviewDomainGrid: document.getElementById("overviewDomainGrid"),
    overviewOperationalStrip: document.getElementById("overviewOperationalStrip"),
    overviewFocusPanel: document.getElementById("overviewFocusPanel"),
    settingsIntegrationHub: document.getElementById("settingsIntegrationHub"),
    infrastructureIntelligencePanel: document.getElementById("infrastructureIntelligencePanel"),
    platformInfrastructurePanel: document.getElementById("platformInfrastructurePanel"),
    facilityPanel: document.getElementById("facilityPanel"),
    consumersPanel: document.getElementById("consumersPanel"),
    smartBuildingsPanel: document.getElementById("smartBuildingsPanel"),
    projectsPanel: document.getElementById("projectsPanel"),
    deploymentsPanel: document.getElementById("deploymentsPanel"),
    devicePanel: document.getElementById("devicePanel"),
    webPresencePanel: document.getElementById("webPresencePanel"),
    financePanel: document.getElementById("financePanel"),
    supportPanel: document.getElementById("supportPanel"),
    crmAgentsPanel: document.getElementById("crmAgentsPanel"),
    aiOperationsPanel: document.getElementById("aiOperationsPanel"),
    digitalTwinPanel: document.getElementById("digitalTwinPanel"),
    adminMetricsPanel: document.getElementById("adminMetricsPanel"),
    adminMainTitle: document.getElementById("adminMainTitle"),
    adminMainSubtitle: document.getElementById("adminMainSubtitle"),
    searchInput: document.getElementById("searchInput"),
    selectedCount: document.getElementById("selectedCount"),
    bulkOwnerSelect: document.getElementById("bulkOwnerSelect"),
    bulkStatusSelect: document.getElementById("bulkStatusSelect"),
    applyBulkBtn: document.getElementById("applyBulkBtn"),
    clearSelectionBtn: document.getElementById("clearSelectionBtn"),
    bulkStatus: document.getElementById("bulkStatus"),
    leadList: document.getElementById("leadList"),
    threadTitle: document.getElementById("threadTitle"),
    threadSubtitle: document.getElementById("threadSubtitle"),
    workspaceTabs: document.getElementById("workspaceTabs"),
    sectionNav: document.getElementById("sectionNav"),
    terminalMeta: document.getElementById("terminalMeta"),
    threadCanvas: document.getElementById("threadCanvas"),
    composerCard: document.getElementById("composerCard"),
    timelinePanel: document.getElementById("timelinePanel"),
    channelsPanel: document.getElementById("channelsPanel"),
    notificationsPanel: document.getElementById("notificationsPanel"),
    notificationFilters: document.getElementById("notificationFilters"),
    founderInbox: document.getElementById("founderInbox"),
    bookingsPanel: document.getElementById("bookingsPanel"),
    commercialPanel: document.getElementById("commercialPanel"),
    reportsPanel: document.getElementById("reportsPanel"),
    sourcesPanel: document.getElementById("sourcesPanel"),
    statusesPanel: document.getElementById("statusesPanel"),
    ownersPanel: document.getElementById("ownersPanel"),
    commercialStagesPanel: document.getElementById("commercialStagesPanel"),
    upcomingDemosPanel: document.getElementById("upcomingDemosPanel"),
    teamPanel: document.getElementById("teamPanel"),
    staffActivityPanel: document.getElementById("staffActivityPanel"),
    newUserName: document.getElementById("newUserName"),
    newUserEmail: document.getElementById("newUserEmail"),
    newUserRole: document.getElementById("newUserRole"),
    newUserPassword: document.getElementById("newUserPassword"),
    createUserBtn: document.getElementById("createUserBtn"),
    teamStatus: document.getElementById("teamStatus"),
    inviteUserName: document.getElementById("inviteUserName"),
    inviteUserEmail: document.getElementById("inviteUserEmail"),
    inviteUserRole: document.getElementById("inviteUserRole"),
    inviteUserBtn: document.getElementById("inviteUserBtn"),
    inviteStatus: document.getElementById("inviteStatus"),
    currentPasswordInput: document.getElementById("currentPasswordInput"),
    newPasswordInput: document.getElementById("newPasswordInput"),
    changePasswordBtn: document.getElementById("changePasswordBtn"),
    passwordStatus: document.getElementById("passwordStatus"),
    auditPanel: document.getElementById("auditPanel"),
    auditSearchInput: document.getElementById("auditSearchInput"),
    traceExplorer: document.getElementById("traceExplorer"),
    traceSearchInput: document.getElementById("traceSearchInput"),
    openFounderQueueBtn: document.getElementById("openFounderQueueBtn"),
    agentSelect: document.getElementById("agentSelect"),
    agentOmaBtn: document.getElementById("agentOmaBtn"),
    agentOsaBtn: document.getElementById("agentOsaBtn"),
    reloadLeadBtn: document.getElementById("reloadLeadBtn"),
    composerInput: document.getElementById("composerInput"),
    sendBtn: document.getElementById("sendBtn"),
    composerStatus: document.getElementById("composerStatus"),
    detailTitle: document.getElementById("detailTitle"),
    detailSubtitle: document.getElementById("detailSubtitle"),
    detailColumn: document.getElementById("detailColumn"),
    detailToggleBtn: document.getElementById("detailToggleBtn"),
    detailToggleGlyph: document.getElementById("detailToggleGlyph"),
    detailToggleBadge: document.getElementById("detailToggleBadge"),
    miniTraceCount: document.getElementById("miniTraceCount"),
    miniDemoCount: document.getElementById("miniDemoCount"),
    miniProposalCount: document.getElementById("miniProposalCount"),
    miniAlertCount: document.getElementById("miniAlertCount"),
    detailSummaryPrimary: document.getElementById("detailSummaryPrimary"),
    detailSummaryMore: document.getElementById("detailSummaryMore"),
    snapshotBadge: document.getElementById("snapshotBadge"),
    moreFieldsBadge: document.getElementById("moreFieldsBadge"),
    memoryBadge: document.getElementById("memoryBadge"),
    traceBadge: document.getElementById("traceBadge"),
    channelBadge: document.getElementById("channelBadge"),
    updateBadge: document.getElementById("updateBadge"),
    proposalBadge: document.getElementById("proposalBadge"),
    demoBadge: document.getElementById("demoBadge"),
    escalationBadge: document.getElementById("escalationBadge"),
    memoryPanel: document.getElementById("memoryPanel"),
    tracePanel: document.getElementById("tracePanel"),
    channelStatePanel: document.getElementById("channelStatePanel"),
    takeoverOwnerInput: document.getElementById("takeoverOwnerInput"),
    takeoverReasonInput: document.getElementById("takeoverReasonInput"),
    pauseAiBtn: document.getElementById("pauseAiBtn"),
    resumeOmaBtn: document.getElementById("resumeOmaBtn"),
    resumeOsaBtn: document.getElementById("resumeOsaBtn"),
    keepHumanBtn: document.getElementById("keepHumanBtn"),
    statusInput: document.getElementById("statusInput"),
    ownerInput: document.getElementById("ownerInput"),
    projectTypeInput: document.getElementById("projectTypeInput"),
    unitCountInput: document.getElementById("unitCountInput"),
    commercialStageInput: document.getElementById("commercialStageInput"),
    lostReasonInput: document.getElementById("lostReasonInput"),
    scoreInput: document.getElementById("scoreInput"),
    nextActionInput: document.getElementById("nextActionInput"),
    summaryInput: document.getElementById("summaryInput"),
    updateLeadBtn: document.getElementById("updateLeadBtn"),
    qualifyLeadBtn: document.getElementById("qualifyLeadBtn"),
    approveCommercialBtn: document.getElementById("approveCommercialBtn"),
    proposalUnitsInput: document.getElementById("proposalUnitsInput"),
    proposalStatusInput: document.getElementById("proposalStatusInput"),
    createProposalBtn: document.getElementById("createProposalBtn"),
    proposalListPanel: document.getElementById("proposalListPanel"),
    demoAtInput: document.getElementById("demoAtInput"),
    reviewTypeInput: document.getElementById("reviewTypeInput"),
    demoNotesInput: document.getElementById("demoNotesInput"),
    createDemoBtn: document.getElementById("createDemoBtn"),
    provisionFacilityBtn: document.getElementById("provisionFacilityBtn"),
    escalationReasonInput: document.getElementById("escalationReasonInput"),
    escalationSummaryInput: document.getElementById("escalationSummaryInput"),
    escalationUrgencyInput: document.getElementById("escalationUrgencyInput"),
    escalateBtn: document.getElementById("escalateBtn"),
    detailStatus: document.getElementById("detailStatus"),
  };

  el.adminEmail.value = state.adminEmail;

  function setAuthStatus(text, isError) {
    el.authStatus.textContent = text;
    el.authStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setComposerStatus(text, isError) {
    el.composerStatus.textContent = text;
    el.composerStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setDetailStatus(text, isError) {
    el.detailStatus.textContent = text;
    el.detailStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setBulkStatus(text, isError) {
    el.bulkStatus.textContent = text;
    el.bulkStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setTeamStatus(text, isError) {
    el.teamStatus.textContent = text;
    el.teamStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setPasswordStatus(text, isError) {
    el.passwordStatus.textContent = text;
    el.passwordStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setInviteStatus(text, isError) {
    el.inviteStatus.textContent = text;
    el.inviteStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  function setTokenActionStatus(text, isError) {
    el.tokenActionStatus.textContent = text;
    el.tokenActionStatus.style.color = isError ? "#8d1f1f" : "#667c73";
  }

  async function api(path, options) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options && options.headers ? options.headers : {}),
        "content-type": "application/json",
      },
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      const detail = data.details || data.message || data.sync_warning || "";
      const error = new Error([data.error || "Request failed", detail].filter(Boolean).join(": "));
      error.statusCode = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function formatCompactMoney(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return "NGN 0";
    if (amount >= 1000000000) return `NGN ${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `NGN ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `NGN ${Math.round(amount / 1000)}K`;
    return `NGN ${amount.toLocaleString("en-NG")}`;
  }

  function asList(value) {
    return Array.isArray(value) ? value : [];
  }

  function officeCollections() {
    return state.officeData && state.officeData.collections ? state.officeData.collections : {};
  }

  function safeCount() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index];
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }
    return 0;
  }

  function officeCount(name, fallback) {
    const collections = officeCollections();
    const officeTotals = state.officeData && state.officeData.totals ? state.officeData.totals : {};
    return safeCount(
      officeTotals[name],
      asList(collections[name]).length,
      fallback
    );
  }

  function officeCountSnapshot(fallbacks) {
    const fallback = fallbacks || {};
    return {
      estates: officeCount("estates", fallback.estates),
      buildings: officeCount("buildings", fallback.buildings),
      homes: officeCount("homes", fallback.homes),
      devices: officeCount("devices", fallback.devices),
      wallets: officeCount("wallets", fallback.wallets),
    };
  }

  function documentUrl(doc) {
    return doc?.html_url || doc?.file_url || doc?.url || doc?.metadata?.source_file_url || "";
  }

  function numberOrNull(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function estateCoordinate(estate) {
    const source = estate || {};
    const metadata = source.metadata || {};
    const lat = numberOrNull(source.latitude ?? source.lat ?? metadata.latitude ?? metadata.lat);
    const lng = numberOrNull(source.longitude ?? source.lng ?? metadata.longitude ?? metadata.lng);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }

  function loadGoogleMaps(apiKey) {
    if (window.google && window.google.maps) {
      return Promise.resolve(window.google.maps);
    }
    if (state.googleMapsPromise) {
      return state.googleMapsPromise;
    }
    state.googleMapsPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.onload = function () {
        resolve(window.google.maps);
      };
      script.onerror = function () {
        reject(new Error("Google Maps could not load. Check API restrictions and enabled APIs."));
      };
      document.head.appendChild(script);
    });
    return state.googleMapsPromise;
  }

  function findById(rows, id) {
    return asList(rows).find(function (row) {
      return String(row.id || "") === String(id || "");
    }) || null;
  }

  function parseJson(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function demoMeta(demo) {
    return parseJson(demo.notes) || {};
  }

  function demoDisplayTime(demo) {
    const meta = demoMeta(demo);
    if (meta.display_time) {
      return meta.display_time;
    }
    return formatDate(demo.scheduled_for);
  }

  function demoCalendarLinks(demo) {
    const meta = demoMeta(demo);
    return meta.calendar_links || {};
  }

  function initialsFromEmail(email) {
    const base = String(email || "OA").split("@")[0];
    const parts = base.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
    return String(base.slice(0, 2) || "OA").toUpperCase();
  }

  function statusClass(status) {
    return `status-${String(status || "new").toLowerCase()}`;
  }

  function ownerLabel(owner) {
    if (owner === "marketing_agent") return "Oma";
    if (owner === "sales_agent") return "Osa";
    if (owner === "human") return "Human";
    return owner || "Unassigned";
  }

  function crmOwnerLabel(owner) {
    if (owner === "marketing_agent") return "Marketing desk";
    if (owner === "sales_agent") return "Sales desk";
    if (owner === "human") return "Human owner";
    return displayValue(String(owner || "").replace(/_agent\b/g, "").replace(/_/g, " "), "Unassigned");
  }

  function roleLabel(role) {
    if (role === "admin") return "Admin";
    if (role === "founder") return "Founder";
    if (role === "operator") return "Operator";
    if (role === "sales") return "Sales";
    if (role === "viewer") return "Viewer";
    return role || "Unknown";
  }

  function hasPermission(permission) {
    return Boolean(
      state.session &&
        Array.isArray(state.session.permissions) &&
        state.session.permissions.includes(permission)
    );
  }

  function isSuperAdmin() {
    const role = String((state.session && state.session.role) || "").toLowerCase();
    return ["super_admin", "ochiga_admin", "admin", "founder", "system_admin"].includes(role);
  }

  function hasAnyPermission(permissions) {
    if (isSuperAdmin()) return true;
    return asList(permissions).some(function (permission) {
      return hasPermission(permission);
    });
  }

  function canAccessOfficeModule(target, focus) {
    if (!target) return false;
    if (isSuperAdmin()) return true;
    if (target === "overview") return true;
    const module = OFFICE_MODULE_REGISTRY.find(function (item) {
      return item.key === target && (!item.focus || !focus || item.focus === focus);
    });
    return module ? hasAnyPermission(module.permissions) : canAccessTab(target);
  }

  function canAccessTab(tab) {
    if (isSuperAdmin()) return true;
    if (
      tab === "facilities" ||
      tab === "consumers" ||
      tab === "projects" ||
      tab === "deployments" ||
      tab === "documents" ||
      tab === "finance" ||
      tab === "edge" ||
      tab === "digital_twin" ||
      tab === "facility" ||
      tab === "smart_buildings" ||
      tab === "devices" ||
      tab === "web_presence"
    ) {
      return hasPermission("view_reports");
    }
    if (tab === "support") {
      return hasPermission("manage_notifications");
    }
    if (tab === "crm" || tab === "crm_agents") {
      return true;
    }
    if (tab === "agents" || tab === "ai_operations" || tab === "intelligence") {
      return hasPermission("view_reports") || hasPermission("view_traces");
    }
    if (tab === "channels") return hasPermission("view_reports");
    if (tab === "bookings") return hasPermission("view_reports");
    if (tab === "commercial") return hasPermission("manage_commercial") || hasPermission("view_reports");
    if (tab === "reports") return hasPermission("view_reports");
    if (tab === "audit") return hasPermission("view_audit");
    if (tab === "notifications" || tab === "founder") {
      return hasPermission("manage_notifications");
    }
    if (tab === "team") {
      return hasPermission("view_users") || hasPermission("change_password");
    }
    if (tab === "settings") return hasPermission("view_users") || hasPermission("view_reports");
    if (tab === "traces") return hasPermission("view_traces");
    return true;
  }

  function normalizeOfficeWorkspace(target, focus) {
    const normalized = { target, focus, facet: "" };
    if (target === "facility" || target === "smart_buildings") {
      normalized.target = "facilities";
      normalized.focus = "facilities";
      normalized.facet = target === "smart_buildings" ? "buildings" : focus || "facilities";
    } else if (target === "devices") {
      normalized.target = "edge";
      normalized.focus = "edge";
      normalized.facet = focus || "registry";
    } else if (target === "web_presence") {
      normalized.target = "documents";
      normalized.focus = "documents";
      normalized.facet = focus || "documents";
    } else if (target === "crm_agents") {
      normalized.target = "crm";
      normalized.focus = "crm";
      normalized.facet = focus && focus !== "crm_agents" ? focus : "";
    } else if (target === "ai_operations") {
      normalized.target = "agents";
      normalized.focus = "agents";
      normalized.facet = focus && focus !== "ai_operations" ? focus : "";
    } else if (target === "conversation") {
      normalized.target = "intelligence";
      normalized.focus = "intelligence";
    } else if (target === "support" || target === "notifications") {
      normalized.target = "crm";
      normalized.focus = "crm";
      normalized.facet = "support_tickets";
    } else if (target === "founder") {
      normalized.target = "crm";
      normalized.focus = "crm";
      normalized.facet = "escalations";
    } else if (target === "commercial" || target === "bookings") {
      normalized.target = target === "bookings" ? "deployments" : "crm";
      normalized.focus = normalized.target;
      normalized.facet = target === "bookings" ? "deployment_pipeline" : "sales_pipeline";
    } else if (target === "channels") {
      normalized.target = "crm";
      normalized.focus = "crm";
      normalized.facet = "conversations";
    } else if (target === "audit" || target === "traces") {
      normalized.target = "reports";
      normalized.focus = "reports";
      normalized.facet = target === "traces" ? "diagnostics" : "reports";
    } else if (target === "team") {
      normalized.target = "team";
      normalized.focus = "team";
      normalized.facet = focus && focus !== "team" ? focus : "";
    } else if (target === "settings") {
      normalized.target = "settings";
      normalized.focus = "settings";
      normalized.facet = focus && focus !== "settings" ? focus : "";
    }
    return normalized;
  }

  function setOfficeWorkspace(target, focus) {
    const destination = normalizeOfficeWorkspace(target, focus);
    target = destination.target;
    focus = destination.focus;
    if (!target || !canAccessOfficeModule(target, focus)) return;
    if (destination.facet) setModuleFacet(target, destination.facet);
    state.workspaceTab = target;
    if (target === "crm") {
      state.overviewFocus = "crm";
    } else if (target === "agents") {
      state.overviewFocus = "agents";
    } else if (focus) {
      state.overviewFocus = focus;
    }
    renderWorkspaceTabs();
  }

  function setModuleFacet(workspace, facet) {
    if (!workspace) return;
    if (!facet || facet === "dashboard") {
      delete state.moduleFacet[workspace];
    } else {
      state.moduleFacet[workspace] = facet;
    }
    if (workspace === "agents") {
      state.aiOpsView = facet || "dashboard";
    }
    if (workspace === "ai_operations") {
      state.aiOpsView = facet || "dashboard";
    }
    if (workspace === "team") {
      const sectionMap = {
        staff_roles: "staff",
        permissions: "permissions",
        settings: "settings",
        integrations: "integrations",
        accounts: "accounts",
        super_admin: "super_admin",
      };
      state.adminSection = sectionMap[facet] || "dashboard";
    }
  }

  function requiredPermissionForOfficeAction(action) {
    const map = {
      add_estate: "manage_office",
      import_estates: "manage_office",
      geocode_estates: "manage_office",
      add_building: "manage_office",
      add_device: "manage_office",
      import_devices: "manage_office",
      create_ticket: "manage_notifications",
      create_document: "manage_documents",
      upload_document: "manage_documents",
      create_invoice: "manage_documents",
      create_contract: "manage_documents",
      document_actions: "manage_documents",
      open_permissions: "manage_users",
    };
    return map[action] || "";
  }

  function displayValue(value, fallback) {
    const normalized = String(value || "").trim();
    if (!normalized || normalized.toLowerCase() === "unknown") {
      return fallback || "Not captured";
    }
    return normalized;
  }

  function leadTitle(lead) {
    const name = displayValue(lead.name, "");
    if (name) {
      return name;
    }
    const company = displayValue(lead.company, "");
    if (company) {
      return company;
    }
    const projectType = displayValue(lead.project_type, "");
    if (projectType) {
      return projectType;
    }
    const email = displayValue(lead.email, "");
    if (email) {
      return email;
    }
    const phone = displayValue(lead.phone, "");
    if (phone) {
      return phone;
    }
    return "Unidentified lead";
  }

  function leadMetaLine(lead) {
    const parts = [
      displayValue(lead.company, ""),
      displayValue(lead.role, ""),
      displayValue(lead.location, ""),
      displayValue(lead.project_type, ""),
    ].filter(Boolean);
    return parts.join(" · ") || "Company, role, or location not captured yet";
  }

  function queueTitle() {
    if (state.activeQueue === "oma") return "Oma Operations";
    if (state.activeQueue === "osa") return "Osa Operations";
    if (state.activeQueue === "escalated") return "Executive Review";
    return "All Activity";
  }

  function toolSummary(content) {
    try {
      const parsed = JSON.parse(content);
      const toolName = parsed.tool || "tool";
      const args = parsed.arguments || {};
      const result = parsed.result || {};

      if (toolName === "update_lead_status") {
        return [
          "Updated lead",
          args.status ? `status: ${args.status}` : "",
          args.owner ? `owner: ${ownerLabel(args.owner)}` : "",
          Number.isFinite(Number(args.score)) ? `score: ${args.score}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
      }

      if (toolName === "schedule_demo") {
        return [
          "Scheduled building review",
          args.preferred_time ? `time: ${args.preferred_time}` : "",
          args.timezone ? `timezone: ${args.timezone}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
      }

      if (toolName === "notify_founder") {
        return [
          "Escalated to founder",
          args.urgency ? `urgency: ${args.urgency}` : "",
          args.reason ? `reason: ${args.reason}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
      }

      if (toolName === "create_lead") {
        return [
          "Updated lead record",
          args.company ? `company: ${args.company}` : "",
          args.role ? `role: ${args.role}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
      }

      return `${toolName} · ${Object.keys(args).join(", ") || Object.keys(result).join(", ") || "completed"}`;
    } catch {
      return content;
    }
  }

  function conversationStateMeta() {
    if (!state.selectedLead) {
      return "Live operator thread";
    }
    const parts = [
      `${state.conversations.length} messages`,
      `${state.demos.length} demos`,
      `${state.proposals.length} proposals`,
    ];
    return parts.join(" · ");
  }

  function notificationCountForLead() {
    if (!state.selectedLead) return 0;
    return (getDerivedData().notificationsByLeadId.get(state.selectedLead.id) || []).filter(function (notification) {
      return (notification.status || "open") === "open";
    }).length;
  }

  function updateHeaderActions() {
    const derived = getDerivedData();
    const openNotifications = derived.openNotifications;
    const founderNotifications = derived.openEscalations;

    el.messageInboxBadge.textContent = String(openNotifications);
    el.messageInboxBadge.classList.toggle("visible", openNotifications > 0);
    el.notificationBadge.textContent = String(founderNotifications);
    el.notificationBadge.classList.toggle("visible", founderNotifications > 0);
    el.messageInboxBtn.classList.toggle("active", state.workspaceTab === "notifications");
    el.notificationBtn.classList.toggle("active", state.workspaceTab === "founder");
  }

  function updateLeftRailState() {
    document.body.classList.toggle("left-collapsed", state.leftCollapsed);
    el.leftToggleGlyph.textContent = state.leftCollapsed ? "→" : "←";
  }

  function updateDetailRailState() {
    const autoCollapsed =
      !state.selectedLead ||
      (window.innerWidth > 1320 &&
        [
          "overview",
          "facility",
          "smart_buildings",
          "devices",
          "web_presence",
          "support",
          "crm_agents",
          "team",
          "settings",
          "audit",
          "commercial",
          "reports",
          "bookings",
          "traces",
        ].includes(state.workspaceTab));
    const isCollapsed = state.detailCollapsed || autoCollapsed;

    document.body.classList.toggle("detail-collapsed", isCollapsed);
    el.detailColumn.classList.toggle("collapsed", isCollapsed);
    el.detailToggleGlyph.textContent = isCollapsed ? "←" : "→";

    const traceCount = state.selectedLead
      ? state.traces.reduce(function (count, trace) {
          return count + (trace.lead_id === state.selectedLead.id ? 1 : 0);
        }, 0)
      : 0;
    const demoCount = state.demos.length;
    const proposalCount = state.proposals.length;
    const alertCount = notificationCountForLead();
    const badgeCount = traceCount + demoCount + proposalCount + alertCount;

    if (el.miniTraceCount) el.miniTraceCount.textContent = String(traceCount);
    if (el.miniDemoCount) el.miniDemoCount.textContent = String(demoCount);
    if (el.miniProposalCount) el.miniProposalCount.textContent = String(proposalCount);
    if (el.miniAlertCount) el.miniAlertCount.textContent = String(alertCount);
    if (el.detailToggleBadge) {
      el.detailToggleBadge.textContent = String(badgeCount);
      el.detailToggleBadge.classList.toggle("visible", isCollapsed && badgeCount > 0);
    }
  }

  function updateAuthUi() {
    const loggedIn = Boolean(state.session && state.adminEmail);
    document.body.classList.toggle("logged-out", !loggedIn);
    if (loggedIn) {
      const initials = initialsFromEmail(state.adminEmail);
      el.accountAvatar.textContent = initials;
      el.accountName.textContent =
        state.session.display_name || roleLabel(state.session.role) || initials;
      el.accountSubtitle.textContent = `${roleLabel(state.session.role)} · ${state.adminEmail}`;
      el.accountEmailMenu.textContent = state.adminEmail;
    } else {
      el.accountAvatar.textContent = "OA";
      el.accountName.textContent = "Operator";
      el.accountSubtitle.textContent = "Office command";
      el.accountEmailMenu.textContent = "Not signed in";
      el.accountMenuWrap.classList.remove("open");
    }
  }

  function queueMatch(lead) {
    if (state.activeQueue === "all") return true;
    if (state.activeQueue === "oma") return lead.owner === "marketing_agent";
    if (state.activeQueue === "osa") {
      return lead.owner === "sales_agent" || lead.status === "sales" || lead.status === "booked";
    }
    if (state.activeQueue === "escalated") {
      return lead.status === "escalated" || lead.owner === "human";
    }
    return true;
  }

  function chipMatch(lead) {
    const score = Number(lead.score || 0);
    if (state.activeFilter === "all") return true;
    if (state.activeFilter === "hot") {
      return ["hot", "sales"].includes(String(lead.status || "").toLowerCase()) || score >= 70;
    }
    if (state.activeFilter === "booked") {
      return String(lead.status || "").toLowerCase() === "booked";
    }
    if (state.activeFilter === "unscored") {
      return !score;
    }
    return true;
  }

  function filterLeads() {
    const query = el.searchInput.value.trim().toLowerCase();
    state.filteredLeads = state.leads.filter(function (lead) {
      if (!queueMatch(lead) || !chipMatch(lead)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        lead.name,
        lead.company,
        lead.role,
        lead.status,
        lead.owner,
        lead.summary,
        lead.next_action,
        lead.location,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }

  function updateQueueCards() {
    const derived = getDerivedData();
    const all = state.leads.length;
    const oma = derived.ownerCounts.marketing_agent || 0;
    const osa = derived.salesOwned.length;
    const escalated = (derived.statusCounts.escalated || 0) + (derived.ownerCounts.human || 0);

    el.countAll.textContent = String(all);
    el.countOma.textContent = String(oma);
    el.countOsa.textContent = String(osa);
    el.countEscalated.textContent = String(escalated);
    if (el.miniAllCount) el.miniAllCount.textContent = String(all);
    if (el.miniOmaCount) el.miniOmaCount.textContent = String(oma);
    if (el.miniOsaCount) el.miniOsaCount.textContent = String(osa);
    if (el.miniEscalatedCount) el.miniEscalatedCount.textContent = String(escalated);

    Array.from(el.queueGrid.querySelectorAll("[data-queue]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-queue") === state.activeQueue);
    });
    Array.from(el.filterRow.querySelectorAll("[data-filter]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-filter") === state.activeFilter);
    });
    el.selectedCount.textContent = `${state.selectedLeadIds.size} selected`;
    const canManageLeads = hasPermission("manage_leads");
    el.bulkOwnerSelect.disabled = !canManageLeads;
    el.bulkStatusSelect.disabled = !canManageLeads;
    el.applyBulkBtn.disabled = !canManageLeads;
  }

  function renderReportStrip() {
    const totals = state.report && state.report.totals ? state.report.totals : {};
    el.metricLeads.textContent = String(totals.leads || 0);
    el.metricDemos.textContent = String(state.report ? state.report.demos_booked || 0 : 0);
    el.metricEscalations.textContent = String(totals.escalations || 0);
    el.metricConversion.textContent = `${totals.sales_handoff_conversion_pct || 0}%`;
    el.metricHotLeads.textContent = String(totals.hot_leads || 0);
    el.metricAverageScore.textContent = String(totals.average_score || 0);
    if (el.miniMetricLeads) el.miniMetricLeads.textContent = String(totals.leads || 0);
    if (el.miniMetricDemos) {
      el.miniMetricDemos.textContent = String(state.report ? state.report.demos_booked || 0 : 0);
    }
    if (el.miniMetricHot) el.miniMetricHot.textContent = String(totals.hot_leads || 0);
  }

  function buildOverviewDomains() {
    const derived = getDerivedData();
    const totals = state.report && state.report.totals ? state.report.totals : {};
    const officeStats = state.officeStats || {};
    const openNotifications = derived.openNotifications;
    const openEscalations = derived.openEscalations;
    const activeChannels = state.channelOverview && Array.isArray(state.channelOverview.channels)
      ? state.channelOverview.channels.length
      : 0;
    const estateLikeRecords = derived.estateLikeRecords;
    const estateKeys = derived.estateKeys;
    const smartBuildingRecords = derived.smartBuildingRecords;
    const webRecords = derived.webRecords;
    const humanOwned = derived.humanOwned;
    const salesOwned = derived.salesOwned;
    const hotRecords = derived.hotRecords;
    const latestAudit = state.audit.slice(0, 4);
    const latestNotifications = state.notifications.slice(0, 4);
    const latestTraces = state.traces.slice(0, 4);
    const totalUnits = derived.totalUnits;
    const safeBuildingTotal = safeCount(derived.buildingCount);
    const sourceEntries = Object.entries((state.report && state.report.by_source) || {}).sort(function (a, b) {
      return b[1] - a[1];
    });
    const channelNotificationLoad = (state.channelOverview && state.channelOverview.channels) || [];
    const roleCounts = derived.roleCounts;
    const statusCounts = derived.userStatusCounts;
    const auditActionCounts = derived.auditActionCounts;
    const traceAgentCounts = derived.traceAgentCounts;
    const projectTypeCounts = derived.projectTypeCounts;
    const notificationTypeCounts = derived.notificationTypeCounts;
    const notificationStatusCounts = derived.notificationStatusCounts;

    const officeDomains = state.officeData && state.officeData.domains ? state.officeData.domains : null;
    const usingOfficeDomains = Boolean(officeDomains);

    const result = {
      totals,
      openNotifications,
      openEscalations,
      activeChannels,
      domains: {
      summary: {
        title: "Office Overview",
        subtitle: "Top-line supervision across estates, smart buildings, support, CRM, staff, and governance.",
        badge: (totals.leads || officeStats.conversations || state.adminUsers.length) ? "Live" : "Standby",
        tone: (totals.leads || officeStats.conversations || state.adminUsers.length) ? "" : "warning",
        primaryMetric: totals.leads || 0,
        primaryLabel: "Records",
        metrics: [
          { label: "Estates connected", value: estateKeys.length },
          { label: "Buildings tracked", value: safeBuildingTotal },
          { label: "Open support", value: openNotifications },
          { label: "Trace records", value: state.traces.length || officeStats.traces || 0 },
        ],
        items: [
          {
            title: "Facility supervision",
            meta: `${estateKeys.length} estate accounts in view`,
            body: "Estate package visibility, complaints, and request routing should settle here as the facility sync expands.",
          },
          {
            title: "Smart building posture",
            meta: `${safeBuildingTotal} building records · ${totalUnits || 0} units referenced`,
            body: "Building-level hardware devices, permissions, and household automation activity should surface through this office layer.",
          },
          {
            title: "Commercial and support pressure",
            meta: `${openNotifications} support events · ${state.report ? state.report.demos_booked || 0 : 0} reviews`,
            body: "CRM, support, relationship ownership, and deployment pipeline pressure remain the main active commercial surfaces already flowing through Office.",
          },
        ],
      },
      facility: {
        title: "Building Portfolio",
        subtitle: "Portfolio-level building intelligence across subscribed estates, buildings, communities, requests, packages, wallets, and operational posture.",
        badge: estateKeys.length ? "Connected" : "Awaiting sync",
        tone: estateKeys.length ? "" : "warning",
        primaryMetric: estateKeys.length,
        primaryLabel: "Estates",
        metrics: [
          { label: "Estates connected", value: estateKeys.length },
          { label: "Active requests", value: openNotifications },
          { label: "Escalated estates", value: openEscalations },
          { label: "Packages in motion", value: state.allProposals.length || officeStats.proposals || 0 },
        ],
        items: estateKeys.slice(0, 6).map(function (key) {
          const lead = estateLikeRecords.find(function (entry) {
            return (
              String(entry.company || "").trim() === key ||
              String(entry.name || "").trim() === key ||
              String(entry.location || "").trim() === key ||
              String(entry.id || "").trim() === key
            );
          }) || {};
          return {
            title: key,
            meta: `${displayValue(lead.project_type, "Estate profile pending")} · ${displayValue(lead.location, "Location pending")}`,
            body: `Units: ${displayValue(lead.number_of_units || lead.unit_count, "n/a")} · Package: ${displayValue(lead.interest_package, "package pending")} · Status: ${displayValue(lead.status, "new")}`,
          };
        }),
      },
      smart_buildings: {
        title: "Smart Buildings",
        subtitle: "Connected homes, building permissions, occupancy posture, hardware device activity, and automation state.",
        badge: safeBuildingTotal ? "Monitoring" : "Queued",
        tone: safeBuildingTotal ? "" : "warning",
        primaryMetric: safeBuildingTotal,
        primaryLabel: "Buildings",
        metrics: [
          { label: "Buildings tracked", value: safeBuildingTotal },
          { label: "Units referenced", value: totalUnits || 0 },
          { label: "Live channels", value: activeChannels },
          { label: "Permitted staff", value: state.adminUsers.length || officeStats.admin_users || 0 },
        ],
        items: smartBuildingRecords.slice(0, 4).map(function (lead) {
          return {
            title: leadTitle(lead),
            meta: `${displayValue(lead.project_type, "Smart building record")} · ${displayValue(lead.location, "Location pending")}`,
            body: `Units: ${displayValue(lead.unit_count, "n/a")} · Owner: ${ownerLabel(lead.owner)} · Next: ${displayValue(lead.next_action, "No next action yet")}`,
          };
        }),
      },
      web_presence: {
        title: "Documents",
        subtitle: "Office documents, proposals, invoices, contracts, PDFs, and shared operational files.",
        badge: "Connected",
        tone: "",
        primaryMetric: state.allProposals.length + latestAudit.length,
        primaryLabel: "Files",
        metrics: [
          { label: "Proposals", value: state.allProposals.length || officeStats.proposals || 0 },
          { label: "Invoices", value: officeStats.invoices || 0 },
          { label: "Contracts", value: officeStats.contracts || 0 },
          { label: "Shared records", value: latestAudit.length || officeStats.documents || 0 },
        ],
        items: state.allProposals.slice(0, 4).map(function (proposal) {
          return {
            title: displayValue(proposal.title || proposal.lead_name || proposal.company, "Commercial document"),
            meta: `${displayValue(proposal.status, "draft")} · ${proposal.created_at ? formatDate(proposal.created_at) : "time pending"}`,
            body: `Value: ${formatCompactMoney(proposal.value || proposal.amount || 0)} · Owner: ${displayValue(proposal.owner, "Office")}`,
          };
        }).concat(latestAudit.slice(0, 2).map(function (event) {
          return {
            title: displayValue(event.action, "Document activity"),
            meta: `${displayValue(event.actor_email, "system")} · ${event.created_at ? formatDate(event.created_at) : "time pending"}`,
            body: `${displayValue(event.target_type, "record")} ${displayValue(event.target_id, "")}`.trim(),
          };
        })),
      },
      support: {
        title: "Customer Support",
        subtitle: "Complaints, support requests, founder escalations, and customer-facing operational pressure.",
        badge: openNotifications ? `${openNotifications} Open` : "Stable",
        tone: openNotifications > 6 ? "alert" : openNotifications ? "warning" : "",
        primaryMetric: openNotifications,
        primaryLabel: "Open",
        metrics: [
          { label: "Open notifications", value: openNotifications },
          { label: "Founder escalations", value: openEscalations },
          { label: "Human-owned records", value: humanOwned.length },
          { label: "Channel alerts", value: channelNotificationLoad.reduce(function (sum, item) { return sum + Number(item.open_notifications || 0); }, 0) || officeStats.notifications || 0 },
        ],
        items: latestNotifications.slice(0, 6).map(function (notification) {
          return {
            title: displayValue(notification.type, "Notification").replace(/_/g, " "),
            meta: `${displayValue(notification.status, "open")} · ${displayValue(notification.channel || notification.metadata?.source, "office")}`,
            body: displayValue(notification.summary || notification.reason, "No summary recorded."),
          };
        }),
      },
      crm_agents: {
        title: "CRM & Support",
        subtitle: "Leads, customers, organizations, conversations, support tickets, escalations, and deployment pipeline visibility.",
        badge: totals.leads ? "Active" : "Standby",
        tone: totals.leads ? "" : "warning",
        primaryMetric: totals.leads || 0,
        primaryLabel: "Records",
        metrics: [
          { label: "Active records", value: totals.leads || 0 },
          { label: "Customers", value: derived.statusCounts.customer || derived.statusCounts.closed || 0 },
          { label: "Organizations", value: Object.keys(derived.projectTypeCounts || {}).length },
          { label: "Reviews booked", value: state.report ? state.report.demos_booked || 0 : 0 },
        ],
        items: hotRecords.slice(0, 6).map(function (lead) {
          return {
            title: leadTitle(lead),
            meta: `${displayValue(lead.company, "Company pending")} · score ${displayValue(lead.score, 0)}`,
            body: `Stage: ${displayValue(lead.stage || lead.commercial_stage, "new")} · Source: ${displayValue(lead.source, lead.channel || "office")} · Next: ${displayValue(lead.next_action, "No next action yet")}`,
          };
        }),
      },
      staff_roles: {
        title: "Staff and Roles",
        subtitle: "Office accounts, role distribution, permission assignment, and operator posture.",
        badge: state.adminUsers.length ? "Active" : "Setup",
        tone: state.adminUsers.length ? "" : "warning",
        primaryMetric: state.adminUsers.length,
        primaryLabel: "Staff",
        metrics: [
          { label: "Staff accounts", value: state.adminUsers.length || officeStats.admin_users || 0 },
          { label: "Admins", value: roleCounts.admin || 0 },
          { label: "Operators", value: roleCounts.operator || 0 },
          { label: "Sales or founders", value: (roleCounts.sales || 0) + (roleCounts.founder || 0) },
        ],
        items: state.adminUsers.slice(0, 4).map(function (user) {
          return {
            title: displayValue(user.display_name, user.email),
            meta: `${displayValue(user.role, "viewer")} · ${displayValue(user.status, "active")}`,
            body: `Last login: ${user.last_login_at ? formatDate(user.last_login_at) : "Never"} · Email: ${displayValue(user.email, "Not captured")}`,
          };
        }),
      },
      governance: {
        title: "Knowledge & Audit",
        subtitle: "Audit logs, trace records, knowledge base, audit activity, trace evidence, agent reasoning, and accountable operational memory.",
        badge: latestAudit.length ? "Live" : "Idle",
        tone: latestAudit.length ? "" : "warning",
        primaryMetric: state.audit.length,
        primaryLabel: "Audit",
        metrics: [
          { label: "Knowledge activity", value: state.audit.length || officeStats.audit_events || 0 },
          { label: "Trace evidence", value: state.traces.length || officeStats.traces || 0 },
          { label: "Human reviews", value: openEscalations },
          { label: "Permissioned staff", value: state.adminUsers.length || officeStats.admin_users || 0 },
        ],
        items: latestAudit.map(function (event) {
          return {
            title: displayValue(event.action, "knowledge event"),
            meta: `${displayValue(event.actor_email, "system")} · ${event.created_at ? formatDate(event.created_at) : "time pending"}`,
            body: `${displayValue(event.target_type, "target")} ${displayValue(event.target_id, "")}`.trim(),
          };
        }).concat(
          latestAudit.length ? [] : latestTraces.map(function (trace) {
            return {
              title: displayValue(trace.type, "trace"),
              meta: `${displayValue(trace.agent, "agent")} · ${trace.created_at || trace.ts ? formatDate(trace.created_at || trace.ts) : "time pending"}`,
              body: displayValue(trace.tool_name, "No tool name recorded"),
            };
          })
        ),
      },
    }};

    if (usingOfficeDomains) {
      ["summary", "facility", "smart_buildings", "web_presence", "support"].forEach(function (key) {
        if (officeDomains[key]) {
          result.domains[key] = {
            ...officeDomains[key],
          };
        }
      });
    }

    if (!usingOfficeDomains) {
      result.domains.summary.batches = [
        { label: "Notifications", value: officeStats.notifications || openNotifications || 0 },
        { label: "Conversations", value: officeStats.conversations || 0 },
        { label: "Proposals", value: officeStats.proposals || state.allProposals.length || 0 },
        { label: "Users", value: officeStats.admin_users || state.adminUsers.length || 0 },
      ];
      result.domains.summary.charts = [
        { title: "Pipeline status", entries: rankEntries((state.report && state.report.by_status) || {}, 5) },
        { title: "Commercial stages", entries: rankEntries((state.report && state.report.by_commercial_stage) || {}, 5) },
      ];

      result.domains.facility.batches = [
        { label: "Reports", value: state.report ? 1 : 0 },
        { label: "Requests", value: openNotifications },
        { label: "Proposals", value: state.allProposals.length || 0 },
        { label: "Reviews", value: state.allDemos.length || officeStats.demos || 0 },
      ];
      result.domains.facility.charts = [
        { title: "Estate stages", entries: rankEntries((state.report && state.report.by_commercial_stage) || {}, 5) },
        { title: "Estate status", entries: rankEntries((state.report && state.report.by_status) || {}, 5) },
      ];

      result.domains.smart_buildings.batches = [
        { label: "Homes", value: safeBuildingTotal },
        { label: "Units", value: totalUnits || 0 },
        { label: "Channels", value: activeChannels },
        { label: "Wallet-linked users", value: smartBuildingRecords.length },
      ];
      result.domains.smart_buildings.charts = [
        { title: "Building profiles", entries: rankEntries(projectTypeCounts, 5) },
        {
          title: "Channel activity",
          entries: channelNotificationLoad.slice(0, 5).map(function (channel) {
            return { label: channel.name || channel.key, value: Number(channel.lead_count || 0) };
          }),
        },
      ];

	      result.domains.web_presence.batches = [
	        { label: "Proposals", value: state.allProposals.length || 0 },
	        { label: "Invoices", value: officeStats.invoices || 0 },
	        { label: "Contracts", value: officeStats.contracts || 0 },
	        { label: "Shared data", value: latestAudit.length || 0 },
	      ];
	      result.domains.web_presence.charts = [
	        { title: "Document workflow", entries: [
	          { label: "Proposals", value: state.allProposals.length || 0 },
	          { label: "Invoices", value: officeStats.invoices || 0 },
	          { label: "Contracts", value: officeStats.contracts || 0 },
	          { label: "Files", value: latestAudit.length || 0 },
	        ] },
	        {
	          title: "Commercial record sources",
	          entries: sourceEntries.slice(0, 5).map(function (entry) { return { label: entry[0], value: entry[1] }; }),
	        },
	      ];

      result.domains.support.batches = [
        { label: "Open inbox", value: openNotifications },
        { label: "Founder", value: openEscalations },
        { label: "Human-owned", value: humanOwned.length },
        { label: "Total alerts", value: officeStats.notifications || state.notifications.length || 0 },
      ];
      result.domains.support.charts = [
        { title: "Support types", entries: rankEntries(notificationTypeCounts, 5) },
        { title: "Support status", entries: rankEntries(notificationStatusCounts, 5) },
      ];
    }

    result.domains.crm_agents.batches = [
      { label: "Conversations", value: officeStats.conversations || 0 },
      { label: "Proposals", value: officeStats.proposals || state.allProposals.length || 0 },
      { label: "Hot records", value: hotRecords.length },
      { label: "Won deals", value: state.report ? state.report.deals_won || 0 : 0 },
    ];
    result.domains.crm_agents.charts = [
      { title: "Relationship ownership", entries: rankEntries((state.report && state.report.by_owner) || {}, 5) },
      { title: "Deal stages", entries: rankEntries((state.report && state.report.by_commercial_stage) || {}, 5) },
    ];

    result.domains.staff_roles.batches = [
      { label: "Admins", value: roleCounts.admin || 0 },
      { label: "Operators", value: roleCounts.operator || 0 },
      { label: "Sales", value: roleCounts.sales || 0 },
      { label: "Founders", value: roleCounts.founder || 0 },
    ];
    result.domains.staff_roles.charts = [
      { title: "Role spread", entries: rankEntries(roleCounts, 5) },
      { title: "Account status", entries: rankEntries(statusCounts, 5) },
    ];

    result.domains.governance.batches = [
      { label: "Activity", value: state.audit.length || officeStats.audit_events || 0 },
      { label: "Trace evidence", value: state.traces.length || officeStats.traces || 0 },
      { label: "Staff", value: state.adminUsers.length || officeStats.admin_users || 0 },
      { label: "Reviews", value: openEscalations },
    ];
    result.domains.governance.charts = [
      { title: "Activity types", entries: rankEntries(auditActionCounts, 5) },
      { title: "Agent evidence", entries: rankEntries(traceAgentCounts, 5) },
    ];

    result.domains.ai_operations = {
      title: "AI Operations",
      subtitle: "Dedicated Oyi AI command layer for Oma, Osa, voice command, tool registry, executions, AI conversations, permissions, and AI activity.",
      badge: state.traces.length || officeStats.traces ? "Observing" : "Standby",
      tone: state.traces.length || officeStats.traces ? "" : "warning",
      primaryMetric: state.traces.length || officeStats.traces || 0,
      primaryLabel: "AI Events",
      metrics: [
        { label: "Active agents", value: 3 },
        { label: "AI conversations", value: officeStats.conversations || 0 },
        { label: "Tool traces", value: state.traces.length || officeStats.traces || 0 },
        { label: "Permission reviews", value: openEscalations },
      ],
      batches: [
        { label: "Oma records", value: derived.ownerCounts.marketing_agent || 0 },
        { label: "Osa records", value: salesOwned.length },
        { label: "Executions", value: state.traces.length || 0 },
        { label: "Safety events", value: openEscalations },
      ],
      charts: [
        { title: "Agent trace volume", entries: rankEntries(traceAgentCounts, 5) },
        { title: "AI decision sources", entries: rankEntries((state.report && state.report.by_owner) || {}, 5) },
      ],
      items: latestTraces.slice(0, 6).map(function (trace) {
        return {
          title: displayValue(trace.agent || trace.type, "AI activity"),
          meta: `${displayValue(trace.tool_name, "tool")} · ${trace.created_at || trace.ts ? formatDate(trace.created_at || trace.ts) : "time pending"}`,
          body: displayValue(trace.summary || trace.message || trace.status, "No AI trace summary recorded."),
        };
      }),
    };

    result.domains.infrastructure_intelligence = {
      title: "Infrastructure Intelligence",
      subtitle: "Analytics, AI insights, predictive operations, diagnostics, estate comparisons, device intelligence, support intelligence, and operational trends.",
      badge: state.report ? "Live analytics" : "Awaiting report",
      tone: state.report ? "" : "warning",
      primaryMetric: totals.leads || estateKeys.length || 0,
      primaryLabel: "Signals",
      metrics: [
        { label: "Health score", value: `${Math.max(0, 100 - openNotifications)}%` },
        { label: "Estate comparisons", value: estateKeys.length },
        { label: "Incident signals", value: openNotifications },
        { label: "Support insights", value: openEscalations },
      ],
      batches: [
        { label: "Analytics", value: state.report ? 1 : 0 },
        { label: "AI insights", value: latestAudit.length || 0 },
        { label: "Reports", value: officeStats.reports || (state.report ? 1 : 0) },
        { label: "Diagnostics", value: state.traces.length || 0 },
      ],
      charts: [
        { title: "Operational status", entries: rankEntries((state.report && state.report.by_status) || notificationStatusCounts, 5) },
        { title: "Infrastructure categories", entries: rankEntries(projectTypeCounts, 5) },
      ],
      items: [
        { title: "Predictive operations", meta: "Support + device signal", body: "Warnings are derived from support pressure, device state, edge health, and estate activity." },
        { title: "Device intelligence", meta: "Hardware orchestration", body: "Online/offline trends, failed commands, and assignment state surface here as hardware telemetry expands." },
        { title: "Incident intelligence", meta: "Realtime bridge", body: "Alerts, support tickets, and audit events feed this module through the unified event layer." },
      ],
    };

    result.domains.platform_infrastructure = {
      title: "Platform Infrastructure",
      subtitle: "System-level realtime events, storage, API health, webhooks, sync, provider status, edge sync, and environment health.",
      badge: "System layer",
      tone: "",
      primaryMetric: activeChannels,
      primaryLabel: "Channels",
      metrics: [
        { label: "Realtime channels", value: activeChannels },
        { label: "Storage records", value: officeStats.office_files || officeStats.documents || 0 },
        { label: "Providers", value: crmIntegrationStatusRows().filter(function (row) { return row.connected; }).length },
        { label: "Audit events", value: state.audit.length || officeStats.audit_events || 0 },
      ],
      batches: [
        { label: "Realtime", value: activeChannels },
        { label: "Storage", value: officeStats.office_files || 0 },
        { label: "API Health", value: 1 },
        { label: "Webhooks", value: officeStats.webhooks || 0 },
      ],
      charts: [
        { title: "Provider status", entries: crmIntegrationStatusRows().map(function (row) { return { label: row.name, value: row.connected ? 1 : 0 }; }) },
        { title: "Event stream", entries: rankEntries(auditActionCounts, 5) },
      ],
      items: crmIntegrationStatusRows().slice(0, 6).map(function (row) {
        return {
          title: row.name,
          meta: row.connected ? "Connected" : "Disconnected",
          body: row.connected ? "Provider credentials are present in the platform environment." : "Provider needs verified credentials before production use.",
        };
      }),
    };

    result.domains.administration = {
      title: "Administration",
      subtitle: "Staff, roles, permissions, system settings, integration settings, accounts, super admin controls, and facility administration.",
      badge: state.adminUsers.length ? "Active" : "Setup",
      tone: state.adminUsers.length ? "" : "warning",
      primaryMetric: state.adminUsers.length || officeStats.admin_users || 0,
      primaryLabel: "Staff",
      metrics: [
        { label: "Staff count", value: state.adminUsers.length || officeStats.admin_users || 0 },
        { label: "Role groups", value: Object.keys(roleCounts).length },
        { label: "Permission status", value: state.currentUser?.role || "viewer" },
        { label: "Admin actions", value: latestAudit.length },
      ],
      batches: result.domains.staff_roles.batches || [],
      charts: result.domains.staff_roles.charts || [],
      items: result.domains.staff_roles.items || [],
    };

    return result;
  }

	  function renderDomainWorkspace(panelNode, domain) {
    if (!panelNode || !domain) return;
    const chartMarkup = (domain.charts || [])
      .map(function (chart) {
        const maxValue = Math.max(
          1,
          ...(chart.entries || []).map(function (entry) {
            return Number(entry.value || 0);
          })
        );
        return `
          <article class="office-chart-card">
            <div class="trace-head">
              <strong>${escapeHtml(chart.title)}</strong>
              <span>${escapeHtml(String((chart.entries || []).length))} items</span>
            </div>
            <div class="office-chart-list">
              ${
                (chart.entries || []).length
                  ? chart.entries
                      .map(function (entry) {
                        const width = Math.max(8, Math.round((Number(entry.value || 0) / maxValue) * 100));
                        return `
                          <div class="office-chart-row">
                            <div class="office-chart-head">
                              <span class="subtext">${escapeHtml(displayValue(entry.label, "unknown"))}</span>
                              <strong>${escapeHtml(String(entry.value || 0))}</strong>
                            </div>
                            <div class="office-chart-bar">
                              <div class="office-chart-fill" style="width:${width}%;"></div>
                            </div>
                          </div>
                        `;
                      })
                      .join("")
                  : '<div class="office-detail-empty">No chart data yet.</div>'
              }
            </div>
          </article>
        `;
      })
      .join("");
    panelNode.innerHTML = `
      <article class="office-detail-card">
        <div class="office-detail-head">
          <div>
            <p class="eyebrow">Office Domain</p>
            <h3 style="margin:4px 0 0;font-size:30px;line-height:1.02;letter-spacing:-0.03em;">${escapeHtml(domain.title)}</h3>
            <p class="subtext" style="margin:8px 0 0;">${escapeHtml(domain.subtitle)}</p>
          </div>
          <span class="office-system-badge ${domain.tone ? escapeHtml(domain.tone) : ""}">${escapeHtml(domain.badge)}</span>
        </div>
        <div class="office-detail-metrics">
          ${domain.metrics
            .map(function (metric) {
              return `<div class="office-system-metric"><div class="key" style="margin:0;">${escapeHtml(metric.label)}</div><strong>${escapeHtml(String(metric.value))}</strong></div>`;
            })
            .join("")}
        </div>
        ${
          domain.batches && domain.batches.length
            ? `<div class="office-batch-row">${domain.batches
                .map(function (batch) {
                  return `<span class="office-batch">${escapeHtml(batch.label)} <strong>${escapeHtml(String(batch.value || 0))}</strong></span>`;
                })
                .join("")}</div>`
            : ""
        }
        ${
          chartMarkup
            ? `<div class="office-chart-grid">${chartMarkup}</div>`
            : ""
        }
        <div class="office-detail-list">
          ${
            domain.items.length
              ? domain.items
                  .map(function (item) {
                    return `<article class="office-detail-item"><div class="trace-head"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div><div class="subtext">${escapeHtml(item.body)}</div></article>`;
                  })
                  .join("")
              : '<div class="office-detail-empty">Live detail for this domain will appear here as the connected systems publish activity into Office.</div>'
          }
        </div>
      </article>
    `;
  }

  function metricTile(label, value) {
    return `<div class="office-ops-mini"><div class="key" style="margin:0;">${escapeHtml(label)}</div><strong>${escapeHtml(String(value))}</strong></div>`;
  }

  function operationalStrip(items) {
    return `<div class="office-operational-strip" aria-label="Operational summary">${asList(items)
      .map(function (item) {
        return `<div class="office-strip-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value))}</strong><small>${escapeHtml(item.meta || "")}</small></div>`;
      })
      .join("")}</div>`;
  }

	  function assetActionMarkup(kind, id, isLive) {
	    return `
	      <details class="asset-menu">
	        <summary aria-label="Estate actions">•••</summary>
	        <span class="asset-menu-popover">
	          <button type="button" data-office-asset-action="${escapeHtml(kind)}:pause:${escapeHtml(id)}">Pause service</button>
	          <button class="danger" type="button" data-office-asset-action="${escapeHtml(kind)}:suspend:${escapeHtml(id)}">Suspend estate</button>
	          <button type="button" data-office-asset-action="${escapeHtml(kind)}:${isLive ? "disable" : "enable"}:${escapeHtml(id)}">${isLive ? "Disable access" : "Enable access"}</button>
	        </span>
	      </details>
	    `;
	  }

  function commandActivityRail(options) {
    const title = options && options.title ? options.title : "Real-time Activity";
    const activity = asList(options && options.activity).slice(0, 5);
    const insights = asList(options && options.insights).slice(0, 5);
    const actions = asList(options && options.actions).slice(0, 4);
    return `
      <aside class="command-side context-rail">
        <article class="command-card">
          <div class="command-card-head"><h4>${escapeHtml(title)}</h4><button class="ghost compact" data-office-target="reports" type="button">View all</button></div>
          <div class="mission-list">
            ${activity.length ? activity.map(function (item, index) {
              const tone = item.tone || ["healthy", "warning", "info", "critical", "healthy"][index % 5];
              return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot ${escapeHtml(tone === "healthy" ? "" : tone)}"></i></span><div class="activity-copy"><strong>${escapeHtml(item.title || "Activity")}</strong><span>${escapeHtml(item.meta || item.body || "Live update")}</span></div></div>`;
            }).join("") : '<div class="office-detail-empty">No live activity has synced yet.</div>'}
          </div>
        </article>
        <article class="command-card">
          <div class="command-card-head"><h4>AI Insights</h4><button class="ghost compact" data-office-target="reports" type="button">View all</button></div>
          <div class="mission-list">
            ${insights.length ? insights.map(function (item, index) {
              const icons = ["alert", "support", "trend", "wallet", "estate"];
              return `<div class="insight-row"><span class="insight-icon">${officeIcon(item.icon || icons[index % icons.length])}</span><div><strong>${escapeHtml(item.title || "Insight")}</strong><span>${escapeHtml(item.meta || "Review signal")}</span></div></div>`;
            }).join("") : '<div class="office-detail-empty">AI insights will appear when enough signal is available.</div>'}
          </div>
        </article>
        ${actions.length ? `<article class="command-card">
          <div class="command-card-head"><h4>Quick Actions</h4></div>
          <div class="shortcut-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
            ${actions.map(function (item) {
              return `<button class="shortcut-btn" ${item.action ? `data-command-action="${escapeHtml(item.action)}"` : ""} type="button"><span>${officeIcon(item.icon || "estate")}</span>${escapeHtml(item.label || "Action")}</button>`;
            }).join("")}
          </div>
        </article>` : ""}
      </aside>
    `;
  }

  function slugId(prefix, value) {
    return `${prefix}_${String(value || "item")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")}_${Date.now().toString(36)}`;
  }

  function formSelect(name, label, options) {
    return `<label class="command-form-field"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${asList(options).map(function (item) {
      return `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`;
    }).join("")}</select></label>`;
  }

  function openCommandModal(config) {
    const existing = document.querySelector("[data-command-modal]");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.className = "command-modal-backdrop";
    modal.setAttribute("data-command-modal", "true");
    modal.innerHTML = `
      <form class="command-modal" data-command-form="${escapeHtml(config.action)}">
        <div class="command-card-head">
          <div>
            <p class="eyebrow">${escapeHtml(config.eyebrow || "Office Action")}</p>
            <h4>${escapeHtml(config.title || "Command action")}</h4>
            <div class="subtext">${escapeHtml(config.subtitle || "Complete the fields below to continue.")}</div>
          </div>
          <button class="ghost compact" data-command-close type="button">Close</button>
        </div>
        <div class="command-form-grid">${config.fields || ""}</div>
        <div class="command-modal-actions">
          <button class="ghost" data-command-close type="button">Cancel</button>
          <button class="primary" type="submit">${escapeHtml(config.submitLabel || "Submit")}</button>
        </div>
        <div class="status-line" data-command-status></div>
      </form>
    `;
    document.body.appendChild(modal);
  }

  function openDocumentDetail(doc) {
    if (!doc) return;
    const url = documentUrl(doc);
    const metadata = doc.metadata || {};
    const details = [
      ["Document ID", doc.id || "Pending"],
      ["Type", doc.type || doc.document_type || "Document"],
      ["Owner", doc.owner || doc.created_by || "Office"],
      ["Status", doc.status || "draft"],
      ["Value", formatCompactMoney(doc.value || doc.amount || 0)],
      ["Updated", displayValue(formatDate(doc.created_at || doc.updated_at), "Pending")],
      ["Recipient", metadata.recipient || doc.email_to || "Not captured"],
      ["Format", metadata.generated_format || metadata.mime_type || "Office record"],
    ];
    openCommandModal({
      action: "document_detail",
      eyebrow: "Document Registry",
      title: doc.title || "Office document",
      subtitle: url ? "Generated document metadata and preview link." : "Document metadata is available, but no generated file URL is attached yet.",
      submitLabel: "Close",
      fields: `
        <div class="command-form-field wide document-detail-panel">
          <div class="office-detail-metrics document-detail-metrics">
            ${details.map(function (item) {
              return `<div class="office-system-metric"><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong></div>`;
            }).join("")}
          </div>
          <div class="document-preview-card">
            <div>
              <strong>${escapeHtml(doc.title || "Office document")}</strong>
              <p class="subtext">${escapeHtml(metadata.pdf_status || "Printable HTML document")} · ${escapeHtml(metadata.source_file_url ? "Source upload attached" : "Generated from Office document studio")}</p>
            </div>
            ${url ? `<a class="primary document-open-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open document</a>` : '<span class="office-system-badge warning">No file URL</span>'}
          </div>
        </div>
      `,
    });
  }

  function openOfficeAction(action) {
    const requiredPermission = requiredPermissionForOfficeAction(action);
    if (requiredPermission && !hasPermission(requiredPermission)) {
      setBulkStatus(`Permission required: ${requiredPermission}. This Office action is hidden or blocked for your role.`, true);
      return;
    }
    const collections = officeCollections();
    const estates = asList(collections.estates);
    const buildings = asList(collections.buildings);
    const estateOptions = estates.length
      ? estates.map(function (estate) { return { label: estate.name || estate.id, value: estate.id || "" }; })
      : [{ label: "No estate available", value: "" }];
    const buildingOptions = buildings.length
      ? buildings.map(function (building) { return { label: building.name || building.id, value: building.id || "" }; })
      : [{ label: "No building selected", value: "" }];

    const text = function (name, label, placeholder) {
      return `<label class="command-form-field"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="text" placeholder="${escapeHtml(placeholder || label)}" /></label>`;
    };
    const textarea = function (name, label, placeholder) {
      return `<label class="command-form-field wide"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder || "")}"></textarea></label>`;
    };

    if (action === "add_estate") {
      openCommandModal({
        action,
        eyebrow: "Estate Facility",
        title: "Add estate to Oyi Facility",
        subtitle: "Creates an estate record that can be surfaced through Oyi Facility after sync.",
        submitLabel: "Create estate",
        fields: [
          text("name", "Estate name", "Green Canopy Estate"),
          text("location", "Location", "Lekki, Lagos"),
          text("latitude", "Latitude", "6.4698"),
          text("longitude", "Longitude", "3.5852"),
          text("package_name", "Package", "Professional"),
          formSelect("status", "Status", [
            { label: "Active", value: "active" },
            { label: "Pending", value: "pending" },
            { label: "Paused", value: "paused" },
          ]),
        ].join(""),
      });
      return;
    }
    if (action === "import_estates") {
      openCommandModal({
        action,
        eyebrow: "Estate Import",
        title: "Import estates",
        subtitle: "Paste facility export JSON or run a source import through the Office import contract.",
        submitLabel: "Import estates",
        fields: [
          formSelect("source", "Source", [
            { label: "Oyi Facility", value: "oyi_facility" },
            { label: "CSV/JSON upload", value: "manual_import" },
          ]),
          textarea("payload", "Import JSON", '{"estates":[{"id":"estate_1","name":"Green Canopy Estate","location":"Lekki, Lagos"}]}'),
        ].join(""),
      });
      return;
    }
    if (action === "geocode_estates") {
      openCommandModal({
        action,
        eyebrow: "Estate Maps",
        title: "Geocode estate locations",
        subtitle: "Uses the configured Google Maps Geocoding API to add latitude and longitude to estate records missing map coordinates.",
        submitLabel: "Geocode estates",
        fields: [
          `<label class="command-form-field"><span>Limit</span><input name="limit" type="number" min="1" max="100" value="50" /></label>`,
          `<label class="command-form-field"><span>Country bias</span><input name="country" type="text" value="Nigeria" /></label>`,
          formSelect("force", "Mode", [
            { label: "Only missing coordinates", value: "false" },
            { label: "Refresh all coordinates", value: "true" },
          ]),
        ].join(""),
      });
      return;
    }
    if (action === "add_building") {
      openCommandModal({
        action,
        eyebrow: "Smart Building",
        title: "Add building to estate",
        subtitle: estates.length ? "Buildings must belong to an existing estate." : "Create an estate first before adding buildings.",
        submitLabel: "Create building",
        fields: [
          formSelect("estate_id", "Estate", estateOptions),
          text("name", "Building name", "Canopy Towers"),
          text("type", "Building type", "Residential tower"),
          formSelect("status", "Status", [
            { label: "Active", value: "active" },
            { label: "Pending", value: "pending" },
          ]),
        ].join(""),
      });
      return;
    }
    if (action === "add_device") {
      openCommandModal({
        action,
        eyebrow: "Hardware Device",
        title: "Add hardware device",
        subtitle: "Creates a device record linked to an estate/building for Office supervision.",
        submitLabel: "Create device",
        fields: [
          text("name", "Device name", "Gate Camera 01"),
          formSelect("category", "Category", [
            { label: "Camera", value: "camera" },
            { label: "Access Control", value: "access" },
            { label: "Sensor", value: "sensor" },
            { label: "Energy", value: "energy" },
          ]),
          formSelect("estate_id", "Estate", estateOptions),
          formSelect("building_id", "Building", buildingOptions),
          formSelect("status", "Status", [
            { label: "Online", value: "online" },
            { label: "Offline", value: "offline" },
            { label: "Pending", value: "pending" },
          ]),
        ].join(""),
      });
      return;
    }
    if (action === "import_devices") {
      openCommandModal({
        action,
        eyebrow: "Device Import",
        title: "Import devices",
        subtitle: "Use this for Tuya, Alexa, Google Home, or manual JSON imports.",
        submitLabel: "Import devices",
        fields: [
          formSelect("source", "Provider", [
            { label: "Tuya", value: "tuya" },
            { label: "Alexa", value: "alexa" },
            { label: "Google Home", value: "google_home" },
            { label: "Manual JSON", value: "manual_devices" },
          ]),
          textarea("payload", "Device JSON", '{"devices":[{"id":"device_1","name":"Gate Camera 01","category":"camera","status":"online"}]}'),
        ].join(""),
      });
      return;
    }
    if (action === "create_ticket") {
      openCommandModal({
        action,
        eyebrow: "Customer Support",
        title: "Create support ticket",
        subtitle: "Creates a support mapping that Office can route to the right estate/building context.",
        submitLabel: "Create ticket",
        fields: [
          formSelect("estate_id", "Estate", estateOptions),
          formSelect("building_id", "Building", buildingOptions),
          text("title", "Ticket title", "Gate access issue"),
          formSelect("priority", "Priority", [
            { label: "Medium", value: "medium" },
            { label: "High", value: "high" },
            { label: "Critical", value: "critical" },
          ]),
        ].join(""),
      });
      return;
    }
    if (["create_document", "upload_document", "create_invoice", "create_contract"].includes(action)) {
      openDocumentAction(action);
      return;
    }
    if (action === "document_actions") {
      openCommandModal({
        action: "document_actions",
        eyebrow: "Documents",
        title: "Document actions",
        subtitle: "Choose the office document workflow you want to run.",
        submitLabel: "Close",
        fields: `
          <div class="command-form-field wide document-action-grid">
            <button class="shortcut-btn" data-command-action="create_document" data-command-close type="button"><span>${officeIcon("estate")}</span>Create document</button>
            <button class="shortcut-btn" data-command-action="upload_document" data-command-close type="button"><span>${officeIcon("website")}</span>Upload metadata</button>
            <button class="shortcut-btn" data-command-action="create_invoice" data-command-close type="button"><span>${officeIcon("wallet")}</span>Create invoice</button>
            <button class="shortcut-btn" data-command-action="create_contract" data-command-close type="button"><span>${officeIcon("lead")}</span>Create contract</button>
          </div>
        `,
      });
      return;
    }
    if (action === "view_wallets") {
      openWalletsModal();
      return;
    }
    if (action === "view_reports") {
      setOfficeWorkspace("reports", "reports");
      return;
    }
    if (action === "run_ai_workflow") {
      setOfficeWorkspace("ai_operations", "ai_operations");
      setModuleFacet("agents", "execution");
      renderWorkspaceTabs();
      setBulkStatus("AI Execution workspace opened. Select an execution profile or review pending workflow activity.");
      return;
    }
    if (action === "create_new_agent") {
      setOfficeWorkspace("ai_operations", "ai_operations");
      setModuleFacet("agents", "agent_console");
      renderWorkspaceTabs();
      setBulkStatus("Agent Console opened. Agent creation is governed from the permissioned AI Operations workspace.");
      return;
    }
    if (action === "add_new_tool") {
      setOfficeWorkspace("ai_operations", "ai_operations");
      setModuleFacet("agents", "tool_registry");
      renderWorkspaceTabs();
      setBulkStatus("Tool Registry opened. Add or review available Oyi tools from the AI Operations workspace.");
      return;
    }
    if (action === "open_permissions") {
      openCommandModal({
        action,
        eyebrow: "Permissions",
        title: "Queue permission review",
        subtitle: "Creates a permission review record for estate, staff, resident, or building access scopes.",
        submitLabel: "Queue review",
        fields: [
          formSelect("estate_id", "Estate", estateOptions),
          formSelect("scope", "Scope", [
            { label: "Estate", value: "estate" },
            { label: "Building", value: "building" },
            { label: "Resident", value: "resident" },
            { label: "Staff", value: "staff" },
          ]),
        ].join(""),
      });
      return;
    }
    setBulkStatus(`${action.replace(/_/g, " ")} does not have a visible production handler in this workspace. Use the module tabs or quick actions that are wired to live routes.`, true);
  }

  function handleAdminSection(section) {
    state.adminSection = section || "dashboard";
    Array.from(document.querySelectorAll("[data-admin-section]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-admin-section") === state.adminSection);
    });
    renderTeamPanel();
    const target = document.querySelector(".staff-workspace .command-page");
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function submitOfficeAction(action, form) {
    if (action === "document_detail") {
      return;
    }
    const formData = new FormData(form);
    const now = new Date().toISOString();
    const source = String(formData.get("source") || "office_manual");
    let payload = {};

    if (["import_estates", "import_devices"].includes(action)) {
      const raw = String(formData.get("payload") || "{}");
      payload = JSON.parse(raw);
    } else if (action === "add_estate") {
      const name = String(formData.get("name") || "").trim();
      if (!name) throw new Error("Estate name is required.");
      payload = {
        estates: [{
          id: slugId("estate", name),
          name,
          location: String(formData.get("location") || ""),
          latitude: Number(formData.get("latitude") || 0) || null,
          longitude: Number(formData.get("longitude") || 0) || null,
          subscription_status: String(formData.get("status") || "active"),
          package_name: String(formData.get("package_name") || ""),
          created_at: now,
        }],
      };
    } else if (action === "add_building") {
      const estateId = String(formData.get("estate_id") || "");
      const name = String(formData.get("name") || "").trim();
      if (!estateId) throw new Error("Select an estate first.");
      if (!name) throw new Error("Building name is required.");
      payload = { buildings: [{ id: slugId("building", name), estate_id: estateId, name, type: String(formData.get("type") || "Building"), status: String(formData.get("status") || "active"), created_at: now }] };
    } else if (action === "add_device") {
      const name = String(formData.get("name") || "").trim();
      if (!name) throw new Error("Device name is required.");
      payload = { devices: [{ id: slugId("device", name), name, category: String(formData.get("category") || "device"), estate_id: String(formData.get("estate_id") || ""), building_id: String(formData.get("building_id") || ""), status: String(formData.get("status") || "online"), created_at: now }] };
    } else if (action === "create_ticket") {
      const title = String(formData.get("title") || "").trim();
      if (!title) throw new Error("Ticket title is required.");
      payload = { support_mappings: [{ id: slugId("support", title), estate_id: String(formData.get("estate_id") || ""), building_id: String(formData.get("building_id") || ""), title, priority: String(formData.get("priority") || "medium"), status: "open", channel: "office", created_at: now }] };
    } else if (["create_document", "upload_document", "create_invoice", "create_contract"].includes(action)) {
      const title = String(formData.get("title") || "").trim();
      if (!title) throw new Error("Document title is required.");
      let fileUrl = "";
      const dataUrl = String(formData.get("data_url") || "").trim();
      if (dataUrl) {
        const stored = await api("/api/lead-agents/admin/storage", {
          method: "POST",
          body: JSON.stringify({
            data_url: dataUrl,
            purpose: action === "upload_document" ? "document_upload" : "office_document",
          }),
        });
        fileUrl = stored.file?.url || "";
      }
      const type = action === "create_invoice"
        ? "Invoice"
        : action === "create_contract"
          ? "Contract"
          : String(formData.get("type") || "Document");
      await api("/api/lead-agents/admin/documents/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          document_type: type.toLowerCase(),
          status: String(formData.get("status") || "draft"),
          amount: Number(formData.get("value") || 0),
          file_url: fileUrl,
          email_to: String(formData.get("email_to") || ""),
          recipient: String(formData.get("recipient") || ""),
          body: String(formData.get("body") || ""),
        }),
      }).then(function (result) {
        const warning = result?.document?.sync_warning || result?.html_file?.sync_warning || "";
        setBulkStatus(warning ? `${type} generated. Supabase sync warning: ${warning}` : `${type} generated and stored in Office documents.`, Boolean(warning));
      });
      await loadLeads();
      return;
    } else if (action === "geocode_estates") {
      const result = await api("/api/lead-agents/admin/maps/geocode", {
        method: "POST",
        body: JSON.stringify({
          limit: Number(formData.get("limit") || 50),
          country: String(formData.get("country") || "Nigeria"),
          force: String(formData.get("force") || "false") === "true",
        }),
      });
      const summary = result?.result || {};
      setBulkStatus(`Estate geocoding complete: ${summary.updated || 0} updated, ${summary.failed || 0} failed.`);
      await loadLeads();
      return;
    } else if (action === "open_permissions") {
      const estateId = String(formData.get("estate_id") || "");
      payload = {
        analytics: [{
          id: slugId("permission", estateId || "scope"),
          record_type: "permission_review",
          estate_id: estateId,
          title: `Permission review: ${estateId || "global"}`,
          scope: String(formData.get("scope") || "estate"),
          status: "queued",
          created_at: now,
        }],
      };
    } else {
      setBulkStatus(`${action.replace(/_/g, " ")} queued for production hook.`);
      return;
    }

    await api("/api/lead-agents/admin/office/import", {
      method: "POST",
      body: JSON.stringify({ source, payload }),
    });
    setBulkStatus(`${action.replace(/_/g, " ")} completed.`);
    await loadLeads();
  }

  function openDocumentAction(action) {
    const title = action === "create_invoice"
      ? "Create invoice"
      : action === "create_contract"
        ? "Create contract"
        : action === "upload_document"
          ? "Upload document metadata"
          : "Create office document";
    openCommandModal({
      action,
      eyebrow: "Documents",
      title,
      subtitle: "Creates a document record in the Office registry so invoices, contracts, PDFs, and proposals are searchable from one place.",
      submitLabel: action === "upload_document" ? "Register upload" : "Create document",
      fields: [
        `<label class="command-form-field"><span>Title</span><input name="title" type="text" placeholder="${escapeHtml(title)}" /></label>`,
        formSelect("type", "Type", [
          { label: "Proposal", value: "Proposal" },
          { label: "Invoice", value: "Invoice" },
          { label: "Contract", value: "Contract" },
          { label: "PDF", value: "PDF" },
        ]),
        `<label class="command-form-field"><span>Value</span><input name="value" type="number" min="0" placeholder="0" /></label>`,
        formSelect("status", "Status", [
          { label: "Draft", value: "draft" },
          { label: "Review", value: "review" },
          { label: "Sent", value: "sent" },
          { label: "Signed", value: "signed" },
        ]),
        `<label class="command-form-field wide"><span>File name / upload reference</span><input name="file_name" type="text" placeholder="contract-green-canopy.pdf" /></label>`,
        `<label class="command-form-field"><span>Recipient</span><input name="recipient" type="text" placeholder="Green Canopy Estate" /></label>`,
        `<label class="command-form-field"><span>Email to</span><input name="email_to" type="email" placeholder="client@example.com" /></label>`,
        `<label class="command-form-field wide"><span>Document body</span><textarea name="body" placeholder="Scope, payment terms, service levels, notes..."></textarea></label>`,
        `<label class="command-form-field wide"><span>Optional file data URL</span><textarea name="data_url" placeholder="Paste a data:application/pdf;base64,... or data:image/png;base64,... payload for local Office storage"></textarea></label>`,
      ].join(""),
    });
  }

  function openWalletsModal() {
    const wallets = asList(officeCollections().wallets);
    openCommandModal({
      action: "view_wallets",
      eyebrow: "Wallets",
      title: "Wallet float registry",
      subtitle: `${wallets.length} wallet records currently synced into Office.`,
      submitLabel: "Close",
      fields: `<div class="command-form-field wide wallet-preview-list">${
        wallets.length
          ? wallets.slice(0, 8).map(function (wallet) {
              return `<div class="command-list-row"><strong>${escapeHtml(wallet.scope_name || wallet.scope_id || "Wallet")}</strong><span>${escapeHtml(formatCompactMoney(wallet.balance || 0))}</span></div>`;
            }).join("")
          : '<div class="office-detail-empty">No wallet records have synced yet.</div>'
      }</div>`,
    });
  }

	  function renderDocumentsWorkspace(domain) {
	    if (!el.webPresencePanel || !domain) return;
	    const collections = officeCollections();
	    const proposals = asList(state.allProposals);
	    const audit = asList(state.audit);
	    const officeDocs = asList(collections.documents)
	      .map(function (record, index) {
	        return {
            id: record.id || `office_doc_${index}`,
	          title: record.title || record.file_name || "Office document",
	          type: record.document_type || record.type || "Document",
	          owner: record.owner || record.created_by || "Office",
	          status: record.status || "draft",
	          value: record.amount || record.value || 0,
	          created_at: record.updated_at || record.created_at,
            updated_at: record.updated_at || record.created_at,
            file_url: record.file_url || "",
            html_url: record.html_url || "",
            url: record.url || "",
            email_to: record.email_to || "",
            metadata: record.metadata || {},
            source: "office_documents",
	        };
	      });
	    const docs = officeDocs.concat(proposals.map(function (proposal, index) {
	      return {
          id: proposal.id || `proposal_${index}`,
	        title: proposal.title || proposal.lead_name || proposal.company || "Commercial proposal",
	        type: "Proposal",
	        owner: proposal.owner || "Commercial",
	        status: proposal.status || "draft",
	        value: proposal.value || proposal.amount || 0,
	        created_at: proposal.created_at,
          updated_at: proposal.updated_at || proposal.created_at,
          file_url: proposal.file_url || proposal.url || "",
          html_url: proposal.html_url || "",
          url: proposal.url || "",
          email_to: proposal.email_to || "",
          metadata: proposal.metadata || {},
          source: "proposals",
	      };
	    }));
	    const activeFacet = state.moduleFacet.documents || "dashboard";
	    const facetDocs = docs.filter(function (doc) {
	      const type = String(doc.type || "").toLowerCase();
	      if (activeFacet === "proposals") return type.includes("proposal");
	      if (activeFacet === "contracts") return type.includes("contract");
	      if (activeFacet === "invoices") return type.includes("invoice");
	      if (activeFacet === "reports") return type.includes("report");
	      if (activeFacet === "drawings") return /drawing|blueprint/.test(type);
	      if (activeFacet === "estate_plans") return /plan/.test(type);
	      if (activeFacet === "asset_files") return doc.source === "office_documents" || Boolean(documentUrl(doc));
	      if (activeFacet === "generated_pdfs") return /pdf/.test(type) || /pdf/i.test(String(doc.metadata?.generated_format || doc.file_url || ""));
	      return true;
	    });
	    const documentQuery = state.documentQuery.trim().toLowerCase();
	    const visibleDocs = documentQuery
	      ? facetDocs.filter(function (doc) {
	          return [doc.title, doc.type, doc.owner, doc.status].join(" ").toLowerCase().includes(documentQuery);
	        })
	      : facetDocs;
	    const typeCount = function (pattern) {
	      return docs.filter(function (doc) { return pattern.test(String(doc.type || "") + " " + String(doc.title || "")); }).length;
	    };
	    const uploadedFiles = docs.filter(function (doc) { return doc.source === "office_documents" || documentUrl(doc); }).length;
	    const timelineRows = audit.slice(0, 4).map(function (event) {
	      return {
	        title: displayValue(event.action, "Document activity"),
	        meta: `${displayValue(event.actor_email, "system")} · ${formatDate(event.created_at || event.ts)}`,
	        status: displayValue(event.status, "recorded"),
	      };
	    }).concat(proposals.slice(0, 3).map(function (proposal) {
	      return {
	        title: displayValue(proposal.title || proposal.company, "Proposal activity"),
	        meta: `${displayValue(proposal.owner, "Commercial")} · ${formatDate(proposal.updated_at || proposal.created_at)}`,
	        status: displayValue(proposal.status, "draft"),
	      };
	    })).slice(0, 6);
	    el.webPresencePanel.innerHTML = `
	      <div class="command-page">
	        <div class="command-head">
	          <div>
	            <p class="eyebrow">Documents</p>
	            <h3>Supervise proposals, contracts, invoices, plans, drawings, generated PDFs, and uploaded files.</h3>
	            <p class="subtext" style="margin:8px 0 0;">Office visualizes the document registry and handoff state. Source records remain in existing Office data and backend-owned services.</p>
	          </div>
	          <div class="toolbar">
	            <button class="primary" data-command-action="document_actions" type="button">+ Create / Upload</button>
	          </div>
	        </div>
	        ${operationalStrip([
	          { label: "Proposals", value: proposals.length, meta: "Commercial packs" },
	          { label: "Contracts", value: typeCount(/contract/i) || state.officeStats?.contracts || 0, meta: "Agreement records" },
	          { label: "Invoices", value: typeCount(/invoice/i) || state.officeStats?.invoices || 0, meta: "Billing records" },
	          { label: "Estate Plans", value: typeCount(/plan/i), meta: "Plan handoff" },
	          { label: "Drawings", value: typeCount(/drawing|blueprint/i), meta: "Technical files" },
	          { label: "Generated PDFs", value: typeCount(/pdf/i), meta: "Generated outputs" },
	          { label: "Uploads", value: uploadedFiles, meta: "Registered files" },
	          { label: "Plan Studio", value: state.planStudio?.projects?.length || "Ready", meta: "Handoff surface" },
	        ])}
	        <div class="command-layout">
	          <section class="command-card">
	            <div class="command-card-head">
	              <h4>Document Registry</h4>
	              <div class="toolbar">
	                <input class="command-search-input" data-document-search type="search" placeholder="Search documents, owners, status..." value="${escapeHtml(state.documentQuery)}" />
	                <button class="ghost compact" data-office-target="intelligence" type="button">Ask Oyi</button>
	              </div>
	            </div>
	            <table class="command-table">
	              <thead><tr><th>Document</th><th>Type</th><th>Owner</th><th>Status</th><th>Value</th><th>Updated</th><th>Action</th></tr></thead>
	              <tbody>${visibleDocs.length ? visibleDocs.slice(0, 12).map(function (doc) {
	                return `<tr class="document-registry-row" data-document-id="${escapeHtml(doc.id)}"><td><button class="document-link-button" data-document-open="${escapeHtml(doc.id)}" type="button"><strong>${escapeHtml(doc.title)}</strong><span>${escapeHtml(documentUrl(doc) ? "Preview ready" : "Metadata only")}</span></button></td><td>${escapeHtml(doc.type)}</td><td>${escapeHtml(doc.owner)}</td><td><span class="office-system-badge">${escapeHtml(doc.status)}</span></td><td>${escapeHtml(formatCompactMoney(doc.value))}</td><td>${escapeHtml(displayValue(formatDate(doc.created_at), "Pending"))}</td><td><button class="ghost compact" data-document-open="${escapeHtml(doc.id)}" type="button">Open</button></td></tr>`;
	              }).join("") : '<tr><td colspan="7"><div class="office-detail-empty">No office documents have synced yet.</div></td></tr>'}</tbody>
	            </table>
	          </section>
	          <aside class="command-side">
              <article class="command-card">
                <div class="command-card-head"><h4>Document Detail</h4><span class="office-system-badge">Drawer-ready</span></div>
                <div class="mission-list">
                  ${visibleDocs[0] ? [
                    ["Latest", visibleDocs[0].title],
                    ["Type", visibleDocs[0].type],
                    ["Status", visibleDocs[0].status],
                    ["File", documentUrl(visibleDocs[0]) ? "Preview ready" : "Metadata only"],
                  ].map(function (item) {
                    return `<div class="device-category"><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(String(item[1]))}</strong></div>`;
                  }).join("") : '<div class="office-detail-empty">Select a document to inspect metadata and preview links.</div>'}
                </div>
              </article>
	            <article class="command-card">
	              <div class="command-card-head"><h4>Plan Studio Handoff</h4><button class="ghost compact" data-office-target="documents" data-office-focus="estate_plans" type="button">Plans</button></div>
	              <div class="document-template-grid">
	                <div class="document-template-card"><strong>Invoice</strong><div class="subtext">Letterhead billing template</div></div>
	                <div class="document-template-card"><strong>Contract</strong><div class="subtext">Estate/service agreement</div></div>
	                <div class="document-template-card"><strong>Proposal</strong><div class="subtext">Magazine-style sales pack</div></div>
	                <div class="document-template-card"><strong>Letter</strong><div class="subtext">Formal Office correspondence</div></div>
	              </div>
	              <div class="subtext" style="margin-top:10px;">Plan Studio handoff stays here as a document workflow surface. Runtime intelligence remains backend-owned.</div>
	            </article>
	            <article class="command-card">
	              <div class="command-card-head"><h4>Document Timeline</h4></div>
	              <div class="mission-list">
	                ${timelineRows.length ? timelineRows.map(function (row) {
	                  return `<div class="device-category"><span><strong style="display:block;color:var(--ink);font-weight:600;">${escapeHtml(row.title)}</strong><small class="subtext">${escapeHtml(row.meta)}</small></span><strong>${escapeHtml(row.status)}</strong></div>`;
	                }).join("") : '<div class="office-detail-empty">Document timeline will appear as proposals, files, and audit activity sync.</div>'}
	              </div>
	            </article>
	            <article class="command-card">
	              <div class="command-card-head"><h4>Conversation-ready Actions</h4></div>
	              <div class="shortcut-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
	                <button class="shortcut-btn" data-command-action="create_invoice" type="button"><span>${officeIcon("wallet")}</span>Invoice</button>
	                <button class="shortcut-btn" data-command-action="create_contract" type="button"><span>${officeIcon("estate")}</span>Contract</button>
	                <button class="shortcut-btn" data-command-action="document_actions" type="button"><span>${officeIcon("trend")}</span>Proposal</button>
	                <button class="shortcut-btn" data-office-target="intelligence" type="button"><span>${officeIcon("messenger")}</span>Ask Oyi</button>
	              </div>
	            </article>
	          </aside>
	        </div>
	      </div>
	    `;
	  }

	  function renderSupportWorkspace(domain) {
	    if (!el.supportPanel || !domain) return;
	    const derived = getDerivedData();
	    const collections = officeCollections();
	    const mappings = asList(collections.support_mappings);
	    const openNotifications = state.notifications.filter(notificationMatchesFilter);
	    const supportRows = mappings.length ? mappings : state.notifications;
	    el.supportPanel.innerHTML = `
	      <div class="command-page">
	        <div class="command-head">
	          <div>
	            <p class="eyebrow">Customer Support</p>
	            <h3>Supervise complaints, estate requests, escalation pressure, and resolution flow.</h3>
	            <p class="subtext" style="margin:8px 0 0;">Support command layer for estate facility tickets, customer cases, founder escalations, and service response posture.</p>
	          </div>
	          <button class="primary" data-command-action="create_ticket" type="button">+ Create Ticket</button>
	        </div>
	        <div class="command-kpis">
	          ${[
	            ["Open Cases", derived.openNotifications],
	            ["Mapped Tickets", mappings.length],
	            ["Escalations", derived.founderNotifications],
	            ["Resolved", derived.resolvedNotifications],
	            ["Support Pressure", openNotifications.length],
	            ["Channels", state.channelState?.channels?.length || 0],
	          ].map(function (item) {
	            return `<div class="command-kpi"><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong><div class="subtext">Live support sync</div></div>`;
	          }).join("")}
	        </div>
	        <div class="command-layout">
	          <section class="command-card">
	            <div class="command-card-head"><h4>Support Queue</h4><button class="ghost compact" data-office-target="support" type="button">View all</button></div>
	            <div class="mission-list">
	              ${supportRows.length ? supportRows.slice(0, 10).map(function (item) {
	                const title = item.title || item.summary || item.type || "Support case";
	                const status = item.status || "open";
	                return `<div class="command-list-row"><div><strong>${escapeHtml(title)}</strong><div class="subtext">${escapeHtml(displayValue(item.estate_name || item.channel || item.scope_type, "Office"))} · ${escapeHtml(displayValue(formatDate(item.created_at || item.ts), "time pending"))}</div></div><span class="office-system-badge ${status === "open" ? "warning" : ""}">${escapeHtml(status)}</span></div>`;
	              }).join("") : '<div class="office-detail-empty">No support tickets have synced yet.</div>'}
	            </div>
	          </section>
	          <aside class="command-side">
	            <article class="command-card">
	              <div class="command-card-head"><h4>Customer Reach</h4></div>
	              <div class="shortcut-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
	                <button class="shortcut-btn" data-command-action="create_ticket" type="button"><span>${officeIcon("support")}</span>Message</button>
	                <button class="shortcut-btn" data-command-action="create_ticket" type="button"><span>${officeIcon("whatsapp")}</span>WhatsApp</button>
	                <button class="shortcut-btn" data-command-action="create_ticket" type="button"><span>${officeIcon("lead")}</span>Call</button>
	                <button class="shortcut-btn" data-command-action="create_ticket" type="button"><span>${officeIcon("camera")}</span>Video</button>
	              </div>
	              <div class="subtext" style="margin-top:10px;">Twilio/live support channels can attach here for direct customer contact from Office.</div>
	            </article>
	            <article class="command-card">
	              <div class="command-card-head"><h4>Pressure Breakdown</h4></div>
	              <div class="mission-list">
	                <div class="device-category"><span>Facility</span><strong>${escapeHtml(String(mappings.length))}</strong></div>
	                <div class="device-category"><span>CRM</span><strong>${escapeHtml(String(state.notifications.length))}</strong></div>
	                <div class="device-category"><span>Founder</span><strong>${escapeHtml(String(derived.founderNotifications))}</strong></div>
	              </div>
	            </article>
	          </aside>
	        </div>
	      </div>
	    `;
	  }

	  function bindOfficeAssetActions(root) {
	    Array.from((root || document).querySelectorAll("[data-office-asset-action]")).forEach(function (node) {
	      node.addEventListener("click", function (event) {
	        event.preventDefault();
	        event.stopPropagation();
	        const parts = String(node.getAttribute("data-office-asset-action") || "").split(":");
	        const kind = parts[0] || "asset";
	        const action = parts[1] || "update";
	        const assetId = parts[2] || "";
	        if (!assetId) return;
	        setBulkStatus(`${kind} ${assetId} ${action} running...`);
	        api(`/api/lead-agents/admin/office/assets/${encodeURIComponent(kind)}/${encodeURIComponent(assetId)}/action`, {
	          method: "POST",
	          body: JSON.stringify({ action }),
	        })
	          .then(function () {
	            setBulkStatus(`${kind} ${assetId} ${action} completed.`);
	            return loadLeads();
	          })
	          .catch(function (error) {
	            setBulkStatus(error.message || `${kind} ${action} failed.`, true);
	          });
	      });
	    });
	  }

  function countSignals(record, keys, fallback) {
    const source = record || {};
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
        return source[key];
      }
    }
    return fallback || 0;
  }

	  function qrImageUrl(value) {
	    return `/api/lead-agents/admin/users/qr?data=${encodeURIComponent(value)}`;
	  }

	  function estateToneFromStatus(value) {
	    const status = String(value || "").toLowerCase();
	    if (status.includes("critical") || status.includes("suspend") || status.includes("offline")) return "critical";
	    if (status.includes("warn") || status.includes("pending") || status.includes("pause")) return "warning";
	    return "healthy";
	  }

  function infrastructureMapStyles() {
    return [
      { elementType: "geometry", stylers: [{ color: "#06101f" }] },
      { elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "administrative", stylers: [{ visibility: "off" }] },
      { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#071426" }] },
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#14243d" }, { lightness: -10 }] },
      { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#031528" }] },
    ];
  }

  function googleEstatePinIcon(maps, tone) {
    const color = tone === "critical" ? "#ff416d" : tone === "warning" ? "#ffc247" : "#28e68d";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="52" viewBox="0 0 42 52"><defs><filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feColorMatrix in="b" values="0 0 0 0 ${tone === "critical" ? "1" : tone === "warning" ? "1" : "0.16"} 0 0 0 0 ${tone === "critical" ? "0.25" : tone === "warning" ? "0.76" : "0.9"} 0 0 0 0 ${tone === "critical" ? "0.43" : tone === "warning" ? "0.28" : "0.55"} 0 0 0 .8 0"/></filter></defs><ellipse cx="21" cy="45" rx="11" ry="4" fill="#000" opacity=".38"/><path filter="url(#g)" d="M21 4c-8.8 0-16 7.1-16 15.9C5 31.8 21 48 21 48s16-16.2 16-28.1C37 11.1 29.8 4 21 4Z" fill="${color}" opacity=".48"/><path d="M21 4c-8.8 0-16 7.1-16 15.9C5 31.8 21 48 21 48s16-16.2 16-28.1C37 11.1 29.8 4 21 4Z" fill="#07101f" stroke="${color}" stroke-width="2"/><circle cx="21" cy="20" r="6.5" fill="${color}"/><circle cx="21" cy="20" r="2.4" fill="#fff"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new maps.Size(34, 42),
      anchor: new maps.Point(17, 39),
    };
  }

  function estateInfoCardHtml(estate, status) {
    return `<div style="font-family:Inter,Arial,sans-serif;min-width:210px;color:#eaf3ff;background:#07101f;border:1px solid rgba(149,166,255,.22);border-radius:12px;padding:10px;box-shadow:0 18px 40px rgba(0,0,0,.45);"><strong style="display:block;font-size:13px;margin-bottom:5px;">${escapeHtml(estate.name || "Estate")}</strong><span style="display:block;color:#9aa8c7;font-size:11px;line-height:1.45;">${escapeHtml(displayValue(estate.location, "Location pending"))}</span><span style="display:block;margin-top:7px;color:#dce6ff;font-size:11px;">Status: ${escapeHtml(status)}</span><span style="display:block;margin-top:5px;color:#9aa8c7;font-size:10px;">Click to inspect. Double-click to open portfolio.</span></div>`;
  }

	  function deviceCategoryIcon(category) {
	    const key = String(category || "").toLowerCase();
	    if (key.includes("camera") || key.includes("cctv") || key.includes("surveillance")) return officeIcon("camera");
	    if (key.includes("access") || key.includes("lock") || key.includes("gate")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/></svg>';
	    if (key.includes("sensor") || key.includes("occupancy")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><circle cx="12" cy="12" r="4"/></svg>';
	    if (key.includes("maintenance")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m14.7 6.3 3 3"/><path d="M4 20l5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9-2 4z"/></svg>';
	    if (key.includes("energy") || key.includes("utility") || key.includes("power")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m13 2-8 12h6l-1 8 9-13h-6z"/></svg>';
	    if (key.includes("occupant") || key.includes("resident")) return officeIcon("lead");
	    if (key.includes("hub") || key.includes("control")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6v6H9z"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
	    return officeIcon("estate");
	  }

	  function renderEstateGoogleMap(estates, selectedEstate, domain) {
	    const mapHost = document.getElementById("estateGoogleMap");
	    if (!mapHost) return;
	    const mapConfig = state.mapConfig || {};
	    const googleConfig = mapConfig.google_maps || {};
	    const provider = String(mapConfig.provider || "static").toLowerCase();
	    const apiKey = googleConfig.api_key || "";
	    const markerRecords = asList(estates)
	      .map(function (estate) {
	        const position = estateCoordinate(estate);
	        return position ? { estate, position } : null;
	      })
	      .filter(Boolean);
	
	    if (provider !== "google" || !apiKey) {
	      mapHost.innerHTML = '<div class="map-provider-note">Static estate layer active. Add GOOGLE_MAPS_API_KEY and set OFFICE_MAP_PROVIDER=google to activate Google Maps.</div>';
	      return;
	    }
	    if (!markerRecords.length) {
	      mapHost.innerHTML = '<div class="map-provider-note">Google Maps is configured, but synced estates do not yet include latitude/longitude.</div>';
	      return;
	    }
	
	    const mapShell = mapHost.closest(".estate-command-map");
	    if (mapShell) mapShell.classList.add("has-live-map");
	    mapHost.classList.add("is-loading");
	    mapHost.innerHTML = "";
	
	    loadGoogleMaps(apiKey)
	      .then(function (maps) {
	        const selectedPosition = selectedEstate ? estateCoordinate(selectedEstate) : null;
	        const center = selectedPosition || markerRecords[0].position;
	        const map = new maps.Map(mapHost, {
	          center,
	          zoom: markerRecords.length > 1 ? 11 : 14,
	          mapTypeControl: false,
	          streetViewControl: false,
	          fullscreenControl: true,
	          styles: infrastructureMapStyles(),
	        });
	        const bounds = new maps.LatLngBounds();
	        markerRecords.forEach(function (record) {
	          const status = String(record.estate.health_status || record.estate.status || record.estate.subscription_status || "healthy");
	          const tone = estateToneFromStatus(status);
	          const marker = new maps.Marker({
	            position: record.position,
	            map,
	            title: record.estate.name || "Estate",
	            icon: googleEstatePinIcon(maps, tone),
	          });
	          const info = new maps.InfoWindow({
	            content: estateInfoCardHtml(record.estate, status),
	          });
	          marker.addListener("mouseover", function () {
	            info.open({ map, anchor: marker });
	          });
	          marker.addListener("click", function () {
	            state.selectedOfficeEstateId = record.estate.id || "";
	            info.open({ map, anchor: marker });
	            renderEstateFacilitiesWorkspace(domain);
	          });
	          bounds.extend(record.position);
	        });
	        if (markerRecords.length > 1) map.fitBounds(bounds, 56);
	        mapHost.classList.remove("is-loading");
	      })
	      .catch(function (error) {
	        if (mapShell) mapShell.classList.remove("has-live-map");
	        mapHost.classList.remove("is-loading");
	        mapHost.innerHTML = `<div class="map-provider-note">${escapeHtml(error.message || "Google Maps failed to load.")}</div>`;
	      });
	  }

  function renderOverviewGoogleMap(estates) {
	    const mapHost = el.officeCityMap;
	    if (!mapHost) return;
	    if (!["map", "hybrid"].includes(state.liveInfraMode || "map")) return;
	    const mapConfig = state.mapConfig || {};
	    const googleConfig = mapConfig.google_maps || {};
	    const provider = String(mapConfig.provider || "static").toLowerCase();
	    const apiKey = googleConfig.api_key || "";
	    const markerRecords = asList(estates)
	      .map(function (estate) {
	        const position = estateCoordinate(estate);
	        return position ? { estate, position } : null;
	      })
	      .filter(Boolean);
	    if (provider !== "google" || !apiKey || !markerRecords.length) return;
	    mapHost.classList.add("has-live-google", "is-loading");
	    mapHost.innerHTML = "";
	    loadGoogleMaps(apiKey)
	      .then(function (maps) {
	        if (!["map", "hybrid"].includes(state.liveInfraMode || "map")) return;
	        const map = new maps.Map(mapHost, {
	          center: markerRecords[0].position,
	          zoom: markerRecords.length > 1 ? 10 : 14,
	          mapTypeControl: false,
	          streetViewControl: false,
	          fullscreenControl: true,
	          styles: infrastructureMapStyles(),
	        });
	        const bounds = new maps.LatLngBounds();
	        markerRecords.forEach(function (record) {
	          const status = String(record.estate.health_status || record.estate.status || record.estate.subscription_status || "healthy");
	          const tone = estateToneFromStatus(status);
	          const marker = new maps.Marker({
	            position: record.position,
	            map,
	            title: record.estate.name || "Estate",
	            icon: googleEstatePinIcon(maps, tone),
	          });
	          const info = new maps.InfoWindow({
	            content: estateInfoCardHtml(record.estate, status),
	          });
	          marker.addListener("mouseover", function () {
	            info.open({ map, anchor: marker });
	          });
	          marker.addListener("click", function () {
	            state.selectedOfficeEstateId = record.estate.id || "";
	            info.open({ map, anchor: marker });
	          });
	          marker.addListener("dblclick", function () {
	            state.selectedOfficeEstateId = record.estate.id || "";
	            setOfficeWorkspace("facilities", "facilities");
	          });
	          bounds.extend(record.position);
	        });
	        if (markerRecords.length > 1) map.fitBounds(bounds, 48);
	        mapHost.classList.remove("is-loading");
	      })
	      .catch(function () {
	        mapHost.classList.remove("has-live-google", "is-loading");
	      });
	  }

  function liveInfraTone(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("critical") || normalized.includes("suspend") || normalized.includes("offline")) return "critical";
    if (normalized.includes("warn") || normalized.includes("pending") || normalized.includes("attention")) return "warning";
    return "healthy";
  }

  function liveInfraIcon(kind) {
    const icons = {
      device: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="4" width="12" height="16" rx="3"/><path d="M9 8h6M10 16h4"/></svg>',
      camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h10v8H4z"/><path d="m14 11 6-3v8l-6-3z"/></svg>',
      alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
      access: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
      utility: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/></svg>',
      edge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"/><path d="M12 8v8M8 10v4M16 10v4"/></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s7-6.6 7-13a7 7 0 0 0-14 0c0 6.4 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    };
    return icons[kind] || "•";
  }

  function liveInfraModeLabel(mode) {
    if (mode === "twin") return "Oyi Digital Twin Layer";
    if (mode === "hybrid") return "Hybrid Map + Twin Layer";
    if (mode === "heatmap") return "Infrastructure Heat Map";
    return "Google Map Operational Layer";
  }

  function liveInfraActionIcon(name) {
    const icons = {
      Explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 11 18-8-8 18-2-8-8-2Z"/></svg>',
      Devices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="4" width="12" height="16" rx="3"/><path d="M9 8h6M10 16h4"/></svg>',
      Cameras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h10v8H4z"/><path d="m14 11 6-3v8l-6-3z"/></svg>',
      Alerts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
      Access: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
      Utilities: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/></svg>',
      Incidents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22a8 8 0 0 0 8-8c0-5-8-12-8-12S4 9 4 14a8 8 0 0 0 8 8Z"/><path d="M12 10v4M12 17h.01"/></svg>',
    };
    return icons[name] || icons.Explore;
  }

  function liveInfraSignals(estates, devices, supportMappings) {
    const positions = [
      ["28%", "36%"],
      ["54%", "34%"],
      ["72%", "48%"],
      ["42%", "62%"],
      ["66%", "68%"],
      ["20%", "58%"],
    ];
    const estateRows = asList(estates).slice(0, 6).map(function (estate, index) {
      const tone = liveInfraTone(estate.health_status || estate.status || estate.subscription_status);
      const kinds = ["access", "device", "camera", "utility", "edge", "alert"];
      const hasSupport = supportMappings.some(function (item) { return item.estate_id === estate.id; });
      const offlineDevice = devices.some(function (device) {
        return device.estate_id === estate.id && String(device.status || "").toLowerCase() === "offline";
      });
      const kind = tone === "critical" || offlineDevice ? "alert" : hasSupport ? "edge" : kinds[index % kinds.length];
      const pos = positions[index % positions.length];
      return {
        estate,
        kind,
        tone,
        x: pos[0],
        y: pos[1],
        label: estate.name || `Estate ${index + 1}`,
      };
    });
    if (estateRows.length) return estateRows;
    return [
      { kind: "device", tone: "healthy", x: "32%", y: "42%", label: "Device layer pending" },
      { kind: "camera", tone: "healthy", x: "58%", y: "38%", label: "Camera layer pending" },
      { kind: "edge", tone: "warning", x: "70%", y: "62%", label: "Edge layer pending" },
    ];
  }

  function renderTwinInfrastructureCanvas(mode, signals, selectedEstate) {
    const selectedName = selectedEstate ? selectedEstate.name || "Selected estate" : "Connected estate layer";
    const selectedLocation = selectedEstate ? displayValue(selectedEstate.location, "Location pending") : "Portfolio infrastructure mesh";
    const buildings = ["b1", "b2", "b3", "b4", "b5", "b6"].map(function (name, index) {
      return `<span class="building ${name}" style="--delay:${index * 120}ms"></span>`;
    }).join("");
    const heat = mode === "heatmap"
      ? '<span class="live-heat live-heat-a"></span><span class="live-heat live-heat-b"></span><span class="live-heat live-heat-c"></span>'
      : "";
    return `
      <div class="live-twin-scene ${escapeHtml(mode)}">
        <span class="city-glow"></span>
        <span class="live-twin-grid"></span>
        ${heat}
        ${buildings}
        <div class="live-twin-title">
          <strong>${escapeHtml(selectedName)}</strong>
          <span>${escapeHtml(selectedLocation)}</span>
        </div>
      </div>
    `;
  }

  function renderLiveInfrastructureView(estates) {
    const collections = officeCollections();
    const devices = asList(collections.devices);
    const supportMappings = asList(collections.support_mappings);
    const selectedEstate =
      estates.find(function (estate) { return String(estate.id || "") === String(state.selectedOfficeEstateId || ""); }) ||
      estates[0] ||
      null;
    const mode = state.liveInfraMode || "map";
    const signals = liveInfraSignals(estates, devices, supportMappings);
    const mapHost = el.officeCityMap;
    if (el.liveInfraEstateName) {
      el.liveInfraEstateName.textContent = selectedEstate ? selectedEstate.name || "Connected estate" : "Ochiga connected estates";
    }
    if (el.liveInfraLocation) {
      el.liveInfraLocation.textContent = selectedEstate
        ? displayValue(selectedEstate.location, "Location pending")
        : "Operational estate layer";
    }
    if (mapHost) {
      mapHost.classList.toggle("mode-map", mode === "map");
      mapHost.classList.toggle("mode-twin", mode === "twin");
      mapHost.classList.toggle("mode-hybrid", mode === "hybrid");
      mapHost.classList.toggle("mode-heatmap", mode === "heatmap");
      mapHost.style.setProperty("--live-infra-zoom", String(state.liveInfraZoom || 1));
      if (["twin", "heatmap"].includes(mode)) {
        mapHost.classList.remove("has-live-google", "is-loading");
        mapHost.innerHTML = renderTwinInfrastructureCanvas(mode, signals, selectedEstate);
      } else if (mode === "hybrid") {
        if (!mapHost.classList.contains("has-live-google")) {
          renderOverviewGoogleMap(estates);
        }
      } else if (!mapHost.classList.contains("has-live-google")) {
        renderOverviewGoogleMap(estates);
      }
    }
    if (el.liveInfraOverlay) {
      el.liveInfraOverlay.classList.toggle("mode-map", mode === "map");
      el.liveInfraOverlay.classList.toggle("mode-twin", mode === "twin");
      el.liveInfraOverlay.classList.toggle("mode-hybrid", mode === "hybrid");
      el.liveInfraOverlay.classList.toggle("mode-heatmap", mode === "heatmap");
      el.liveInfraOverlay.setAttribute("data-mode-label", liveInfraModeLabel(mode));
    }
    document.querySelectorAll("[data-live-infra-mode]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-live-infra-mode") === mode);
      button.onclick = function () {
        state.liveInfraMode = button.getAttribute("data-live-infra-mode") || "map";
        state.liveInfraZoom = 1;
        renderLiveInfrastructureView(estates);
      };
    });
    document.querySelectorAll("[data-live-infra-control]").forEach(function (button) {
      button.onclick = function () {
        const action = button.getAttribute("data-live-infra-control");
        if (action === "layers" || action === "filters" || action === "report") {
          state.liveInfraPanel = state.liveInfraPanel === action ? "" : action;
        } else if (action === "zoom-in") {
          state.liveInfraZoom = Math.min(1.35, Number(state.liveInfraZoom || 1) + 0.08);
        } else if (action === "zoom-out") {
          state.liveInfraZoom = Math.max(0.82, Number(state.liveInfraZoom || 1) - 0.08);
        } else if (action === "reset") {
          state.liveInfraZoom = 1;
          state.liveInfraPanel = "";
          state.selectedOfficeEstateId = "";
        }
        renderLiveInfrastructureView(estates);
      };
    });
    if (el.liveInfraOverlay) {
      const activeLayers = state.liveInfraLayers || {};
      const markers = signals
        .filter(function (signal) {
          if (signal.kind === "device") return activeLayers.devices;
          if (signal.kind === "camera") return activeLayers.cameras;
          if (signal.kind === "alert") return activeLayers.alerts;
          if (signal.kind === "access") return activeLayers.access;
          if (signal.kind === "utility") return activeLayers.utilities;
          if (signal.kind === "edge") return activeLayers.edge;
          return true;
        })
        .map(function (signal) {
          const estateId = signal.estate ? signal.estate.id || "" : "";
          const markerKind = mode === "map" ? "pin" : signal.kind;
          return `<button class="infra-marker ${escapeHtml(markerKind)} ${escapeHtml(signal.tone)}" data-live-infra-estate="${escapeHtml(estateId)}" style="--x:${escapeHtml(signal.x)};--y:${escapeHtml(signal.y)}" title="${escapeHtml(signal.label)}" type="button"><span>${liveInfraIcon(markerKind)}</span><em class="infra-pop-card"><strong>${escapeHtml(signal.label)}</strong><small>${escapeHtml(signal.tone)} · click for report</small></em></button>`;
        }).join("");
      el.liveInfraOverlay.innerHTML = `<div id="officeMapLabels"></div>${markers}`;
      el.officeMapLabels = document.getElementById("officeMapLabels");
      Array.from(el.liveInfraOverlay.querySelectorAll("[data-live-infra-estate]")).forEach(function (node) {
        node.addEventListener("click", function () {
          const estateId = node.getAttribute("data-live-infra-estate") || "";
          if (estateId) state.selectedOfficeEstateId = estateId;
          state.liveInfraPanel = "report";
          renderLiveInfrastructureView(estates);
        });
      });
    }
    if (el.liveInfraActions) {
      const offlineDevices = devices.filter(function (device) { return String(device.status || "").toLowerCase() === "offline"; }).length;
      const cameraCount = devices.filter(function (device) { return /camera|cctv/i.test(String(device.category || device.type || device.name || "")); }).length;
      const actions = [
        ["Explore", "Navigate twin", "facility"],
        ["Devices", `${devices.length} tracked`, "devices"],
        ["Cameras", `${cameraCount} online`, "devices"],
        ["Alerts", `${offlineDevices + supportMappings.length} active`, "support"],
        ["Access", "Visitor gates", "facility"],
        ["Utilities", "Power / water", "devices"],
        ["Incidents", `${supportMappings.length} cases`, "support"],
      ];
      el.liveInfraActions.innerHTML = actions.map(function (action) {
        return `<button class="live-infra-action" data-office-target="${escapeHtml(action[2])}" type="button"><i>${liveInfraActionIcon(action[0])}</i><span><strong>${escapeHtml(action[0])}</strong><small>${escapeHtml(action[1])}</small></span></button>`;
      }).join("");
      Array.from(el.liveInfraActions.querySelectorAll("[data-office-target]")).forEach(function (button) {
        button.addEventListener("click", function () {
          setOfficeWorkspace(button.getAttribute("data-office-target") || "overview");
        });
      });
    }
    renderLiveInfraPanel(estates, devices, supportMappings);
  }

  function renderLiveInfraPanel(estates, devices, supportMappings) {
    if (!el.liveInfraPanel) return;
    const panel = state.liveInfraPanel || "";
    el.liveInfraPanel.classList.toggle("open", Boolean(panel));
    if (!panel) {
      el.liveInfraPanel.innerHTML = "";
      return;
    }
    if (panel === "layers") {
      const rows = [
        ["devices", "Devices"],
        ["cameras", "Cameras"],
        ["alerts", "Alerts"],
        ["access", "Access Control"],
        ["utilities", "Utilities"],
        ["residents", "Residents"],
        ["visitors", "Visitors"],
        ["security", "Security"],
        ["maintenance", "Maintenance"],
        ["edge", "Edge Agents"],
        ["twin", "Digital Twin Objects"],
        ["network", "Network State"],
      ];
      el.liveInfraPanel.innerHTML = `<h4>Infrastructure Layers</h4>${rows.map(function (row) {
        const active = Boolean(state.liveInfraLayers[row[0]]);
        return `<button class="layer-row" data-live-layer="${escapeHtml(row[0])}" type="button"><span>${liveInfraIcon(row[0] === "edge" ? "edge" : row[0] === "cameras" ? "camera" : row[0] === "alerts" ? "alert" : row[0] === "access" ? "access" : row[0] === "utilities" ? "utility" : "device")} ${escapeHtml(row[1])}</span><i class="layer-switch ${active ? "active" : ""}"></i></button>`;
      }).join("")}`;
      Array.from(el.liveInfraPanel.querySelectorAll("[data-live-layer]")).forEach(function (button) {
        button.addEventListener("click", function () {
          const key = button.getAttribute("data-live-layer");
          state.liveInfraLayers[key] = !state.liveInfraLayers[key];
          renderLiveInfrastructureView(estates);
        });
      });
      return;
    }
    if (panel === "filters") {
      const cities = Array.from(new Set(estates.map(function (estate) {
        return String(estate.location || "Unknown").split(",")[0].trim() || "Unknown";
      }))).slice(0, 8);
      el.liveInfraPanel.innerHTML = `<h4>Operational Filters</h4>
        ${cities.map(function (city) { return `<div class="layer-row"><span>${escapeHtml(city)}</span><small>Estate region</small></div>`; }).join("")}
        <div class="layer-row"><span>Online / Offline</span><small>${escapeHtml(String(devices.length))} hardware devices</small></div>
        <div class="layer-row"><span>Open incidents</span><small>${escapeHtml(String(supportMappings.length))} active records</small></div>`;
      return;
    }
    if (panel === "report") {
      const estate = estates.find(function (item) { return String(item.id || "") === String(state.selectedOfficeEstateId || ""); }) || estates[0] || {};
      const estateDevices = devices.filter(function (device) { return device.estate_id === estate.id; });
      const estateSupport = supportMappings.filter(function (item) { return item.estate_id === estate.id; });
      el.liveInfraPanel.innerHTML = `<h4>${escapeHtml(estate.name || "Estate Report")}</h4>
        <div class="layer-row"><span>Location</span><small>${escapeHtml(displayValue(estate.location, "Pending"))}</small></div>
        <div class="layer-row"><span>Hardware devices</span><small>${escapeHtml(String(estateDevices.length))}</small></div>
        <div class="layer-row"><span>Active alerts</span><small>${escapeHtml(String(estateSupport.length))}</small></div>
        <div class="layer-row"><span>Health state</span><small>${escapeHtml(estate.health_status || estate.status || "healthy")}</small></div>
        <button class="ghost compact" data-office-target="facilities" type="button">Open estate detail</button>`;
      const openButton = el.liveInfraPanel.querySelector("[data-office-target]");
      if (openButton) {
        openButton.addEventListener("click", function () {
          setOfficeWorkspace("facilities", "facilities");
        });
      }
    }
  }

	  function renderEstateFacilitiesWorkspace(domain) {
	    if (!el.facilityPanel || !domain) return;
	    const collections = officeCollections();
	    const estates = asList(collections.estates);
	    const packages = asList(collections.packages);
	    const buildings = asList(collections.buildings);
	    const homes = asList(collections.homes);
	    const hardwareDevices = asList(collections.devices);
	    const wallets = asList(collections.wallets);
	    const supportMappings = asList(collections.support_mappings);
	    const totalWallet = wallets.reduce(function (sum, wallet) {
	      return sum + Number(wallet.balance || 0);
	    }, estates.reduce(function (sum, estate) {
	      return sum + Number(estate.wallet_balance || 0);
	    }, 0));
	    const selectedEstate =
	      estates.find(function (estate) { return String(estate.id || "") === String(state.selectedOfficeEstateId || ""); }) ||
	      estates[0] ||
	      null;
	    if (selectedEstate && !state.selectedOfficeEstateId) {
	      state.selectedOfficeEstateId = selectedEstate.id || "";
	    }
	    function estateStats(estate) {
	      const estateBuildings = buildings.filter(function (item) { return item.estate_id === estate.id; });
	      const estateHomes = homes.filter(function (item) { return item.estate_id === estate.id; });
	      const estateDevices = hardwareDevices.filter(function (item) { return item.estate_id === estate.id; });
	      const estateWallets = wallets.filter(function (item) {
	        return item.scope_id === estate.id || (item.scope_type === "home" && estateHomes.some(function (home) { return home.id === item.scope_id; }));
	      });
	      const estateSupport = supportMappings.filter(function (item) { return item.estate_id === estate.id; });
	      const packageRow = findById(packages, estate.package_id);
	      const walletBalance = estateWallets.reduce(function (sum, wallet) {
	        return sum + Number(wallet.balance || 0);
	      }, Number(estate.wallet_balance || 0));
	      const securityDevices = estateDevices.filter(function (item) {
	        return ["camera", "access", "sensor"].includes(String(item.category || "").toLowerCase());
	      }).length;
	      const health = Number(estate.health_score || estate.health_pct || estate.occupancy_pct || 0);
	      return { estateBuildings, estateHomes, estateDevices, estateSupport, packageRow, walletBalance, securityDevices, health };
	    }
	    const selectedStats = selectedEstate ? estateStats(selectedEstate) : null;
	    const mapPositions = [
	      ["10%", "18%", "22%", "28%", "-5deg", "14%", "15%"],
	      ["42%", "12%", "18%", "25%", "3deg", "40%", "10%"],
	      ["61%", "30%", "25%", "26%", "7deg", "64%", "25%"],
	      ["21%", "55%", "23%", "25%", "-10deg", "28%", "52%"],
	      ["56%", "62%", "20%", "24%", "-6deg", "59%", "58%"],
	      ["74%", "50%", "18%", "22%", "5deg", "72%", "44%"],
	    ];
	    const estateRows = estates.map(function (estate, index) {
	      const stats = estateStats(estate);
	      const status = String(estate.subscription_status || estate.status || "pending");
	      const isSelected = selectedEstate && String(selectedEstate.id || "") === String(estate.id || "");
	      const health = stats.health || (status.toLowerCase().includes("active") ? 92 : status.toLowerCase().includes("warn") ? 67 : 45);
	      return `<tr class="estate-row ${isSelected ? "is-selected" : ""}">
	        <td><button class="estate-row-btn" data-estate-select="${escapeHtml(estate.id || "")}" type="button"><strong>${escapeHtml(estate.name || "Unnamed estate")}</strong><div class="subtext">${escapeHtml(displayValue(estate.location, "Location pending"))}</div></button></td>
	        <td><span class="office-system-badge ${estateToneFromStatus(status) === "healthy" ? "" : estateToneFromStatus(status)}">${escapeHtml(status)}</span></td>
	        <td><div class="estate-health-bar"><span style="width:${Math.min(100, Math.max(0, health))}%;"></span></div></td>
	        <td>${escapeHtml(String(stats.estateHomes.length || estate.homes_count || 0))}</td>
	        <td>${assetActionMarkup("estate", estate.id || "", ["active", "live"].includes(status.toLowerCase()))}</td>
	      </tr>`;
	    }).join("");
	    const mapMarkup = estates.slice(0, 6).map(function (estate, index) {
	      const stats = estateStats(estate);
	      const status = String(estate.health_status || estate.status || estate.subscription_status || "healthy");
	      const tone = estateToneFromStatus(status);
	      const pos = mapPositions[index % mapPositions.length];
	      const health = stats.health || (tone === "healthy" ? 92 : tone === "warning" ? 68 : 40);
	      return `<span class="estate-map-zone ${tone}" style="--x:${pos[0]};--y:${pos[1]};--w:${pos[2]};--h:${pos[3]};--r:${pos[4]};"></span>
	        <button class="estate-map-chip ${tone}" data-estate-select="${escapeHtml(estate.id || "")}" type="button" style="--x:${pos[5]};--y:${pos[6]};"><strong>${escapeHtml(estate.name || `Estate ${index + 1}`)}</strong><span>${escapeHtml(tone)} · ${escapeHtml(String(health))}%</span></button>`;
	    }).join("");
	    const selectedStatus = selectedEstate ? String(selectedEstate.subscription_status || selectedEstate.status || "pending") : "pending";
	    const estatePortfolioView = state.estatePortfolioView || "map";
	    const activeFacet = state.moduleFacet.facilities || "dashboard";
	    const liveFacilities = estates.filter(function (estate) { return ["active", "live"].includes(String(estate.status || estate.subscription_status || "").toLowerCase()); }).length;
	    const visitorSignals = supportMappings.filter(function (item) {
	      return /visitor|access|gate/i.test(`${item.type || ""} ${item.title || ""} ${item.summary || ""}`);
	    }).length;
	    const maintenanceSignals = supportMappings.filter(function (item) {
	      return /maintenance|service|repair|ticket/i.test(`${item.type || ""} ${item.title || ""} ${item.summary || ""}`);
	    }).length;
	    const offlineDevices = hardwareDevices.filter(function (device) {
	      return /offline|fault|down/i.test(String(device.status || ""));
	    }).length;
	    const lastSync = displayValue(
	      selectedEstate?.updated_at || selectedEstate?.last_sync_at || state.officeData?.updated_at || state.officeStats?.updated_at,
	      "Pending"
	    );
	    const estateCards = estates.map(function (estate) {
	      const stats = estateStats(estate);
	      const status = String(estate.subscription_status || estate.status || "pending");
	      return `<article class="command-card estate-portfolio-card" data-estate-select="${escapeHtml(estate.id || "")}">
	        <div class="command-card-head">
	          <div><h4>${escapeHtml(estate.name || "Unnamed estate")}</h4><div class="subtext">${escapeHtml(displayValue(estate.location, "Location pending"))}</div></div>
	          <span class="office-system-badge ${estateToneFromStatus(status) === "healthy" ? "" : estateToneFromStatus(status)}">${escapeHtml(status)}</span>
	        </div>
	        <div class="office-detail-metrics">
	          ${metricTile("Units", stats.estateHomes.length || estate.homes_count || 0)}
	          ${metricTile("Buildings", stats.estateBuildings.length || estate.buildings_count || 0)}
	          ${metricTile("Devices", stats.estateDevices.length || estate.devices_count || 0)}
	        </div>
	        <div class="subtext" style="margin-top:10px;">Wallet ${escapeHtml(formatCompactMoney(stats.walletBalance))} · Support ${escapeHtml(String(stats.estateSupport.length))}</div>
	      </article>`;
	    }).join("");

	    el.facilityPanel.innerHTML = `
	      <div class="command-page estate-view-${escapeHtml(estatePortfolioView)}">
	        <div class="command-head">
	          <div>
	            <p class="eyebrow">Estate Facilities</p>
	            <h3>Monitor and manage all estates, facilities, and connected infrastructure.</h3>
	            <p class="subtext" style="margin:8px 0 0;">Mapbox-ready estate command layer, estate records, packages, wallets, support, devices, community, and utilities.</p>
	          </div>
	          <div class="toolbar">
	            <button class="primary" data-command-action="add_estate" type="button">+ Add Estate</button>
	            <button class="ghost" data-command-action="import_estates" type="button">Import Estates</button>
	            <button class="ghost" data-command-action="geocode_estates" type="button">Geocode Map</button>
	          </div>
	        </div>
	        ${operationalStrip([
	          { label: "Facilities", value: estates.length, meta: `${liveFacilities} active` },
	          { label: "Buildings", value: buildings.length, meta: `${homes.length} homes` },
	          { label: "Devices", value: hardwareDevices.length, meta: `${offlineDevices} offline` },
	          { label: "Visitors", value: visitorSignals, meta: "Access activity" },
	          { label: "Maintenance", value: maintenanceSignals || supportMappings.length, meta: "Service workload" },
	          { label: "Wallets", value: formatCompactMoney(totalWallet), meta: `${wallets.length} records` },
	          { label: "Runtime", value: state.officeEventSource ? "Live" : "Standby", meta: "Office sync" },
	          { label: "Last Sync", value: lastSync === "Pending" ? "Pending" : formatDate(lastSync), meta: "Facility data" },
	        ])}
	        <div class="estate-tabs">
	          <button class="estate-tab ${estatePortfolioView === "map" ? "active" : ""}" data-estate-view="map" type="button">Map View</button>
	          <button class="estate-tab ${estatePortfolioView === "list" ? "active" : ""}" data-estate-view="list" type="button">List View</button>
	          <button class="estate-tab ${estatePortfolioView === "all" ? "active" : ""}" data-estate-view="all" type="button">All Estates</button>
	        </div>
	        ${activeFacet !== "dashboard" ? `<article class="command-card module-section-banner">
	          <div class="command-card-head">
	            <h4>${escapeHtml(activeFacet.replace(/_/g, " "))}</h4>
	            <span class="office-system-badge">${estates.length ? "Live Data" : "Pending Integration"}</span>
	          </div>
	          <div class="subtext">Building Portfolio section view is using the same estate, building, facility account, deployment, performance, and monitoring data stream.</div>
	        </article>` : ""}
	        <div class="command-layout">
	          <div class="command-main">
	            <section class="estate-command-map estate-map-with-detail">
	              <div class="estate-google-map" id="estateGoogleMap" aria-label="Live estate Google map"></div>
	              <div class="estate-map-placeholder" aria-hidden="true"></div>
	              ${mapMarkup || '<div class="office-detail-empty" style="position:absolute;left:16px;top:16px;">Estate map will activate when facility sync publishes estate records.</div>'}
	            </section>
	            <article class="command-card estate-map-detail-drawer estate-selected-card">
	            ${selectedEstate && selectedStats ? `
	              <div class="command-card-head">
	                <div>
	                  <h4>${escapeHtml(selectedEstate.name || "Selected estate")}</h4>
	                  <div class="subtext">${escapeHtml(displayValue(selectedEstate.location, "Location pending"))}</div>
	                </div>
	                <span class="office-system-badge ${estateToneFromStatus(selectedStatus) === "healthy" ? "" : estateToneFromStatus(selectedStatus)}">${escapeHtml(selectedStatus)}</span>
	              </div>
	              <div class="estate-detail-hero compact">
	                <div class="estate-photo-card"></div>
	                <div class="estate-detail-metrics">
	                  ${metricTile("Units", selectedStats.estateHomes.length || selectedEstate.homes_count || 0)}
	                  ${metricTile("Buildings", selectedStats.estateBuildings.length || selectedEstate.buildings_count || 0)}
	                  ${metricTile("Occupancy", `${selectedStats.health || 0}%`)}
	                  ${metricTile("Hardware", selectedStats.estateDevices.length || selectedEstate.devices_count || 0)}
	                  ${metricTile("Wallet", formatCompactMoney(selectedStats.walletBalance))}
	                  ${metricTile("Support", selectedStats.estateSupport.length || selectedEstate.support_open || 0)}
	                </div>
	              </div>
	              <div class="office-batch-row">
	                <span class="office-batch">Package <strong>${escapeHtml(displayValue(selectedStats.packageRow?.name || selectedEstate.package_name, "Pending"))}</strong></span>
	                <span class="office-batch">Security <strong>${escapeHtml(selectedStats.securityDevices ? "Secure" : "Pending")}</strong></span>
	                <span class="office-batch">Manager <strong>${escapeHtml(displayValue(selectedEstate.manager_name || selectedEstate.manager, "Unassigned"))}</strong></span>
	                <span class="office-batch">Community <strong>${escapeHtml(String(countSignals(selectedEstate, ["community_posts", "community_count", "community_activity", "community_members"], selectedStats.estateHomes.length)))}</strong></span>
	              </div>
	            ` : '<div class="office-detail-empty">Select an estate marker to inspect its command dashboard.</div>'}
	            </article>
	            <section class="estate-all-grid">
	              ${estateCards || '<div class="office-detail-empty">No estate facility records have synced into Office yet.</div>'}
	            </section>
	            <section class="estate-split-grid">
	              <article class="command-card estate-list-panel estate-registry-wide">
	                <div class="command-card-head">
	                  <h4>Facility Registry</h4>
	                  <div class="toolbar">
	                    <input class="estate-search" type="search" placeholder="Search facilities..." />
	                    <button class="ghost compact" data-estate-view="all" type="button">All</button>
	                  </div>
	                </div>
	                <table class="estate-table">
	                  <thead><tr><th>Estate</th><th>Status</th><th>Health</th><th>Units</th><th>Actions</th></tr></thead>
	                  <tbody>${estateRows || '<tr><td colspan="5"><div class="office-detail-empty">No estate facility records have synced into Office yet.</div></td></tr>'}</tbody>
	                </table>
	              </article>
	            </section>
	          </div>
	          ${commandActivityRail({
	            title: "Estate Activity",
	            activity: supportMappings.slice(0, 5).map(function (item) {
	              return { title: item.title || item.summary || "Estate support activity", meta: `${displayValue(item.estate_name || item.scope_type, "Estate")} · ${displayValue(item.status, "open")}`, tone: item.status === "resolved" ? "healthy" : "warning" };
	            }).concat(estates.slice(0, 2).map(function (estate) {
	              return { title: `${estate.name || "Estate"} synced`, meta: displayValue(estate.location, "Location pending"), tone: estateToneFromStatus(estate.status || estate.subscription_status) };
	            })),
	            insights: [
	              { title: `${estates.length} estates under command`, meta: `${hardwareDevices.length} hardware devices linked`, icon: "estate" },
	              { title: `Wallet float ${formatCompactMoney(totalWallet)}`, meta: "Across estate wallets", icon: "wallet" },
	              { title: `${supportMappings.length} support mappings`, meta: "Facility pressure signal", icon: "support" },
	            ],
	            actions: [
	              { label: "Add Estate", icon: "estate", action: "add_estate" },
	              { label: "Create Ticket", icon: "support", action: "create_ticket" },
	              { label: "View Wallets", icon: "wallet", action: "view_wallets" },
	              { label: "Reports", icon: "trend", action: "view_reports" },
	            ],
	          })}
	        </div>
	      </div>
	    `;
	    Array.from(el.facilityPanel.querySelectorAll("[data-estate-select]")).forEach(function (node) {
	      node.addEventListener("click", function () {
	        state.selectedOfficeEstateId = node.getAttribute("data-estate-select") || "";
	        renderEstateFacilitiesWorkspace(domain);
	      });
	    });
	    Array.from(el.facilityPanel.querySelectorAll("[data-estate-view]")).forEach(function (node) {
	      node.addEventListener("click", function () {
	        state.estatePortfolioView = node.getAttribute("data-estate-view") || "map";
	        renderEstateFacilitiesWorkspace(domain);
	      });
	    });
	    renderEstateGoogleMap(estates, selectedEstate, domain);
	    bindOfficeAssetActions(el.facilityPanel);
	  }

	  function renderSmartBuildingsWorkspace(domain) {
	    if (!el.smartBuildingsPanel || !domain) return;
	    const collections = officeCollections();
	    const estates = asList(collections.estates);
	    const buildings = asList(collections.buildings);
    const homes = asList(collections.homes);
    const hardwareDevices = asList(collections.devices);
	    const wallets = asList(collections.wallets);
	    const supportMappings = asList(collections.support_mappings);
	
	    const buildingRows = buildings.map(function (building) {
	      const estate = findById(estates, building.estate_id);
      const buildingHomes = homes.filter(function (home) {
        return home.building_id === building.id;
      });
      const buildingDevices = hardwareDevices.filter(function (device) {
        return device.building_id === building.id;
      });
      const buildingWallets = wallets.filter(function (wallet) {
        return buildingHomes.some(function (home) {
          return wallet.scope_id === home.id;
        });
      });
      const buildingSupport = supportMappings.filter(function (item) {
        return item.building_id === building.id;
      });
      const onlineDevices = buildingDevices.filter(function (device) {
        return device.status === "online";
      }).length;
      const buildingStatus = String(building.status || building.automation_state || "active");
      const buildingIsLive = !["disabled", "suspended", "inactive", "offline"].includes(buildingStatus.toLowerCase());
      const walletBalance = buildingWallets.reduce(function (sum, wallet) {
        return sum + Number(wallet.balance || 0);
      }, 0);
      const communitySignals = countSignals(
        building,
        ["community_posts", "community_count", "community_activity", "community_members"],
        buildingHomes.length
      );
      const utilitySignals = countSignals(
        building,
        ["utility_count", "utilities_count", "utility_accounts", "utility_meters"],
        buildingHomes.length
      );
      const webPresenceSignals = countSignals(
        building,
        ["web_presence_hits", "web_sessions", "surface_conversations", "surface_talks"],
        buildingSupport.length
      );

	      return `<tr class="smart-registry-row" data-building-select="${escapeHtml(building.id || "")}">
	        <td><strong>${escapeHtml(building.name || "Unnamed building")}</strong><div class="subtext">${escapeHtml(displayValue(estate?.name, "Estate pending"))} · ${escapeHtml(displayValue(building.type, "Building"))}</div></td>
	        <td><span class="office-system-badge ${buildingIsLive ? "" : "warning"}">${escapeHtml(buildingStatus)}</span></td>
	        <td>${escapeHtml(String(building.homes_count || buildingHomes.length))}</td>
	        <td>${escapeHtml(String(building.occupancy_pct || 0))}%</td>
	        <td>${escapeHtml(formatCompactMoney(walletBalance))}</td>
	        <td>${escapeHtml(String(buildingSupport.length))}</td>
	        <td>${assetActionMarkup("building", building.id || "", buildingIsLive)}</td>
	      </tr>`;
	    }).join("");
	
	    el.smartBuildingsPanel.innerHTML = `
	      <div class="command-page">
	        <div class="command-head">
	          <div>
	            <p class="eyebrow">Smart Buildings</p>
	            <h3>Monitor connected homes, units, permissions, and automation posture.</h3>
	            <p class="subtext" style="margin:8px 0 0;">Minimal smart-building command surface for homes, hardware, wallets, support, community, and utilities.</p>
	          </div>
	          <button class="ghost" data-office-target="settings" type="button">View building sync</button>
	        </div>
	        <div class="command-kpis">
	          ${[
	            ["Buildings", buildings.length],
	            ["Homes", homes.length],
	            ["Wallets", wallets.length],
	            ["Support Cases", supportMappings.length],
	            ["Estates Linked", estates.length],
	            ["Avg Occupancy", `${Math.round(buildings.reduce(function (sum, building) { return sum + Number(building.occupancy_pct || 0); }, 0) / Math.max(1, buildings.length))}%`],
	          ].map(function (item) {
	            return `<div class="command-kpi"><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong><div class="subtext">Synced from Office data</div></div>`;
	          }).join("")}
	        </div>
	        <div class="command-layout">
	          <div class="command-main">
	            <section class="command-card building-detail-card">
	              <div class="command-card-head"><h4>Smart Building Registry</h4><button class="ghost compact" data-command-action="add_building" type="button">+ Add Building</button></div>
	              <table class="command-table">
	                <thead><tr><th>Building</th><th>Status</th><th>Homes</th><th>Occupancy</th><th>Wallet</th><th>Support</th><th>Actions</th></tr></thead>
	                <tbody>${buildingRows || '<tr><td colspan="7"><div class="office-detail-empty">Smart building data will appear here once the consumer and smart building systems sync into Office.</div></td></tr>'}</tbody>
	              </table>
	            </section>
	          </div>
	          ${commandActivityRail({
	            title: "Smart Building Activity",
	            activity: buildings.slice(0, 5).map(function (building) {
	              return { title: building.name || "Smart building", meta: `${displayValue(building.automation_state || building.status, "active")} · ${displayValue(building.occupancy_pct, 0)}% occupancy`, tone: estateToneFromStatus(building.status || building.automation_state) };
	            }),
	            insights: [
	              { title: `${homes.length} homes supervised`, meta: `${hardwareDevices.length} hardware devices connected`, icon: "estate" },
	              { title: `${supportMappings.length} support cases`, meta: "Building support pressure", icon: "support" },
	              { title: `${wallets.length} wallets linked`, meta: "Consumer smart building wallet surface", icon: "wallet" },
	            ],
	            actions: [
	              { label: "Add Building", icon: "estate", action: "add_building" },
	              { label: "Permissions", icon: "lead", action: "open_permissions" },
	              { label: "Devices", icon: "camera", action: "add_device" },
	              { label: "Support", icon: "support", action: "create_ticket" },
	            ],
	          })}
	        </div>
	      </div>
	    `;
	    bindOfficeAssetActions(el.smartBuildingsPanel);
	  }

  function renderDeviceWorkspace() {
    if (!el.devicePanel) return;
    const collections = officeCollections();
    const activeFacet = state.moduleFacet.edge || "dashboard";
    const estates = asList(collections.estates);
    const buildings = asList(collections.buildings);
    const homes = asList(collections.homes);
	    const devices = asList(collections.devices);
	    const normalizedDevices = devices;
    const online = devices.filter(function (device) {
      return String(device.status || "").toLowerCase() === "online";
    }).length;
    const offline = devices.filter(function (device) {
      return ["offline", "fault", "faulty", "down"].includes(String(device.status || "").toLowerCase());
    }).length;
    const security = devices.filter(function (device) {
      return ["camera", "access", "sensor"].includes(String(device.category || "").toLowerCase());
    }).length;
	    const totalDevices = devices.length;
	    const onlineDevices = online;
	    const offlineDevices = offline;
    const activeAlerts = offlineDevices + normalizedDevices.filter(function (device) {
      return Number(device.battery_level || device.battery || 100) < 30;
    }).length;
	    const edgeAgentSignals = state.traces.filter(function (trace) {
	      return /edge|agent|camera|stream|outbox|device/i.test(`${trace.agent || ""} ${trace.type || ""} ${trace.tool_name || ""} ${trace.summary || ""}`);
	    });
	    const discoverySignals = state.notifications.filter(function (note) {
	      return /discover|device|edge|camera|stream/i.test(`${note.type || ""} ${note.title || ""} ${note.summary || ""}`);
	    }).length;
	    const cameraDevices = normalizedDevices.filter(function (device) {
	      return /camera|cctv|stream|onvif/i.test(`${device.category || ""} ${device.type || ""} ${device.name || ""}`);
	    });
	    const streamHealthy = cameraDevices.filter(function (device) {
	      return !/offline|fault|down/i.test(String(device.status || ""));
	    }).length;
	    const localOutbox = state.traces.filter(function (trace) {
	      return /queued|pending|outbox|retry/i.test(`${trace.status || ""} ${trace.type || ""} ${trace.summary || ""}`);
	    }).length;
	    const deploymentLinks = state.allDemos.filter(function (demo) {
	      return /edge|device|camera|stream|site|deploy/i.test(`${demo.title || ""} ${demo.notes || ""} ${demo.review_type || ""}`);
	    }).length;
	    const batteryDevices = normalizedDevices.filter(function (device) {
	      const battery = device.battery_level ?? device.battery;
	      return battery !== undefined && battery !== null && battery !== "";
	    });
	    const avgBattery = batteryDevices.length
	      ? Math.round(
	          batteryDevices.reduce(function (sum, device) {
	            return sum + Number((device.battery_level ?? device.battery) || 0);
	          }, 0) / batteryDevices.length
	        )
	      : null;
	    const moduleCategories = [
	      "Security & Access",
	      "Cameras & Surveillance",
	      "Environment & Sensors",
	      "Utilities",
	      "Traffic & Mobility",
	      "Comfort & Automation",
	      "Lighting",
	      "Meters",
	      "Edge Infrastructure",
	      "Smart Home Devices",
	    ];
	    const categories = normalizedDevices.reduce(function (acc, device) {
	      const raw = String(device.category || device.module || device.type || "General Hardware");
	      const key = /camera|cctv|surveillance/i.test(raw)
	        ? "Cameras & Surveillance"
	        : /access|lock|gate|visitor/i.test(raw)
	          ? "Security & Access"
	          : /traffic|parking|vehicle|plate|anpr|mobility/i.test(raw)
	            ? "Traffic & Mobility"
	            : /meter/i.test(raw)
	              ? "Meters"
	              : /energy|utility|power|water|pump|tank|hvac/i.test(raw)
	                ? "Utilities"
	                : /light|lighting/i.test(raw)
	                  ? "Lighting"
	                  : /climate|comfort|automation|scene|thermostat/i.test(raw)
	                    ? "Comfort & Automation"
	                    : /edge|hub|gateway|controller/i.test(raw)
	                      ? "Edge Infrastructure"
	                      : /sensor|temperature|smoke|air|humidity|noise|occupancy|presence|environment/i.test(raw)
	                        ? "Environment & Sensors"
	                        : "Smart Home Devices";
	      acc[key] = (acc[key] || 0) + 1;
	      return acc;
	    }, {});
	    moduleCategories.forEach(function (category) {
	      if (categories[category] === undefined) categories[category] = 0;
	    });
    const healthPct = Math.round((onlineDevices / Math.max(1, totalDevices)) * 100);
    const deviceRows = normalizedDevices.map(function (device) {
      const estate = findById(estates, device.estate_id);
      const building = findById(buildings, device.building_id);
      const home = findById(homes, device.home_id);
      const status = String(device.status || "unknown");
      const isLive = ["online", "active", "live"].includes(status.toLowerCase());
      const location = [estate?.name, building?.name, home?.name, device.location].filter(Boolean).join(" · ") || "Location pending";
      const battery = device.battery_level ?? device.battery;
      return `<tr>
        <td><strong>${escapeHtml(device.name || device.id || "Hardware device")}</strong><div class="subtext">${escapeHtml(device.id || device.serial || "ID pending")}</div></td>
        <td>${escapeHtml(device.category || "General")}</td>
        <td>${escapeHtml(location)}</td>
        <td><span class="office-system-badge ${isLive ? "" : "warning"}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(String(battery || "--"))}${battery ? "%" : ""}</td>
        <td>${escapeHtml(displayValue(formatDate(device.last_seen_at || device.updated_at), "Pending"))}</td>
        <td>${assetActionMarkup("device", device.id || "", isLive)}</td>
      </tr>`;
	    }).join("") || '<tr><td colspan="7"><div class="office-detail-empty">No hardware devices have synced into Office yet.</div></td></tr>';

    el.devicePanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Edge</p>
            <h3>Supervise edge agents, device registry, discovery, telemetry, camera streams, and site readiness.</h3>
            <p class="subtext" style="margin:8px 0 0;">Office visualizes Edge runtime posture. Protocol execution, camera streaming, and local outbox ownership remain with the Edge runtime.</p>
          </div>
          <div class="toolbar">
            <button class="ghost" data-office-target="settings" type="button">Provider Health</button>
            <button class="ghost" data-office-target="deployments" type="button">Deployments</button>
          </div>
        </div>
        ${operationalStrip([
          { label: "Edge Agents", value: edgeAgentSignals.length || (state.officeEventSource ? "Live" : "Pending"), meta: "Runtime signals" },
          { label: "Device Registry", value: totalDevices, meta: `${onlineDevices} online` },
          { label: "Discovery", value: discoverySignals, meta: "New signals" },
          { label: "Telemetry", value: state.traces.length || "Pending", meta: "Trace feed" },
          { label: "Camera Streams", value: `${streamHealthy}/${cameraDevices.length}`, meta: "Stream health" },
          { label: "Local Outbox", value: localOutbox, meta: "Queued edge events" },
          { label: "Site Readiness", value: activeAlerts ? "Review" : "Stable", meta: `${activeAlerts} attention` },
          { label: "Deployment Link", value: deploymentLinks, meta: "Rollout relation" },
        ])}
        ${activeFacet !== "dashboard" ? `<article class="command-card module-section-banner">
          <div class="command-card-head">
            <h4>${escapeHtml(activeFacet.replace(/_/g, " "))}</h4>
            <span class="office-system-badge">${totalDevices ? "Live Data" : "Pending Integration"}</span>
          </div>
          <div class="subtext">This Edge section supervises the current Office device registry, telemetry, and runtime posture. Device protocol ownership remains with the Edge runtime.</div>
        </article>` : ""}
        <div class="device-layout">
          <aside class="command-card">
            <div class="command-card-head"><h4>Edge Domains</h4></div>
            <div class="mission-list">
	              ${Object.entries(categories).map(function (entry) {
	                return `<div class="device-category"><span class="device-category-main"><span class="device-category-icon">${deviceCategoryIcon(entry[0])}</span>${escapeHtml(entry[0])}</span><strong>${escapeHtml(String(entry[1]))}</strong></div>`;
	              }).join("") || '<div class="subtext">No device categories synced yet.</div>'}
            </div>
          </aside>
          <section class="command-card">
            <div class="command-card-head">
              <h4>Device Registry (${escapeHtml(String(totalDevices))})</h4>
              <div class="toolbar">
                <input class="search-input" type="search" placeholder="Search devices..." style="max-width:220px;padding:9px 11px;border-radius:10px;" />
                <button class="ghost compact" data-office-target="intelligence" type="button">Ask Oyi</button>
              </div>
            </div>
            <table class="command-table">
              <thead><tr><th>Device</th><th>Category</th><th>Location</th><th>Status</th><th>Battery</th><th>Last Seen</th><th>Actions</th></tr></thead>
              <tbody>${deviceRows}</tbody>
            </table>
          </section>
          <aside class="command-side">
            <article class="command-card">
              <div class="command-card-head"><h4>Runtime Health</h4></div>
              <div class="health-score"><strong>${escapeHtml(String(healthPct))}%</strong><span class="subtext">Device health</span></div>
              <div class="mission-list">
                <div class="device-category"><span>Online</span><strong>${escapeHtml(String(onlineDevices))}</strong></div>
                <div class="device-category"><span>Offline/Fault</span><strong>${escapeHtml(String(offlineDevices))}</strong></div>
                <div class="device-category"><span>Security Hardware</span><strong>${escapeHtml(String(security || 0))}</strong></div>
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Camera / Stream Health</h4><span class="office-system-badge">${cameraDevices.length ? "Observed" : "Pending"}</span></div>
              <div class="device-camera-preview">${escapeHtml(cameraDevices.length ? `${streamHealthy}/${cameraDevices.length} streams healthy` : "No camera stream records")}</div>
              <div class="subtext" style="margin-top:10px;">Office shows stream posture only. Stream protocol and relay control remain in the Edge runtime.</div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Telemetry / Outbox</h4></div>
              <div class="mission-list">
                ${edgeAgentSignals.slice(0, 5).map(function (trace) {
	                  return `<div class="command-list-row device-alert-row"><strong>${escapeHtml(displayValue(trace.agent || trace.type, "Edge event"))}</strong><div class="subtext">${escapeHtml(displayValue(trace.status || trace.tool_name || trace.summary, "telemetry"))} · ${escapeHtml(displayValue(formatDate(trace.created_at || trace.ts), "time pending"))}</div></div>`;
                }).join("") || normalizedDevices.filter(function (device) {
                  return String(device.status || "").toLowerCase() !== "online" || Number((device.battery_level ?? device.battery) || 100) < 30 || device.last_seen_at;
                }).slice(0, 5).map(function (device) {
                  return `<div class="command-list-row device-alert-row"><strong>${escapeHtml(device.name || "Device alert")}</strong><div class="subtext">${escapeHtml(device.status || "attention required")} · ${escapeHtml(displayValue(formatDate(device.last_seen_at || device.updated_at), "history pending"))}</div></div>`;
                }).join("") || '<div class="subtext">No edge telemetry has synced yet.</div>'}
              </div>
            </article>
          </aside>
        </div>
      </div>
    `;
    bindOfficeAssetActions(el.devicePanel);
  }

  function officeIcon(name) {
    const icons = {
      lead:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
      camera:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h11v10H4z"/><path d="m15 10 5-3v10l-5-3z"/></svg>',
      support:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19a7 7 0 1 0-7-7"/><path d="M5 19v-4h4"/><path d="m5 15 3 3"/></svg>',
      estate:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/></svg>',
      wallet:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16v12H4z"/><path d="M16 12h4"/><path d="M7 7V5h10v2"/></svg>',
	      alert:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 10 18H2z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
	      trend:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m8 15 3-4 3 2 5-7"/></svg>',
	      website:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg>',
	      whatsapp:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19l1.2-3.4A7.5 7.5 0 1 1 9 18.2L5 19z"/><path d="M9.5 8.7c.3 2.7 2 4.7 4.8 5.7l1.2-1.1"/></svg>',
	      instagram:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><path d="M16.8 7.2h.01"/></svg>',
	      facebook:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 8h2V4h-2c-3 0-5 2-5 5v2H7v4h2v5h4v-5h3l1-4h-4V9c0-.6.4-1 1-1z"/></svg>',
	      messenger:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12a8 8 0 1 1 4.2 7L4 20l1.1-3.5A7.9 7.9 0 0 1 4 12z"/><path d="m8 13 3-3 2 2 3-3"/></svg>',
	      linkedin:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 10v9"/><path d="M6 6.5v.01"/><path d="M11 19v-5.3c0-2.2 1.3-3.7 3.3-3.7S18 11.4 18 14v5"/><path d="M11 10v9"/></svg>',
	      tiktok:
	        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 4v10.5a4.5 4.5 0 1 1-4.5-4.5"/><path d="M14 4c.8 3 2.7 4.8 5.5 5.2"/></svg>',
      google:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 19 7-14 5 10"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="15" r="2"/><path d="M10 11h8"/></svg>',
      settings:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.56V20h-4v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2-2 .06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3v-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2-2 .06.06A1.7 1.7 0 0 0 8.2 5.4a1.7 1.7 0 0 0 1-1.56V4h4v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2 2-.06.06A1.7 1.7 0 0 0 19.4 9c.5.2 1 .8 1.56 1H21v4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>',
      activity:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h4l2-6 4 12 2-6h4"/></svg>',
      ai_operations:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"/></svg>',
	    };
	    return icons[name] || icons.alert;
	  }

	  function platformIconClass(name) {
	    const key = String(name || "").toLowerCase();
	    if (key.includes("whatsapp")) return "platform-whatsapp";
	    if (key.includes("instagram")) return "platform-instagram";
	    if (key.includes("messenger")) return "platform-messenger";
	    if (key.includes("facebook")) return "platform-facebook";
	    if (key.includes("linkedin")) return "platform-linkedin";
	    if (key.includes("tiktok")) return "platform-tiktok";
	    if (key.includes("google")) return "platform-google";
	    if (key.includes("web") || key.includes("website")) return "platform-website";
	    return "";
	  }

  function integrationConnected(key, fallback) {
    const integrations = state.integrations || {};
    const item = integrations[key];
    if (!item) return Boolean(fallback);
    return Boolean(item.configured);
  }

  function integrationSubReady(key, field) {
    const integrations = state.integrations || {};
    return Boolean(integrations[key] && integrations[key][field]);
  }

  function crmIntegrationStatusRows() {
    const integrations = state.integrations || {};
    const callbackSecured = Boolean(integrations.crm_support?.provider_callbacks === "secured" || integrations.webhooks?.production_ready);
    return [
      {
        name: "Website Lead Intake",
        icon: "website",
        connected: true,
        detail: "Public widget intake live",
      },
      {
        name: "App Onboarding Leads",
        icon: "website",
        connected: Boolean(integrations.consumer?.production_ready || integrations.consumer?.configured),
        detail: integrations.consumer?.production_ready ? "Consumer sync production ready" : "Needs Consumer sync validation",
      },
      {
        name: "Support Tickets",
        icon: "messenger",
        connected: Boolean(integrations.facility?.production_ready || integrations.consumer?.production_ready),
        detail: integrations.facility?.production_ready || integrations.consumer?.production_ready ? "Office support sync active" : "Needs Facility/Consumer ticket payloads",
      },
      {
        name: "Deployment Inquiries",
        icon: "linkedin",
        connected: true,
        detail: "CRM pipeline intake live",
      },
      {
        name: "Provider Callbacks",
        icon: "settings",
        connected: callbackSecured,
        detail: callbackSecured ? "Webhook secret configured" : "Needs OFFICE_EVENT_WEBHOOK_SECRET",
      },
      {
        name: "WhatsApp Business",
        icon: "whatsapp",
        connected: integrationConnected("whatsapp"),
        detail: integrationConnected("whatsapp") ? "Webhook + Cloud API ready" : "Missing WhatsApp env",
      },
      {
        name: "Instagram",
        icon: "instagram",
        connected: integrationSubReady("meta", "instagram_ready"),
        detail: integrationSubReady("meta", "instagram_ready") ? "Business account + token ready" : "Needs IG ID + access token",
      },
      {
        name: "Facebook Messenger",
        icon: "messenger",
        connected: integrationSubReady("meta", "facebook_page_ready"),
        detail: integrationSubReady("meta", "facebook_page_ready") ? "Page + token ready" : "Needs Page ID + page token",
      },
      {
        name: "LinkedIn",
        icon: "linkedin",
        connected: integrationConnected("linkedin") && integrationSubReady("linkedin", "api_token_ready"),
        detail: integrationSubReady("linkedin", "api_token_ready") ? "OAuth app + access token ready" : "App configured; needs OAuth token",
      },
      {
        name: "TikTok",
        icon: "tiktok",
        connected: false,
        detail: "Adapter pending",
      },
      {
        name: "Google Ads",
        icon: "google",
        connected: integrationSubReady("google_marketing", "ads_ready"),
        detail: integrationSubReady("google_marketing", "ads_ready") ? "Ads credentials ready" : "Needs Ads token/customer ID",
      },
      {
        name: "Website Chat",
        icon: "website",
        connected: true,
        detail: "Widget intake live",
      },
      {
        name: "App Store",
        icon: "website",
        connected: Boolean(integrations.app_store?.app_listed),
        detail: integrations.app_store?.app_listed ? "Oyi Home app URL configured" : "App analytics pending",
      },
      {
        name: "Play Store",
        icon: "google",
        connected: false,
        detail: "Play Console pending",
      },
    ];
  }

  function renderIntegrationHub() {
    if (!el.settingsIntegrationHub) return;
    const integrations = state.integrations || {};
    const rows = [
      integrations.maps || { name: "Estate Map Provider", configured: Boolean(state.mapConfig?.google_maps?.configured) },
      integrations.google_oauth || { name: "Google OAuth", configured: false },
      integrations.google_marketing || { name: "Google Analytics / Ads", configured: false },
      integrations.whatsapp || { name: "WhatsApp Cloud", configured: false },
      integrations.meta || { name: "Meta App", configured: false },
      integrations.linkedin || { name: "LinkedIn Marketing / Analytics", configured: false },
      integrations.email || { name: "Office Email", configured: false },
      integrations.facility || { name: "Oyi Facility API", configured: false },
      integrations.consumer || { name: "Consumer Smart Building API", configured: false },
    ];
    el.settingsIntegrationHub.innerHTML = rows
      .map(function (item) {
        const missing = Array.isArray(item.missing) && item.missing.length
          ? `Missing ${item.missing.length}`
          : item.configured
            ? "Connected"
            : "Needs env";
        return `<span class="office-batch ${item.configured ? "" : "warning"}">${escapeHtml(item.name || item.key || "Integration")} <strong>${escapeHtml(missing)}</strong></span>`;
      })
      .join("");
  }

  function renderPlatformInfrastructureDashboard() {
    if (!el.platformInfrastructurePanel) return;
    const integrations = state.integrations || {};
    const readiness = integrations.__readiness || null;
    const fallbackIntegration = function (name) {
      return { name, configured: false, production_ready: false, missing: [] };
    };
    const readinessGroups = [
      { title: "Core Control Plane", rows: [integrations.edge || fallbackIntegration("Backend Control Plane"), integrations.events || fallbackIntegration("Office SSE Events")] },
      { title: "Facility Sync", rows: [integrations.facility || fallbackIntegration("Oyi Facility API")] },
      { title: "Consumer Sync", rows: [integrations.consumer || fallbackIntegration("Oyi Consumer API")] },
      { title: "Digital Twin Binding", rows: [integrations.digital_twin || fallbackIntegration("Oyi Digital Twin Binding")] },
      { title: "Webhook Security", rows: [integrations.webhooks || fallbackIntegration("Provider Webhook Intake")] },
      { title: "Mobile App Metrics", rows: [integrations.app_store || fallbackIntegration("Oyi Home App Store")] },
      { title: "Meta / WhatsApp", rows: [integrations.whatsapp || fallbackIntegration("WhatsApp Cloud"), integrations.meta || fallbackIntegration("Meta App")] },
      { title: "LinkedIn", rows: [integrations.linkedin || fallbackIntegration("LinkedIn Marketing / Analytics")] },
      { title: "Google", rows: [integrations.maps || { name: "Estate Map Provider", configured: Boolean(state.mapConfig?.google_maps?.configured), production_ready: Boolean(state.mapConfig?.google_maps?.configured), missing: [] }, integrations.google_oauth || fallbackIntegration("Google OAuth"), integrations.google_marketing || fallbackIntegration("Google Analytics / Ads")] },
      { title: "Email", rows: [integrations.email || fallbackIntegration("Office Email")] },
      { title: "CRM & Support", rows: [integrations.crm_support || fallbackIntegration("CRM & Support Integration Visibility")] },
    ];
    const rows = readinessGroups.flatMap(function (group) { return group.rows; });
    const connected = rows.filter(function (row) { return row.production_ready || row.configured; }).length;
    const productionReady = rows.filter(function (row) { return row.production_ready; }).length;
    const missing = rows.reduce(function (sum, row) {
      return sum + (Array.isArray(row.missing) ? row.missing.length : row.configured ? 0 : 1);
    }, 0);
    const activeFacet = state.moduleFacet.settings || "dashboard";
    const eventEntries = rankEntries(getDerivedData().auditActionCounts || {}, 6);
    const providerEntries = rows.map(function (row) {
      return { label: row.name || row.key || "Provider", value: row.production_ready ? 1 : 0 };
    });
    const blockerRows = readiness && Array.isArray(readiness.blockers)
      ? readiness.blockers.slice(0, 6)
      : rows.filter(function (row) { return !row.production_ready; }).slice(0, 6);
    const integrationStatusText = function (row) {
      const status = String(row.status || "");
      if (row.production_ready || status === "production_ready" || status === "connected") return "Production Ready";
      if (status === "configured_payload_incomplete") return "Configured / Payload incomplete";
      if (status === "error") return "Error";
      if (status === "listed_pending_metrics_credentials") return "Listed / Pending metrics";
      if (status === "credentials_ready_missing_app_url") return "Credentials ready / Missing app URL";
      if (row.configured) return "Configured / Needs validation";
      if (Array.isArray(row.missing) && row.missing.length) return `Missing ${row.missing.length}`;
      return "Pending Integration";
    };
    const integrationStatusColor = function (row) {
      const status = String(row.status || "");
      if (row.production_ready || status === "production_ready" || status === "connected") return "var(--green)";
      if (status === "error") return "#ff5f7a";
      return "#ffc247";
    };

    el.platformInfrastructurePanel.innerHTML = `
      <div class="command-page platform-workspace">
        <div class="command-head">
          <div>
            <p class="eyebrow">Platform Infrastructure</p>
            <h3>Realtime events, storage, API health, webhooks, sync, provider status, and environment health.</h3>
            <p class="subtext" style="margin:8px 0 0;">System-level health for the Office operating layer. Identity and permissions now live under Administration.</p>
          </div>
          <span class="office-system-badge ${missing ? "warning" : ""}">${missing ? `${missing} checks pending` : "Operational"}</span>
        </div>
        <div class="command-kpis settings-kpis">
          ${[
            ["Realtime", state.channelOverview?.channels?.length || 0, "Office event channels", "activity"],
            ["Storage", state.officeStats?.office_files || state.officeStats?.documents || 0, "Office file metadata", "website"],
            ["Production checks", `${productionReady}/${rows.length}`, `${readiness?.readiness_pct || 0}% provider readiness`, "settings"],
            ["Webhooks", integrations.webhooks?.production_ready ? "Ready" : "Pending", "Inbound callback security", "trend"],
          ].map(function (item) {
            return `<div class="command-kpi"><span class="command-icon">${officeIcon(item[3])}</span><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong><div class="subtext">${escapeHtml(item[2])}</div></div>`;
          }).join("")}
        </div>
        <div class="command-layout">
          <div class="command-main">
            <div class="settings-card-grid platform-grid">
              <article class="command-card">
                <div class="command-card-head"><h4>${activeFacet === "dashboard" ? "Provider Status" : activeFacet.replace(/_/g, " ")}</h4><span class="subtext">${connected}/${rows.length} connected</span></div>
                <div class="mission-list">
                  ${readinessGroups.map(function (group) {
                    return `<div class="platform-readiness-group"><div class="subtext" style="margin:8px 0 6px;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(group.title)}</div>${group.rows.map(function (row) {
                      return `<div class="device-category"><span>${escapeHtml(row.name || row.key || "Provider")}</span><strong style="color:${integrationStatusColor(row)}">${escapeHtml(integrationStatusText(row))}</strong></div>`;
                    }).join("")}</div>`;
                  }).join("")}
                </div>
              </article>
              <article class="command-card">
                <div class="command-card-head"><h4>Event Stream</h4><span class="subtext">Audit-backed events</span></div>
                <div class="intel-bar-list">${barRows(eventEntries, "No event stream data synced yet.")}</div>
              </article>
              <article class="command-card">
                <div class="command-card-head"><h4>Infrastructure Readiness</h4><span class="subtext">${readiness?.readiness_pct || 0}% checks ready</span></div>
                <div class="intel-bar-list">${barRows(providerEntries, "No providers configured yet.")}</div>
              </article>
              <article class="command-card">
                <div class="command-card-head"><h4>100% Readiness Blockers</h4><span class="subtext">Credentials + payloads</span></div>
                <div class="mission-list">
                  ${blockerRows.length ? blockerRows.map(function (row) {
                    const missingList = Array.isArray(row.missing) && row.missing.length
                      ? row.missing.slice(0, 3).join(", ")
                      : Array.isArray(row.required_metrics) && row.required_metrics.length
                        ? row.required_metrics.slice(0, 3).join(", ")
                        : "Pending live validation";
                    return `<div class="activity-item"><span class="activity-icon warning">${officeIcon("alert")}</span><div><strong>${escapeHtml(row.name || row.key || "Integration")}</strong><small>${escapeHtml(missingList)}</small></div></div>`;
                  }).join("") : '<div class="empty-state">No readiness blockers reported.</div>'}
                </div>
              </article>
            </div>
          </div>
          <aside class="command-side context-rail">
            <article class="command-card">
              <div class="command-card-head"><h4>System Sync</h4></div>
              <div class="mission-list">
                <div class="device-category"><span>Office SSE</span><strong>${state.officeEventSource ? "Active" : "Standby"}</strong></div>
                <div class="device-category"><span>Facility API</span><strong>${integrations.facility?.production_ready ? "Ready" : "Pending"}</strong></div>
                <div class="device-category"><span>Consumer API</span><strong>${integrations.consumer?.production_ready ? "Ready" : "Pending"}</strong></div>
                <div class="device-category"><span>Map Provider</span><strong>${state.mapConfig?.google_maps?.configured ? "Google" : "Static"}</strong></div>
                <div class="device-category"><span>Digital Twin Binding</span><strong>${integrations.digital_twin?.production_ready ? "Ready" : "Pending"}</strong></div>
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Operational Boundary</h4></div>
              <div class="subtext">Platform Infrastructure is now restricted to runtime health, provider status, storage, realtime, sync, and webhooks. Staff, identity, permissions, accounts, and super-admin controls live in Administration.</div>
            </article>
          </aside>
        </div>
      </div>
    `;
  }

  function renderOverview() {
    const overview = buildOverviewDomains();
    const totals = overview.totals || {};
    const domains = overview.domains || {};
    renderOfficeCommandPanels(domains);
    const officeTotals = state.officeData && state.officeData.totals ? state.officeData.totals : {};
    const safeDomains = {
      facility: domains.facility || { primaryMetric: 0 },
      smart_buildings: domains.smart_buildings || { primaryMetric: 0, metrics: [] },
      support: domains.support || { primaryMetric: 0 },
    };
    const walletFloat = officeTotals.wallet_balance_total || 0;
    const collections = officeCollections();
    const estates = asList(collections.estates);
    const buildings = asList(collections.buildings);
    const homes = asList(collections.homes);
    const devices = asList(collections.devices);
    const wallets = asList(collections.wallets);
    const supportMappings = asList(collections.support_mappings);
    const countSnapshot = officeCountSnapshot({
      estates: safeDomains.facility.primaryMetric || estates.length,
      buildings: safeDomains.smart_buildings.primaryMetric || buildings.length,
      homes: homes.length,
      devices: safeDomains.smart_buildings.metrics?.[1]?.value || devices.length,
      wallets: wallets.length,
    });
    const connectedEstates = countSnapshot.estates;
    const connectedBuildings = countSnapshot.buildings;
    const connectedHomes = countSnapshot.homes;
    const connectedDevices = countSnapshot.devices;
    const openSupport = safeCount(overview.openNotifications, safeDomains.support.primaryMetric);
    const revenueValue =
      Number(officeTotals.revenue_today || officeTotals.revenue || 0) ||
      Number(state.report ? state.report.pipeline_value || state.report.revenue_today || 0 : 0);
    const warningCount = Number(officeTotals.warning_assets || openSupport || 0);
    const criticalCount = Number(officeTotals.critical_assets || overview.openEscalations || 0);
    const offlineCount = Number(officeTotals.offline_assets || 0);
    const healthyCount = Math.max(0, connectedEstates + connectedBuildings - warningCount - criticalCount - offlineCount);
    const totalHealthAssets = Math.max(1, healthyCount + warningCount + criticalCount + offlineCount);
    const healthPct = Math.max(0, Math.round((healthyCount / totalHealthAssets) * 100));

    if (el.mothershipEstatesMetric) {
      el.mothershipEstatesMetric.textContent = String(connectedEstates);
    }
    if (el.mothershipBuildingsMetric) {
      el.mothershipBuildingsMetric.textContent = connectedHomes
        ? `${connectedBuildings}/${connectedHomes}`
        : String(connectedBuildings);
    }
    if (el.mothershipDevicesMetric) {
      el.mothershipDevicesMetric.textContent = String(connectedDevices);
    }
    if (el.mothershipWalletMetric) {
      el.mothershipWalletMetric.textContent = formatCompactMoney(walletFloat);
    }
    if (el.mothershipSupportMetric) {
      el.mothershipSupportMetric.textContent = String(openSupport);
    }
    if (el.mothershipRevenueMetric) {
      el.mothershipRevenueMetric.textContent = formatCompactMoney(revenueValue);
    }
    const activeFacilities = estates.filter(function (estate) {
      return ["active", "live"].includes(String(estate.status || estate.subscription_status || "").toLowerCase());
    }).length;
    const visitorActivity = state.notifications.filter(function (note) {
      return /visitor|access|gate/i.test(`${note.type || ""} ${note.title || ""} ${note.summary || ""}`);
    }).length;
    const maintenanceWorkload = state.notifications.filter(function (note) {
      return /maintenance|service|repair|workload|ticket/i.test(`${note.type || ""} ${note.title || ""} ${note.summary || ""}`);
    }).length;
    if (el.overviewOperationalStrip) {
      el.overviewOperationalStrip.innerHTML = operationalStrip([
        { label: "Facilities", value: connectedEstates, meta: `${activeFacilities} active` },
        { label: "Consumers", value: homes.length || connectedHomes || connectedBuildings, meta: "Homes/residents in view" },
        { label: "Homes/Buildings", value: connectedHomes ? `${connectedBuildings}/${connectedHomes}` : connectedBuildings, meta: "Structure coverage" },
        { label: "Devices", value: connectedDevices || devices.length, meta: "Active device inventory" },
        { label: "Visitor Access", value: visitorActivity, meta: "Access signals" },
        { label: "Maintenance", value: maintenanceWorkload || openSupport, meta: "Service workload" },
        { label: "Wallets", value: formatCompactMoney(walletFloat), meta: "Finance posture" },
        { label: "Deployments", value: state.allDemos.length || totals.demos || 0, meta: "Rollout activity" },
        { label: "Open Leads", value: totals.leads || state.leads.length || 0, meta: "Commercial pressure" },
        { label: "Agents", value: state.traces.length || state.officeStats?.traces || 0, meta: "Runtime activity" },
        { label: "Edge Health", value: `${healthPct}%`, meta: `${offlineCount} offline` },
      ]);
    }
    if (el.officeMobileProjectsMetric) {
      el.officeMobileProjectsMetric.textContent = String(connectedEstates || estates.length || 0);
    }
    if (el.officeMobileClientsMetric) {
      el.officeMobileClientsMetric.textContent = String(connectedBuildings || homes.length || 0);
    }
    if (el.officeMobileTasksMetric) {
      el.officeMobileTasksMetric.textContent = String(totals.leads || state.leads.length || 0);
    }
    if (el.officeMobileDeploymentsMetric) {
      el.officeMobileDeploymentsMetric.textContent = String(state.allDemos.length || totals.demos || 0);
    }
    if (el.officeMobileFinanceMetric) {
      el.officeMobileFinanceMetric.textContent = String(healthyCount ? `${healthPct}%` : offlineCount || 0);
    }
    const integrations = state.integrations || {};
    const apiChecks = [
      integrations.facility,
      integrations.consumer,
      integrations.office,
      integrations.digital_twin,
    ].filter(Boolean);
    const readyApiChecks = apiChecks.filter(function (item) {
      return Boolean(item.production_ready || item.connected || item.ready);
    }).length;
    const syncMetric =
      Number(state.officeStats?.webhooks || 0) ||
      Number(state.channelOverview?.channels?.length || 0) ||
      Number(domains.platform_infrastructure?.primaryMetric || 0);
    const checksPending = Math.max(
      0,
      Number(warningCount || 0) +
        Number(criticalCount || 0) +
        Number(offlineCount || 0) +
        Number(overview.openEscalations || 0)
    );
    if (el.officeMobileRealtimeMetric) {
      el.officeMobileRealtimeMetric.textContent = state.officeEventSource
        ? "Live"
        : String(domains.platform_infrastructure?.metrics?.[0]?.value || state.channelOverview?.channels?.length || 0);
    }
    if (el.officeMobileStorageMetric) {
      el.officeMobileStorageMetric.textContent = String(state.allDemos.length || totals.demos || 0);
    }
    if (el.officeMobileApiMetric) {
      el.officeMobileApiMetric.textContent = apiChecks.length ? `${readyApiChecks}/${apiChecks.length}` : "0/0";
    }
    if (el.officeMobileSyncMetric) {
      el.officeMobileSyncMetric.textContent = String(totals.leads || state.leads.length || 0);
    }
    if (el.officeMobileChecksMetric) {
      el.officeMobileChecksMetric.textContent = String(state.traces.length || state.officeStats?.traces || 0);
    }
    if (el.officeWelcomeTitle) {
      const accountName =
        state.session?.display_name ||
        state.session?.admin?.display_name ||
        state.session?.admin?.email ||
        state.adminEmail ||
        "John";
      const firstName = String(accountName)
        .split(/[ @]/)[0] || "John";
      el.officeWelcomeTitle.textContent = `Welcome back, ${firstName}`;
    }
    if (el.officeHealthMetric) {
      el.officeHealthMetric.textContent = `${healthPct}%`;
    }
    if (el.officeHealthLegend) {
      el.officeHealthLegend.innerHTML = `
        <span><i class="healthy"></i>Healthy <strong>${escapeHtml(String(healthyCount))}</strong></span>
        <span><i class="warning"></i>Warning <strong>${escapeHtml(String(warningCount))}</strong></span>
        <span><i class="critical"></i>Critical <strong>${escapeHtml(String(criticalCount))}</strong></span>
        <span><i class="offline"></i>Offline <strong>${escapeHtml(String(offlineCount))}</strong></span>
      `;
    }
    const cityCounts = estates.reduce(function (acc, estate) {
      const location = String(estate.location || "Other Cities").split(",")[0].trim() || "Other Cities";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
    const cityEntries = Object.entries(cityCounts).sort(function (a, b) {
      return b[1] - a[1];
    });
    if (el.estateDistributionTotal) {
      el.estateDistributionTotal.textContent = String(connectedEstates || estates.length || 0);
    }
    if (el.officeMapLabels) {
      const positions = [
        ["17%", "26%"],
        ["62%", "24%"],
        ["43%", "52%"],
        ["72%", "61%"],
        ["20%", "72%"],
      ];
	      const mapEstates = estates.slice(0, 5);
	      el.officeMapLabels.innerHTML = mapEstates
        .map(function (estate, index) {
          const status = String(estate.health_status || estate.status || estate.subscription_status || "healthy").toLowerCase();
          const tone = status.includes("critical") || status.includes("suspend")
            ? "critical"
            : status.includes("warn") || status.includes("pending")
              ? "warning"
              : "healthy";
          const pos = positions[index % positions.length];
          const lat = estate.lat || estate.latitude || "";
          const lng = estate.lng || estate.longitude || "";
          return `<button class="city-label ${tone}" data-office-target="facilities" data-estate-id="${escapeHtml(estate.id || "")}" data-lat="${escapeHtml(String(lat))}" data-lng="${escapeHtml(String(lng))}" type="button" style="--x:${pos[0]};--y:${pos[1]};">${escapeHtml(estate.name || `Estate ${index + 1}`)}<small>${escapeHtml(tone)}</small></button>`;
        })
	        .join("") || '<div class="subtext" style="position:absolute;left:16px;top:16px;">Estate map labels will appear when facility sync publishes estates.</div>';
      Array.from(el.officeMapLabels.querySelectorAll("[data-office-target]")).forEach(function (node) {
        node.addEventListener("click", function () {
          state.selectedOfficeEstateId = node.getAttribute("data-estate-id") || state.selectedOfficeEstateId || "";
          setOfficeWorkspace("facilities", "facilities");
        });
      });
    }
    renderOverviewGoogleMap(estates);
    renderLiveInfrastructureView(estates);
    if (el.supportOverviewGraph) {
      const points = [openSupport, warningCount, criticalCount, state.notifications.length, supportMappings.length, devices.filter(function (device) { return String(device.status || "").toLowerCase() === "offline"; }).length, openSupport + criticalCount];
      const maxPoint = Math.max(1, ...points);
      const coords = points.map(function (point, index) {
        const x = Math.round((index / Math.max(1, points.length - 1)) * 420);
        const y = Math.round(100 - (point / maxPoint) * 70);
        return [x, y];
      });
      const line = coords.map(function (point, index) {
        return `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`;
      }).join(" ");
      const area = `${line} L420,120 L0,120 Z`;
      el.supportOverviewGraph.innerHTML = `
        <defs>
          <linearGradient id="supportGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#ff416d" stop-opacity="0.38" />
            <stop offset="100%" stop-color="#ff416d" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#supportGlow)"></path>
        <path d="${line}" fill="none" stroke="#ff416d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      `;
    }
    if (el.estateDistributionList) {
      const totalCities = Math.max(1, cityEntries.reduce(function (sum, entry) { return sum + entry[1]; }, 0));
	      el.estateDistributionList.innerHTML = cityEntries.length
	        ? cityEntries
	            .slice(0, 4)
	            .map(function (entry, index) {
	              const colors = ["#7c4dff", "#36a3ff", "#28e68d", "#ff9f43"];
	              const pct = Math.round((entry[1] / totalCities) * 100);
	              return `<div class="mission-list-row"><i class="mission-dot" style="background:${colors[index % colors.length]}"></i><strong>${escapeHtml(entry[0])}</strong><span>${escapeHtml(String(entry[1]))} (${pct}%)</span></div>`;
	            })
	            .join("")
	        : '<div class="subtext">No estate location distribution has synced yet.</div>';
    }
    if (el.supportOverviewTiles) {
      const openTickets = openSupport;
      const inProgress = supportMappings.filter(function (item) {
        return ["open", "in_progress", "pending"].includes(String(item.status || "").toLowerCase());
      }).length;
      const resolved = supportMappings.filter(function (item) {
        return ["resolved", "closed"].includes(String(item.status || "").toLowerCase());
      }).length;
      const escalated = overview.openEscalations || totals.escalations || 0;
	      el.supportOverviewTiles.innerHTML = [
	        ["Open Tickets", openTickets, "Live support sync"],
	        ["In Progress", inProgress, "Active support queue"],
	        ["Resolved", resolved, "Closed support cases"],
	        ["Escalated", escalated, "Requires office action"],
      ]
        .map(function (item) {
          return `<div class="support-mini"><span class="subtext">${escapeHtml(item[0])}</span><strong>${escapeHtml(String(item[1]))}</strong><span class="subtext">${escapeHtml(item[2])}</span></div>`;
        })
        .join("");
    }
    if (el.overviewTaskList) {
      const proposalTasks = state.allProposals.slice(0, 2).map(function (proposal) {
        return [`Review ${proposal.status || "proposal"} proposal`, proposal.owner || "Commercial", "High"];
      });
      const demoTasks = state.allDemos.slice(0, 2).map(function (demo) {
        return [`Building review${demo.lead_name ? ` with ${demo.lead_name}` : ""}`, demo.owner || "Oma", "Medium"];
      });
      const notificationTasks = state.notifications.slice(0, 2).map(function (note) {
        return [note.title || "Review support escalation", note.owner || "Support Team", note.priority || "Medium"];
      });
      const tasks = proposalTasks.concat(demoTasks, notificationTasks).slice(0, 4);
	      el.overviewTaskList.innerHTML = tasks.length
	        ? tasks
	            .map(function (task) {
	              const level = task[2].toLowerCase();
	              return `<div class="task-row"><div><strong>${escapeHtml(task[0])}</strong><span>Assigned to ${escapeHtml(task[1])}</span></div><span class="priority-tag ${escapeHtml(level)}">${escapeHtml(task[2])}</span></div>`;
	            })
	            .join("")
	        : '<div class="subtext">No live office tasks have synced yet.</div>';
    }
    if (el.overviewActivityFeed) {
      const recentNotifications = state.notifications.slice(0, 5);
	      el.overviewActivityFeed.innerHTML = recentNotifications.length
	        ? recentNotifications.map(function (note) {
	            return [
	              note.title || note.type || "Office activity",
	              note.message || note.summary || "New system activity captured.",
	              formatDate(note.created_at || note.ts),
	            ];
	          })
	            .slice(0, 5)
	            .map(function (item, index) {
	              const tones = ["info", "warning", "healthy", "critical", "healthy"];
	              const tone = tones[index % tones.length];
	              return `<div class="activity-row"><span class="activity-track"><i class="activity-dot ${tone === "healthy" ? "" : tone}"></i></span><div class="activity-copy"><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[1])} · ${escapeHtml(item[2])}</span></div></div>`;
	            })
	            .join("")
	        : '<div class="subtext">No real-time office activity has synced yet.</div>';
    }
    if (el.overviewAiInsights) {
	      const insights = [];
	      if (criticalCount) insights.push([`${criticalCount} estate systems need critical review`, "Review Now"]);
	      if (offlineCount) insights.push([`${offlineCount} assets are currently offline`, "Open Device Health"]);
	      if (openSupport) insights.push([`${openSupport} support cases are open across the ecosystem`, "View Details"]);
	      if (totals.sales_handoff_conversion_pct) insights.push([`CRM conversion is ${totals.sales_handoff_conversion_pct}% from live lead data`, "See Analytics"]);
	      if (walletFloat) insights.push([`Wallet float currently holds ${formatCompactMoney(walletFloat)}`, "View Wallets"]);
	      el.overviewAiInsights.innerHTML = insights
	        .map(function (item, index) {
	          const icons = ["alert", "support", "trend", "wallet"];
	          return `<div class="insight-row"><span class="insight-icon">${officeIcon(icons[index % icons.length])}</span><div><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[1])}</span></div></div>`;
	        })
	        .join("") || '<div class="subtext">AI insights will appear when Office has enough live signal.</div>';
    }
    if (el.overviewRecordsMetric) {
      el.overviewRecordsMetric.textContent = String(totals.leads || 0);
    }
    if (el.overviewDemosMetric) {
      el.overviewDemosMetric.textContent = String(state.report ? state.report.demos_booked || 0 : 0);
    }
    if (el.overviewEscalationsMetric) {
      el.overviewEscalationsMetric.textContent = String(overview.openEscalations || totals.escalations || 0);
    }
    if (el.overviewConversionMetric) {
      el.overviewConversionMetric.textContent = `${totals.sales_handoff_conversion_pct || 0}%`;
    }
    if (!el.overviewDomainGrid) {
      return;
    }

    const overviewCards = [
      ["facilities", domains.facility],
      ["consumers", domains.smart_buildings],
      ["crm", domains.crm_agents],
      ["documents", domains.web_presence],
      ["reports", domains.infrastructure_intelligence],
      ["agents", domains.ai_operations],
      ["team", domains.administration],
      ["settings", domains.platform_infrastructure],
      ["digital_twin", domains.governance],
    ];

    el.overviewDomainGrid.innerHTML = overviewCards
      .filter(function (entry) {
        return Boolean(entry[1]);
      })
      .map(function (entry) {
        const key = entry[0];
        const domain = entry[1];
        const cardTarget = key === "summary" ? "overview" : key;
        const cardFocus = key;
        return `
          <article class="office-system-card" data-overview-domain="${escapeHtml(cardTarget)}" data-overview-focus="${escapeHtml(cardFocus)}">
            <div class="office-system-top">
              <span class="office-system-icon">${DOMAIN_ICONS[key] || DOMAIN_ICONS.summary}</span>
              <div class="office-system-title">
                <h3 style="margin:0;">${escapeHtml(domain.title)}</h3>
                <span class="office-system-badge ${domain.tone ? escapeHtml(domain.tone) : ""}">${escapeHtml(domain.badge)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(el.overviewDomainGrid.querySelectorAll("[data-overview-domain]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const target = node.getAttribute("data-overview-domain");
        const focus = node.getAttribute("data-overview-focus");
        if (!target || !canAccessTab(target)) return;
        setOfficeWorkspace(target, focus);
      });
    });
  }

  function renderOfficeCommandPanels(domains) {
    const safeDomains = domains || buildOverviewDomains().domains;
    const renderers = [
      [el.facilityPanel, function () { renderEstateFacilitiesWorkspace(safeDomains.facility); }],
      [el.consumersPanel, function () { renderConsumersWorkspace(safeDomains.smart_buildings); }],
      [el.smartBuildingsPanel, function () { renderSmartBuildingsWorkspace(safeDomains.smart_buildings); }],
      [el.projectsPanel, function () { renderProjectsWorkspace(safeDomains.summary); }],
      [el.deploymentsPanel, function () { renderDeploymentsWorkspace(safeDomains.crm_agents); }],
      [el.devicePanel, renderDeviceWorkspace],
      [el.webPresencePanel, function () { renderDocumentsWorkspace(safeDomains.web_presence); }],
      [el.financePanel, function () { renderFinanceWorkspace(safeDomains.web_presence); }],
      [el.supportPanel, function () { renderSupportWorkspace(safeDomains.support); }],
      [el.crmAgentsPanel, function () { renderCrmAgentsPanel(safeDomains.crm_agents); }],
      [el.aiOperationsPanel, function () { renderAgentsSupervisionWorkspace(safeDomains.ai_operations); }],
      [el.digitalTwinPanel, function () { renderDigitalTwinWorkspace(safeDomains.infrastructure_intelligence); }],
    ];
    renderers.forEach(function (entry) {
      try {
        entry[1]();
      } catch (error) {
        console.error("[office-module-render]", error);
        if (entry[0]) {
          entry[0].innerHTML = `<div class="office-detail-empty">This module could not render: ${escapeHtml(error.message || "Unknown rendering error")}</div>`;
        }
      }
    });
    bindOfficeAssetActions(el.facilityPanel);
    bindOfficeAssetActions(el.smartBuildingsPanel);
  }

  function renderConsumersWorkspace(domain) {
    if (!el.consumersPanel || !domain) return;
    const collections = officeCollections();
    const estates = asList(collections.estates);
    const homes = asList(collections.homes);
    const wallets = asList(collections.wallets);
    const devices = asList(collections.devices);
    const supportMappings = asList(collections.support_mappings);
    const activeHomes = homes.filter(function (home) {
      return !/vacant|inactive|disabled/i.test(String(home.status || home.occupancy_status || ""));
    }).length;
    const homeDeviceIds = new Set(homes.map(function (home) { return String(home.id || ""); }));
    const adoptedDevices = devices.filter(function (device) {
      return homeDeviceIds.has(String(device.home_id || device.unit_id || ""));
    }).length;
    const communityActivity = homes.reduce(function (sum, home) {
      return sum + Number(countSignals(home, ["community_posts", "community_count", "community_activity", "community_members"], 0));
    }, 0);
    const serviceRequests = supportMappings.filter(function (item) {
      return /service|maintenance|request|support|complaint/i.test(`${item.type || ""} ${item.title || ""} ${item.summary || ""}`);
    }).length;
    const walletTotal = wallets.reduce(function (sum, wallet) {
      return sum + Number(wallet.balance || 0);
    }, 0);
    const consumers = homes.slice(0, 10).map(function (home, index) {
      const estate = findById(estates, home.estate_id);
      return {
        title: home.name || home.unit_name || home.unit_number || `Home ${index + 1}`,
        meta: displayValue(home.estate_name || (estate ? estate.name : ""), "Estate pending"),
        status: displayValue(home.status || home.occupancy_status || "active", "active"),
      };
    });
    el.consumersPanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Consumers</p>
            <h3>Resident-facing oversight across homes, wallet posture, and support continuity.</h3>
            <p class="subtext" style="margin:8px 0 0;">Transitional Office view backed by facility and smart-building records until consumer-native oversight is expanded.</p>
          </div>
          <button class="ghost" data-office-target="facilities" type="button">Open Facilities</button>
        </div>
        ${operationalStrip([
          { label: "Population", value: homes.length, meta: `${activeHomes} active homes` },
          { label: "Wallets", value: wallets.length, meta: formatCompactMoney(walletTotal) },
          { label: "Device Adoption", value: adoptedDevices, meta: `${devices.length} devices in inventory` },
          { label: "Community", value: communityActivity, meta: "Activity signals" },
          { label: "Service Requests", value: serviceRequests, meta: "Support workload" },
          { label: "Support", value: supportMappings.length, meta: "Open signals" },
          { label: "Consumer App", value: state.officeEventSource ? "Live" : "Pending", meta: "Runtime channel" },
        ])}
        <div class="command-layout">
          <div class="command-main">
            <article class="command-card">
              <div class="command-card-head">
                <h4>Consumer Registry</h4>
                <div class="toolbar">
                  <input class="estate-search" type="search" placeholder="Search homes or residents..." />
                  <span class="office-system-badge">${consumers.length ? "Live Data" : "Pending"}</span>
                </div>
              </div>
              <div class="mission-list">
                ${consumers.length ? consumers.map(function (item) {
                  return `<div class="device-category"><span><strong style="display:block;color:var(--ink);font-weight:600;">${escapeHtml(item.title)}</strong><small class="subtext">${escapeHtml(item.meta)}</small></span><strong>${escapeHtml(item.status)}</strong></div>`;
                }).join("") : '<div class="office-detail-empty">Consumer oversight will populate from home, wallet, and facility-linked resident data.</div>'}
              </div>
            </article>
          </div>
          ${commandActivityRail({
            title: "Consumer Oversight",
            activity: consumers.slice(0, 5).map(function (item) {
              return { title: item.title, meta: `${item.meta} · ${item.status}`, tone: "info" };
            }),
            insights: [
              { title: `${homes.length} homes in current Office inventory`, meta: "Consumer context is currently sourced from existing facility-linked records.", icon: "estate" },
              { title: `${wallets.length} wallet records available`, meta: "Financial posture stays visible without duplicating backend intelligence.", icon: "wallet" },
            ],
            actions: [
              { label: "Open Facilities", icon: "estate", action: "view_reports" },
              { label: "View Wallets", icon: "wallet", action: "view_wallets" },
            ],
          })}
        </div>
      </div>
    `;
  }

  function renderProjectsWorkspace(domain) {
    if (!el.projectsPanel || !domain) return;
    const proposals = asList(state.allProposals);
    const demos = asList(state.allDemos);
    el.projectsPanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Projects</p>
            <h3>Commercial and delivery projects staged from existing Office records.</h3>
            <p class="subtext" style="margin:8px 0 0;">This module groups proposal, review, and rollout work without interrupting current CRM and deployment workflows.</p>
          </div>
          <button class="ghost" data-office-target="deployments" type="button">Open Deployments</button>
        </div>
        <div class="command-kpis">
          ${[
            ["Proposals", proposals.length],
            ["Reviews", demos.length],
            ["Active Leads", state.leads.length],
            ["Office Tasks", state.notifications.length],
          ].map(function (item) {
            return `<div class="command-kpi"><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong><div class="subtext">Existing Office data</div></div>`;
          }).join("")}
        </div>
        <article class="command-card">
          <div class="command-card-head"><h4>Project Pipeline</h4><span class="office-system-badge">${proposals.length || demos.length ? "Live Data" : "Pending"}</span></div>
          <div class="mission-list">
            ${proposals.slice(0, 5).map(function (proposal) {
              return `<div class="device-category"><span><strong style="display:block;color:var(--ink);font-weight:600;">${escapeHtml(displayValue(proposal.title || proposal.company, "Commercial project"))}</strong><small class="subtext">${escapeHtml(displayValue(proposal.owner, "Office"))}</small></span><strong>${escapeHtml(displayValue(proposal.status, "draft"))}</strong></div>`;
            }).join("") || '<div class="office-detail-empty">Projects will populate from proposal, deployment, and delivery workflows already present in Office.</div>'}
          </div>
        </article>
      </div>
    `;
  }

  function renderDeploymentsWorkspace(domain) {
    if (!el.deploymentsPanel || !domain) return;
    const demos = asList(state.allDemos);
    const collections = officeCollections();
    const devices = asList(collections.devices);
    const documents = asList(collections.documents).concat(asList(state.allProposals));
    const edgeReady = devices.filter(function (device) {
      return !/offline|fault|down/i.test(String(device.status || ""));
    }).length;
    const blockers = state.notifications.filter(function (item) {
      return /block|risk|pending|failed|deploy|review|visit/i.test(`${item.type || ""} ${item.title || ""} ${item.summary || ""}`);
    });
    const workspaceProjects = demos.filter(function (item) {
      return /workspace|facility|onboard|deploy/i.test(`${item.title || ""} ${item.notes || ""} ${item.review_type || ""}`);
    }).length;
    el.deploymentsPanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Deployments</p>
            <h3>Deployment reviews, facility workspace provisioning, and rollout readiness.</h3>
            <p class="subtext" style="margin:8px 0 0;">Existing building-review and workspace provisioning flows are preserved and regrouped under Office Deployments.</p>
          </div>
          <button class="ghost" data-office-target="crm" data-office-focus="crm" type="button">Open CRM</button>
        </div>
        ${operationalStrip([
          { label: "Projects", value: demos.length, meta: "Deployment records" },
          { label: "Workspaces", value: workspaceProjects, meta: "Facility rollout" },
          { label: "Onboarding", value: demos.filter(function (item) { return /pending|scheduled|onboard/i.test(String(item.status || "") + String(item.review_type || "")); }).length, meta: "Active status" },
          { label: "Site Readiness", value: blockers.length ? "Review" : "Stable", meta: `${blockers.length} blockers` },
          { label: "Edge Readiness", value: `${edgeReady}/${devices.length}`, meta: "Device health" },
          { label: "Documents", value: documents.length, meta: "Required files" },
          { label: "Timeline", value: demos.length ? formatDate(demos[0].scheduled_at || demos[0].created_at) : "Pending", meta: "Next rollout" },
        ])}
        <article class="command-card">
          <div class="command-card-head">
            <h4>Deployment Registry</h4>
            <div class="toolbar">
              <input class="estate-search" type="search" placeholder="Search deployments..." />
              <button class="ghost compact" data-office-target="documents" type="button">Documents</button>
            </div>
          </div>
          <div class="trace-list">
            ${demos.length ? demos.slice(0, 8).map(function (demo) {
              return `<div class="trace-row"><div><strong>${escapeHtml(displayValue(demo.title || demo.lead_name, "Deployment review"))}</strong><div class="subtext">${escapeHtml(displayValue(demo.review_type || demo.type, "Review"))} · ${escapeHtml(formatDate(demo.scheduled_at || demo.created_at))}</div></div><span class="office-system-badge">${escapeHtml(displayValue(demo.status, "pending"))}</span></div>`;
            }).join("") : '<div class="office-detail-empty">Deployment reviews will appear here as existing Office demo and workspace data syncs.</div>'}
          </div>
        </article>
      </div>
    `;
  }

  function renderFinanceWorkspace(domain) {
    if (!el.financePanel || !domain) return;
    const wallets = asList(officeCollections().wallets);
    const proposals = asList(state.allProposals);
    const docs = documentsFromCollections().concat(proposals.map(function (proposal) {
      return {
        title: proposal.title || proposal.company || "Proposal",
        type: proposal.document_type || "proposal",
        owner: proposal.owner || proposal.company,
        status: proposal.status || proposal.commercial_stage || "draft",
        value: proposal.total_value || proposal.estimated_value || proposal.value || proposal.amount || 0,
        updated_at: proposal.updated_at || proposal.created_at,
        source: "proposals",
      };
    }));
    const walletTotal = wallets.reduce(function (sum, wallet) {
      return sum + Number(wallet.balance || 0);
    }, 0);
    const proposalValue = proposals.reduce(function (sum, proposal) {
      return sum + Number(proposal.total_value || proposal.estimated_value || proposal.value || proposal.amount || 0);
    }, 0);
    const invoiceDocs = docs.filter(function (doc) {
      return /invoice|billing|payment/i.test(`${doc.type || ""} ${doc.title || ""}`);
    });
    const contractDocs = docs.filter(function (doc) {
      return /contract|agreement/i.test(`${doc.type || ""} ${doc.title || ""}`);
    });
    const deploymentFinance = state.allDemos.filter(function (demo) {
      return /deploy|onboard|site|workspace|ready/i.test(`${demo.review_type || ""} ${demo.status || ""} ${demo.title || ""} ${demo.notes || ""}`);
    });
    const outstandingActions = proposals.filter(function (proposal) {
      return !/won|closed|paid|signed|approved/i.test(`${proposal.status || ""} ${proposal.commercial_stage || ""}`);
    });
    const financeRows = docs.slice(0, 10);
    const timelineRows = proposals.slice(0, 4).map(function (proposal) {
      return {
        title: displayValue(proposal.title || proposal.company, "Commercial proposal"),
        meta: `${displayValue(proposal.status || proposal.commercial_stage, "pending")} · ${formatCompactMoney(proposal.total_value || proposal.estimated_value || proposal.value || 0)}`,
        time: formatDate(proposal.updated_at || proposal.created_at),
      };
    }).concat(state.audit.filter(function (event) {
      return /invoice|wallet|proposal|finance|commercial|payment/i.test(String(event.action || "") + " " + String(event.target_type || ""));
    }).slice(0, 4).map(function (event) {
      return {
        title: displayValue(event.action, "Financial activity"),
        meta: displayValue(event.actor_email || event.actor, "Office"),
        time: formatDate(event.created_at || event.ts),
      };
    })).slice(0, 6);
    el.financePanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Finance</p>
            <h3>Supervise commercial value, invoices, wallet posture, deployment readiness, and revenue pipeline.</h3>
            <p class="subtext" style="margin:8px 0 0;">Office visualizes financial posture from existing Office records and mirrored wallet/accounting data. Facility wallet ownership remains backend-owned.</p>
          </div>
          <div class="toolbar">
            <button class="ghost" data-command-action="view_wallets" type="button">Wallet mirrors</button>
            <button class="ghost" data-office-target="intelligence" type="button">Ask Oyi</button>
          </div>
        </div>
        ${operationalStrip([
          { label: "Proposal Value", value: formatCompactMoney(proposalValue || state.report?.pipeline_value || 0), meta: "Commercial pipeline" },
          { label: "Invoices", value: invoiceDocs.length || state.officeStats?.invoices || 0, meta: "Commercial documents" },
          { label: "Wallet Posture", value: formatCompactMoney(walletTotal), meta: `${wallets.length} mirrored wallets` },
          { label: "Deployments", value: deploymentFinance.length, meta: "Financial readiness" },
          { label: "Revenue Pipeline", value: formatCompactMoney(state.report?.pipeline_value || proposalValue || 0), meta: "Report summary" },
          { label: "Actions", value: outstandingActions.length, meta: "Outstanding commercial work" },
        ])}
        <div class="command-layout">
          <section class="command-card">
            <div class="command-card-head">
              <h4>Finance Registry</h4>
              <div class="toolbar">
                <button class="ghost compact" data-office-target="documents" type="button">Documents</button>
                <button class="ghost compact" data-office-target="deployments" type="button">Deployments</button>
              </div>
            </div>
            <table class="command-table">
              <thead><tr><th>Record</th><th>Type</th><th>Owner</th><th>Status</th><th>Value</th><th>Updated</th><th>Action</th></tr></thead>
              <tbody>${financeRows.length ? financeRows.map(function (doc) {
                return `<tr><td><strong>${escapeHtml(doc.title)}</strong><div class="subtext">${escapeHtml(doc.source || "Office record")}</div></td><td>${escapeHtml(displayValue(doc.type, "document"))}</td><td>${escapeHtml(displayValue(doc.owner, "Office"))}</td><td><span class="office-system-badge">${escapeHtml(displayValue(doc.status, "pending"))}</span></td><td>${escapeHtml(formatCompactMoney(doc.value || 0))}</td><td>${escapeHtml(formatDate(doc.updated_at || doc.created_at))}</td><td><button class="ghost compact" data-office-target="documents" type="button">Review</button></td></tr>`;
              }).join("") : '<tr><td colspan="7"><div class="office-detail-empty">Finance registry will populate from proposals, invoices, contracts, wallet mirrors, and deployment records.</div></td></tr>'}</tbody>
            </table>
          </section>
          <aside class="command-side">
            <article class="command-card">
              <div class="command-card-head"><h4>Financial Detail</h4><span class="office-system-badge">${wallets.length || proposals.length ? "Mirrored" : "Pending"}</span></div>
              <div class="mission-list">
                <div class="device-category"><span>Contracts</span><strong>${escapeHtml(String(contractDocs.length || state.officeStats?.contracts || 0))}</strong></div>
                <div class="device-category"><span>Wallet/accounting source</span><strong>Backend-owned</strong></div>
                <div class="device-category"><span>Deployment readiness</span><strong>${escapeHtml(deploymentFinance.length ? "Review" : "Pending")}</strong></div>
                <div class="device-category"><span>Outstanding actions</span><strong>${escapeHtml(String(outstandingActions.length))}</strong></div>
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Finance Timeline</h4></div>
              <div class="mission-list">
                ${timelineRows.length ? timelineRows.map(function (row) {
                  return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot"></i></span><div class="activity-copy"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.meta)} · ${escapeHtml(row.time)}</span></div></div>`;
                }).join("") : '<div class="office-detail-empty">Commercial and wallet activity will appear as Office records sync.</div>'}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Conversation-ready Actions</h4></div>
              <div class="shortcut-grid compact-action-grid">
                <button class="shortcut-btn" data-office-target="intelligence" type="button"><span>${officeIcon("messenger")}</span>Ask about revenue</button>
                <button class="shortcut-btn" data-office-target="crm" type="button"><span>${officeIcon("lead")}</span>Open pipeline</button>
                <button class="shortcut-btn" data-office-target="documents" type="button"><span>${officeIcon("website")}</span>Review invoices</button>
                <button class="shortcut-btn" data-office-target="reports" type="button"><span>${officeIcon("trend")}</span>Open reports</button>
              </div>
            </article>
          </aside>
        </div>
      </div>
    `;
  }

  function renderDigitalTwinWorkspace(domain) {
    if (!el.digitalTwinPanel || !domain) return;
    el.digitalTwinPanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Digital Twin</p>
            <h3>Future operational twin surface for facilities, consumers, devices, and runtime state.</h3>
            <p class="subtext" style="margin:8px 0 0;">The shell is now ready for Digital Twin oversight. Live twin rendering remains pending while Office continues consuming Ochiga backend intelligence instead of duplicating it.</p>
          </div>
          <button class="ghost" data-office-target="reports" type="button">Open Reports</button>
        </div>
        <article class="command-card">
          <div class="command-card-head"><h4>Twin Readiness</h4><span class="office-system-badge warning">Transitional</span></div>
          <div class="mission-list">
            <div class="device-category"><span>Facility state</span><strong>Available</strong></div>
            <div class="device-category"><span>Consumer context</span><strong>Available</strong></div>
            <div class="device-category"><span>Edge device graph</span><strong>Partial</strong></div>
            <div class="device-category"><span>Backend intelligence feed</span><strong>Consume only</strong></div>
          </div>
        </article>
      </div>
    `;
  }

  function renderCrmAgentsPanel(domain) {
    if (!el.crmAgentsPanel || !domain) return;
    const derived = getDerivedData();
    const totals = state.report && state.report.totals ? state.report.totals : {};
    const activeDeals = state.allProposals.length || derived.salesOwned.length;
    const accountManagers = rankEntries((state.report && state.report.by_owner) || {}, 5);
    const supportSummary = [
      ["Open Support", derived.openNotifications || 0],
      ["Escalations", derived.openEscalations || 0],
      ["Resolved", derived.resolvedNotifications || 0],
      ["Human Owned", derived.humanOwned.length || 0],
    ];
	    const channelOverviewRows = asList(state.channelOverview?.channels);
	    const channelLiveCount = function (name, fallback) {
	      const match = channelOverviewRows.find(function (channel) {
	        return String(channel.name || channel.key || "").toLowerCase().includes(String(name || "").toLowerCase());
	      });
	      return Number(match?.lead_count || match?.message_count || match?.open_notifications || fallback || 0);
	    };
	    const channelRows = [
	      ["Website", channelLiveCount("web", derived.channelCounts.website), "website"],
	      ["WhatsApp", channelLiveCount("whatsapp", derived.channelCounts.whatsapp), "whatsapp"],
	      ["Instagram", channelLiveCount("instagram", derived.channelCounts.instagram), "instagram"],
	      ["Facebook", channelLiveCount("facebook", derived.channelCounts.facebook), "facebook"],
	      ["LinkedIn", channelLiveCount("linkedin", derived.channelCounts.linkedin), "linkedin"],
	      ["TikTok", channelLiveCount("tiktok", derived.channelCounts.tiktok), "tiktok"],
	      ["Google Ads", channelLiveCount("google", derived.channelCounts.google), "google"],
	      ["App Store", channelLiveCount("app store", derived.channelCounts.appStore), "website"],
	      ["Play Store", channelLiveCount("play", derived.channelCounts.playStore), "google"],
	    ];
	    const integrationRows = crmIntegrationStatusRows();
	    const visibleIntegrationRows = state.crmIntegrationsExpanded ? integrationRows : integrationRows.slice(0, 5);
    const stages = [
      ["New Lead", derived.statusCounts.new || 0],
      ["Contacted", (derived.statusCounts.contacted || 0) + (derived.statusCounts.warm || 0)],
      ["Qualified", (derived.statusCounts.qualified || 0) + (derived.statusCounts.hot || 0)],
      ["Proposal", state.allProposals.length],
      ["Negotiation", derived.stageCounts.negotiation || 0],
      ["Closed Won", derived.statusCounts.closed || 0],
    ];
    const maxStage = Math.max(1, ...stages.map(function (stage) { return stage[1]; }));
    const activeFacet = state.moduleFacet.crm || "dashboard";
    const customers = state.leads.filter(function (lead) {
      return /customer|closed|won|active/i.test(`${lead.status || ""} ${lead.stage || lead.commercial_stage || ""}`);
    });
    const organizations = rankEntries(derived.projectTypeCounts || {}, 8);
    const supportTickets = state.notifications.filter(function (note) {
      return !note.type || /support|ticket|inbound|complaint|issue|demo|sales/i.test(`${note.type} ${note.title || ""} ${note.summary || ""}`);
    });
    const escalations = state.notifications.filter(function (note) {
      return /founder|escalat|critical|urgent/i.test(`${note.type || ""} ${note.priority || ""} ${note.summary || ""}`);
    });
    const followUps = state.leads.filter(function (lead) {
      return /follow|next|call|review/i.test(`${lead.next_action || ""} ${lead.status || ""}`);
    }).length;
    const partnerRecords = state.leads.filter(function (lead) {
      return /partner|channel|broker|developer/i.test(`${lead.source || ""} ${lead.company || ""} ${lead.project_type || ""}`);
    }).length;
    const leadRegistryRows = state.leads.slice(0, 8).map(function (lead) {
      return `<div class="device-category"><span><strong style="display:block;color:var(--ink);font-weight:600;">${escapeHtml(leadTitle(lead))}</strong><small class="subtext">${escapeHtml(displayValue(lead.company || lead.source || lead.channel, "Source pending"))}</small></span><strong>${escapeHtml(displayValue(lead.status || lead.commercial_stage, "new"))}</strong></div>`;
    }).join("");
    function crmFacetSummary() {
      const titleMap = {
        leads: "Lead Registry",
        customers: "Customer Accounts",
        organizations: "Organizations",
        conversations: "Conversations",
        support_tickets: "Support Tickets",
        escalations: "Escalations",
        account_managers: "Account Managers",
        sales_pipeline: "Sales Pipeline",
        deployment_pipeline: "Deployment Pipeline",
      };
      if (activeFacet === "dashboard") return "";
      const rows = {
        leads: state.leads.slice(0, 8).map(function (lead) {
          return [leadTitle(lead), displayValue(lead.status, "new"), displayValue(lead.source || lead.channel, "source pending")];
        }),
        customers: customers.slice(0, 8).map(function (lead) {
          return [leadTitle(lead), displayValue(lead.company, "Company pending"), displayValue(lead.stage || lead.commercial_stage, "customer")];
        }),
        organizations: organizations.map(function (entry) {
          return [entry.label, `${entry.value} records`, "CRM category"];
        }),
        conversations: state.leads.slice(0, 8).map(function (lead) {
          return [leadTitle(lead), displayValue(lead.last_message || lead.summary, "Conversation pending"), formatDate(lead.updated_at || lead.created_at)];
        }),
        support_tickets: supportTickets.slice(0, 8).map(function (note) {
          return [displayValue(note.title || note.type, "Support ticket"), displayValue(note.status, "open"), formatDate(note.created_at || note.ts)];
        }),
        escalations: escalations.slice(0, 8).map(function (note) {
          return [displayValue(note.title || note.type, "Escalation"), displayValue(note.status, "open"), formatDate(note.created_at || note.ts)];
        }),
        account_managers: accountManagers.map(function (entry) {
          return [crmOwnerLabel(entry.label), `${entry.value} records`, "Relationship owner"];
        }),
        sales_pipeline: stages.map(function (stage) {
          return [stage[0], `${stage[1]} records`, "Commercial stage"];
        }),
        deployment_pipeline: state.allDemos.slice(0, 8).map(function (demo) {
          return [displayValue(demo.title || demo.company || demo.lead_name, "Deployment checkpoint"), displayValue(demo.status, "pending"), formatDate(demo.scheduled_at || demo.created_at)];
        }),
      }[activeFacet] || [];
      return `
        <article class="command-card">
          <div class="command-card-head">
            <h4>${escapeHtml(titleMap[activeFacet] || "CRM Section")}</h4>
            <span class="office-system-badge">${rows.length ? "Live Data" : "Pending Integration"}</span>
          </div>
          <div class="mission-list">
            ${rows.length ? rows.map(function (row) {
              return `<div class="device-category"><span><strong style="display:block;color:var(--ink);font-weight:600;">${escapeHtml(row[0])}</strong><small class="subtext">${escapeHtml(row[2] || "")}</small></span><strong>${escapeHtml(row[1])}</strong></div>`;
            }).join("") : '<div class="office-detail-empty">No live records have synced for this CRM section yet. This tab is ready and will populate from the Office CRM/support data stream.</div>'}
          </div>
        </article>
      `;
    }

    el.crmAgentsPanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">CRM + Support Command Center</p>
            <h3>Manage leads, customers, organizations, conversations, support tickets, and deployment pipeline.</h3>
            <p class="subtext" style="margin:8px 0 0;">Pure CRM workspace for relationship management, channel performance, support load, and commercial pipeline posture.</p>
          </div>
          <button class="ghost" data-command-action="view_reports" type="button">View full report</button>
        </div>
        ${operationalStrip([
          { label: "Leads", value: totals.leads || state.leads.length, meta: "CRM records" },
          { label: "Conversations", value: state.officeStats?.conversations || state.leads.length || 0, meta: "Relationship signals" },
          { label: "Demos", value: state.allDemos.length || totals.demos || 0, meta: "Reviews booked" },
          { label: "Proposals", value: state.allProposals.length, meta: formatCompactMoney(state.report?.pipeline_value || 0) },
          { label: "Partners", value: partnerRecords, meta: "Channel records" },
          { label: "Pipeline", value: `${totals.sales_handoff_conversion_pct || 0}%`, meta: "Conversion" },
          { label: "Follow-ups", value: followUps, meta: "Next actions" },
          { label: "Support Handoff", value: supportTickets.length, meta: "Support load" },
        ])}
        <div class="command-layout">
          <div class="command-main">
            <article class="command-card">
              <div class="command-card-head">
                <h4>Lead Registry</h4>
                <div class="toolbar">
                  <input class="estate-search" type="search" placeholder="Search leads, partners, or companies..." />
                  <button class="ghost compact" data-crm-facet="leads" type="button">All leads</button>
                </div>
              </div>
              <div class="mission-list">
                ${leadRegistryRows || '<div class="office-detail-empty">CRM records will appear when leads sync into Office.</div>'}
              </div>
            </article>
            ${crmFacetSummary()}
            <article class="command-card">
	              <div class="command-card-head"><h4>Channel Performance</h4><button class="ghost compact" data-crm-facet="conversations" type="button">View all</button></div>
	              <div class="channel-grid">
	                ${channelRows.map(function (row) {
	                  return `<div class="channel-card"><span class="command-icon ${platformIconClass(row[0])}">${officeIcon(row[2])}</span><strong>${escapeHtml(String(row[1]))}</strong><div class="subtext">${escapeHtml(row[0])}</div></div>`;
	                }).join("")}
	              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Lead Flow Analysis</h4><span class="subtext">${escapeHtml(String(state.leads.length))} total records</span></div>
              <div class="funnel">
                ${stages.map(function (stage, index) {
                  const width = Math.max(28, Math.round((stage[1] / maxStage) * 100));
                  return `<div class="funnel-row" style="width:${width}%;background:linear-gradient(90deg, hsl(${260 - index * 24}, 72%, 44%), hsl(${178 - index * 10}, 70%, 42%));"><span>${escapeHtml(stage[0])}</span><strong>${escapeHtml(String(stage[1]))}</strong></div>`;
                }).join("")}
              </div>
            </article>
            <article class="command-card">
	              <div class="command-card-head"><h4>Account Manager Workload</h4><button class="ghost compact" data-crm-facet="account_managers" type="button">View accounts</button></div>
	              <div class="agent-strip">
	                ${accountManagers.length ? accountManagers.map(function (entry) {
                  return `<div class="agent-mini-card">
	                    <div style="display:flex;align-items:center;gap:10px;">
	                      <span class="avatar-dot">${escapeHtml(String(entry.label || "C").slice(0, 1).toUpperCase())}</span>
                        <div><strong>${escapeHtml(crmOwnerLabel(entry.label))}</strong><div class="subtext">Relationship owner</div></div>
                      </div>
                      <div class="agent-spark" style="margin-top:10px;">
                        <div class="agent-spark-row"><span>Records</span><span class="agent-spark-track"><span class="agent-spark-fill" style="width:${Math.min(100, Number(entry.value || 0) * 8)}%;"></span></span><strong>${escapeHtml(String(entry.value || 0))}</strong></div>
                      </div>
                    </div>`;
                  }).join("") : '<div class="office-detail-empty">Account manager workload will appear when CRM ownership data syncs.</div>'}
              </div>
            </article>
          </div>
          <aside class="command-side">
            <article class="command-card">
              <div class="command-card-head"><h4>Real-time Activity</h4></div>
              <div class="mission-list">
                ${state.notifications.slice(0, 5).map(function (note, index) {
                  const tone = note.status === "resolved" ? "healthy" : note.type === "founder_escalation" ? "critical" : index % 2 ? "warning" : "info";
                  return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot ${escapeHtml(tone === "healthy" ? "" : tone)}"></i></span><div class="activity-copy"><strong>${escapeHtml(note.title || note.type || "Activity")}</strong><span>${escapeHtml(formatDate(note.created_at || note.ts))}</span></div></div>`;
                }).join("") || '<div class="subtext">No live CRM activity yet.</div>'}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Support Breakdown</h4></div>
              <div class="mission-list">
                ${supportSummary.map(function (row) {
                  return `<div class="device-category"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(String(row[1]))}</strong></div>`;
                }).join("")}
              </div>
            </article>
	            <article class="command-card">
		              <div class="command-card-head"><h4>Channel Integration</h4><button class="ghost compact" data-crm-integrations-toggle type="button">${state.crmIntegrationsExpanded ? "Show less" : "View channels"}</button></div>
	              <div class="mission-list">
	                ${visibleIntegrationRows.map(function (row) {
	                  return `<div class="device-category"><span style="display:inline-flex;align-items:center;gap:8px;"><span class="command-icon ${platformIconClass(row.name)}">${officeIcon(row.icon)}</span><span><strong style="font-weight:400;color:var(--ink);">${escapeHtml(row.name)}</strong><div class="subtext">${escapeHtml(row.detail)}</div></span></span><strong style="font-weight:400;color:${row.connected ? "var(--green)" : "#ff6b8a"};">${row.connected ? "Connected" : "Disconnected"}</strong></div>`;
	                }).join("")}
	              </div>
            </article>
          </aside>
        </div>
      </div>
    `;
  }

  function renderAiOperationsDashboard(domain) {
    if (!el.aiOperationsPanel) return;
    const derived = getDerivedData();
    const officeStats = state.officeStats || {};
    const totals = state.report && state.report.totals ? state.report.totals : {};
    const aiOps = state.aiOperations || { available: false, status: "pending_integration", tools: [], executions: [], confirmations: [] };
    const aiExecutions = Array.isArray(aiOps.executions) ? aiOps.executions : [];
    const aiConfirmations = Array.isArray(aiOps.confirmations) ? aiOps.confirmations : [];
    const aiTools = Array.isArray(aiOps.tools) ? aiOps.tools : [];
    const activeAiOpsView = state.aiOpsView || "dashboard";
    const aiOpsTabs = [
      ["dashboard", "Overview", "summary"],
      ["agent_console", "Agent Console", "estate"],
      ["voice_command", "Voice Command", "trend"],
      ["tool_registry", "Tool Registry", "settings"],
      ["execution", "Execution", "alert"],
      ["activity", "Activity", "activity"],
    ];
    const traceCount = state.traces.length || Number(officeStats.traces || 0);
    const conversationCount = Number(officeStats.conversations || totals.conversations || state.leads.length || 0);
    const ledgerToolCalls = aiExecutions.length;
    const toolCalls = Math.max(ledgerToolCalls, traceCount, Object.values(derived.traceAgentCounts || {}).reduce(function (sum, value) {
      return sum + Number(value || 0);
    }, 0));
    const pendingExecutions = Math.max(aiConfirmations.length, state.traces.filter(function (trace) {
      return /pending|running|queued|processing/i.test(String(trace.status || trace.type || ""));
    }).length + state.notifications.filter(function (note) {
      return /ai|agent|automation|voice|tool/i.test(`${note.title || ""} ${note.type || ""} ${note.summary || ""}`);
    }).length);
    const failedExecutions = Math.max(aiExecutions.filter(function (item) {
      return /failed|denied|cancelled|expired/i.test(String(item.execution_status || ""));
    }).length, state.traces.filter(function (trace) {
      return /fail|error|denied|cancel/i.test(String(trace.status || trace.type || trace.error || ""));
    }).length);
    const runningExecutions = Math.max(aiExecutions.filter(function (item) {
      return /pending_confirmation|confirmed/i.test(String(item.execution_status || ""));
    }).length, state.traces.filter(function (trace) {
      return /running|processing|queued/i.test(String(trace.status || trace.type || ""));
    }).length);
    const cancelledExecutions = Math.max(aiExecutions.filter(function (item) {
      return /denied|expired/i.test(String(item.execution_status || ""));
    }).length, state.traces.filter(function (trace) {
      return /cancel/i.test(String(trace.status || trace.type || ""));
    }).length);
    const completedExecutions = aiExecutions.length
      ? aiExecutions.filter(function (item) { return String(item.execution_status || "") === "executed"; }).length
      : Math.max(0, toolCalls - failedExecutions - runningExecutions - cancelledExecutions);
    const successRate = toolCalls ? Math.round((completedExecutions / Math.max(1, toolCalls)) * 1000) / 10 : 0;
    const agentRows = [
      { name: "Oyi AI", role: "Core intelligence", icon: "ai_operations", count: traceCount, state: traceCount ? "Online" : "Idle" },
      { name: "Oma", role: "Operations manager", icon: "support", count: derived.ownerCounts.marketing_agent || 0, state: (derived.ownerCounts.marketing_agent || 0) ? "Online" : "Idle" },
      { name: "Osa", role: "Support assistant", icon: "messenger", count: derived.salesOwned.length || 0, state: derived.salesOwned.length ? "Online" : "Idle" },
      { name: "Orin", role: "Analytics agent", icon: "trend", count: state.report ? 1 : 0, state: state.report ? "Online" : "Idle" },
      { name: "Ezi", role: "Automation agent", icon: "settings", count: pendingExecutions, state: pendingExecutions ? "Online" : "Idle" },
    ];
    const aiAuditEvents = state.audit.filter(function (event) { return String(event.action || "").indexOf("ai.") === 0; });
    const confirmationQueue = Math.max(aiConfirmations.length, aiAuditEvents.filter(function (event) { return String(event.action || "") === "ai.command.confirmation.required"; }).length);
    const deniedCommands = aiAuditEvents.filter(function (event) { return /denied|cancelled|failed/i.test(String(event.action || "") + " " + String(event.status || "")); }).length;
    const toolRegistryRows = aiTools.length ? aiTools.map(function (tool) {
      return {
        id: tool.tool_id || tool.id || "unknown_tool",
        risk: tool.risk_level || "authenticated_read",
        enabled: tool.enabled !== false,
        count: aiExecutions.filter(function (execution) { return String(execution.tool_id || "") === String(tool.tool_id || tool.id || ""); }).length,
      };
    }) : [
      { id: "summarize_estate", risk: "authenticated_read", enabled: true, count: Number(totals.estates || domain.metrics?.[0]?.value || 0) || 0 },
      { id: "summarize_devices", risk: "authenticated_read", enabled: true, count: Number(domain.metrics?.[2]?.value || 0) || traceCount },
      { id: "summarize_support", risk: "authenticated_read", enabled: true, count: derived.openNotifications || 0 },
      { id: "open_module", risk: "authenticated_read", enabled: true, count: conversationCount },
      { id: "device_command", risk: "infrastructure_control", enabled: false, count: confirmationQueue },
      { id: "visitor_create", risk: "sensitive_write", enabled: false, count: deniedCommands },
    ];
    const toolRows = toolRegistryRows.map(function (tool) { return [tool.id, tool.count, tool.risk, tool.enabled]; }).sort(function (a, b) { return b[1] - a[1]; });
    const maxTool = Math.max(1, ...toolRows.map(function (row) { return row[1]; }));
    const chartSeries = Array.from({ length: 7 }).map(function (_, index) {
      const factor = (index + 1) / 7;
      return {
        label: `${index * 4}:00`,
        conversations: Math.round(conversationCount * factor),
        executions: Math.round(toolCalls * factor),
        tools: Math.round((toolCalls + pendingExecutions) * factor),
      };
    });
    function pointsFor(key, maxValue) {
      return chartSeries.map(function (point, index) {
        const x = 18 + index * 58;
        const y = 190 - Math.round((Number(point[key] || 0) / Math.max(1, maxValue)) * 150);
        return `${x},${Math.max(24, y)}`;
      }).join(" ");
    }
    const maxChart = Math.max(1, ...chartSeries.flatMap(function (point) {
      return [point.conversations, point.executions, point.tools];
    }));
    const conversationRows = state.leads.slice(0, 5).map(function (lead, index) {
      return {
        title: displayValue(lead.summary || lead.next_action || leadTitle(lead), "AI conversation"),
        agent: index % 2 ? "Oma" : "Oyi AI",
        time: formatDate(lead.created_at || lead.updated_at),
        initial: initialsFromEmail(lead.email || leadTitle(lead)),
      };
    });
    const insightRows = [
      confirmationQueue ? { title: "Confirmation queue active", meta: ` AI command request(s) require human confirmation before execution`, tone: "warning", icon: "alert" } : null,
      deniedCommands ? { title: "Denied command trail active", meta: ` AI command event(s) were blocked or cancelled by policy`, tone: "critical", icon: "settings" } : null,
      derived.openNotifications ? { title: "Support pressure trending", meta: `${derived.openNotifications} open support signals requiring AI-assisted routing review`, tone: "warning", icon: "support" } : null,
      failedExecutions ? { title: "Execution failures need review", meta: `${failedExecutions} failed tool traces need inspection before automation escalation`, tone: "critical", icon: "alert" } : null,
      traceCount ? { title: "Tool trace volume active", meta: `${traceCount} trace records are available for operational audit and diagnostics`, tone: "info", icon: "trend" } : null,
      state.audit.length ? { title: "Governance trail available", meta: `${state.audit.length} audit events are connected to the AI operations trail`, tone: "healthy", icon: "estate" } : null,
    ].filter(Boolean);
    const activityRows = aiExecutions.slice(0, 5).map(function (execution) {
      return {
        title: displayValue(execution.tool_id, "AI command"),
        meta: displayValue(execution.result_summary || execution.execution_status, "Execution ledger event"),
        time: formatDate(execution.requested_at || execution.executed_at),
        icon: "trend",
      };
    }).concat(state.traces.slice(0, 5).map(function (trace) {
      return {
        title: displayValue(trace.agent || trace.type, "AI request processed"),
        meta: displayValue(trace.tool_name || trace.status || trace.summary, "Tool execution event"),
        time: formatDate(trace.created_at || trace.ts),
        icon: "trend",
      };
    })).concat(state.notifications.slice(0, 2).map(function (note) {
      return {
        title: displayValue(note.title || note.type, "AI operational notice"),
        meta: displayValue(note.summary || note.message, "Office event"),
        time: formatDate(note.created_at || note.ts),
        icon: "support",
      };
    })).slice(0, 5);
    const healthRows = [
      ["AI Services", aiOps.available !== false],
      ["Model Inference", true],
      ["Vector Database", Boolean(state.audit.length || state.traces.length)],
      ["Tool Services", aiTools.length > 0 || aiOps.available !== false],
      ["Voice Services", Boolean(window.MediaRecorder || navigator.mediaDevices)],
    ];

    el.aiOperationsPanel.innerHTML = `
      <div class="command-page ai-ops-page">
        <div class="ai-ops-topline">
          <div>
            <p class="eyebrow">AI Operations</p>
            <h3>Monitor, manage, and optimize Oyi AI agents, tools, executions, and infrastructure intelligence.</h3>
            <p class="subtext" style="margin:8px 0 0;">Live AI orchestration command center for the Ochiga Office OS. ${escapeHtml(aiOps.available === false ? `Backend ledger: ${aiOps.status || "pending"}${aiOps.reason ? " · " + aiOps.reason : ""}` : "Backend ledger connected.")}</p>
          </div>
          <div class="ai-command-selectors">
            <button class="ai-command-pill" data-command-action="run_ai_workflow" type="button"><span>${officeIcon("trend")}</span>AI Command</button>
            <button class="ai-command-pill" data-command-action="view_reports" type="button"><i></i>AI System Status · Healthy</button>
          </div>
        </div>
        <div class="ai-ops-tabs" role="tablist" aria-label="AI Operations sections">
          ${aiOpsTabs.map(function (tab) {
            const active = activeAiOpsView === tab[0];
            return `<button class="ai-ops-tab ${active ? "active" : ""}" data-ai-ops-tab="${escapeHtml(tab[0])}" type="button" role="tab" aria-selected="${active ? "true" : "false"}"><span>${officeIcon(tab[2])}</span>${escapeHtml(tab[1])}</button>`;
          }).join("")}
        </div>
        <div class="command-kpis ai-ops-kpis">
          ${[
            ["Active AI Agents", agentRows.filter(function (agent) { return agent.state === "Online"; }).length, "Live agent states", "lead"],
            ["AI Conversations", conversationCount, "Office conversation signal", "messenger"],
            ["Pending Confirmations", confirmationQueue, "Risky commands waiting for approval", "alert"],
            ["Tool Calls Today", toolCalls, "Trace-backed tool activity", "trend"],
            ["Denied Commands", deniedCommands, "Blocked by policy or permission", "settings"],
            ["Success Rate", `${successRate}%`, "Completed vs failed traces", "support"],
          ].map(function (item) {
            return `<div class="command-kpi ai-ops-kpi"><span class="command-icon">${officeIcon(item[3])}</span><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong><div class="subtext">${escapeHtml(item[2])}</div></div>`;
          }).join("")}
        </div>
        <div class="ai-ops-grid">
          <div class="command-main">
            <div class="ai-ops-main">
              <article class="command-card">
                <div class="command-card-head"><h4>AI Activity Overview</h4><button class="ghost compact" data-command-action="view_reports" type="button">Today</button></div>
                <div class="ai-chart-legend">
                  <span><i style="background:#7c4dff;"></i> Conversations</span>
                  <span><i style="background:#36a3ff;"></i> Executions</span>
                  <span><i style="background:#20d6c7;"></i> Tool Calls</span>
                </div>
                <div class="ai-line-chart">
                  <svg viewBox="0 0 390 220" preserveAspectRatio="none" role="img" aria-label="AI activity chart">
                    <defs>
                      <linearGradient id="aiOpsArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7c4dff" stop-opacity="0.32"/><stop offset="100%" stop-color="#7c4dff" stop-opacity="0"/></linearGradient>
                    </defs>
                    <path d="M18 204 L18 190 L${pointsFor("conversations", maxChart).replace(/ /g, " L")} L366 204 Z" fill="url(#aiOpsArea)"></path>
                    <polyline points="${pointsFor("conversations", maxChart)}" fill="none" stroke="#7c4dff" stroke-width="3"></polyline>
                    <polyline points="${pointsFor("executions", maxChart)}" fill="none" stroke="#36a3ff" stroke-width="2.4"></polyline>
                    <polyline points="${pointsFor("tools", maxChart)}" fill="none" stroke="#20d6c7" stroke-width="2.2"></polyline>
                    ${chartSeries.map(function (point, index) {
                      return `<text x="${18 + index * 58}" y="214" fill="rgba(220,230,255,0.5)" font-size="10" text-anchor="middle">${escapeHtml(point.label)}</text>`;
                    }).join("")}
                  </svg>
                </div>
              </article>
              <article class="command-card ai-voice-panel">
                <div class="command-card-head"><h4>Voice Command Layer</h4><button class="ghost compact" data-ai-ops-tab="voice_command" type="button">Open</button></div>
                <div class="ai-voice-wave" aria-label="Voice command signal">
                  ${Array.from({ length: 28 }).map(function (_, index) {
                    return `<i style="--h:${10 + ((index * 11) % 42)}px;--d:${index * 34}ms"></i>`;
                  }).join("")}
                </div>
                <div class="office-batch-row" style="margin-top:10px;">
                  <span class="office-batch">Wake <strong>Hey Oyi</strong></span>
                  <span class="office-batch">Mode <strong>${window.MediaRecorder || navigator.mediaDevices ? "Ready" : "Pending"}</strong></span>
                  <span class="office-batch">Audited <strong>On</strong></span>
                </div>
              </article>
              <article class="command-card">
                <div class="command-card-head"><h4>AI Execution Summary</h4></div>
                <div class="ai-donut-wrap">
                  <div class="ai-donut"><div class="ai-donut-core"><span><strong>${escapeHtml(String(toolCalls))}</strong><small class="subtext">Total</small></span></div></div>
                  <div class="mission-list">
                    ${[
                      ["Completed", completedExecutions, "#39e58f"],
                      ["Failed", failedExecutions, "#f05252"],
                      ["Cancelled", cancelledExecutions, "#94a3b8"],
                      ["Running", runningExecutions, "#36a3ff"],
                    ].map(function (row) {
                      return `<div class="mission-list-row"><i class="mission-dot" style="background:${row[2]}"></i><strong>${escapeHtml(row[0])}</strong><span>${escapeHtml(String(row[1]))}</span></div>`;
                    }).join("")}
                  </div>
                </div>
                <div class="office-detail-metrics" style="margin-top:14px;">
                  <div class="office-system-metric"><div class="key">Success Rate</div><strong>${escapeHtml(String(successRate))}%</strong></div>
                  <div class="office-system-metric"><div class="key">Avg Response Time</div><strong>${traceCount ? "1.42s" : "Pending"}</strong></div>
                </div>
              </article>
            </div>
            <div class="ai-ops-bottom">
              <article class="command-card">
                <div class="command-card-head"><h4>Tool Usage</h4><button class="ghost compact" data-ai-ops-tab="tool_registry" type="button">Today</button></div>
                <div class="ai-tool-list">
                  ${toolRows.map(function (row) {
                    const width = Math.max(8, Math.round((row[1] / maxTool) * 100));
                    return `<div class="ai-tool-row"><span>${escapeHtml(row[0])}<small class="subtext">${escapeHtml(row[2] || "authenticated_read")} · ${row[3] === false ? "Disabled" : "Enabled"}</small></span><span class="ai-tool-bar"><span class="ai-tool-fill" style="width:${width}%;"></span></span><strong>${escapeHtml(String(row[1]))}</strong></div>`;
                  }).join("")}
                </div>
              </article>
              <article class="command-card">
                <div class="command-card-head"><h4>Recent AI Conversations</h4><button class="ghost compact" data-office-target="intelligence" type="button">View all</button></div>
                <div class="ai-conversation-list">
                  ${conversationRows.length ? conversationRows.map(function (row) {
                    return `<div class="ai-conversation-row"><div style="display:flex;align-items:center;gap:10px;"><span class="avatar-dot">${escapeHtml(row.initial)}</span><div><strong>${escapeHtml(row.title)}</strong><div class="subtext">${escapeHtml(row.agent)}</div></div></div><span class="subtext">${escapeHtml(row.time)}</span></div>`;
                  }).join("") : '<div class="office-detail-empty">AI conversations will appear when Oyi activity syncs.</div>'}
                </div>
              </article>
              <article class="command-card">
                <div class="command-card-head"><h4>Agent Status</h4><button class="ghost compact" data-ai-ops-tab="agent_console" type="button">View all</button></div>
                <div class="ai-agent-list">
                  ${agentRows.map(function (agent) {
                    const idle = agent.state !== "Online";
                    return `<div class="ai-agent-row"><div style="display:flex;align-items:center;gap:10px;"><span class="ai-agent-avatar">${officeIcon(agent.icon)}</span><div><strong>${escapeHtml(agent.name)}</strong><div class="subtext">${escapeHtml(agent.role)}</div></div></div><span class="ai-state-badge ${idle ? "idle" : ""}">${escapeHtml(agent.state)}</span></div>`;
                  }).join("")}
                </div>
              </article>
            </div>
          </div>
          <aside class="command-side context-rail">
            <article class="command-card">
              <div class="command-card-head"><h4>Real-time AI Activity</h4><span class="office-system-badge">Live</span></div>
              <div class="mission-list">
                ${activityRows.length ? activityRows.map(function (item) {
                  return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot"></i></span><div class="activity-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)} · ${escapeHtml(item.time)}</span></div></div>`;
                }).join("") : '<div class="office-detail-empty">No realtime AI activity has synced yet.</div>'}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>AI Insights</h4><button class="ghost compact" data-command-action="view_reports" type="button">View all</button></div>
              <div class="mission-list ai-insight-list">
                ${insightRows.length ? insightRows.map(function (item) {
                  return `<div class="insight-row"><span class="insight-icon">${officeIcon(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div><span class="office-system-badge ${escapeHtml(item.tone === "critical" ? "alert" : item.tone === "warning" ? "warning" : "")}">${escapeHtml(item.tone)}</span></div>`;
                }).join("") : '<div class="office-detail-empty">AI insights will appear as traces, audits, and support signals increase.</div>'}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Quick Actions</h4></div>
              <div class="shortcut-grid ai-quick-actions">
                <button class="shortcut-btn" data-office-target="intelligence" type="button"><span>${officeIcon("messenger")}</span>Open Oyi Intelligence</button>
                <button class="shortcut-btn" data-command-action="run_ai_workflow" type="button"><span>${officeIcon("trend")}</span>Run AI Workflow</button>
                <button class="shortcut-btn" data-command-action="create_new_agent" type="button"><span>${officeIcon("lead")}</span>Create New Agent</button>
                <button class="shortcut-btn" data-command-action="add_new_tool" type="button"><span>${officeIcon("estate")}</span>Add New Tool</button>
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>AI System Health</h4></div>
              <div class="ai-health-list">
                ${healthRows.map(function (row) {
                  return `<div class="ai-health-row"><span>${escapeHtml(row[0])}</span><span class="subtext"><i class="ai-status-dot" style="display:inline-block;margin-right:7px;background:${row[1] ? "#39e58f" : "#f6c85f"};"></i>${row[1] ? "Healthy" : "Pending"}</span></div>`;
                }).join("")}
              </div>
            </article>
          </aside>
        </div>
      </div>
    `;
    Array.from(el.aiOperationsPanel.querySelectorAll("[data-ai-ops-tab]")).forEach(function (node) {
      node.addEventListener("click", function () {
        setModuleFacet("agents", node.getAttribute("data-ai-ops-tab") || "dashboard");
        renderAiOperationsDashboard(domain);
        renderSectionNav();
      });
    });
  }

  function renderAgentsSupervisionWorkspace(domain) {
    if (!el.aiOperationsPanel) return;
    const derived = getDerivedData();
    const officeStats = state.officeStats || {};
    const totals = state.report && state.report.totals ? state.report.totals : {};
    const aiOps = state.aiOperations || { available: false, status: "pending_integration", tools: [], executions: [], confirmations: [] };
    const aiExecutions = Array.isArray(aiOps.executions) ? aiOps.executions : [];
    const aiConfirmations = Array.isArray(aiOps.confirmations) ? aiOps.confirmations : [];
    const aiTools = Array.isArray(aiOps.tools) ? aiOps.tools : [];
    const traceCount = state.traces.length || Number(officeStats.traces || 0);
    const aiAuditEvents = state.audit.filter(function (event) {
      return String(event.action || "").indexOf("ai.") === 0 || /agent|tool|runtime|conversation/i.test(`${event.action || ""} ${event.target_type || ""}`);
    });
    const failedTraces = state.traces.filter(function (trace) {
      return /fail|error|denied|cancel/i.test(`${trace.status || ""} ${trace.type || ""} ${trace.error || ""}`);
    });
    const pendingExecutions = Math.max(aiConfirmations.length, state.traces.filter(function (trace) {
      return /pending|running|queued|processing/i.test(`${trace.status || ""} ${trace.type || ""}`);
    }).length);
    const completedExecutions = aiExecutions.length
      ? aiExecutions.filter(function (item) { return /executed|completed|success/i.test(String(item.execution_status || "")); }).length
      : Math.max(0, traceCount - failedTraces.length - pendingExecutions);
    const agentRows = [
      { name: "Oyi Core", role: "Backend intelligence authority", status: aiOps.available === false ? "Transitional" : "Connected", count: traceCount, source: "Ochiga backend" },
      { name: "Oma", role: "Commercial / operations assistant", status: (derived.ownerCounts.marketing_agent || 0) ? "Active" : "Idle", count: derived.ownerCounts.marketing_agent || 0, source: "Office records" },
      { name: "Osa", role: "Sales / support assistant", status: derived.salesOwned.length ? "Active" : "Idle", count: derived.salesOwned.length, source: "Office records" },
      { name: "Executive reporting", role: "Summary and review surface", status: state.report ? "Available" : "Pending", count: state.report ? 1 : 0, source: "/admin/reports/summary" },
      { name: "Automation review", role: "Confirmation and safety queue", status: aiConfirmations.length ? "Review" : "Stable", count: aiConfirmations.length, source: "Backend runtime mirror" },
    ];
    const toolRows = aiTools.length ? aiTools.map(function (tool) {
      return {
        title: tool.tool_id || tool.id || "unknown_tool",
        meta: `${displayValue(tool.risk_level, "authenticated_read")} · ${tool.enabled === false ? "disabled" : "enabled"}`,
        count: aiExecutions.filter(function (execution) { return String(execution.tool_id || "") === String(tool.tool_id || tool.id || ""); }).length,
      };
    }) : [
      { title: "summarize_estate", meta: "Backend-owned read tool", count: Number(totals.estates || domain?.metrics?.[0]?.value || 0) || 0 },
      { title: "summarize_devices", meta: "Backend-owned read tool", count: traceCount },
      { title: "summarize_support", meta: "Backend-owned read tool", count: derived.openNotifications || 0 },
      { title: "open_module", meta: "Office navigation helper", count: Number(officeStats.conversations || totals.conversations || state.leads.length || 0) },
    ];
    const executionRows = aiExecutions.slice(0, 5).map(function (execution) {
      return {
        title: displayValue(execution.tool_id, "Runtime execution"),
        meta: displayValue(execution.result_summary || execution.execution_status, "Execution ledger event"),
        status: displayValue(execution.execution_status, "recorded"),
        time: formatDate(execution.requested_at || execution.executed_at),
      };
    }).concat(state.traces.slice(0, 5).map(function (trace) {
      return {
        title: displayValue(trace.agent || trace.type, "Runtime trace"),
        meta: displayValue(trace.tool_name || trace.summary || trace.status, "Trace evidence"),
        status: displayValue(trace.status || trace.type, "trace"),
        time: formatDate(trace.created_at || trace.ts),
      };
    })).slice(0, 8);
    const healthRows = [
      ["Backend runtime dependency", aiOps.available === false ? displayValue(aiOps.status, "Transitional") : "Connected"],
      ["Local intelligence ownership", "Disabled"],
      ["Trace evidence", traceCount],
      ["Confirmations", aiConfirmations.length],
      ["Failures", failedTraces.length],
    ];

    el.aiOperationsPanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Agents</p>
            <h3>Supervise Oyi Core agents, tools, executions, confirmations, traces, and AI operations health.</h3>
            <p class="subtext" style="margin:8px 0 0;">Office visualizes backend-owned intelligence. Awareness, reasoning, recommendations, automation, and execution ledger remain owned by Ochiga backend.</p>
          </div>
          <div class="toolbar">
            <button class="ghost" data-office-target="intelligence" type="button">Open Oyi</button>
            <button class="ghost" data-office-target="reports" type="button">Runtime reports</button>
          </div>
        </div>
        ${operationalStrip([
          { label: "Active Agents", value: agentRows.filter(function (agent) { return /active|connected|available|review/i.test(agent.status); }).length, meta: "Supervised surfaces" },
          { label: "Tools", value: toolRows.length, meta: "Registry mirror" },
          { label: "Executions", value: Math.max(aiExecutions.length, traceCount), meta: "Ledger + traces" },
          { label: "Confirmations", value: aiConfirmations.length, meta: "Approval queue" },
          { label: "Failures", value: failedTraces.length, meta: "Needs review" },
          { label: "Backend Runtime", value: aiOps.available === false ? "Transitional" : "Connected", meta: displayValue(aiOps.reason, "Oyi Core authority") },
        ])}
        <div class="command-layout">
          <section class="command-card">
            <div class="command-card-head">
              <h4>Agent Registry</h4>
              <div class="toolbar">
                <button class="ghost compact" data-office-target="intelligence" type="button">Ask Oyi</button>
                <button class="ghost compact" data-office-target="reports" type="button">Diagnostics</button>
              </div>
            </div>
            <table class="command-table">
              <thead><tr><th>Agent</th><th>Role</th><th>Status</th><th>Evidence</th><th>Source</th><th>Action</th></tr></thead>
              <tbody>${agentRows.map(function (agent) {
                return `<tr><td><strong>${escapeHtml(agent.name)}</strong></td><td>${escapeHtml(agent.role)}</td><td><span class="office-system-badge ${/review|transitional/i.test(agent.status) ? "warning" : ""}">${escapeHtml(agent.status)}</span></td><td>${escapeHtml(String(agent.count))}</td><td>${escapeHtml(agent.source)}</td><td><button class="ghost compact" data-office-target="intelligence" type="button">Review</button></td></tr>`;
              }).join("")}</tbody>
            </table>
          </section>
          <aside class="command-side">
            <article class="command-card">
              <div class="command-card-head"><h4>Tool Registry</h4><span class="office-system-badge">${aiTools.length ? "Backend" : "Fallback mirror"}</span></div>
              <div class="mission-list">
                ${toolRows.slice(0, 6).map(function (tool) {
                  return `<div class="device-category"><span><strong style="display:block;color:var(--ink);font-weight:600;">${escapeHtml(tool.title)}</strong><small class="subtext">${escapeHtml(tool.meta)}</small></span><strong>${escapeHtml(String(tool.count))}</strong></div>`;
                }).join("")}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Execution Timeline</h4></div>
              <div class="mission-list">
                ${executionRows.length ? executionRows.map(function (row) {
                  return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot ${/fail|error|denied/i.test(row.status) ? "critical" : ""}"></i></span><div class="activity-copy"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.meta)} · ${escapeHtml(row.time)}</span></div></div>`;
                }).join("") : '<div class="office-detail-empty">Runtime executions and traces will appear when backend Oyi Core activity syncs.</div>'}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>AI Operations Health</h4></div>
              <div class="mission-list">
                ${healthRows.map(function (row) {
                  return `<div class="device-category"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(String(row[1]))}</strong></div>`;
                }).join("")}
              </div>
            </article>
          </aside>
        </div>
      </div>
    `;
  }

  function renderSectionNav() {
    if (!el.sectionNav) return;

    const navByTab = {
      overview: [],
      facilities: [
        { label: "Overview", type: "tab", value: "facilities", active: true },
        { label: "Estates", type: "facet", value: "estates" },
        { label: "Buildings", type: "facet", value: "buildings" },
        { label: "Accounts", type: "facet", value: "accounts" },
        { label: "Deployments", type: "tab", value: "deployments" },
        { label: "Monitoring", type: "facet", value: "monitoring" },
      ],
      consumers: [
        { label: "Overview", type: "tab", value: "consumers", active: true },
        { label: "Residents", type: "facet", value: "residents" },
        { label: "Wallets", type: "facet", value: "wallets" },
        { label: "Support", type: "tab", value: "crm", facet: "support_tickets" },
      ],
      crm: [
        { label: "Overview", type: "tab", value: "crm", active: true },
        { label: "Leads", type: "facet", value: "leads" },
        { label: "Customers", type: "facet", value: "customers" },
        { label: "Organizations", type: "facet", value: "organizations" },
        { label: "Conversations", type: "facet", value: "conversations" },
        { label: "Support Tickets", type: "facet", value: "support_tickets" },
        { label: "Escalations", type: "facet", value: "escalations" },
        { label: "Sales Pipeline", type: "facet", value: "sales_pipeline" },
        { label: "Deployment Pipeline", type: "facet", value: "deployment_pipeline" },
      ],
      projects: [
        { label: "Overview", type: "tab", value: "projects", active: true },
        { label: "Active Projects", type: "facet", value: "active_projects" },
        { label: "Pipeline", type: "facet", value: "project_pipeline" },
        { label: "Documents", type: "tab", value: "documents" },
      ],
      deployments: [
        { label: "Overview", type: "tab", value: "deployments", active: true },
        { label: "Reviews", type: "facet", value: "deployment_pipeline" },
        { label: "Workspaces", type: "facet", value: "workspaces" },
        { label: "Facilities", type: "tab", value: "facilities" },
      ],
      documents: [
        { label: "Overview", type: "tab", value: "documents", active: true },
        { label: "Proposals", type: "facet", value: "proposals" },
        { label: "Contracts", type: "facet", value: "contracts" },
        { label: "Invoices", type: "facet", value: "invoices" },
        { label: "Asset Files", type: "facet", value: "asset_files" },
        { label: "Generated PDFs", type: "facet", value: "generated_pdfs" },
      ],
      finance: [
        { label: "Overview", type: "tab", value: "finance", active: true },
        { label: "Wallet Float", type: "facet", value: "wallet_float" },
        { label: "Collections", type: "facet", value: "collections" },
        { label: "Documents", type: "tab", value: "documents", facet: "invoices" },
      ],
      agents: [
        { label: "Overview", type: "tab", value: "agents", active: true },
        { label: "Agent Console", type: "facet", value: "agent_console" },
        { label: "Voice Command", type: "facet", value: "voice_command" },
        { label: "Tool Registry", type: "facet", value: "tool_registry" },
        { label: "Execution", type: "facet", value: "execution" },
        { label: "Activity", type: "facet", value: "activity" },
      ],
      edge: [
        { label: "Overview", type: "tab", value: "edge", active: true },
        { label: "Registry", type: "facet", value: "registry" },
        { label: "Discovery", type: "facet", value: "discovery" },
        { label: "Control", type: "facet", value: "control" },
        { label: "Telemetry", type: "facet", value: "telemetry" },
        { label: "Edge Agents", type: "facet", value: "edge_agents" },
      ],
      digital_twin: [
        { label: "Overview", type: "tab", value: "digital_twin", active: true },
        { label: "Twin Surfaces", type: "facet", value: "twin_surfaces" },
        { label: "Runtime Links", type: "tab", value: "reports", facet: "ai_insights" },
      ],
      reports: [
        { label: "Overview", type: "tab", value: "reports", active: true },
        { label: "Analytics", type: "facet", value: "analytics" },
        { label: "AI Insights", type: "facet", value: "ai_insights" },
        { label: "Reports", type: "facet", value: "reports" },
        { label: "Predictive Operations", type: "facet", value: "predictive_operations" },
        { label: "Diagnostics", type: "facet", value: "diagnostics" },
      ],
      team: [
        { label: "Overview", type: "tab", value: "team", active: true },
        { label: "Staff & Roles", type: "facet", value: "staff_roles" },
        { label: "Permissions", type: "facet", value: "permissions" },
        { label: "System Settings", type: "facet", value: "settings" },
        { label: "Integrations", type: "facet", value: "integrations" },
        { label: "Accounts", type: "facet", value: "accounts" },
        { label: "Super Admin", type: "facet", value: "super_admin" },
      ],
      settings: [
        { label: "Overview", type: "tab", value: "settings", active: true },
        { label: "Realtime", type: "facet", value: "realtime" },
        { label: "Storage", type: "facet", value: "storage" },
        { label: "API Health", type: "facet", value: "api_health" },
        { label: "Webhooks", type: "facet", value: "webhooks" },
        { label: "Sync", type: "facet", value: "sync" },
        { label: "Provider Status", type: "facet", value: "provider_status" },
      ],
      intelligence: [
        { label: "Workspace", type: "tab", value: "intelligence", active: true },
        { label: "CRM Context", type: "tab", value: "crm", facet: "conversations" },
        { label: "Agents", type: "tab", value: "agents" },
        { label: "Reports", type: "tab", value: "reports", facet: "ai_insights" },
      ],
    };

    const items =
      navByTab[state.workspaceTab] || navByTab.overview;
    if (!items.length) {
      el.sectionNav.classList.add("is-hidden");
      el.sectionNav.innerHTML = "";
      return;
    }
    el.sectionNav.classList.remove("is-hidden");
    const visibleItems = items.filter(function (item) {
      if (item.permission) return hasAnyPermission([item.permission]);
      if (item.permissions) return hasAnyPermission(item.permissions);
      if (item.type === "tab") return canAccessTab(item.value);
      return true;
    });
    if (!visibleItems.length) {
      el.sectionNav.classList.add("is-hidden");
      el.sectionNav.innerHTML = "";
      return;
    }
    el.sectionNav.innerHTML = visibleItems
      .map(function (item) {
        const active =
          (item.active && !state.moduleFacet[state.workspaceTab]) ||
          (item.type === "tab" && item.value === state.workspaceTab) ||
          (item.type === "facet" && item.value === state.moduleFacet[state.workspaceTab]) ||
          (item.type === "focus" && item.value === state.overviewFocus) ||
          (item.type === "crm_view" && item.value === state.crmOfficeView) ||
          (item.type === "agent" &&
            item.value === (el.agentSelect ? el.agentSelect.value : "marketing"));
        return `<button class="section-nav-btn ${active ? "active" : ""}" type="button" data-section-nav-type="${escapeHtml(
          item.type
        )}" data-section-nav-value="${escapeHtml(item.value)}" data-section-nav-facet="${escapeHtml(item.facet || "")}">${escapeHtml(item.label)}</button>`;
      })
      .join("");

    Array.from(el.sectionNav.querySelectorAll("[data-section-nav-type]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const type = node.getAttribute("data-section-nav-type");
        const value = node.getAttribute("data-section-nav-value");
        const facet = node.getAttribute("data-section-nav-facet");
        if (type === "tab" && value && canAccessTab(value)) {
          setModuleFacet(state.workspaceTab, "dashboard");
          if (facet) {
            setModuleFacet(value, facet);
          }
          state.workspaceTab = value;
          state.overviewFocus = value;
          renderWorkspaceTabs();
          return;
        }
        if (type === "focus" && value) {
          state.overviewFocus = value;
          state.workspaceTab = "overview";
          renderWorkspaceTabs();
          return;
        }
        if (type === "agent" && value) {
          setAgentChoice(value);
          renderSectionNav();
          return;
        }
        if (type === "crm_view" && value) {
          state.crmOfficeView = value;
          renderWorkspaceTabs();
          return;
        }
        if (type === "facet" && value) {
          setModuleFacet(state.workspaceTab, value);
          renderWorkspaceTabs();
          return;
        }
        if (type === "action" && value === "add_agent") {
          state.workspaceTab = "agents";
          state.overviewFocus = "agents";
          state.aiOpsView = "agent_console";
          renderWorkspaceTabs();
          setBulkStatus("Agent Console opened. AI agent profile work now routes through Office Agents.");
        }
        if (type === "staff_action" && value) {
          const panel = document.getElementById(value);
          const dock = panel ? panel.closest(".staff-command-row") : null;
          if (dock) {
            dock.classList.add("is-open");
          }
          if (panel) {
            panel.open = true;
            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
      });
    });
  }

  function keyValueLines(map, emptyText) {
    const entries = Object.entries(map || {});
    if (!entries.length) {
      return `<div class="value empty">${escapeHtml(emptyText)}</div>`;
    }
    return entries
      .sort(function (left, right) {
        return right[1] - left[1];
      })
      .map(function (entry) {
        return `
          <div class="trace-head">
            <strong>${escapeHtml(displayValue(entry[0], "Not captured"))}</strong>
            <span>${escapeHtml(String(entry[1]))}</span>
          </div>
        `;
      })
      .join("");
  }

  function barRows(entries, emptyText) {
    const rows = asList(entries).filter(function (entry) {
      return entry && entry.label !== undefined;
    });
    const max = Math.max(1, ...rows.map(function (entry) { return Number(entry.value || 0); }));
    if (!rows.length) return `<div class="office-detail-empty">${escapeHtml(emptyText || "No data synced yet.")}</div>`;
    return rows.map(function (entry) {
      const width = Math.max(6, Math.round((Number(entry.value || 0) / max) * 100));
      return `<div class="intel-bar-row"><span>${escapeHtml(displayValue(entry.label, "Unknown"))}</span><i><b style="width:${width}%;"></b></i><strong>${escapeHtml(String(entry.value || 0))}</strong></div>`;
    }).join("");
  }

  function renderIntelligenceFacetPanels(activeFacet, context) {
    const facet = activeFacet || "dashboard";
    const healthScore = context.healthScore;
    const incidents = context.incidents;
    const diagnostics = context.diagnostics;
    const totals = context.totals || {};
    const trendEntries = context.trendEntries || [];
    const categoryEntries = context.categoryEntries || [];
    const derived = context.derived || {};
    const devices = asList(officeCollections().devices);
    const estates = asList(officeCollections().estates);
    const audits = asList(state.audit);
    const traces = asList(state.traces);
    const notifications = asList(state.notifications);
    const panels = {
      dashboard: [
        ["Operational Intelligence Overview", "Live signal distribution", "chart"],
        ["Infrastructure Trends", "Status pressure", "trends"],
        ["Category Intelligence", "Operational spread", "categories"],
        ["Diagnostics Summary", "Audit and trace layer", "diagnostics"],
      ],
      analytics: [
        ["Portfolio Analytics", "Estate and device signal mix", "analytics"],
        ["Device Intelligence", "Online, warning, and offline pressure", "device_intel"],
        ["Support Intelligence", "Open case and escalation trend", "support_intel"],
        ["Estate Comparisons", "Portfolio operating spread", "estate_compare"],
      ],
      ai_insights: [
        ["AI Insight Queue", "Generated from traces, support, and audit signals", "ai_cards"],
        ["Anomaly Signals", "Permission, incident, and device outliers", "anomaly"],
        ["Automation Opportunities", "Candidate workflows for Oyi AI execution", "automation"],
        ["Insight Evidence", "Trace and audit records backing recommendations", "evidence"],
      ],
      reports: [
        ["Executive Report Snapshot", "Current Office reporting totals", "report_totals"],
        ["Source Breakdown", "CRM and operational source pressure", "source_breakdown"],
        ["Status Breakdown", "Pipeline and support stage mix", "status_breakdown"],
        ["Report Actions", "Safe report routes", "report_actions"],
      ],
      predictive_operations: [
        ["Predictive Operations", "Risk indicators from current live data", "predictive"],
        ["Maintenance Pressure", "Support and incident pressure", "maintenance"],
        ["Capacity Forecast", "Estate, resident, and device growth readiness", "capacity"],
        ["Next Best Actions", "Operational recommendations", "next_actions"],
      ],
      diagnostics: [
        ["Diagnostics Console", "Trace, audit, and permission evidence", "diagnostic_console"],
        ["Permission Denials", "Security and access failures", "permission_denials"],
        ["System Event Trail", "Recent audit activity", "event_trail"],
        ["Health Checks", "Data source readiness", "health_checks"],
      ],
    };
    function panelBody(kind) {
      if (kind === "chart") {
        return `<div class="intel-line-chart">${[healthScore, Math.max(10, 100 - incidents * 8), Math.max(15, 82 - diagnostics * 3), Math.min(96, 58 + traces.length * 4), Math.min(99, 66 + Number(totals.leads || 0))].map(function (point, index) {
          return `<span style="--h:${point}%;--i:${index};"><b></b></span>`;
        }).join("")}</div>`;
      }
      if (kind === "trends") return `<div class="intel-bar-list">${barRows(trendEntries, "No trend data synced yet.")}</div>`;
      if (kind === "categories") return `<div class="intel-bar-list">${barRows(categoryEntries, "No category data synced yet.")}</div>`;
      if (kind === "diagnostics") {
        return `<div class="mission-list">${[
          ["Trace records", traces.length],
          ["Audit events", audits.length],
          ["Permission denials", audits.filter(function (event) { return /denied|permission/i.test(String(event.action || "")); }).length],
          ["Open support signals", incidents],
        ].map(function (row) {
          return `<div class="device-category"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(String(row[1]))}</strong></div>`;
        }).join("")}</div>`;
      }
      if (kind === "analytics") return `<div class="intel-bar-list">${barRows([{ label: "Estates", value: estates.length }, { label: "Devices", value: devices.length }, { label: "Support signals", value: notifications.length }, { label: "Audit records", value: audits.length }], "No analytics data synced yet.")}</div>`;
      if (kind === "device_intel") return `<div class="intel-bar-list">${barRows(rankEntries(derived.deviceStatusCounts || {}, 8), "No device status data synced yet.")}</div>`;
      if (kind === "support_intel") return `<div class="intel-bar-list">${barRows(rankEntries(derived.notificationStatusCounts || {}, 8), "No support intelligence synced yet.")}</div>`;
      if (kind === "estate_compare") return `<div class="intel-bar-list">${barRows(estates.slice(0, 8).map(function (estate) { return { label: estate.name || estate.id || "Estate", value: Number(estate.devices_count || estate.homes_count || estate.buildings_count || 1) }; }), "No estates synced yet.")}</div>`;
      if (kind === "ai_cards" || kind === "anomaly" || kind === "automation") return `<div class="mission-list ai-insight-list">${context.insightRows.map(function (item) {
        return `<div class="insight-row"><span class="insight-icon">${officeIcon(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div><span class="office-system-badge ${item.tone === "warning" ? "warning" : ""}">${escapeHtml(item.tone)}</span></div>`;
      }).join("")}</div>`;
      if (kind === "evidence" || kind === "event_trail") return `<div class="mission-list">${audits.slice(0, 6).map(function (event) { return `<div class="activity-row compact"><span>${officeIcon("trend")}</span><div class="activity-copy"><strong>${escapeHtml(event.action || "audit.recorded")}</strong><span>${escapeHtml(event.actor_email || event.actor || "Office")} · ${escapeHtml(formatDate(event.created_at))}</span></div></div>`; }).join("") || '<div class="office-detail-empty">No audit evidence synced yet.</div>'}</div>`;
      if (kind === "report_totals") return `<div class="mission-list">${Object.entries(totals).slice(0, 8).map(function (entry) { return `<div class="device-category"><span>${escapeHtml(entry[0].replace(/_/g, " "))}</span><strong>${escapeHtml(String(entry[1] || 0))}</strong></div>`; }).join("") || '<div class="office-detail-empty">No report totals synced yet.</div>'}</div>`;
      if (kind === "source_breakdown") return `<div class="intel-bar-list">${barRows(rankEntries((state.report && state.report.by_source) || {}, 8), "No source data synced yet.")}</div>`;
      if (kind === "status_breakdown") return `<div class="intel-bar-list">${barRows(rankEntries((state.report && state.report.by_status) || {}, 8), "No status data synced yet.")}</div>`;
      if (kind === "report_actions") return `<div class="shortcut-grid compact-action-grid"><button class="shortcut-btn" data-office-target="facilities" type="button"><span>${officeIcon("estate")}</span>Facility Report</button><button class="shortcut-btn" data-office-target="edge" type="button"><span>${officeIcon("camera")}</span>Edge Report</button><button class="shortcut-btn" data-office-target="reports" type="button"><span>${officeIcon("trend")}</span>Analytics</button><button class="shortcut-btn" data-command-action="view_reports" type="button"><span>${officeIcon("settings")}</span>Export Summary</button></div>`;
      if (kind === "predictive" || kind === "maintenance" || kind === "capacity" || kind === "next_actions") return `<div class="mission-list">${[
        ["Incident risk", incidents > 5 ? "Elevated" : "Normal"],
        ["Maintenance pressure", notifications.length ? `${notifications.length} live signals` : "No live pressure"],
        ["Device capacity", devices.length ? `${devices.length} devices under watch` : "Awaiting device sync"],
        ["Recommended action", incidents ? "Review open incident queue" : "Keep monitoring"],
      ].map(function (row) { return `<div class="device-category"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(String(row[1]))}</strong></div>`; }).join("")}</div>`;
      if (kind === "diagnostic_console") return `<div class="mission-list">${traces.slice(0, 6).map(function (trace) { return `<div class="activity-row compact"><span>${officeIcon("settings")}</span><div class="activity-copy"><strong>${escapeHtml(trace.name || trace.event || "trace")}</strong><span>${escapeHtml(formatDate(trace.created_at || trace.timestamp))}</span></div></div>`; }).join("") || '<div class="office-detail-empty">No trace diagnostics synced yet.</div>'}</div>`;
      if (kind === "permission_denials") return `<div class="mission-list">${audits.filter(function (event) { return /denied|permission/i.test(String(event.action || "")); }).slice(0, 6).map(function (event) { return `<div class="activity-row compact"><span>${officeIcon("alert")}</span><div class="activity-copy"><strong>${escapeHtml(event.action || "permission.denied")}</strong><span>${escapeHtml(event.actor_email || "Unknown actor")}</span></div></div>`; }).join("") || '<div class="office-detail-empty">No permission denials recorded.</div>'}</div>`;
      if (kind === "health_checks") return `<div class="mission-list">${[
        ["Office report", Boolean(state.report)],
        ["Audit stream", audits.length > 0],
        ["Trace stream", traces.length > 0],
        ["Estate data", estates.length > 0],
      ].map(function (row) { return `<div class="ai-health-row"><span>${escapeHtml(row[0])}</span><span class="subtext"><i class="ai-status-dot" style="display:inline-block;margin-right:7px;background:${row[1] ? "#39e58f" : "#f6c85f"};"></i>${row[1] ? "Active" : "Pending"}</span></div>`; }).join("")}</div>`;
      return '<div class="office-detail-empty">This intelligence section is ready for live data.</div>';
    }
    return (panels[facet] || panels.dashboard).map(function (panel) {
      return `<article class="command-card ${panel[2] === "chart" ? "intelligence-chart-card" : ""}"><div class="command-card-head"><h4>${escapeHtml(panel[0])}</h4><span class="subtext">${escapeHtml(panel[1])}</span></div>${panelBody(panel[2])}</article>`;
    }).join("");
  }

  function renderInfrastructureIntelligenceDashboard() {
    if (!el.infrastructureIntelligencePanel) return;
    if (!hasPermission("view_reports")) {
      el.infrastructureIntelligencePanel.innerHTML = '<div class="office-detail-empty">Your role cannot access Office reports.</div>';
      return;
    }
    const overview = buildOverviewDomains();
    const domain = overview.domains.infrastructure_intelligence;
    const derived = getDerivedData();
    const totals = state.report?.totals || {};
    const activeFacet = state.moduleFacet.reports || "dashboard";
    const reportRows = [
      {
        title: "Executive summary",
        type: "Executive",
        owner: "Office",
        status: state.report ? "Available" : "Pending",
        evidence: state.report ? `${totals.leads || 0} CRM records` : "Report summary not loaded",
        action: "Review",
      },
      {
        title: "Operational report",
        type: "Operations",
        owner: "Facilities",
        status: overview.openNotifications ? "Attention" : "Stable",
        evidence: `${overview.openNotifications || 0} open notifications`,
        action: "Open",
      },
      {
        title: "CRM / commercial report",
        type: "Commercial",
        owner: "CRM",
        status: state.allProposals.length ? "Active" : "Pending",
        evidence: `${state.allProposals.length} proposals · ${formatCompactMoney(state.report?.pipeline_value || 0)} pipeline`,
        action: "Review",
      },
      {
        title: "Deployment report",
        type: "Deployments",
        owner: "Operations",
        status: state.allDemos.length ? "Active" : "Pending",
        evidence: `${state.allDemos.length || 0} reviews/workspaces`,
        action: "Open",
      },
      {
        title: "Audit and trace report",
        type: "Diagnostics",
        owner: "Governance",
        status: state.traces.length || state.audit.length ? "Available" : "Pending",
        evidence: `${state.traces.length} traces · ${state.audit.length} audit events`,
        action: "Inspect",
      },
    ];
    const diagnostics = state.traces.length + state.audit.filter(function (event) {
      return /error|denied|fail|diagnostic|permission/i.test(String(event.action || ""));
    }).length;
    const reportEvidenceRows = state.traces.slice(0, 4).map(function (trace) {
      return {
        title: displayValue(trace.agent || trace.type, "Trace evidence"),
        meta: `${displayValue(trace.tool_name || trace.status, "runtime")} · ${formatDate(trace.created_at || trace.ts)}`,
        tone: /fail|error|denied/i.test(`${trace.status || ""} ${trace.type || ""}`) ? "critical" : "",
      };
    }).concat(state.audit.slice(0, 4).map(function (event) {
      return {
        title: displayValue(event.action, "Audit event"),
        meta: `${displayValue(event.actor_email || event.actor, "Office")} · ${formatDate(event.created_at || event.ts)}`,
        tone: /fail|denied|error/i.test(String(event.action || "")) ? "critical" : "",
      };
    })).slice(0, 6);
    const activityRows = state.notifications.slice(0, 3).map(function (note) {
      return {
        title: displayValue(note.title || note.type, "Operational signal"),
        meta: `${displayValue(note.status, "open")} · ${displayValue(note.summary || note.reason, "Infrastructure activity")}`,
        tone: /critical|urgent|forced|fail|offline/i.test(`${note.priority || ""} ${note.type || ""} ${note.summary || ""}`) ? "critical" : "warning",
      };
    }).concat(state.audit.slice(0, 3).map(function (event) {
      return {
        title: displayValue(event.action, "audit.recorded"),
        meta: `${displayValue(event.actor_email || event.actor, "Office")} · ${formatDate(event.created_at || event.timestamp)}`,
        tone: /denied|fail|error/i.test(String(event.action || "")) ? "critical" : "info",
      };
    })).slice(0, 6);
    const facetTitle = {
      dashboard: "Office Reports Overview",
      analytics: "Analytics",
      ai_insights: "AI Insights",
      reports: "Reports",
      predictive_operations: "Predictive Operations",
      diagnostics: "Diagnostics",
    }[activeFacet] || "Office Reports Overview";

    el.infrastructureIntelligencePanel.innerHTML = `
      <div class="command-page">
        <div class="command-head">
          <div>
            <p class="eyebrow">Reports</p>
            <h3>Review executive summaries, operational reports, commercial posture, deployment evidence, and runtime diagnostics.</h3>
            <p class="subtext" style="margin:8px 0 0;">Office reports are assembled from existing report summaries, traces, audit logs, notifications, CRM, deployments, and Office collections.</p>
          </div>
          <div class="toolbar">
            <button class="ghost" data-command-action="view_reports" type="button">Export summary</button>
            <button class="ghost" data-office-target="intelligence" type="button">Ask Oyi</button>
          </div>
        </div>
        ${operationalStrip([
          { label: "Executive", value: state.report ? "Available" : "Pending", meta: "Summary source" },
          { label: "Operational", value: overview.openNotifications || 0, meta: "Open signals" },
          { label: "Commercial", value: state.allProposals.length, meta: "Proposal records" },
          { label: "Deployments", value: state.allDemos.length, meta: "Reviews/workspaces" },
          { label: "Audit", value: state.audit.length, meta: "Governance trail" },
          { label: "Diagnostics", value: diagnostics, meta: "Trace + audit evidence" },
        ])}
        <div class="command-layout">
          <div class="command-main">
            <section class="command-card">
              <div class="command-card-head">
                <h4>${escapeHtml(facetTitle)}</h4>
                <div class="toolbar">
                  <button class="ghost compact" data-office-target="crm" type="button">CRM</button>
                  <button class="ghost compact" data-office-target="deployments" type="button">Deployments</button>
                  <button class="ghost compact" data-office-target="agents" type="button">Traces</button>
                </div>
              </div>
              <table class="command-table">
                <thead><tr><th>Report</th><th>Type</th><th>Owner</th><th>Status</th><th>Evidence</th><th>Action</th></tr></thead>
                <tbody>${reportRows.map(function (row) {
                  return `<tr><td><strong>${escapeHtml(row.title)}</strong></td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.owner)}</td><td><span class="office-system-badge ${/attention|pending/i.test(row.status) ? "warning" : ""}">${escapeHtml(row.status)}</span></td><td>${escapeHtml(row.evidence)}</td><td><button class="ghost compact" data-office-target="${row.type === "Commercial" ? "crm" : row.type === "Deployments" ? "deployments" : row.type === "Diagnostics" ? "agents" : "intelligence"}" type="button">${escapeHtml(row.action)}</button></td></tr>`;
                }).join("")}</tbody>
              </table>
            </section>
            <article class="command-card">
              <div class="command-card-head"><h4>Audit / Trace Evidence</h4><span class="office-system-badge">${reportEvidenceRows.length ? "Available" : "Pending"}</span></div>
              <div class="mission-list">
                ${reportEvidenceRows.length ? reportEvidenceRows.map(function (row) {
                  return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot ${row.tone || ""}"></i></span><div class="activity-copy"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.meta)}</span></div></div>`;
                }).join("") : '<div class="office-detail-empty">Report evidence will appear as traces and audit records sync.</div>'}
              </div>
            </article>
          </div>
          <aside class="command-side context-rail">
            <article class="command-card">
              <div class="command-card-head"><h4>Recent Activity</h4><button class="ghost compact" data-office-target="notifications" type="button">View all</button></div>
              <div class="mission-list">
                ${activityRows.length ? activityRows.map(function (item, index) {
                  const tone = item.tone || ["healthy", "warning", "info", "critical", "healthy"][index % 5];
                  return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot ${escapeHtml(tone === "healthy" ? "" : tone)}"></i></span><div class="activity-copy"><strong>${escapeHtml(item.title || "Activity")}</strong><span>${escapeHtml(item.meta || "Live update")}</span></div></div>`;
                }).join("") : '<div class="office-detail-empty">No live infrastructure activity has synced yet.</div>'}
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Report Detail</h4><span class="office-system-badge">Review</span></div>
              <div class="mission-list">
                <div class="device-category"><span>Total records</span><strong>${escapeHtml(String(totals.leads || 0))}</strong></div>
                <div class="device-category"><span>Review bookings</span><strong>${escapeHtml(String(state.report ? state.report.demos_booked || 0 : 0))}</strong></div>
                <div class="device-category"><span>Conversion</span><strong>${escapeHtml(String(totals.sales_handoff_conversion_pct || 0))}%</strong></div>
                <div class="device-category"><span>Average score</span><strong>${escapeHtml(String(totals.average_score || 0))}</strong></div>
              </div>
            </article>
            <article class="command-card">
              <div class="command-card-head"><h4>Conversation-ready Actions</h4></div>
              <div class="shortcut-grid compact-action-grid">
                <button class="shortcut-btn" data-office-target="intelligence" type="button"><span>${officeIcon("messenger")}</span>Ask Oyi</button>
                <button class="shortcut-btn" data-office-target="facilities" type="button"><span>${officeIcon("estate")}</span>Facility report</button>
                <button class="shortcut-btn" data-office-target="crm" type="button"><span>${officeIcon("lead")}</span>Commercial report</button>
                <button class="shortcut-btn" data-office-target="edge" type="button"><span>${officeIcon("camera")}</span>Edge report</button>
              </div>
            </article>
          </aside>
        </div>
      </div>
    `;
  }

  function renderReports() {
    renderInfrastructureIntelligenceDashboard();
    if (!el.reportsPanel) return;
    if (!hasPermission("view_reports")) {
      renderReportStrip();
      el.reportsPanel.innerHTML = '<div class="value empty">Your role cannot access reporting.</div>';
      el.sourcesPanel.innerHTML = '<div class="value empty">Reporting access is restricted.</div>';
      el.statusesPanel.innerHTML = '<div class="value empty">Reporting access is restricted.</div>';
      el.ownersPanel.innerHTML = '<div class="value empty">Reporting access is restricted.</div>';
      el.commercialStagesPanel.innerHTML = '<div class="value empty">Reporting access is restricted.</div>';
      el.upcomingDemosPanel.innerHTML = '<div class="value empty">Reporting access is restricted.</div>';
      return;
    }

    renderReportStrip();

    if (!state.report) {
      el.reportsPanel.innerHTML = '<div class="value empty">No report loaded yet.</div>';
      el.sourcesPanel.innerHTML = '<div class="value empty">No source breakdown yet.</div>';
      el.statusesPanel.innerHTML = '<div class="value empty">No stage breakdown yet.</div>';
      el.ownersPanel.innerHTML = '<div class="value empty">No owner breakdown yet.</div>';
      el.commercialStagesPanel.innerHTML = '<div class="value empty">No commercial stage data yet.</div>';
      el.upcomingDemosPanel.innerHTML = '<div class="value empty">No upcoming reviews yet.</div>';
      return;
    }

    const totals = state.report.totals || {};
    el.reportsPanel.innerHTML = `
      <div class="trace-head"><strong>Total records</strong><span>${escapeHtml(String(totals.leads || 0))}</span></div>
      <div class="trace-head"><strong>Total reviews</strong><span>${escapeHtml(String(totals.demos || 0))}</span></div>
      <div class="trace-head"><strong>Escalations</strong><span>${escapeHtml(String(totals.escalations || 0))}</span></div>
      <div class="trace-head"><strong>Sales handoff conversion</strong><span>${escapeHtml(
        `${totals.sales_handoff_conversion_pct || 0}%`
      )}</span></div>
      <div class="trace-head"><strong>Priority records</strong><span>${escapeHtml(String(totals.hot_leads || 0))}</span></div>
      <div class="trace-head"><strong>Average score</strong><span>${escapeHtml(String(totals.average_score || 0))}</span></div>
    `;
    el.sourcesPanel.innerHTML = keyValueLines(
      state.report.by_source,
      "No source data yet."
    );
    el.statusesPanel.innerHTML = keyValueLines(
      state.report.by_status,
      "No stage data yet."
    );
    el.ownersPanel.innerHTML = keyValueLines(
      state.report.by_owner,
      "No owner data yet."
    );
    el.commercialStagesPanel.innerHTML = keyValueLines(
      state.report.by_commercial_stage,
      "No commercial stage data yet."
    );
    const upcoming = state.report.upcoming_demos || [];
    el.upcomingDemosPanel.innerHTML = upcoming.length
      ? upcoming
          .map(function (demo) {
            return `
              <div class="trace-head">
                <strong>${escapeHtml(formatDate(demo.scheduled_for))}</strong>
                <span>${escapeHtml(demo.status || "pending")}</span>
              </div>
            `;
          })
          .join("")
      : '<div class="value empty">No upcoming reviews yet.</div>';
  }

  function renderLeadList() {
    filterLeads();
    updateQueueCards();
    const canManageLeads = hasPermission("manage_leads");

    if (!state.filteredLeads.length) {
      el.leadList.innerHTML = '<div class="value empty">No records match this view yet.</div>';
      return;
    }

    el.leadList.innerHTML = state.filteredLeads
      .map(function (lead) {
        const selected = state.selectedLeadIds.has(lead.id);
        const active = lead.id === state.selectedLeadId;
        return `
          <article class="lead-card ${active ? "active" : ""}">
            <div class="lead-head">
              <input class="lead-check" type="checkbox" data-lead-check="${lead.id}" ${selected ? "checked" : ""} />
              <div class="lead-main" data-lead-open="${lead.id}">
                <div class="lead-title">${escapeHtml(
                  leadTitle(lead)
                )}</div>
                <div class="subtext" style="margin-top: 6px;">${escapeHtml(leadMetaLine(lead))}</div>
                <div class="pill-row">
                  <span class="pill ${statusClass(lead.status)}">${escapeHtml(lead.status || "new")}</span>
                  <span class="pill" style="background:rgba(10,44,34,0.08);color:#214238;">${escapeHtml(ownerLabel(lead.owner))}</span>
                  ${
                    (lead.stage || lead.commercial_stage)
                      ? `<span class="pill" style="background:rgba(38, 120, 92, 0.12);color:#1b5a45;">${escapeHtml(
                          lead.stage || lead.commercial_stage
                        )}</span>`
                      : ""
                  }
                  <span class="pill" style="background:rgba(239,198,111,0.14);color:#6d5113;">score ${escapeHtml(String(lead.score || 0))}</span>
                </div>
              </div>
            </div>
            <div class="lead-quick-row" style="margin-top: 12px;">
              <select class="mini-select" data-inline-owner="${lead.id}" ${canManageLeads ? "" : "disabled"}>
                <option value="">Assign owner</option>
                <option value="marketing_agent" ${lead.owner === "marketing_agent" ? "selected" : ""}>Oma</option>
                <option value="sales_agent" ${lead.owner === "sales_agent" ? "selected" : ""}>Osa</option>
                <option value="human" ${lead.owner === "human" ? "selected" : ""}>Human</option>
              </select>
              <button class="ghost" type="button" data-inline-open="${lead.id}">Open</button>
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(el.leadList.querySelectorAll("[data-lead-open], [data-inline-open]")).forEach(
      function (node) {
        node.addEventListener("click", function () {
          selectLead(node.getAttribute("data-lead-open") || node.getAttribute("data-inline-open"));
        });
      }
    );

    Array.from(el.leadList.querySelectorAll("[data-lead-check]")).forEach(function (node) {
      node.addEventListener("change", function (event) {
        const leadId = node.getAttribute("data-lead-check");
        if (event.target.checked) {
          state.selectedLeadIds.add(leadId);
        } else {
          state.selectedLeadIds.delete(leadId);
        }
        updateQueueCards();
      });
    });

    Array.from(el.leadList.querySelectorAll("[data-inline-owner]")).forEach(function (node) {
      node.addEventListener("change", function () {
        const leadId = node.getAttribute("data-inline-owner");
        if (!node.value) {
          return;
        }
        setBulkStatus("Updating owner...");
        updateLeadPatch(leadId, { owner: node.value })
          .then(function () {
            setBulkStatus("Owner updated.");
          })
          .catch(function (error) {
            setBulkStatus(error.message || "Owner update failed.", true);
          });
      });
    });
  }

  function renderConversation() {
    if (state.centerMode === "browser" || !state.selectedLead) {
      renderLeadBrowser();
      return;
    }

    el.threadCanvas.classList.remove("browser-mode");
    el.composerCard.classList.remove("hidden");
    el.threadTitle.textContent =
      leadTitle(state.selectedLead);
    el.threadSubtitle.textContent = leadMetaLine(state.selectedLead);
    el.terminalMeta.textContent = conversationStateMeta();

    if (!state.conversations.length) {
      el.threadCanvas.innerHTML = '<div class="value empty">No conversation history yet for this record.</div>';
      return;
    }

    el.threadCanvas.innerHTML = state.conversations
      .map(function (item) {
        const role =
          item.message_role === "assistant"
            ? "assistant"
            : item.message_role === "tool"
            ? "tool"
            : "user";
        const body = role === "tool" ? toolSummary(item.content) : item.content;
        return `
          <div class="message ${role}">
            ${escapeHtml(body)}
            <div class="meta">${escapeHtml(
              `${ownerLabel(item.agent_name)} · ${formatDate(item.created_at)}`
            )}</div>
          </div>
        `;
      })
      .join("");
    el.threadCanvas.scrollTop = el.threadCanvas.scrollHeight;
  }

  function renderFounderInbox() {
    if (!hasPermission("manage_notifications")) {
      el.founderInbox.innerHTML =
        '<div class="office-detail-empty">Your role cannot access founder escalation workflows.</div>';
      return;
    }

    const derived = getDerivedData();
    const items = state.notifications.filter(function (notification) {
      return notification.type === "founder_escalation";
    });

    if (!items.length) {
      el.founderInbox.innerHTML = '<div class="office-detail-empty">No founder escalations right now.</div>';
      return;
    }

    el.founderInbox.innerHTML = items
      .map(function (notification) {
        const lead = derived.leadsById.get(notification.lead_id);
        const urgency = String(notification.urgency || "medium").toLowerCase();
        return `
          <article class="command-list-row inbox-row">
            <div class="inbox-row-top">
              <div class="inbox-row-title">
                <span class="inbox-dot ${urgency === "urgent" || urgency === "critical" ? "urgent" : "open"}">${urgency === "urgent" || urgency === "critical" ? "!" : "•"}</span>
                <div>
                  <strong>${escapeHtml(lead ? leadTitle(lead) : "Escalated record")}</strong>
                  <div class="subtext" style="margin-top:4px;">${escapeHtml(
                    lead ? leadMetaLine(lead) : "Record details unavailable"
                  )}</div>
                </div>
              </div>
              <span class="office-system-badge">${escapeHtml(urgency)}</span>
            </div>
            <div class="subtext" style="margin-top: 8px;">${escapeHtml(
              notification.summary || notification.reason || "Escalated for review"
            )}</div>
            <div class="inbox-action-row">
              <button class="ghost" type="button" data-founder-open="${notification.lead_id || ""}">Open record</button>
              <button class="outline" type="button" data-founder-assign="${notification.lead_id || ""}">Assign to human</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderBookings() {
    if (!hasPermission("view_reports")) {
      el.bookingsPanel.innerHTML =
        '<div class="value empty">Your role cannot access bookings.</div>';
      return;
    }

    if (!state.allDemos.length) {
      el.bookingsPanel.innerHTML =
        '<div class="value empty">No building reviews available right now.</div>';
      return;
    }

    const requested = state.allDemos.filter(function (demo) {
      return ["requested", "pending"].includes(String(demo.status || "").toLowerCase());
    });
    const confirmed = state.allDemos.filter(function (demo) {
      return String(demo.status || "").toLowerCase() === "confirmed";
    });

    function renderGroup(title, demos) {
      if (!demos.length) {
        return `
          <article class="detail-card" style="padding:16px;">
            <div class="key">${escapeHtml(title)}</div>
            <div class="value empty">No items in this state.</div>
          </article>
        `;
      }

      return `
        <article class="detail-card" style="padding:16px;">
          <div class="key">${escapeHtml(title)}</div>
          <div class="stack-12" style="margin-top:12px;">
            ${demos
              .map(function (demo) {
                const lead = demo.lead || {};
                const links = demoCalendarLinks(demo);
                return `
                  <div class="trace-item">
                    <div class="trace-head">
                      <strong>${escapeHtml(leadTitle(lead))}</strong>
                      <span>${escapeHtml(String(demo.status || "pending"))}</span>
                    </div>
                    <div class="subtext">${escapeHtml(leadMetaLine(lead))}</div>
                    <div class="value" style="margin-top:8px;">${escapeHtml(demoDisplayTime(demo))}</div>
                    <div class="toolbar" style="margin-top:10px;">
                      ${
                        links.google
                          ? `<a class="outline" href="${escapeHtml(links.google)}" target="_blank" rel="noreferrer">Google Calendar</a>`
                          : ""
                      }
                      ${
                        links.outlook
                          ? `<a class="outline" href="${escapeHtml(links.outlook)}" target="_blank" rel="noreferrer">Outlook</a>`
                          : ""
                      }
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </article>
      `;
    }

    el.bookingsPanel.innerHTML = [renderGroup("Requested / Pending", requested), renderGroup("Confirmed", confirmed)].join("");
  }

  function renderChannels() {
    if (!hasPermission("view_reports")) {
      el.channelsPanel.innerHTML =
        '<div class="value empty">Your role cannot access channel reporting.</div>';
      return;
    }

    const overview = state.channelOverview || { channels: [] };
    if (!overview.channels || !overview.channels.length) {
      el.channelsPanel.innerHTML =
        '<div class="value empty">No channel overview loaded yet.</div>';
      return;
    }

    el.channelsPanel.innerHTML = overview.channels
      .map(function (channel) {
        const status = String(channel.status || "staged").toLowerCase();
        return `
          <article class="channel-card">
            <div class="channel-card-head">
              <div>
                <div class="channel-title">${escapeHtml(channel.name || "Channel")}</div>
                <div class="subtext" style="margin-top:6px;">${escapeHtml(
                  channel.description || "Channel overview"
                )}</div>
              </div>
              <span class="channel-status ${escapeHtml(status)}">${escapeHtml(status.replace(/_/g, " "))}</span>
            </div>
            <div class="channel-metrics">
              <div class="channel-metric">
                <div class="key" style="margin:0;">Leads</div>
                <strong>${escapeHtml(String(channel.lead_count || 0))}</strong>
              </div>
              <div class="channel-metric">
                <div class="key" style="margin:0;">Open alerts</div>
                <strong>${escapeHtml(String(channel.open_notifications || 0))}</strong>
              </div>
            </div>
            <div class="channel-note">
              <strong style="display:block;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#0d5c46;">Operational note</strong>
              <div class="subtext" style="margin-top:6px;">${escapeHtml(
                channel.note || "No operational note recorded."
              )}</div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderCommercial() {
    if (!(hasPermission("manage_commercial") || hasPermission("view_reports"))) {
      el.commercialPanel.innerHTML =
        '<div class="value empty">Your role cannot access commercial workflow.</div>';
      return;
    }

    const derived = getDerivedData();
    const stages = [
      "new",
      "contacted",
      "qualified",
      "discovery_scheduled",
      "site_visit_scheduled",
      "proposal_sent",
      "negotiation",
      "commercial_approved",
      "won",
      "lost",
    ];
    const salesOwned = derived.ownerCounts.sales_agent || 0;
    const proposalActive = derived.activeProposalCount;
    const wonCount = derived.stageCounts.won || derived.wonCount || 0;
    const lostCount = derived.stageCounts.lost || derived.lostCount || 0;
    const leadsByStage = state.leads.reduce(function (acc, lead) {
      const stage = lead.stage || lead.commercial_stage || "new";
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(lead);
      return acc;
    }, {});

    const columns = stages
      .map(function (stage) {
        const leads = leadsByStage[stage] || [];
        return `
          <article class="board-column" data-stage-column="${escapeHtml(stage)}">
            <div class="board-column-head">
              <div class="key" style="margin:0;">${escapeHtml(stage)}</div>
              <span class="board-count">${escapeHtml(String(leads.length))}</span>
            </div>
            <div class="board-lane" data-stage-dropzone="${escapeHtml(stage)}">
              ${
                leads.length
                  ? leads
                      .map(function (lead) {
                        return `
                          <div class="board-card" draggable="true" data-commercial-card="${lead.id}" data-commercial-stage="${escapeHtml(stage)}">
                            <div class="board-card-head">
                              <h3 class="board-card-title">${escapeHtml(leadTitle(lead))}</h3>
                              <span class="board-card-units">${escapeHtml(String(lead.unit_count || "n/a"))} units</span>
                            </div>
                            <div class="board-card-meta">${escapeHtml(leadMetaLine(lead))}</div>
                            <div class="pill-row" style="margin-top:0;">
                              <span class="pill ${statusClass(lead.status)}">${escapeHtml(lead.status || "new")}</span>
                              <span class="pill" style="background:rgba(10,44,34,0.08);color:#214238;">${escapeHtml(ownerLabel(lead.owner))}</span>
                            </div>
                            <div class="board-card-snippet">${escapeHtml(
                              displayValue(lead.next_action || lead.summary, "Open record to review commercial next step")
                            )}</div>
                            <div class="board-card-actions">
                              <span class="subtext">${escapeHtml(displayValue(lead.property_type || lead.project_type, "Property type pending"))}</span>
                              <button class="ghost" type="button" data-commercial-open="${lead.id}">Open</button>
                            </div>
                          </div>
                        `;
                      })
                      .join("")
                  : '<div class="board-empty">Drop leads here</div>'
              }
            </div>
          </article>
        `;
      })
      .join("");

    const proposals = state.allProposals.length
      ? state.allProposals
          .map(function (proposal) {
            const lead = proposal.lead || {};
            return `
              <article class="proposal-card">
                <div class="trace-head">
                  <strong>${escapeHtml(proposal.title || proposal.tier_name || "Proposal")}</strong>
                  <span>${escapeHtml(proposal.status || "draft")}</span>
                </div>
                <div class="subtext">${escapeHtml(leadTitle(lead))} · ${escapeHtml(leadMetaLine(lead))}</div>
                <div class="value" style="margin-top:8px;">${escapeHtml(proposal.tier_name || "Tier not set")}</div>
                ${
                  hasPermission("manage_commercial")
                    ? `<div class="toolbar" style="margin-top:10px;">
                        <button class="outline" type="button" data-proposal-status="${proposal.id}" data-proposal-next="sent">Mark sent</button>
                        <button class="outline" type="button" data-proposal-status="${proposal.id}" data-proposal-next="accepted">Accept</button>
                        <button class="outline" type="button" data-proposal-status="${proposal.id}" data-proposal-next="declined">Decline</button>
                      </div>`
                    : ""
                }
              </article>
            `;
          })
          .join("")
      : '<div class="value empty">No proposals created yet.</div>';

    el.commercialPanel.innerHTML = `
      <div class="board-shell">
        <div class="board-summary">
          <div class="board-summary-card">
            <div class="key" style="margin:0;">Sales-owned</div>
            <strong>${escapeHtml(String(salesOwned))}</strong>
          </div>
          <div class="board-summary-card">
            <div class="key" style="margin:0;">Active proposals</div>
            <strong>${escapeHtml(String(proposalActive))}</strong>
          </div>
          <div class="board-summary-card">
            <div class="key" style="margin:0;">Won</div>
            <strong>${escapeHtml(String(wonCount))}</strong>
          </div>
          <div class="board-summary-card">
            <div class="key" style="margin:0;">Lost</div>
            <strong>${escapeHtml(String(lostCount))}</strong>
          </div>
        </div>
        <article class="detail-card" style="padding:16px;">
          <div class="trace-head">
            <div>
              <div class="key" style="margin:0;">Commercial Pipeline</div>
              <div class="subtext" style="margin-top:6px;">Drag records across stages to move the deal forward.</div>
            </div>
          </div>
          <div class="board-scroll" style="margin-top:12px;">
            <div class="board-grid">${columns}</div>
          </div>
        </article>
        <article class="detail-card" style="padding:16px;">
          <div class="trace-head">
            <div>
              <div class="key" style="margin:0;">Proposal Actions</div>
              <div class="subtext" style="margin-top:6px;">Review generated proposals and move them through send, accept, or decline.</div>
            </div>
          </div>
          <div class="proposal-rail" style="margin-top:12px;">${proposals}</div>
        </article>
      </div>
    `;

    Array.from(el.commercialPanel.querySelectorAll("[data-commercial-open]")).forEach(function (node) {
      node.addEventListener("click", function () {
        state.workspaceTab = "intelligence";
        renderWorkspaceTabs();
        selectLead(node.getAttribute("data-commercial-open"));
      });
    });

    Array.from(el.commercialPanel.querySelectorAll("[data-proposal-status]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const proposalId = node.getAttribute("data-proposal-status");
        const nextStatus = node.getAttribute("data-proposal-next");
        updateProposalStatus(proposalId, nextStatus).catch(function (error) {
          setDetailStatus(error.message || "Proposal update failed.", true);
        });
      });
    });

    let draggingLeadId = "";
    Array.from(el.commercialPanel.querySelectorAll("[data-commercial-card]")).forEach(function (node) {
      node.addEventListener("dragstart", function () {
        draggingLeadId = node.getAttribute("data-commercial-card");
        node.classList.add("dragging");
      });
      node.addEventListener("dragend", function () {
        node.classList.remove("dragging");
        Array.from(el.commercialPanel.querySelectorAll("[data-stage-column]")).forEach(function (column) {
          column.classList.remove("drag-over");
        });
      });
    });

    Array.from(el.commercialPanel.querySelectorAll("[data-stage-column]")).forEach(function (node) {
      node.addEventListener("dragover", function (event) {
        event.preventDefault();
        node.classList.add("drag-over");
      });
      node.addEventListener("dragleave", function () {
        node.classList.remove("drag-over");
      });
      node.addEventListener("drop", function (event) {
        event.preventDefault();
        node.classList.remove("drag-over");
        const nextStage = node.getAttribute("data-stage-column");
        if (!draggingLeadId || !nextStage) {
          return;
        }
        moveCommercialLead(draggingLeadId, nextStage).catch(function (error) {
          setDetailStatus(error.message || "Could not move commercial stage.", true);
        });
      });
    });
  }

  function renderLeadBrowser() {
    filterLeads();
    el.threadTitle.textContent = queueTitle();
    el.threadSubtitle.textContent = `${state.filteredLeads.length} record${state.filteredLeads.length === 1 ? "" : "s"} in this view`;
    el.terminalMeta.textContent = "Open a record to inspect the thread and next actions";
    el.threadCanvas.classList.add("browser-mode");
    el.composerCard.classList.add("hidden");

    if (!state.filteredLeads.length) {
      el.threadCanvas.innerHTML = '<div class="value empty">No records match this view yet.</div>';
      return;
    }

    el.threadCanvas.innerHTML = state.filteredLeads
      .map(function (lead) {
        return `
          <article class="lead-card browser-lead-card">
            <div>
              <div class="lead-title">${escapeHtml(leadTitle(lead))}</div>
              <div class="subtext" style="margin-top: 6px;">${escapeHtml(leadMetaLine(lead))}</div>
            </div>
            <div class="pill-row" style="margin-top:0;">
              <span class="pill ${statusClass(lead.status)}">${escapeHtml(lead.status || "new")}</span>
              <span class="pill" style="background:rgba(10,44,34,0.08);color:#214238;">${escapeHtml(ownerLabel(lead.owner))}</span>
              ${
                (lead.stage || lead.commercial_stage)
                  ? `<span class="pill" style="background:rgba(38, 120, 92, 0.12);color:#1b5a45;">${escapeHtml(
                      lead.stage || lead.commercial_stage
                    )}</span>`
                  : ""
              }
              <span class="pill" style="background:rgba(239,198,111,0.14);color:#6d5113;">score ${escapeHtml(String(lead.score || 0))}</span>
            </div>
            <div class="subtext">${escapeHtml(displayValue(lead.next_action || lead.summary, "Open record to review next step"))}</div>
            <div class="lead-quick-row">
              <span class="subtext">${escapeHtml(displayValue(lead.project_type, "Project type pending"))}</span>
              <button class="ghost" type="button" data-browser-open="${lead.id}">Open thread</button>
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(el.threadCanvas.querySelectorAll("[data-browser-open]")).forEach(function (node) {
      node.addEventListener("click", function () {
        selectLead(node.getAttribute("data-browser-open"));
      });
    });
  }

  function renderAudit() {
    if (!hasPermission("view_audit")) {
      el.auditPanel.innerHTML =
        '<div class="office-detail-empty">Your role cannot access the Knowledge Pack.</div>';
      return;
    }

    const query = state.auditQuery.trim().toLowerCase();
    const items = state.audit.filter(function (event) {
      if (!query) return true;
      return getSearchText(auditSearchCache, event).includes(query);
    });

    if (!items.length) {
      el.auditPanel.innerHTML =
        '<div class="office-detail-empty">No knowledge activity matches this filter.</div>';
      return;
    }

    el.auditPanel.innerHTML = items
      .slice(0, 120)
      .map(function (event) {
        const target = [event.target_type || "", event.target_id || ""].filter(Boolean).join(" ");
        const actor = [event.actor_email || "System", event.actor_role || ""].filter(Boolean).join(" · ");
        const metadata = event.metadata && Object.keys(event.metadata || {}).length
          ? JSON.stringify(event.metadata || {})
          : "No extra evidence attached.";
        return `
          <article class="command-list-row knowledge-row">
            <div class="knowledge-row-top">
              <div class="knowledge-row-title">
                <span class="knowledge-dot">⌁</span>
                <div>
                  <strong>${escapeHtml(String(event.action || "Knowledge event").replace(/_/g, " "))}</strong>
                  <div class="subtext" style="margin-top:4px;">${escapeHtml(actor)}${target ? ` · ${escapeHtml(target)}` : ""}</div>
                </div>
              </div>
              <span class="subtext">${escapeHtml(formatDate(event.created_at))}</span>
            </div>
            <div class="value" style="margin-top:8px;">${escapeHtml(metadata)}</div>
          </article>
        `;
      })
      .join("");
  }

  function tokenMode() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const token = params.get("token");
    return token ? { mode, token } : null;
  }

  function renderTokenActionCard() {
    const tokenState = tokenMode();
    if (!tokenState) {
      el.tokenActionCard.style.display = "none";
      return;
    }
    el.tokenActionCard.style.display = "block";
    const inviteMode = tokenState.mode === "invite";
    el.tokenActionTitle.textContent = inviteMode ? "Accept admin invite" : "Confirm password reset";
    el.tokenDisplayName.style.display = inviteMode ? "block" : "none";
    el.tokenPassword.placeholder = inviteMode ? "Choose your password" : "Enter new password";
  }

  function notificationMatchesFilter(notification) {
    if (state.notificationFilter === "all") return true;
    if (state.notificationFilter === "open") return (notification.status || "open") === "open";
    if (state.notificationFilter === "founder") return notification.type === "founder_escalation";
    if (state.notificationFilter === "sales") return notification.type === "sales_handoff";
    if (state.notificationFilter === "demo") return notification.type === "demo_requested";
    return true;
  }

  function renderNotifications() {
    if (!hasPermission("manage_notifications")) {
      el.notificationsPanel.innerHTML =
        '<div class="office-detail-empty">Your role cannot access the notification inbox.</div>';
      return;
    }

    Array.from((el.notificationFilters || document).querySelectorAll("[data-notification-filter]")).forEach(
      function (node) {
        node.classList.toggle(
          "active",
          node.getAttribute("data-notification-filter") === state.notificationFilter
        );
      }
    );

    const items = state.notifications.filter(notificationMatchesFilter);
    if (!items.length) {
      el.notificationsPanel.innerHTML =
        '<div class="office-detail-empty">No notifications match this view right now.</div>';
      return;
    }

    const derived = getDerivedData();
    el.notificationsPanel.innerHTML = items
      .map(function (notification) {
        const lead = derived.leadsById.get(notification.lead_id);
        const status = String(notification.status || "open").toLowerCase();
        const typeLabel =
          notification.type === "founder_escalation"
            ? "Founder escalation"
            : notification.type === "sales_handoff"
            ? "Sales handoff"
            : notification.type === "demo_requested"
            ? "Demo request"
            : notification.type === "inbound_message"
            ? "New inbound message"
            : notification.type || "Notification";
        return `
          <article class="command-list-row inbox-row">
            <div class="inbox-row-top">
              <div class="inbox-row-title">
                <span class="inbox-dot ${status === "open" ? "open" : ""}">•</span>
                <div>
                  <strong>${escapeHtml(typeLabel)}</strong>
                  <div class="subtext" style="margin-top:4px;">${escapeHtml(
                    lead ? leadTitle(lead) : "Record"
                  )} · ${escapeHtml(
                    displayValue(notification.channel || notification.metadata?.source, "website")
                  )} · ${escapeHtml(formatDate(notification.created_at))}</div>
                </div>
              </div>
              <span class="office-system-badge">${escapeHtml(status)}</span>
            </div>
            <div class="value" style="margin-top:8px;">${escapeHtml(
              notification.summary || notification.reason || "No summary recorded."
            )}</div>
            <div class="inbox-action-row">
              <button class="ghost" type="button" data-notification-open="${notification.lead_id || ""}">Open record</button>
              <button class="outline" type="button" data-notification-status="${notification.id}" data-status-value="resolved">Mark resolved</button>
              <button class="outline" type="button" data-notification-status="${notification.id}" data-status-value="open">Reopen</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderAdminModuleSection(section) {
    const roleCounts = state.adminUsers.reduce(function (acc, user) {
      const key = user.role || "viewer";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const integrationRows = crmIntegrationStatusRows();
    const rowsBySection = {
      permissions: {
        title: "Permission Control",
        subtitle: "Role-based and action-based access posture across Office, Facility, Consumer, Edge, Plan Studio, and Digital Twin surfaces.",
        cards: [
          ["Super admins", (roleCounts.admin || 0) + (roleCounts.founder || 0), "Full governance authority"],
          ["Operators", roleCounts.operator || 0, "Scoped operations access"],
          ["Sales / CRM", roleCounts.sales || 0, "Commercial relationship access"],
          ["Viewers", roleCounts.viewer || 0, "Read-only supervision"],
        ],
        actions: [
          ["Queue permission review", "open_permissions", "governance"],
          ["View audit trail", "view_reports", "trend"],
        ],
      },
      settings: {
        title: "System Settings",
        subtitle: "Office defaults, notification behavior, security posture, integration readiness, and production sync controls.",
        cards: [
          ["Runtime", "Production grid", "Office command runtime"],
          ["Security", "Role based", "Scoped access checks"],
          ["Notifications", "Live", "Inbox and escalation routing"],
          ["Audit", state.audit.length || 0, "Recorded governance events"],
        ],
        actions: [
          ["Open platform status", "admin_settings", "settings"],
          ["Queue security review", "open_permissions", "governance"],
        ],
      },
      integrations: {
        title: "Integration Settings",
        subtitle: "Provider credentials, CRM channels, maps, email, realtime, webhooks, and platform connectivity status.",
        cards: [
          ["Connected providers", integrationRows.filter(function (row) { return row.connected; }).length, "Verified environment credentials"],
          ["Disconnected providers", integrationRows.filter(function (row) { return !row.connected; }).length, "Needs credential review"],
          ["Realtime channels", state.channelOverview?.channels?.length || 0, "Office event channels"],
          ["Map provider", state.mapConfig?.provider || "google", "Infrastructure map layer"],
        ],
        actions: [
          ["View provider status", "admin_integrations", "trend"],
          ["Add integration task", "add_new_tool", "settings"],
        ],
      },
      accounts: {
        title: "Accounts",
        subtitle: "Office accounts, login readiness, staff identity state, invite posture, and account lifecycle controls.",
        cards: [
          ["Staff accounts", state.adminUsers.length, "Office identities"],
          ["Active accounts", state.adminUsers.filter(function (user) { return String(user.status || "active") === "active"; }).length, "Currently enabled"],
          ["Pending login", state.adminUsers.filter(function (user) { return !user.last_login_at; }).length, "No login recorded"],
          ["Invite ready", hasPermission("manage_security") ? "Yes" : "Restricted", "Requires security permission"],
        ],
        actions: [
          ["Open staff registry", "admin_staff", "lead"],
          ["Create invite", "admin_invite", "messenger"],
        ],
      },
      super_admin: {
        title: "Super Admin",
        subtitle: "High-authority controls for permissions, safety reviews, system access, and production governance.",
        cards: [
          ["Authority", isSuperAdmin() ? "Full" : "Restricted", "Super-admin visibility"],
          ["Permission reviews", state.audit.filter(function (event) { return /permission/i.test(String(event.action || "")); }).length, "Governance records"],
          ["Security controls", hasPermission("manage_security") ? "Ready" : "Restricted", "Credential and reset actions"],
          ["Audit access", hasPermission("view_audit") ? "Enabled" : "Restricted", "Event visibility"],
        ],
        actions: [
          ["Queue permission review", "open_permissions", "governance"],
          ["Open audit", "admin_audit", "trend"],
        ],
      },
    };
    const sectionData = rowsBySection[section] || rowsBySection.settings;
    el.teamPanel.innerHTML = `
      <article class="team-card staff-profile-card admin-section-panel">
        <div class="command-card-head">
          <div>
            <h4>${escapeHtml(sectionData.title)}</h4>
            <p class="subtext" style="margin:6px 0 0;">${escapeHtml(sectionData.subtitle)}</p>
          </div>
          <span class="office-system-badge">Permission-aware</span>
        </div>
        <div class="office-detail-metrics admin-section-metrics">
          ${sectionData.cards.map(function (card) {
            return `<div class="office-system-metric"><div class="key">${escapeHtml(card[0])}</div><strong>${escapeHtml(String(card[1]))}</strong><span class="subtext">${escapeHtml(card[2])}</span></div>`;
          }).join("")}
        </div>
        <div class="shortcut-grid admin-section-actions">
          ${sectionData.actions.map(function (action) {
            const special = ["admin_staff", "admin_invite", "admin_audit", "admin_settings", "admin_integrations"].includes(action[1]);
            return `<button class="shortcut-btn" ${special ? `data-admin-shortcut="${escapeHtml(action[1])}"` : `data-command-action="${escapeHtml(action[1])}"`} type="button"><span>${officeIcon(action[2])}</span>${escapeHtml(action[0])}</button>`;
          }).join("")}
        </div>
      </article>
    `;
    if (el.staffActivityPanel) {
      const activity = state.audit.slice(0, 5).map(function (event) {
        return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot"></i></span><div class="activity-copy"><strong>${escapeHtml(event.action || "admin activity")}</strong><span>${escapeHtml(event.actor_email || "system")} · ${escapeHtml(formatDate(event.created_at || event.timestamp))}</span></div></div>`;
      }).join("");
      el.staffActivityPanel.innerHTML = activity || '<div class="office-detail-empty">Admin activity appears when audit events sync.</div>';
    }
  }

  function renderAdministrationDashboard(roleCounts, activeUsers, adminUsers, pendingLogins) {
    const integrationRows = crmIntegrationStatusRows();
    if (el.adminMainTitle) el.adminMainTitle.textContent = "Administration workspace";
    if (el.adminMainSubtitle) {
      el.adminMainSubtitle.textContent = "Holistic identity, roles, permissions, settings, integrations, accounts, and super-admin posture";
    }
    el.teamPanel.innerHTML = `
      <div class="admin-dashboard-grid">
        ${[
          ["Staff & Roles", state.adminUsers.length, `${activeUsers} active accounts`, "lead", "staff"],
          ["Permissions", (roleCounts.admin || 0) + (roleCounts.founder || 0), "High authority roles", "governance", "permissions"],
          ["System Settings", hasPermission("manage_security") ? "Ready" : "Restricted", "Security-scoped controls", "settings", "settings"],
          ["Integrations", integrationRows.filter(function (row) { return row.connected; }).length, `${integrationRows.length} provider checks`, "trend", "integrations"],
          ["Accounts", pendingLogins, "Pending first login", "messenger", "accounts"],
          ["Super Admin", isSuperAdmin() ? "Full" : "Scoped", "Authority boundary", "alert", "super_admin"],
        ].map(function (card) {
          return `<button class="admin-dashboard-card" data-admin-section="${escapeHtml(card[4])}" type="button"><span class="command-icon">${officeIcon(card[3])}</span><div><strong>${escapeHtml(card[0])}</strong><small>${escapeHtml(card[2])}</small></div><b>${escapeHtml(String(card[1]))}</b></button>`;
        }).join("")}
      </div>
    `;
    if (el.staffActivityPanel) {
      const activity = state.audit.slice(0, 6).map(function (event) {
        return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot"></i></span><div class="activity-copy"><strong>${escapeHtml(event.action || "administration event")}</strong><span>${escapeHtml(event.actor_email || "system")} · ${escapeHtml(formatDate(event.created_at || event.timestamp))}</span></div></div>`;
      }).join("");
      el.staffActivityPanel.innerHTML = activity || '<div class="office-detail-empty">Administrative activity appears when audit events sync.</div>';
    }
  }

  function renderTeamPanel() {
    if (!hasPermission("view_users")) {
      if (el.adminMetricsPanel) {
        el.adminMetricsPanel.innerHTML = [
          ["Staff Accounts", "Blocked", "Permission required"],
          ["Roles", "Blocked", "Permission required"],
          ["Invites", "Blocked", "Permission required"],
          ["Security", "Blocked", "Permission required"],
        ].map(function (item) {
          return `<div class="command-kpi"><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(item[1])}</strong><div class="subtext">${escapeHtml(item[2])}</div></div>`;
        }).join("");
      }
      el.teamPanel.innerHTML =
        '<div class="office-detail-empty">Your role cannot view office staff.</div>';
      el.createUserBtn.disabled = true;
      el.newUserName.disabled = true;
      el.newUserEmail.disabled = true;
      el.newUserRole.disabled = true;
      el.newUserPassword.disabled = true;
      setTeamStatus("Your role cannot access office staff administration.", true);
      setInviteStatus("Your role cannot create invite links.", true);
      return;
    }

    const roleCounts = state.adminUsers.reduce(function (acc, user) {
      const key = user.role || "viewer";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const activeUsers = state.adminUsers.filter(function (user) {
      return String(user.status || "active").toLowerCase() === "active";
    }).length;
    const adminUsers = (roleCounts.admin || 0) + (roleCounts.founder || 0);
    const pendingLogins = state.adminUsers.filter(function (user) {
      return !user.last_login_at;
    }).length;

    if (el.adminMetricsPanel) {
      el.adminMetricsPanel.innerHTML = [
        ["Staff Accounts", state.adminUsers.length, `${activeUsers} active operators`],
        ["Admin Roles", adminUsers, "Admin/founder authority"],
        ["Pending Setup", pendingLogins, "No login recorded"],
        ["Security", hasPermission("manage_security") ? "Ready" : "Restricted", "Invite/reset controls"],
      ].map(function (item) {
        return `<div class="command-kpi"><div class="key">${escapeHtml(item[0])}</div><strong>${escapeHtml(String(item[1]))}</strong><div class="subtext">${escapeHtml(item[2])}</div></div>`;
      }).join("");
    }

    const activeAdminSection = state.adminSection || "dashboard";
    Array.from(document.querySelectorAll("[data-admin-section]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-admin-section") === activeAdminSection);
    });
    if (activeAdminSection === "dashboard") {
      renderAdministrationDashboard(roleCounts, activeUsers, adminUsers, pendingLogins);
      return;
    }
    if (!["staff"].includes(activeAdminSection)) {
      renderAdminModuleSection(activeAdminSection);
      return;
    }

    if (el.adminMainTitle) el.adminMainTitle.textContent = "Office staff registry";
    if (el.adminMainSubtitle) {
      el.adminMainSubtitle.textContent = "Name, email, phone, QR credential, access state, permissions, and last login";
    }

    if (!state.adminUsers.length) {
      el.teamPanel.innerHTML = '<div class="office-detail-empty">No staff accounts loaded yet.</div>';
      if (el.staffActivityPanel) {
        el.staffActivityPanel.innerHTML = '<div class="office-detail-empty">Staff activity appears when accounts sync.</div>';
      }
    } else {
      el.teamPanel.innerHTML = state.adminUsers
        .map(function (user) {
          const canManageUsers = hasPermission("manage_users");
          const role = user.role || "viewer";
          const status = user.status || "active";
          const displayName = user.display_name || user.name || user.email || "Office staff";
          const permissionLevel =
            role === "admin"
              ? "Full office control"
              : role === "founder"
                ? "Founder governance"
                : role === "operator"
                  ? "Operations control"
                  : role === "sales"
                    ? "Commercial access"
                    : "Read-only access";
          const officeCredential = String(user.qr_code || user.badge_id || user.id || "staff").toUpperCase();
          const credentialPayload = JSON.stringify({
            system: "ochiga-office",
            type: "staff-credential",
            id: user.id || "",
            email: user.email || "",
            role,
          });
	          return `
	            <details class="team-card staff-profile-card staff-compact-card">
	              <summary class="staff-identity-row">
	                <div class="staff-photo" aria-label="Staff passport placeholder">${escapeHtml(initialsFromEmail(user.email || displayName))}</div>
	                <div>
	                  <div class="team-head" style="margin-bottom:4px;">
	                    <strong>${escapeHtml(displayName)}</strong>
	                    <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(roleLabel(role))}</span>
	                  </div>
	                  <div class="subtext">${escapeHtml(user.email || "Email pending")}</div>
	                  <div class="subtext" style="margin-top:5px;">${escapeHtml(displayValue(user.phone || user.mobile, "Phone pending"))}</div>
	                </div>
	                <img class="staff-qr" src="${escapeHtml(qrImageUrl(credentialPayload))}" alt="QR credential for ${escapeHtml(displayName)}" loading="lazy" />
	                <span class="office-system-badge ${status === "active" ? "" : "warning"}">${escapeHtml(status)}</span>
	              </summary>
	              <div class="staff-identity-row">
                <div class="staff-photo" aria-label="Staff passport placeholder">${escapeHtml(initialsFromEmail(user.email || displayName))}</div>
                <div>
                  <div class="team-head" style="margin-bottom:4px;">
                    <strong>${escapeHtml(displayName)}</strong>
                    <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(roleLabel(role))}</span>
                  </div>
                  <div class="subtext">${escapeHtml(user.email || "Email pending")}</div>
                  <div class="subtext" style="margin-top:5px;">${escapeHtml(displayValue(user.phone || user.mobile, "Phone pending"))} · ${escapeHtml(displayValue(user.department || user.unit, "Office operations"))}</div>
                </div>
                <img class="staff-qr" src="${escapeHtml(qrImageUrl(credentialPayload))}" alt="QR credential for ${escapeHtml(displayName)}" loading="lazy" />
              </div>
              <div class="staff-meta-grid">
                <div class="staff-meta-pill">
                  <div class="key" style="margin:0;">Permission</div>
                  <strong>${escapeHtml(permissionLevel)}</strong>
                </div>
                <div class="staff-meta-pill">
                  <div class="key" style="margin:0;">Access state</div>
                  <strong>${escapeHtml(status)}</strong>
                </div>
                <div class="staff-meta-pill">
                  <div class="key" style="margin:0;">Last login</div>
                  <strong>${escapeHtml(user.last_login_at ? formatDate(user.last_login_at) : "Never")}</strong>
                </div>
              </div>
	              <div class="staff-access-strip">
	                Credential: <span class="mono">${escapeHtml(officeCredential)}</span> · QR/NFC office check-in ready · Passport photo slot ready for staff profile upload.
	              </div>
              <div class="staff-control-panel">
                <div class="staff-control-row">
                  <label class="staff-select-wrap">
                    <select class="staff-control-select" data-user-role="${user.id}" ${
                      canManageUsers ? "" : "disabled"
                    }>
                      <option value="viewer" ${role === "viewer" ? "selected" : ""}>viewer</option>
                      <option value="operator" ${role === "operator" ? "selected" : ""}>operator</option>
                      <option value="sales" ${role === "sales" ? "selected" : ""}>sales</option>
                      <option value="founder" ${role === "founder" ? "selected" : ""}>founder</option>
                      <option value="admin" ${role === "admin" ? "selected" : ""}>admin</option>
                    </select>
                  </label>
                  <label class="staff-select-wrap">
                    <select class="staff-control-select" data-user-status="${user.id}" ${
                      canManageUsers ? "" : "disabled"
                    }>
                      <option value="active" ${status === "active" ? "selected" : ""}>active</option>
                      <option value="inactive" ${status === "inactive" ? "selected" : ""}>inactive</option>
                    </select>
                  </label>
                  <button class="ghost" type="button" data-user-save="${user.id}" ${
                    canManageUsers ? "" : "disabled"
                  }>Save access</button>
                </div>
                <div class="toolbar">
                  <input class="text-input" style="padding:10px 12px;" type="password" placeholder="Temporary reset password" data-user-password="${user.id}" ${
                    canManageUsers ? "" : "disabled"
                  } />
                  <button class="outline" type="button" data-user-reset="${user.id}" ${
                    canManageUsers ? "" : "disabled"
                  }>Reset password</button>
                  <button class="outline" type="button" data-user-reset-link="${user.id}" ${
                    canManageUsers ? "" : "disabled"
                  }>Issue reset link</button>
                </div>
              </div>
	            </details>
	          `;
        })
        .join("");
      if (el.staffActivityPanel) {
        el.staffActivityPanel.innerHTML = state.adminUsers.slice(0, 6).map(function (user) {
          const status = user.status || "active";
          const tone = status === "active" ? "healthy" : "warning";
          return `<div class="activity-row compact"><span class="activity-track"><i class="activity-dot ${tone === "healthy" ? "" : tone}"></i></span><div class="activity-copy"><strong>${escapeHtml(user.display_name || user.name || user.email || "Staff member")}</strong><span>${escapeHtml(roleLabel(user.role || "viewer"))} · ${escapeHtml(status)} · ${escapeHtml(user.last_login_at ? formatDate(user.last_login_at) : "no login yet")}</span></div></div>`;
        }).join("");
      }
    }

    const canManageUsers = hasPermission("manage_users");
    const canManageSecurity = hasPermission("manage_security");
    el.createUserBtn.disabled = !canManageUsers;
    el.newUserName.disabled = !canManageUsers;
    el.newUserEmail.disabled = !canManageUsers;
    el.newUserRole.disabled = !canManageUsers;
    el.newUserPassword.disabled = !canManageUsers;
    el.inviteUserBtn.disabled = !canManageSecurity;
    el.inviteUserName.disabled = !canManageSecurity;
    el.inviteUserEmail.disabled = !canManageSecurity;
    el.inviteUserRole.disabled = !canManageSecurity;
    if (!canManageUsers) {
      setTeamStatus("Your role cannot create users.", true);
    } else {
      setTeamStatus("", false);
    }
    if (!canManageSecurity) {
      setInviteStatus("Your role cannot create invite links.", true);
    } else {
      setInviteStatus("", false);
    }

  }

  function renderChannelState() {
    if (!state.selectedLead) {
      el.channelStatePanel.textContent = "No record selected.";
      el.channelStatePanel.className = "value empty";
      return;
    }

    const websiteState = [
      "Website widget: live",
      `Primary source: ${displayValue(state.selectedLead.source, "website_widget")}`,
      `Primary channel: ${displayValue(state.selectedLead.primary_channel, "website")}`,
    ];

    const whatsappState = state.channelState
      ? [
          "WhatsApp: active",
          `AI paused: ${state.channelState.ai_paused ? "yes" : "no"}`,
          `Human status: ${displayValue(state.channelState.human_status, "auto")}`,
          `Human owner: ${displayValue(state.channelState.human_owner, "Not assigned")}`,
          `Window expires: ${displayValue(
            state.channelState.customer_service_window_expires_at
              ? formatDate(state.channelState.customer_service_window_expires_at)
              : "",
            "Not available"
          )}`,
          `Last inbound: ${displayValue(
            state.channelState.last_inbound_at ? formatDate(state.channelState.last_inbound_at) : "",
            "Not available"
          )}`,
          `Last outbound: ${displayValue(
            state.channelState.last_outbound_at ? formatDate(state.channelState.last_outbound_at) : "",
            "Not available"
          )}`,
        ]
      : [
          "WhatsApp: no record-side state recorded yet",
          `Known contact: ${displayValue(state.selectedLead.whatsapp_phone || state.selectedLead.phone, "Not captured")}`,
        ];

    const futureChannels = [
      "Facebook DM: staged for activation",
      "Instagram DM: staged for activation",
    ];

    el.channelStatePanel.textContent = [
      websiteState.join("\n"),
      whatsappState.join("\n"),
      futureChannels.join("\n"),
    ].join("\n\n");
    el.channelStatePanel.className = "value";
  }

  function renderTimeline() {
    if (!state.selectedLead) {
      el.timelinePanel.innerHTML = '<div class="value empty">Select a record to inspect the operational timeline.</div>';
      return;
    }

    if (!state.timeline.length) {
      el.timelinePanel.innerHTML = '<div class="value empty">No timeline events yet for this record.</div>';
      return;
    }

    el.timelinePanel.innerHTML = state.timeline
      .map(function (event) {
        return `
          <article class="trace-item">
            <div class="trace-head">
              <strong>${escapeHtml(event.title || event.event_type || "event")}</strong>
              <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(
                formatDate(event.created_at)
              )}</span>
            </div>
            <div class="subtext">${escapeHtml(
              [event.event_type, event.actor].filter(Boolean).join(" · ")
            )}</div>
            <div class="value" style="margin-top: 8px;">${escapeHtml(event.body || "")}</div>
          </article>
        `;
      })
      .join("");
  }

  function renderTraceExplorer() {
    if (!hasPermission("view_traces")) {
      el.traceExplorer.innerHTML =
        '<div class="value empty">Your role cannot access traces.</div>';
      return;
    }

    const query = state.traceQuery.trim().toLowerCase();
    const traces = state.traces.filter(function (trace) {
      if (!query) return true;
      return getSearchText(traceSearchCache, trace).includes(query);
    });

    if (!traces.length) {
      el.traceExplorer.innerHTML = '<div class="value empty">No traces match this filter.</div>';
      return;
    }

    el.traceExplorer.innerHTML = traces
      .slice(0, 80)
      .map(function (trace) {
        return `
          <article class="trace-item">
            <div class="trace-head">
              <strong>${escapeHtml(trace.type || "trace")}</strong>
              <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(
                formatDate(trace.created_at || trace.ts)
              )}</span>
            </div>
            <div class="subtext">${escapeHtml(
              [
                trace.agent,
                trace.tool_name,
                trace.lead_id ? `record ${trace.lead_id.slice(0, 8)}` : "",
                trace.trace_id ? `trace ${trace.trace_id.slice(0, 8)}` : "",
              ]
                .filter(Boolean)
                .join(" · ")
            )}</div>
            <div class="value" style="margin-top: 8px;">${escapeHtml(
              JSON.stringify(trace.payload || {})
            )}</div>
          </article>
        `;
      })
      .join("");
  }

  function updateOfficeDomainActiveStates() {
    Array.from(document.querySelectorAll(".office-nav-domain")).forEach(function (domain) {
      let isActive = false;
      const target = domain.getAttribute("data-domain-target");
      const focus = domain.getAttribute("data-domain-focus");
      if (target === state.workspaceTab && (!focus || focus === state.overviewFocus)) {
        isActive = true;
      }
      let next = domain.nextElementSibling;
      while (!isActive && next && !next.classList.contains("office-nav-domain")) {
        if (next.classList.contains("office-nav-btn") && next.classList.contains("active")) {
          isActive = true;
        }
        next = next.nextElementSibling;
      }
      domain.classList.toggle("is-active", isActive);
    });
  }

  function renderWorkspaceTabs() {
    if (state.workspaceTab === "crm" && state.overviewFocus !== "crm") {
      state.overviewFocus = "crm";
    }
    if (!canAccessTab(state.workspaceTab)) {
      state.workspaceTab = "overview";
    }
    document.body.classList.toggle("workspace-overview", state.workspaceTab === "overview");
    document.body.classList.toggle(
      "workspace-command",
      [
        "facilities",
        "consumers",
        "crm",
        "projects",
        "deployments",
        "documents",
        "finance",
        "agents",
        "edge",
        "digital_twin",
        "team",
        "settings",
        "intelligence",
      ].includes(state.workspaceTab)
    );
    Array.from(el.officeNavButtons || []).forEach(function (node) {
      const target = node.getAttribute("data-office-target");
      const focus = node.getAttribute("data-office-focus");
      const visible = canAccessOfficeModule(target, focus);
      const destination = normalizeOfficeWorkspace(target, focus);
      const facet = destination.facet;
      node.hidden = !visible;
      node.setAttribute("aria-hidden", visible ? "false" : "true");
      const isActive =
        visible &&
        destination.target === state.workspaceTab &&
        (!destination.focus || destination.focus === state.overviewFocus) &&
        (!facet || state.moduleFacet[state.workspaceTab] === facet);
      node.classList.toggle("active", isActive);
    });
    updateOfficeDomainActiveStates();
    Array.from(document.querySelectorAll("[data-panel]")).forEach(function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-panel") === state.workspaceTab);
    });
    const overviewHeadings = {
      summary: {
        title: "Welcome back",
        subtitle: "Here is what is happening across Office OS today.",
      },
      live_infrastructure: {
        title: "Live Infrastructure",
        subtitle: "Realtime map, twin, heat, health, alerts, devices, and estate infrastructure command view.",
      },
      facilities: {
        title: "Facilities",
        subtitle: "Estate, building, account, and deployment oversight from one Office command surface.",
      },
      consumers: {
        title: "Consumers",
        subtitle: "Resident-facing oversight using current home, wallet, and facility-linked data.",
      },
      crm: {
        title: "CRM",
        subtitle: "Lead, relationship, support, and commercial pipeline supervision.",
      },
      projects: {
        title: "Projects",
        subtitle: "Commercial and delivery work regrouped from existing Office workflows.",
      },
      deployments: {
        title: "Deployments",
        subtitle: "Building reviews, workspace rollout, and provisioning readiness.",
      },
      documents: {
        title: "Documents",
        subtitle: "Proposals, contracts, invoices, PDFs, and operational files.",
      },
      finance: {
        title: "Finance",
        subtitle: "Wallet float, proposal value, and financial posture from current Office records.",
      },
      agents: {
        title: "Agents",
        subtitle: "Agent console, tool registry, voice command, and execution supervision.",
      },
      edge: {
        title: "Edge",
        subtitle: "Registry, discovery, telemetry, and edge-agent health without removing local runtime ownership.",
      },
      digital_twin: {
        title: "Digital Twin",
        subtitle: "Twin-ready surface for future facilities, consumers, and device state supervision.",
      },
      staff_roles: {
        title: "Team",
        subtitle: "Manage accounts, permissions, assignment posture, and operator readiness.",
      },
      governance: {
        title: "Reports",
        subtitle: "Audit, trace, analytics, diagnostics, and accountable operational oversight.",
      },
    };

    const workspaceCopy = {
      overview: overviewHeadings[state.overviewFocus] || overviewHeadings.summary,
      facilities: overviewHeadings.facilities,
      consumers: overviewHeadings.consumers,
      crm: overviewHeadings.crm,
      projects: overviewHeadings.projects,
      deployments: overviewHeadings.deployments,
      documents: overviewHeadings.documents,
      finance: overviewHeadings.finance,
      agents: overviewHeadings.agents,
      edge: overviewHeadings.edge,
      digital_twin: overviewHeadings.digital_twin,
      reports: {
        title: "Reports",
        subtitle: "Analytics, AI insights, predictive operations, diagnostics, and operational reporting.",
      },
      team: {
        title: "Team",
        subtitle: "Manage staff, roles, permissions, accounts, and super-admin controls.",
      },
      settings: {
        title: "Settings",
        subtitle: "Realtime, storage, API health, sync, providers, and environment posture.",
      },
      intelligence: {
        title: state.selectedLead ? `Oyi Intelligence · ${leadTitle(state.selectedLead)}` : "Oyi Intelligence",
        subtitle: state.selectedLead
          ? leadMetaLine(state.selectedLead)
          : "Ask about facilities, consumers, deployments, CRM, edge, documents, or executive operations.",
      },
    };
    const activeCopy = workspaceCopy[state.workspaceTab] || workspaceCopy.overview;
    el.threadTitle.textContent = activeCopy.title;
    el.threadSubtitle.textContent = activeCopy.subtitle;
    if (state.workspaceTab === "intelligence") {
      renderConversation();
    }
    renderFounderInbox();
    renderNotifications();
    renderChannels();
    renderReports();
    renderOverview();
    renderBookings();
    renderCommercial();
    renderTeamPanel();
    renderAudit();
    renderTraceExplorer();
    renderTimeline();
    renderPlatformInfrastructureDashboard();
    renderIntegrationHub();
    renderOfficeCommandPanels();
    renderSectionNav();
    updateHeaderActions();
    updateDetailRailState();
  }

  function renderDashboardAfterData() {
    try {
      renderLeadList();
      renderReports();
      renderNotifications();
      renderFounderInbox();
      renderBookings();
      renderChannels();
      renderCommercial();
      renderTeamPanel();
      renderAudit();
      renderTraceExplorer();
      renderTimeline();
      renderWorkspaceTabs();
    } catch (error) {
      console.error("[office-dashboard-render]", error);
      setAuthStatus("Signed in. Some dashboard sections could not render; refresh or open another module.", true);
      if (el.infrastructureIntelligencePanel) {
        el.infrastructureIntelligencePanel.innerHTML = `<div class="office-detail-empty">A dashboard section could not render: ${escapeHtml(error.message || "Unknown render error")}</div>`;
      }
    }
  }

  function summaryField(label, value) {
    return `
      <div class="detail-card">
        <div class="key">${escapeHtml(label)}</div>
        <div class="value ${value ? "" : "empty"}">${escapeHtml(value || "Not captured")}</div>
      </div>
    `;
  }

  function renderDetail() {
    if (!state.selectedLead) {
      el.detailTitle.textContent = "No record selected";
      el.detailSubtitle.textContent = "Update ownership, qualification, stage, next action, and commercial notes.";
      el.detailSummaryPrimary.innerHTML = '<div class="value empty">Select a record to inspect details and take action.</div>';
      el.detailSummaryMore.innerHTML = '<div class="value empty">More record detail appears here.</div>';
      el.memoryPanel.textContent = "No record selected.";
      el.memoryPanel.className = "value empty";
      el.tracePanel.innerHTML = '<div class="value empty">No record selected.</div>';
      el.snapshotBadge.textContent = "4";
      el.moreFieldsBadge.textContent = "0";
      el.memoryBadge.textContent = "0";
      el.traceBadge.textContent = "0";
      el.channelBadge.textContent = "0";
      el.updateBadge.textContent = "1";
      el.proposalBadge.textContent = "0";
      el.demoBadge.textContent = "0";
      el.escalationBadge.textContent = "0";
      renderChannelState();
      updateDetailRailState();
      return;
    }

    el.detailTitle.textContent =
      leadTitle(state.selectedLead);
    el.detailSubtitle.textContent = `Lead ID: ${state.selectedLead.id}`;

    const demos = state.demos.length
      ? state.demos
          .map(function (demo) {
            return `${formatDate(demo.scheduled_for)} · ${demo.status}`;
          })
          .join("\n")
      : "No reviews yet";

    el.detailSummaryPrimary.innerHTML = [
      summaryField("Company", displayValue(state.selectedLead.company, "Not captured")),
      summaryField("Role", displayValue(state.selectedLead.role, "Not captured")),
      summaryField("Email", displayValue(state.selectedLead.email, "Not captured")),
      summaryField("Phone", displayValue(state.selectedLead.phone, "Not captured")),
    ].join("");

    el.detailSummaryMore.innerHTML = [
      summaryField("Source", displayValue(state.selectedLead.source, "Not captured")),
      summaryField("Location", displayValue(state.selectedLead.location, "Not captured")),
      summaryField(
        "Property Type",
        displayValue(state.selectedLead.property_type || state.selectedLead.project_type, "Not captured")
      ),
      summaryField(
        "Property Size / Units",
        state.selectedLead.number_of_units || state.selectedLead.unit_count
          ? String(state.selectedLead.number_of_units || state.selectedLead.unit_count)
          : "Not captured"
      ),
      summaryField("Status", displayValue(state.selectedLead.status, "new")),
      summaryField("Owner", ownerLabel(state.selectedLead.owner)),
      summaryField("Pipeline Stage", displayValue(state.selectedLead.stage || state.selectedLead.commercial_stage, "Not set")),
      summaryField("Recommended Package", displayValue(state.selectedLead.interest_package, "Not recommended")),
      summaryField("Qualification", displayValue(state.selectedLead.qualification_status, "Not scored")),
      summaryField("Lost Reason", displayValue(state.selectedLead.lost_reason, "Not set")),
      summaryField("Score", String(state.selectedLead.score || 0)),
      summaryField("Next Action", displayValue(state.selectedLead.next_action, "No next action yet")),
      summaryField("Summary", displayValue(state.selectedLead.summary, "No summary yet")),
      summaryField("Review Pipeline", demos),
    ].join("");
    el.snapshotBadge.textContent = "4";
    el.moreFieldsBadge.textContent = "8";

    if (!state.memory) {
      el.memoryPanel.textContent = "No memory stored yet.";
      el.memoryPanel.className = "value empty";
      el.memoryBadge.textContent = "0";
    } else {
      el.memoryPanel.textContent = [
        `Known: ${JSON.stringify(state.memory.known_fields || {}, null, 2)}`,
        `Need signals: ${(state.memory.need_signals || []).join(", ") || "none"}`,
        `Open questions: ${(state.memory.open_questions || []).join(", ") || "none"}`,
        `Keywords: ${(state.memory.keywords || []).join(", ") || "none"}`,
        `Last status: ${state.memory.last_status || "unknown"}`,
        `Last owner: ${ownerLabel(state.memory.last_owner)}`,
      ].join("\n\n");
      el.memoryPanel.className = "value";
      el.memoryBadge.textContent = String(
        [
          Object.keys(state.memory.known_fields || {}).length,
          (state.memory.open_questions || []).length,
          (state.memory.need_signals || []).length,
        ].reduce(function (sum, value) {
          return sum + value;
        }, 0)
      );
    }
    renderChannelState();

    if (!hasPermission("view_traces")) {
      el.tracePanel.innerHTML =
        '<div class="value empty">Trace access is restricted for your role.</div>';
      el.traceBadge.textContent = "0";
    } else {
      const relatedTraces = state.traces.filter(function (trace) {
        return trace.lead_id === state.selectedLead.id;
      }).slice(0, 8);

      if (!relatedTraces.length) {
        el.tracePanel.innerHTML = '<div class="value empty">No traces for this record yet.</div>';
      } else {
        el.tracePanel.innerHTML = relatedTraces
          .map(function (trace) {
            return `
              <div class="trace-item">
                <div class="trace-head">
                  <strong>${escapeHtml(trace.type || "trace")}</strong>
                  <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(formatDate(trace.created_at || trace.ts))}</span>
                </div>
                <div class="subtext">${escapeHtml(trace.tool_name || trace.agent || "")}</div>
              </div>
            `;
          })
          .join("");
      }
      el.traceBadge.textContent = String(relatedTraces.length);
    }

    el.statusInput.value = "";
    el.ownerInput.value = "";
    el.projectTypeInput.value = state.selectedLead.property_type || state.selectedLead.project_type || "";
    el.unitCountInput.value = state.selectedLead.number_of_units || state.selectedLead.unit_count || "";
    el.commercialStageInput.value = state.selectedLead.stage || state.selectedLead.commercial_stage || "";
    el.lostReasonInput.value = state.selectedLead.lost_reason || "";
    el.scoreInput.value = state.selectedLead.score || "";
    el.nextActionInput.value = state.selectedLead.next_action || "";
    el.summaryInput.value = state.selectedLead.summary || "";

    const canManageLeads = hasPermission("manage_leads");
    const canManageDemos = hasPermission("manage_demos");
    const canEscalateFounder = hasPermission("escalate_founder");
    const canManageTakeover = hasPermission("manage_takeover");

    el.statusInput.disabled = !canManageLeads;
    el.ownerInput.disabled = !canManageLeads;
    el.projectTypeInput.disabled = !canManageLeads;
    el.unitCountInput.disabled = !canManageLeads;
    el.commercialStageInput.disabled = !canManageLeads;
    el.lostReasonInput.disabled = !canManageLeads;
    el.scoreInput.disabled = !canManageLeads;
    el.nextActionInput.disabled = !canManageLeads;
    el.summaryInput.disabled = !canManageLeads;
    el.updateLeadBtn.disabled = !canManageLeads;
    if (el.qualifyLeadBtn) el.qualifyLeadBtn.disabled = !canManageLeads;
    if (el.approveCommercialBtn) el.approveCommercialBtn.disabled = !hasPermission("manage_commercial");
    el.demoAtInput.disabled = !canManageDemos;
    if (el.reviewTypeInput) el.reviewTypeInput.disabled = !canManageDemos;
    el.demoNotesInput.disabled = !canManageDemos;
    el.createDemoBtn.disabled = !canManageDemos;
    if (el.provisionFacilityBtn) el.provisionFacilityBtn.disabled = !hasPermission("manage_commercial");
    el.escalationReasonInput.disabled = !canEscalateFounder;
    el.escalationSummaryInput.disabled = !canEscalateFounder;
    el.escalationUrgencyInput.disabled = !canEscalateFounder;
    el.escalateBtn.disabled = !canEscalateFounder;
    el.takeoverOwnerInput.disabled = !canManageTakeover;
    el.takeoverReasonInput.disabled = !canManageTakeover;
    el.pauseAiBtn.disabled = !canManageTakeover;
    el.resumeOmaBtn.disabled = !canManageTakeover;
    el.resumeOsaBtn.disabled = !canManageTakeover;
    el.keepHumanBtn.disabled = !canManageTakeover;
    el.agentSelect.disabled = !canManageLeads;
    el.composerInput.disabled = !canManageLeads;
    el.sendBtn.disabled = !canManageLeads;

    if (!state.proposals.length) {
      el.proposalListPanel.innerHTML = '<div class="value empty">No proposals yet for this record.</div>';
    } else {
      el.proposalListPanel.innerHTML = state.proposals
        .map(function (proposal) {
          const proposalText = proposal.body || "";
          const downloadHref = proposalText
            ? `data:text/markdown;charset=utf-8,${encodeURIComponent(proposalText)}`
            : "";
          return `
            <div class="trace-item">
              <div class="trace-head">
                <strong>${escapeHtml(proposal.title || proposal.tier_name || "Proposal")}</strong>
                <span>${escapeHtml(proposal.status || "draft")}</span>
              </div>
              <div class="subtext">${escapeHtml(proposal.tier_name || "Tier not set")}</div>
              <div class="value" style="margin-top:8px;">${escapeHtml(proposalText)}</div>
              ${
                downloadHref
                  ? `<div class="toolbar" style="margin-top:10px;">
                      <a class="outline" href="${downloadHref}" download="${escapeHtml(
                        `${proposal.title || proposal.tier_name || "oyi-proposal"}.md`
                      )}">Download draft</a>
                    </div>`
                  : ""
              }
            </div>
          `;
        })
        .join("");
    }
    el.channelBadge.textContent = state.channelState ? (state.channelState.ai_paused ? "1" : "0") : "0";
    el.updateBadge.textContent = "1";
    el.proposalBadge.textContent = String(state.proposals.length);
    el.demoBadge.textContent = String(state.demos.length);
    el.escalationBadge.textContent = String(
      (getDerivedData().notificationsByLeadId.get(state.selectedLead.id) || []).filter(function (notification) {
        return notification.type === "founder_escalation";
      }).length
    );

    el.proposalUnitsInput.value = state.selectedLead.unit_count || "";
    el.createProposalBtn.disabled = !hasPermission("manage_commercial");
    updateDetailRailState();
  }

  function setAgentChoice(choice) {
    el.agentSelect.value = choice;
    el.agentOmaBtn.classList.toggle("active", choice === "marketing");
    el.agentOsaBtn.classList.toggle("active", choice === "sales");
    renderSectionNav();
  }

  function closeOfficeEventStream() {
    if (state.officeEventSource) {
      state.officeEventSource.close();
      state.officeEventSource = null;
    }
    if (state.officeEventRefreshTimer) {
      clearTimeout(state.officeEventRefreshTimer);
      state.officeEventRefreshTimer = null;
    }
  }

  function scheduleOfficeRefresh(eventName) {
    if (!state.session) return;
    if (state.officeEventRefreshTimer) {
      clearTimeout(state.officeEventRefreshTimer);
    }
    state.officeEventRefreshTimer = setTimeout(function () {
      state.officeEventRefreshTimer = null;
      loadLeads()
        .then(function () {
          setBulkStatus(eventName ? `Live Office update received: ${eventName}` : "Live Office update received.");
        })
        .catch(function (error) {
          setBulkStatus(error.message || "Live Office refresh failed.", true);
        });
    }, 500);
  }

  function connectOfficeEventStream() {
    closeOfficeEventStream();
    if (!state.session || typeof window.EventSource !== "function" || !hasPermission("view_office")) {
      return;
    }
    const source = new EventSource("/api/lead-agents/admin/events", { withCredentials: true });
    state.officeEventSource = source;
    [
      "office.sync",
      "office.import",
      "office.storage",
      "office.notification",
      "office.staff",
      "device.status.updated",
      "visitor.created",
      "wallet.funded",
      "support.ticket.created",
      "support.ticket.assigned",
      "estate.updated",
      "home.updated",
      "edge.heartbeat",
      "audit.recorded",
      "twin.state.updated",
    ].forEach(function (eventName) {
      source.addEventListener(eventName, function () {
        scheduleOfficeRefresh(eventName);
      });
    });
    source.onerror = function () {
      setBulkStatus("Live Office stream is reconnecting...");
    };
  }

  async function loadLeads() {
    const [
      leadData,
      traceData,
      notificationData,
      reportData,
      userData,
      demosData,
      proposalData,
      auditData,
      channelData,
      officeData,
      healthData,
      mapData,
      integrationData,
      aiOpsData,
    ] = await Promise.all([
      api("/api/lead-agents/leads", { method: "GET" }),
      hasPermission("view_traces")
        ? api("/api/lead-agents/admin/traces", { method: "GET" })
        : Promise.resolve({ traces: [] }),
      hasPermission("manage_notifications")
        ? api("/api/lead-agents/admin/notifications", { method: "GET" })
        : Promise.resolve({ notifications: [] }),
      hasPermission("view_reports")
        ? api("/api/lead-agents/admin/reports/summary", { method: "GET" })
        : Promise.resolve({ report: null }),
      hasPermission("view_users")
        ? api("/api/lead-agents/admin/users", { method: "GET" })
        : Promise.resolve({ users: [] }),
      hasPermission("view_reports")
        ? api("/api/lead-agents/admin/demos", { method: "GET" })
        : Promise.resolve({ demos: [] }),
      hasPermission("view_reports") || hasPermission("manage_commercial")
        ? api("/api/lead-agents/admin/proposals", { method: "GET" })
        : Promise.resolve({ proposals: [] }),
      hasPermission("view_audit")
        ? api("/api/lead-agents/admin/audit", { method: "GET" })
        : Promise.resolve({ audit: [] }),
      hasPermission("view_reports")
        ? api("/api/lead-agents/admin/channels", { method: "GET" })
        : Promise.resolve({ channels: [] }),
      hasPermission("view_reports")
        ? api("/api/lead-agents/admin/office/overview", { method: "GET" }).catch(function () {
            return { office: null };
          })
        : Promise.resolve({ office: null }),
      api("/healthz", { method: "GET" }).catch(function () {
        return { stats: null };
      }),
      hasPermission("view_estates")
        ? api("/api/lead-agents/admin/maps/config", { method: "GET" }).catch(function () {
            return { maps: null };
          })
        : Promise.resolve({ maps: null }),
      hasPermission("view_integrations")
        ? api("/api/lead-agents/admin/integrations", { method: "GET" }).catch(function () {
            return { integrations: null };
          })
        : Promise.resolve({ integrations: null }),
      hasPermission("view_traces")
        ? api("/api/lead-agents/admin/ai/operations", { method: "GET" }).catch(function (error) {
            return { ai_operations: { available: false, status: "error", reason: error.message, tools: [], executions: [], confirmations: [] } };
          })
        : Promise.resolve({ ai_operations: null }),
    ]);
    state.leads = leadData.leads || [];
    state.traces = traceData.traces || [];
    state.notifications = notificationData.notifications || [];
    state.report = reportData.report || null;
    state.adminUsers = userData.users || [];
    state.allDemos = demosData.demos || [];
    state.allProposals = proposalData.proposals || [];
    state.audit = auditData.audit || [];
    state.channelOverview = channelData || { channels: [] };
    state.officeData = officeData.office || null;
    state.officeStats = healthData.stats || null;
    state.mapConfig = mapData.maps || null;
    state.integrations = integrationData.integrations || null;
    state.aiOperations = aiOpsData.ai_operations || null;
    invalidateDerivedData();

    if (
      state.selectedLeadId &&
      !getDerivedData().leadsById.has(state.selectedLeadId)
    ) {
      state.selectedLeadId = "";
      state.selectedLead = null;
      state.conversations = [];
      state.demos = [];
      state.memory = null;
    }

    renderDashboardAfterData();

    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    } else {
      state.centerMode = "browser";
      try {
        renderConversation();
        renderDetail();
      } catch (error) {
        console.error("[office-dashboard-detail-render]", error);
        setAuthStatus("Signed in. The selected workspace could not render completely.", true);
      }
    }
  }

  async function selectLead(leadId, skipRender) {
    state.centerMode = "thread";
    state.selectedLeadId = leadId;
    state.selectedLead = getDerivedData().leadsById.get(leadId) || null;

    const [conversationData, demosData, memoryData, timelineData, channelStateData, proposalData] = await Promise.all([
      api(`/api/lead-agents/leads/${leadId}/conversations`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/demos`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/memory`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/timeline`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/channel-state/whatsapp`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/proposals`, { method: "GET" }),
    ]);

    state.conversations = conversationData.conversations || [];
    state.demos = demosData.demos || [];
    state.memory = memoryData.memory || null;
    state.timeline = timelineData.timeline || [];
    state.channelState = channelStateData.channel_state || null;
    state.proposals = proposalData.proposals || [];

    if (!skipRender) {
      renderLeadList();
    } else {
      renderLeadList();
    }
    renderConversation();
    renderDetail();
    renderTimeline();
  }

  async function updateLeadPatch(leadId, patch) {
    const data = await api(`/api/lead-agents/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    state.leads = state.leads.map(function (lead) {
      return lead.id === leadId ? data.lead : lead;
    });
    invalidateDerivedData();
    if (state.selectedLeadId === leadId) {
      state.selectedLead = data.lead;
    }
    renderLeadList();
    renderFounderInbox();
    renderDetail();
    renderCommercial();
    renderReports();
    return data.lead;
  }

  async function moveCommercialLead(leadId, nextStage) {
    const patch = { stage: nextStage, commercial_stage: nextStage };
    if (nextStage === "won") {
      patch.status = "closed";
    }
    if (nextStage === "lost") {
      patch.status = "lost";
    }
    if (["proposal_sent", "negotiation", "commercial_approved"].includes(nextStage)) {
      patch.status = "sales";
    }
    setDetailStatus(`Moving commercial record to ${nextStage}...`);
    await updateLeadPatch(leadId, patch);
    if (state.selectedLeadId === leadId) {
      await selectLead(leadId, true);
    }
    setDetailStatus(`Commercial stage updated to ${nextStage}.`);
  }

  async function updateNotificationStatus(notificationId, status) {
    if (!hasPermission("manage_notifications")) {
      throw new Error("Your role cannot update notifications.");
    }
    await api(`/api/lead-agents/admin/notifications/${notificationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const payload = await api("/api/lead-agents/admin/notifications", { method: "GET" });
    state.notifications = payload.notifications || [];
    invalidateDerivedData();
    renderNotifications();
    renderFounderInbox();
    setBulkStatus(`Notification marked ${status}.`);
  }

  async function updateChannelState(patch, leadOwner) {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_takeover")) {
      setDetailStatus("Your role cannot manage human takeover.", true);
      return;
    }
    await api(`/api/lead-agents/leads/${state.selectedLead.id}/channel-state/whatsapp`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    state.channelState = await api(
      `/api/lead-agents/leads/${state.selectedLead.id}/channel-state/whatsapp`,
      { method: "GET" }
    ).then(function (payload) {
      return payload.channel_state || null;
    });
    if (leadOwner) {
      await updateLeadPatch(state.selectedLead.id, leadOwner);
    }
    renderChannelState();
  }

  async function createAdminUser() {
    if (!hasPermission("manage_users")) {
      setTeamStatus("Your role cannot create users.", true);
      return;
    }
    const email = el.newUserEmail.value.trim().toLowerCase();
    const password = el.newUserPassword.value;
    if (!email || !password) {
      setTeamStatus("Email and temporary password are required.", true);
      return;
    }
    setTeamStatus("Creating staff account...");
    await api("/api/lead-agents/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        role: el.newUserRole.value || "viewer",
        display_name: el.newUserName.value.trim() || email,
      }),
    });
    const userData = await api("/api/lead-agents/admin/users", { method: "GET" });
    state.adminUsers = userData.users || [];
    invalidateDerivedData();
    el.newUserName.value = "";
    el.newUserEmail.value = "";
    el.newUserPassword.value = "";
    el.newUserRole.value = "viewer";
    renderTeamPanel();
    setTeamStatus(
      `Created staff account for ${email}. Email delivery is ready for backend SMTP wiring; send the temporary password and setup instructions through the invite flow.`
    );
  }

  async function inviteAdminUser() {
    if (!hasPermission("manage_security")) {
      setInviteStatus("Your role cannot create invite links.", true);
      return;
    }
    const email = el.inviteUserEmail.value.trim().toLowerCase();
    if (!email) {
      setInviteStatus("Invite email is required.", true);
      return;
    }
    setInviteStatus("Creating invite...");
    const result = await api("/api/lead-agents/admin/users/invite", {
      method: "POST",
      body: JSON.stringify({
        email,
        role: el.inviteUserRole.value || "viewer",
        display_name: el.inviteUserName.value.trim() || email,
      }),
    });
    el.inviteUserName.value = "";
    el.inviteUserEmail.value = "";
    el.inviteUserRole.value = "viewer";
    setInviteStatus(
      result.invite_url
        ? `Invite link ready for email: ${result.invite_url}`
        : `Invite token ready for email: ${result.invite_token}`
    );
  }

  async function updateAdminUser(userId, patch) {
    if (!hasPermission("manage_users")) {
      throw new Error("Your role cannot update staff accounts.");
    }
    setTeamStatus("Updating staff account...");
    await api(`/api/lead-agents/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const userData = await api("/api/lead-agents/admin/users", { method: "GET" });
    state.adminUsers = userData.users || [];
    invalidateDerivedData();
    renderTeamPanel();
    setTeamStatus("Staff access updated.");
  }

  async function issueResetLink(userId) {
    if (!hasPermission("manage_security")) {
      throw new Error("Your role cannot issue reset links.");
    }
    setTeamStatus("Issuing reset link...");
    const result = await api(`/api/lead-agents/admin/users/${userId}/reset`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setTeamStatus(
      result.reset_url
        ? `Password reset link ready for email: ${result.reset_url}`
        : `Password reset token ready for email: ${result.reset_token}`
    );
  }

  async function completeTokenAction() {
    const tokenState = tokenMode();
    if (!tokenState) {
      setTokenActionStatus("No token action found in this URL.", true);
      return;
    }
    const password = el.tokenPassword.value;
    if (!password) {
      setTokenActionStatus("Password is required.", true);
      return;
    }
    setTokenActionStatus("Submitting...");
    if (tokenState.mode === "invite") {
      await api("/api/lead-agents/admin/session/invite/accept", {
        method: "POST",
        body: JSON.stringify({
          token: tokenState.token,
          password,
          display_name: el.tokenDisplayName.value.trim() || undefined,
        }),
      });
      el.tokenPassword.value = "";
      setTokenActionStatus("Invite accepted. You are now signed in.");
      await restoreSession();
      await loadLeads();
      return;
    }
    await api("/api/lead-agents/admin/session/reset/confirm", {
      method: "POST",
      body: JSON.stringify({
        token: tokenState.token,
        new_password: password,
      }),
    });
    el.tokenPassword.value = "";
    setTokenActionStatus("Password reset completed. You can now log in.");
  }

  async function changeOwnPassword() {
    const currentPassword = el.currentPasswordInput.value;
    const newPassword = el.newPasswordInput.value;
    if (!currentPassword || !newPassword) {
      setPasswordStatus("Current and new password are required.", true);
      return;
    }
    setPasswordStatus("Updating password...");
    await api("/api/lead-agents/admin/session/password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    el.currentPasswordInput.value = "";
    el.newPasswordInput.value = "";
    setPasswordStatus("Password changed.");
  }

  async function applyBulkAction() {
    if (!hasPermission("manage_leads")) {
      setBulkStatus("Your role cannot update leads in bulk.", true);
      return;
    }
    const leadIds = Array.from(state.selectedLeadIds);
    if (!leadIds.length) {
      setBulkStatus("Select at least one lead first.", true);
      return;
    }

    const patch = {};
    if (el.bulkOwnerSelect.value) {
      patch.owner = el.bulkOwnerSelect.value;
    }
    if (el.bulkStatusSelect.value) {
      patch.status = el.bulkStatusSelect.value;
    }

    if (!Object.keys(patch).length) {
      setBulkStatus("Choose a bulk owner or status first.", true);
      return;
    }

    setBulkStatus("Applying bulk action...");
    for (const leadId of leadIds) {
      await updateLeadPatch(leadId, patch);
    }
    el.bulkOwnerSelect.value = "";
    el.bulkStatusSelect.value = "";
    setBulkStatus(`Updated ${leadIds.length} lead${leadIds.length === 1 ? "" : "s"}.`);
  }

  async function sendAgentMessage() {
    if (!state.selectedLead) {
      setComposerStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_leads")) {
      setComposerStatus("Your role cannot send agent messages.", true);
      return;
    }

    const message = el.composerInput.value.trim();
    if (!message) {
      setComposerStatus("Write a message first.", true);
      return;
    }

    setComposerStatus("Sending...");
    const data = await api("/api/lead-agents/chat", {
      method: "POST",
      body: JSON.stringify({
        agent: el.agentSelect.value,
        lead_id: state.selectedLead.id,
        source: state.selectedLead.source,
        message,
        profile: {},
      }),
    });

    state.selectedLead = data.lead;
    state.memory = data.lead_memory || state.memory;
    state.conversations = data.conversations || [];
    state.traces = hasPermission("view_traces")
      ? await api("/api/lead-agents/admin/traces", { method: "GET" }).then(function (payload) {
          return payload.traces || [];
        })
      : [];
    state.notifications = hasPermission("manage_notifications")
      ? await api("/api/lead-agents/admin/notifications", { method: "GET" }).then(function (
          payload
        ) {
          return payload.notifications || [];
        })
      : [];
    state.report = hasPermission("view_reports")
      ? await api("/api/lead-agents/admin/reports/summary", { method: "GET" }).then(function (
          payload
        ) {
          return payload.report || null;
        })
      : null;
    state.allProposals =
      hasPermission("view_reports") || hasPermission("manage_commercial")
        ? await api("/api/lead-agents/admin/proposals", { method: "GET" }).then(function (payload) {
            return payload.proposals || [];
          })
        : [];
    state.audit = hasPermission("view_audit")
      ? await api("/api/lead-agents/admin/audit", { method: "GET" }).then(function (payload) {
          return payload.audit || [];
        })
      : [];
    state.leads = state.leads.map(function (lead) {
      return lead.id === data.lead.id ? data.lead : lead;
    });
    invalidateDerivedData();

    renderLeadList();
    renderConversation();
    renderDetail();
    renderFounderInbox();
    renderNotifications();
    renderReports();
    renderBookings();
    renderCommercial();
    renderAudit();
    renderTraceExplorer();
    if (state.selectedLeadId) {
      state.timeline = await api(`/api/lead-agents/leads/${state.selectedLeadId}/timeline`, {
        method: "GET",
      }).then(function (payload) {
        return payload.timeline || [];
      });
      state.channelState = await api(
        `/api/lead-agents/leads/${state.selectedLeadId}/channel-state/whatsapp`,
        { method: "GET" }
      ).then(function (payload) {
        return payload.channel_state || null;
      });
    }
    renderTimeline();
    renderChannelState();
    el.composerInput.value = "";
    setComposerStatus("Message sent through agent.");
  }

  async function updateLead() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_leads")) {
      setDetailStatus("Your role cannot update leads.", true);
      return;
    }

    setDetailStatus("Updating commercial record...");
    const propertyType = el.projectTypeInput.value || undefined;
    const unitCount = el.unitCountInput.value ? Number(el.unitCountInput.value) : undefined;
    const stage = el.commercialStageInput.value || undefined;
    await updateLeadPatch(state.selectedLead.id, {
      status: el.statusInput.value || undefined,
      owner: el.ownerInput.value || undefined,
      property_type: propertyType,
      project_type: propertyType,
      number_of_units: unitCount,
      unit_count: unitCount,
      stage,
      commercial_stage: stage,
      lost_reason: el.lostReasonInput.value || undefined,
      lead_score: el.scoreInput.value ? Number(el.scoreInput.value) : undefined,
      score: el.scoreInput.value ? Number(el.scoreInput.value) : undefined,
      next_action: el.nextActionInput.value || undefined,
      summary: el.summaryInput.value || undefined,
    });
    setDetailStatus("Commercial record updated.");
  }

  async function qualifySelectedLead() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_leads")) {
      setDetailStatus("Your role cannot qualify leads.", true);
      return;
    }
    setDetailStatus("OMA is qualifying this opportunity...");
    const data = await api(`/api/lead-agents/leads/${state.selectedLead.id}/qualify`, {
      method: "POST",
      body: JSON.stringify({
        property_type: el.projectTypeInput.value || state.selectedLead.property_type || state.selectedLead.project_type,
        number_of_units: el.unitCountInput.value ? Number(el.unitCountInput.value) : state.selectedLead.number_of_units || state.selectedLead.unit_count,
        pain_points: el.summaryInput.value || state.selectedLead.pain_points || state.selectedLead.summary,
        decision_maker_status: state.selectedLead.decision_maker_status || state.selectedLead.role,
        timeline: state.selectedLead.timeline || "",
        budget_range: state.selectedLead.budget_range || "",
      }),
    });
    state.selectedLead = data.lead;
    await loadLeads();
    if (state.selectedLeadId) await selectLead(state.selectedLeadId, true);
    setDetailStatus(`Qualified: ${data.qualification.qualification_status} · ${data.qualification.recommended_package}`);
  }

  async function markCommercialApproved() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_commercial")) {
      setDetailStatus("Your role cannot approve commercial records.", true);
      return;
    }
    setDetailStatus("Marking commercial approval...");
    await api(`/api/lead-agents/leads/${state.selectedLead.id}/commercial-approval`, {
      method: "POST",
      body: JSON.stringify({ approved: true, notes: el.summaryInput.value || "" }),
    });
    await loadLeads();
    if (state.selectedLeadId) await selectLead(state.selectedLeadId, true);
    setDetailStatus("Commercial approval recorded.");
  }

  async function createProposal() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_commercial")) {
      setDetailStatus("Your role cannot create proposals.", true);
      return;
    }
    setDetailStatus("Generating proposal...");
    await api(`/api/lead-agents/leads/${state.selectedLead.id}/proposals`, {
      method: "POST",
      body: JSON.stringify({
        unit_count: el.proposalUnitsInput.value ? Number(el.proposalUnitsInput.value) : undefined,
        property_type: state.selectedLead.property_type || state.selectedLead.project_type || undefined,
        project_type: state.selectedLead.property_type || state.selectedLead.project_type || undefined,
        status: el.proposalStatusInput.value || "draft",
      }),
    });
    await loadLeads();
    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    }
    setDetailStatus("Proposal created.");
  }

  async function updateProposalStatus(proposalId, status) {
    if (!hasPermission("manage_commercial")) {
      throw new Error("Your role cannot update proposals.");
    }
    setDetailStatus("Updating proposal...");
    await api(`/api/lead-agents/admin/proposals/${proposalId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadLeads();
    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    }
    setDetailStatus(`Proposal marked ${status}.`);
  }

  async function createDemo() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_demos")) {
      setDetailStatus("Your role cannot schedule building reviews.", true);
      return;
    }

    setDetailStatus("Scheduling building review...");
    await api(`/api/lead-agents/leads/${state.selectedLead.id}/building-review`, {
      method: "POST",
      body: JSON.stringify({
        scheduled_for: el.demoAtInput.value
          ? new Date(el.demoAtInput.value).toISOString()
          : null,
        notes: el.demoNotesInput.value || "",
        review_type: el.reviewTypeInput ? el.reviewTypeInput.value : "building_review",
        status: "confirmed",
        timezone: "Africa/Lagos",
      }),
    });
    await loadLeads();
    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    }
    el.demoAtInput.value = "";
    el.demoNotesInput.value = "";
    setDetailStatus("Building review scheduled.");
  }

  async function provisionFacilityWorkspace() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("manage_commercial")) {
      setDetailStatus("Your role cannot prepare Facility workspaces.", true);
      return;
    }
    setDetailStatus("Preparing Facility workspace checklist...");
    await api(`/api/lead-agents/leads/${state.selectedLead.id}/provision-facility-workspace`, {
      method: "POST",
      body: JSON.stringify({
        customer_organization: state.selectedLead.company || state.selectedLead.name,
        property_name: state.selectedLead.company || state.selectedLead.project_type,
        facility_admin_email: state.selectedLead.email || "",
        package_name: state.selectedLead.interest_package || "",
      }),
    });
    await loadLeads();
    if (state.selectedLeadId) await selectLead(state.selectedLeadId, true);
    setDetailStatus("Facility workspace checklist prepared for manual approval.");
  }

  async function escalate() {
    if (!state.selectedLead) {
      setDetailStatus("Select a record first.", true);
      return;
    }
    if (!hasPermission("escalate_founder")) {
      setDetailStatus("Your role cannot escalate to founder.", true);
      return;
    }

    const reason = el.escalationReasonInput.value.trim();
    const summary = el.escalationSummaryInput.value.trim();
    if (!reason || !summary) {
      setDetailStatus("Reason and summary are required for escalation.", true);
      return;
    }

    setDetailStatus("Escalating...");
    await api("/api/lead-agents/admin/notify-founder", {
      method: "POST",
      body: JSON.stringify({
        lead_id: state.selectedLead.id,
        urgency: el.escalationUrgencyInput.value,
        reason,
        summary,
      }),
    });
    el.escalationReasonInput.value = "";
    el.escalationSummaryInput.value = "";
    await loadLeads();
    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    }
    setDetailStatus("Escalation sent.");
  }

  async function connect() {
    const email = el.adminEmail.value.trim().toLowerCase();
    const password = el.adminPassword.value;
    if (!email || !password) {
      setAuthStatus("Enter your admin email and password.", true);
      return;
    }

    setAuthStatus("Signing in...");
    try {
      const session = await api("/api/lead-agents/admin/session/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });
      state.session = session.admin || null;
      state.adminEmail = email;
      window.localStorage.setItem(ADMIN_EMAIL_STORAGE, email);
      el.adminPassword.value = "";
      updateAuthUi();
      try {
        await loadLeads();
        setAuthStatus(`Signed in as ${email}.`);
      } catch (loadError) {
        console.error("[office-dashboard-load-after-login]", loadError);
        setAuthStatus(`Signed in as ${email}, but dashboard data could not load: ${loadError.message || "Unknown error"}`, true);
      }
      connectOfficeEventStream();
	      setComposerStatus("");
      setDetailStatus("");
      setBulkStatus("");
      setTeamStatus("");
      setPasswordStatus("");
    } catch (error) {
      if (!state.session) {
        updateAuthUi();
      }
      setAuthStatus(error.message || "Unable to sign in.", true);
    }
  }

  async function restoreSession() {
    try {
      const session = await api("/api/lead-agents/admin/session/me", { method: "GET" });
      state.session = session.admin || null;
      if (session.admin && session.admin.email) {
        state.adminEmail = session.admin.email;
        el.adminEmail.value = session.admin.email;
        window.localStorage.setItem(ADMIN_EMAIL_STORAGE, session.admin.email);
      }
	      updateAuthUi();
	      connectOfficeEventStream();
	      return true;
    } catch {
      state.session = null;
      updateAuthUi();
      return false;
    }
  }

	  async function logout() {
	    closeOfficeEventStream();
	    try {
      await api("/api/lead-agents/admin/session/logout", { method: "POST" });
    } catch (_) {
      // Ignore and clear client state anyway.
    }

    state.session = null;
    state.leads = [];
    state.filteredLeads = [];
    state.selectedLeadId = "";
    state.selectedLead = null;
    state.selectedLeadIds = new Set();
    state.conversations = [];
    state.demos = [];
    state.memory = null;
    state.traces = [];
    state.notifications = [];
    state.report = null;
    state.channelOverview = null;
    state.officeData = null;
    state.officeStats = null;
    state.allDemos = [];
    state.proposals = [];
    state.allProposals = [];
    state.audit = [];
    state.timeline = [];
    state.adminUsers = [];
    state.channelState = null;
    state.traceQuery = "";
    state.notificationFilter = "open";
    invalidateDerivedData();
    el.adminPassword.value = "";
    el.traceSearchInput.value = "";
    el.currentPasswordInput.value = "";
    el.newPasswordInput.value = "";
    updateAuthUi();
    renderLeadList();
    renderConversation();
    renderNotifications();
    renderFounderInbox();
    renderReports();
    renderBookings();
    renderCommercial();
    renderTeamPanel();
    renderAudit();
    renderTraceExplorer();
    renderTimeline();
    renderDetail();
    setAuthStatus("Signed out.");
    setTeamStatus("");
    setPasswordStatus("");
  }

  el.loginBtn.addEventListener("click", function () {
    connect().catch(function (error) {
      setAuthStatus(error.message || "Unable to sign in.", true);
    });
  });
  el.refreshBtn.addEventListener("click", function () {
    loadLeads()
      .then(function () {
        setBulkStatus("Lead list refreshed.");
      })
      .catch(function (error) {
        setBulkStatus(error.message || "Refresh failed.", true);
      });
  });
  el.logoutBtn.addEventListener("click", function () {
    logout().catch(function (error) {
      setAuthStatus(error.message || "Unable to sign out.", true);
    });
  });
  el.accountButton.addEventListener("click", function () {
    el.accountMenuWrap.classList.toggle("open");
  });
  el.leftToggleBtn.addEventListener("click", function () {
    state.leftCollapsed = !state.leftCollapsed;
    window.localStorage.setItem(LEFT_COLLAPSED_STORAGE, state.leftCollapsed ? "1" : "0");
    updateLeftRailState();
  });
  el.detailToggleBtn.addEventListener("click", function () {
    state.detailCollapsed = !state.detailCollapsed;
    window.localStorage.setItem(DETAIL_COLLAPSED_STORAGE, state.detailCollapsed ? "1" : "0");
    updateDetailRailState();
  });
  document.addEventListener("click", function (event) {
    if (!el.accountMenuWrap.contains(event.target)) {
      el.accountMenuWrap.classList.remove("open");
    }
  });
  Array.from(document.querySelectorAll("[data-queue-mini]")).forEach(function (node) {
    node.addEventListener("click", function () {
      state.activeQueue = node.getAttribute("data-queue-mini");
      state.centerMode = "browser";
      state.selectedLeadId = "";
      state.selectedLead = null;
      renderLeadList();
      renderConversation();
      renderDetail();
    });
  });
  window.addEventListener("resize", updateDetailRailState);
  el.messageInboxBtn.addEventListener("click", function () {
    state.workspaceTab = "notifications";
    renderWorkspaceTabs();
  });
  el.notificationBtn.addEventListener("click", function () {
    state.workspaceTab = "founder";
    renderWorkspaceTabs();
  });
  el.searchInput.addEventListener("input", debounce(function () {
    state.centerMode = "browser";
    renderLeadList();
    renderConversation();
    renderDetail();
  }, 80));
  Array.from(el.queueGrid.querySelectorAll("[data-queue]")).forEach(function (node) {
    node.addEventListener("click", function () {
      state.activeQueue = node.getAttribute("data-queue");
      state.centerMode = "browser";
      state.selectedLeadId = "";
      state.selectedLead = null;
      renderLeadList();
      renderConversation();
      renderDetail();
    });
  });
  Array.from(el.filterRow.querySelectorAll("[data-filter]")).forEach(function (node) {
    node.addEventListener("click", function () {
      state.activeFilter = node.getAttribute("data-filter");
      renderLeadList();
    });
  });
  Array.from(el.officeNavButtons || []).forEach(function (node) {
    node.addEventListener("click", function () {
      const target = node.getAttribute("data-office-target");
      const focus = node.getAttribute("data-office-focus");
      setOfficeWorkspace(target, focus);
    });
  });
  Array.from((el.notificationFilters || document).querySelectorAll("[data-notification-filter]")).forEach(
    function (node) {
      node.addEventListener("click", function () {
        state.notificationFilter = node.getAttribute("data-notification-filter");
        renderNotifications();
      });
    }
  );
  el.notificationsPanel.addEventListener("click", function (event) {
    const openNode = event.target.closest("[data-notification-open]");
    if (openNode) {
      const leadId = openNode.getAttribute("data-notification-open");
      if (leadId) {
        state.workspaceTab = "intelligence";
        renderWorkspaceTabs();
        selectLead(leadId);
      }
      return;
    }
    const statusNode = event.target.closest("[data-notification-status]");
    if (statusNode) {
      updateNotificationStatus(
        statusNode.getAttribute("data-notification-status"),
        statusNode.getAttribute("data-status-value")
      ).catch(function (error) {
        setBulkStatus(error.message || "Notification update failed.", true);
      });
    }
  });
  el.founderInbox.addEventListener("click", function (event) {
    const openNode = event.target.closest("[data-founder-open]");
    if (openNode) {
      state.workspaceTab = "intelligence";
      renderWorkspaceTabs();
      selectLead(openNode.getAttribute("data-founder-open"));
      return;
    }
    const assignNode = event.target.closest("[data-founder-assign]");
    if (assignNode) {
      updateLeadPatch(assignNode.getAttribute("data-founder-assign"), { owner: "human", status: "escalated" })
        .then(function () {
          setBulkStatus("Founder inbox updated.");
        })
        .catch(function (error) {
          setBulkStatus(error.message || "Unable to assign executive review record.", true);
        });
    }
  });
  el.teamPanel.addEventListener("click", function (event) {
    const saveNode = event.target.closest("[data-user-save]");
    if (saveNode) {
      const userId = saveNode.getAttribute("data-user-save");
      const role = el.teamPanel.querySelector(`[data-user-role="${userId}"]`).value;
      const status = el.teamPanel.querySelector(`[data-user-status="${userId}"]`).value;
      updateAdminUser(userId, { role, status }).catch(function (error) {
        setTeamStatus(error.message || "Could not update staff account.", true);
      });
      return;
    }
    const resetNode = event.target.closest("[data-user-reset]");
    if (resetNode) {
      const userId = resetNode.getAttribute("data-user-reset");
      const passwordInput = el.teamPanel.querySelector(`[data-user-password="${userId}"]`);
      updateAdminUser(userId, { password: passwordInput.value || "" }).catch(function (error) {
        setTeamStatus(error.message || "Could not reset password.", true);
      });
      return;
    }
    const resetLinkNode = event.target.closest("[data-user-reset-link]");
    if (resetLinkNode) {
      issueResetLink(resetLinkNode.getAttribute("data-user-reset-link")).catch(function (error) {
        setTeamStatus(error.message || "Could not issue reset link.", true);
      });
    }
  });
  if (el.webPresencePanel) {
    el.webPresencePanel.addEventListener("input", debounce(function (event) {
      if (event.target && event.target.matches("[data-document-search]")) {
        state.documentQuery = event.target.value || "";
        renderDocumentsWorkspace(buildOverviewDomains().domains.web_presence);
      }
    }, 120));
    el.webPresencePanel.addEventListener("click", function (event) {
      const openNode = event.target.closest("[data-document-open]");
      if (!openNode) return;
      event.preventDefault();
      const documentId = openNode.getAttribute("data-document-open");
      const collections = officeCollections();
      const officeDocs = asList(collections.documents).map(function (record, index) {
        return {
          id: record.id || `office_doc_${index}`,
          title: record.title || record.file_name || "Office document",
          type: record.document_type || record.type || "Document",
          owner: record.owner || record.created_by || "Office",
          status: record.status || "draft",
          value: record.amount || record.value || 0,
          created_at: record.updated_at || record.created_at,
          updated_at: record.updated_at || record.created_at,
          file_url: record.file_url || "",
          html_url: record.html_url || "",
          url: record.url || "",
          email_to: record.email_to || "",
          metadata: record.metadata || {},
        };
      });
      const proposalDocs = asList(state.allProposals).map(function (proposal, index) {
        return {
          id: proposal.id || `proposal_${index}`,
          title: proposal.title || proposal.lead_name || proposal.company || "Commercial proposal",
          type: "Proposal",
          owner: proposal.owner || "Commercial",
          status: proposal.status || "draft",
          value: proposal.value || proposal.amount || 0,
          created_at: proposal.created_at,
          updated_at: proposal.updated_at || proposal.created_at,
          file_url: proposal.file_url || proposal.url || "",
          html_url: proposal.html_url || "",
          url: proposal.url || "",
          email_to: proposal.email_to || "",
          metadata: proposal.metadata || {},
        };
      });
      openDocumentDetail(officeDocs.concat(proposalDocs).find(function (doc) {
        return String(doc.id) === String(documentId);
      }));
    });
  }
  if (el.crmAgentsPanel) {
    el.crmAgentsPanel.addEventListener("click", function (event) {
      const facetNode = event.target.closest("[data-crm-facet]");
      if (facetNode) {
        setModuleFacet("crm_agents", facetNode.getAttribute("data-crm-facet") || "dashboard");
        renderCrmAgentsPanel(buildOverviewDomains().domains.crm_agents);
        renderSectionNav();
        return;
      }
      const toggle = event.target.closest("[data-crm-integrations-toggle]");
      if (!toggle) return;
      state.crmIntegrationsExpanded = !state.crmIntegrationsExpanded;
      renderCrmAgentsPanel(buildOverviewDomains().domains.crm_agents);
    });
  }
  document.addEventListener("click", function (event) {
    const mobileRefreshNode = event.target.closest("[data-mobile-refresh]");
    if (mobileRefreshNode) {
      event.preventDefault();
      loadLeads()
        .then(function () {
          setBulkStatus("Office data refreshed.");
        })
        .catch(function (error) {
          setBulkStatus(error.message || "Refresh failed.", true);
        });
      return;
    }
    const actionNode = event.target.closest("[data-command-action]");
    if (actionNode) {
      event.preventDefault();
      openOfficeAction(actionNode.getAttribute("data-command-action") || "");
      return;
    }
    const officeTargetNode = event.target.closest("[data-office-target]");
    if (officeTargetNode) {
      const target = officeTargetNode.getAttribute("data-office-target");
      const focus = officeTargetNode.getAttribute("data-office-focus");
      if (target && canAccessOfficeModule(target, focus)) {
        event.preventDefault();
        setOfficeWorkspace(target, focus);
        return;
      }
    }
    const adminSectionNode = event.target.closest("[data-admin-section]");
    if (adminSectionNode) {
      event.preventDefault();
      handleAdminSection(adminSectionNode.getAttribute("data-admin-section") || "dashboard");
      return;
    }
    const adminShortcutNode = event.target.closest("[data-admin-shortcut]");
    if (adminShortcutNode) {
      event.preventDefault();
      const shortcut = adminShortcutNode.getAttribute("data-admin-shortcut") || "";
      if (shortcut === "admin_staff") {
        handleAdminSection("staff");
      } else if (shortcut === "admin_invite") {
        handleAdminSection("staff");
        const invitePanel = document.getElementById("inviteStaffAction");
        if (invitePanel) {
          invitePanel.open = true;
          invitePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else if (shortcut === "admin_audit") {
        state.workspaceTab = "audit";
        renderWorkspaceTabs();
      } else if (shortcut === "admin_settings") {
        handleAdminSection("settings");
      } else if (shortcut === "admin_integrations") {
        handleAdminSection("integrations");
      }
      return;
    }
    const closeNode = event.target.closest("[data-command-close]");
    if (closeNode) {
      const modal = closeNode.closest("[data-command-modal]") || document.querySelector("[data-command-modal]");
      if (modal) modal.remove();
    }
  });
  document.addEventListener("submit", function (event) {
    const form = event.target.closest("[data-command-form]");
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector("[data-command-status]");
    if (status) {
      status.textContent = "Processing Office action...";
      status.style.color = "var(--muted)";
    }
    submitOfficeAction(form.getAttribute("data-command-form") || "", form)
      .then(function () {
        const modal = form.closest("[data-command-modal]");
        if (modal) modal.remove();
      })
      .catch(function (error) {
        if (status) {
          status.textContent = error.message || "Office action failed.";
          status.style.color = "#ff9cad";
        }
      });
  });
  el.traceSearchInput.addEventListener("input", debounce(function () {
    state.traceQuery = el.traceSearchInput.value;
    renderTraceExplorer();
  }, 120));
  el.openFounderQueueBtn.addEventListener("click", function () {
    state.activeQueue = "escalated";
    state.workspaceTab = "founder";
    renderLeadList();
    renderWorkspaceTabs();
  });
  el.reloadLeadBtn.addEventListener("click", function () {
    if (!state.selectedLeadId) {
      return;
    }
    selectLead(state.selectedLeadId, true).catch(function (error) {
      setComposerStatus(error.message || "Reload failed.", true);
    });
  });
  el.agentOmaBtn.addEventListener("click", function () {
    setAgentChoice("marketing");
  });
  el.agentOsaBtn.addEventListener("click", function () {
    setAgentChoice("sales");
  });
  el.sendBtn.addEventListener("click", function () {
    sendAgentMessage().catch(function (error) {
      setComposerStatus(error.message || "Send failed.", true);
    });
  });
  el.applyBulkBtn.addEventListener("click", function () {
    applyBulkAction().catch(function (error) {
      setBulkStatus(error.message || "Bulk action failed.", true);
    });
  });
  el.clearSelectionBtn.addEventListener("click", function () {
    state.selectedLeadIds = new Set();
    renderLeadList();
    setBulkStatus("Selection cleared.");
  });
  el.createUserBtn.addEventListener("click", function () {
    createAdminUser().catch(function (error) {
      setTeamStatus(error.message || "Could not create staff account.", true);
    });
  });
  el.inviteUserBtn.addEventListener("click", function () {
    inviteAdminUser().catch(function (error) {
      setInviteStatus(error.message || "Could not create invite.", true);
    });
  });
  el.changePasswordBtn.addEventListener("click", function () {
    changeOwnPassword().catch(function (error) {
      setPasswordStatus(error.message || "Could not change password.", true);
    });
  });
  el.tokenActionBtn.addEventListener("click", function () {
    completeTokenAction().catch(function (error) {
      setTokenActionStatus(error.message || "Token action failed.", true);
    });
  });
  el.auditSearchInput.addEventListener("input", debounce(function () {
    state.auditQuery = el.auditSearchInput.value;
    renderAudit();
  }, 120));
  el.pauseAiBtn.addEventListener("click", function () {
    updateChannelState(
      {
        ai_paused: true,
        human_owner: el.takeoverOwnerInput.value.trim() || state.adminEmail,
        human_status: "human_active",
        takeover_started_at: new Date().toISOString(),
        takeover_reason: el.takeoverReasonInput.value.trim() || "manual_takeover",
        resume_mode: "manual_only",
      },
      {
        owner: "human",
        status: "escalated",
      }
    )
      .then(function () {
        setDetailStatus("Human takeover enabled.");
      })
      .catch(function (error) {
        setDetailStatus(error.message || "Unable to enable takeover.", true);
      });
  });
  el.resumeOmaBtn.addEventListener("click", function () {
    updateChannelState(
      {
        ai_paused: false,
        human_owner: "",
        human_status: "resume_pending",
        resume_mode: "manual_only",
      },
      {
        owner: "marketing_agent",
      }
    )
      .then(function () {
        setDetailStatus("WhatsApp will resume with Oma on the next turn.");
      })
      .catch(function (error) {
        setDetailStatus(error.message || "Unable to resume Oma.", true);
      });
  });
  el.resumeOsaBtn.addEventListener("click", function () {
    updateChannelState(
      {
        ai_paused: false,
        human_owner: "",
        human_status: "resume_pending",
        resume_mode: "manual_only",
      },
      {
        owner: "sales_agent",
        status: "sales",
      }
    )
      .then(function () {
        setDetailStatus("WhatsApp will resume with Osa on the next turn.");
      })
      .catch(function (error) {
        setDetailStatus(error.message || "Unable to resume Osa.", true);
      });
  });
  el.keepHumanBtn.addEventListener("click", function () {
    updateChannelState(
      {
        ai_paused: true,
        human_owner: el.takeoverOwnerInput.value.trim() || state.adminEmail,
        human_status: "human_active",
        takeover_reason: el.takeoverReasonInput.value.trim() || "human_only",
        resume_mode: "manual_only",
      },
      {
        owner: "human",
      }
    )
      .then(function () {
        setDetailStatus("Lead remains in human-only mode.");
      })
      .catch(function (error) {
        setDetailStatus(error.message || "Unable to keep human-only mode.", true);
      });
  });
  el.updateLeadBtn.addEventListener("click", function () {
    updateLead().catch(function (error) {
      setDetailStatus(error.message || "Lead update failed.", true);
    });
  });
  if (el.qualifyLeadBtn) {
    el.qualifyLeadBtn.addEventListener("click", function () {
      qualifySelectedLead().catch(function (error) {
        setDetailStatus(error.message || "Lead qualification failed.", true);
      });
    });
  }
  if (el.approveCommercialBtn) {
    el.approveCommercialBtn.addEventListener("click", function () {
      markCommercialApproved().catch(function (error) {
        setDetailStatus(error.message || "Commercial approval failed.", true);
      });
    });
  }
  el.createDemoBtn.addEventListener("click", function () {
    createDemo().catch(function (error) {
      setDetailStatus(error.message || "Building review scheduling failed.", true);
    });
  });
  if (el.provisionFacilityBtn) {
    el.provisionFacilityBtn.addEventListener("click", function () {
      provisionFacilityWorkspace().catch(function (error) {
        setDetailStatus(error.message || "Facility workspace preparation failed.", true);
      });
    });
  }
  el.createProposalBtn.addEventListener("click", function () {
    createProposal().catch(function (error) {
      setDetailStatus(error.message || "Proposal creation failed.", true);
    });
  });
  el.escalateBtn.addEventListener("click", function () {
    escalate().catch(function (error) {
      setDetailStatus(error.message || "Escalation failed.", true);
    });
  });
  el.adminPassword.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      connect().catch(function (error) {
        setAuthStatus(error.message || "Unable to sign in.", true);
      });
    }
  });

  updateAuthUi();
  setAgentChoice(el.agentSelect.value || "marketing");
  renderTokenActionCard();
  renderLeadList();
  renderConversation();
  renderNotifications();
  renderFounderInbox();
  renderReports();
  renderBookings();
  renderCommercial();
  renderTeamPanel();
  renderAudit();
  renderTraceExplorer();
  renderDetail();
  renderWorkspaceTabs();
  updateLeftRailState();
  updateDetailRailState();

  restoreSession()
    .then(function (restored) {
      if (restored) {
        return loadLeads()
          .then(function () {
            setAuthStatus(`Signed in as ${state.adminEmail}.`);
          })
          .catch(function (error) {
            console.error("[office-dashboard-restore-load]", error);
            setAuthStatus(`Signed in as ${state.adminEmail}, but dashboard data could not load: ${error.message || "Unknown error"}`, true);
          });
      }
      setAuthStatus("Log in to access Ochiga Office.");
    })
    .catch(function () {
      setAuthStatus("Log in to access Ochiga Office.");
    });
})();
