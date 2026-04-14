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
    workspaceTab: "conversation",
    selectedLeadId: "",
    selectedLead: null,
    selectedLeadIds: new Set(),
    conversations: [],
    demos: [],
    memory: null,
    traces: [],
    notifications: [],
    report: null,
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
    leftCollapsed: window.localStorage.getItem(LEFT_COLLAPSED_STORAGE) === "1",
    detailCollapsed: window.localStorage.getItem(DETAIL_COLLAPSED_STORAGE) === "1",
  };

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
    terminalMeta: document.getElementById("terminalMeta"),
    threadCanvas: document.getElementById("threadCanvas"),
    timelinePanel: document.getElementById("timelinePanel"),
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
    proposalUnitsInput: document.getElementById("proposalUnitsInput"),
    proposalStatusInput: document.getElementById("proposalStatusInput"),
    createProposalBtn: document.getElementById("createProposalBtn"),
    proposalListPanel: document.getElementById("proposalListPanel"),
    demoAtInput: document.getElementById("demoAtInput"),
    demoNotesInput: document.getElementById("demoNotesInput"),
    createDemoBtn: document.getElementById("createDemoBtn"),
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
      throw new Error(data.error || "Request failed");
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

  function canAccessTab(tab) {
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
    if (tab === "traces") return hasPermission("view_traces");
    return true;
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
          "Scheduled demo",
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
    return state.notifications.filter(function (notification) {
      return notification.lead_id === state.selectedLead.id && (notification.status || "open") === "open";
    }).length;
  }

  function updateHeaderActions() {
    const openNotifications = state.notifications.filter(function (notification) {
      return (notification.status || "open") === "open";
    }).length;
    const founderNotifications = state.notifications.filter(function (notification) {
      return notification.type === "founder_escalation" && (notification.status || "open") === "open";
    }).length;

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
      window.innerWidth > 1320 &&
      ["commercial", "reports", "bookings", "audit", "traces"].includes(state.workspaceTab);
    const isCollapsed = state.detailCollapsed || autoCollapsed;

    document.body.classList.toggle("detail-collapsed", isCollapsed);
    el.detailColumn.classList.toggle("collapsed", isCollapsed);
    el.detailToggleGlyph.textContent = isCollapsed ? "←" : "→";

    const traceCount = state.selectedLead
      ? state.traces.filter(function (trace) {
          return trace.lead_id === state.selectedLead.id;
        }).length
      : 0;
    const demoCount = state.demos.length;
    const proposalCount = state.proposals.length;
    const alertCount = notificationCountForLead();
    const badgeCount = traceCount + demoCount + proposalCount + alertCount;

    el.miniTraceCount.textContent = String(traceCount);
    el.miniDemoCount.textContent = String(demoCount);
    el.miniProposalCount.textContent = String(proposalCount);
    el.miniAlertCount.textContent = String(alertCount);
    el.detailToggleBadge.textContent = String(badgeCount);
    el.detailToggleBadge.classList.toggle("visible", isCollapsed && badgeCount > 0);
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
      el.accountSubtitle.textContent = "Lead desk";
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
    const all = state.leads.length;
    const oma = state.leads.filter(function (lead) {
      return lead.owner === "marketing_agent";
    }).length;
    const osa = state.leads.filter(function (lead) {
      return lead.owner === "sales_agent" || lead.status === "sales" || lead.status === "booked";
    }).length;
    const escalated = state.leads.filter(function (lead) {
      return lead.status === "escalated" || lead.owner === "human";
    }).length;

    el.countAll.textContent = String(all);
    el.countOma.textContent = String(oma);
    el.countOsa.textContent = String(osa);
    el.countEscalated.textContent = String(escalated);
    el.miniAllCount.textContent = String(all);
    el.miniOmaCount.textContent = String(oma);
    el.miniOsaCount.textContent = String(osa);
    el.miniEscalatedCount.textContent = String(escalated);

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
    el.miniMetricLeads.textContent = String(totals.leads || 0);
    el.miniMetricDemos.textContent = String(state.report ? state.report.demos_booked || 0 : 0);
    el.miniMetricHot.textContent = String(totals.hot_leads || 0);
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

  function renderReports() {
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
      el.upcomingDemosPanel.innerHTML = '<div class="value empty">No upcoming demos yet.</div>';
      return;
    }

    const totals = state.report.totals || {};
    el.reportsPanel.innerHTML = `
      <div class="trace-head"><strong>Total leads</strong><span>${escapeHtml(String(totals.leads || 0))}</span></div>
      <div class="trace-head"><strong>Total demos</strong><span>${escapeHtml(String(totals.demos || 0))}</span></div>
      <div class="trace-head"><strong>Escalations</strong><span>${escapeHtml(String(totals.escalations || 0))}</span></div>
      <div class="trace-head"><strong>Sales handoff conversion</strong><span>${escapeHtml(
        `${totals.sales_handoff_conversion_pct || 0}%`
      )}</span></div>
      <div class="trace-head"><strong>Hot leads</strong><span>${escapeHtml(String(totals.hot_leads || 0))}</span></div>
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
      : '<div class="value empty">No upcoming demos yet.</div>';
  }

  function renderLeadList() {
    filterLeads();
    updateQueueCards();
    const canManageLeads = hasPermission("manage_leads");

    if (!state.filteredLeads.length) {
      el.leadList.innerHTML = '<div class="value empty">No leads match this view yet.</div>';
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
                    lead.commercial_stage
                      ? `<span class="pill" style="background:rgba(38, 120, 92, 0.12);color:#1b5a45;">${escapeHtml(
                          lead.commercial_stage
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
    if (!state.selectedLead) {
      el.threadTitle.textContent = "Select a lead";
      el.threadSubtitle.textContent = "Review conversations, founder escalations, and trace activity.";
      el.threadCanvas.innerHTML = '<div class="value empty">Choose a lead from the left to review the conversation.</div>';
      el.terminalMeta.textContent = "Live operator thread";
      return;
    }

    el.threadTitle.textContent =
      leadTitle(state.selectedLead);
    el.threadSubtitle.textContent = leadMetaLine(state.selectedLead);
    el.terminalMeta.textContent = conversationStateMeta();

    if (!state.conversations.length) {
      el.threadCanvas.innerHTML = '<div class="value empty">No conversation history yet for this lead.</div>';
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
        '<div class="value empty">Your role cannot access founder escalation workflows.</div>';
      return;
    }

    const items = state.notifications.filter(function (notification) {
      return notification.type === "founder_escalation";
    });

    if (!items.length) {
      el.founderInbox.innerHTML = '<div class="value empty">No founder escalations right now.</div>';
      return;
    }

    el.founderInbox.innerHTML = items
      .map(function (notification) {
        const lead = state.leads.find(function (candidate) {
          return candidate.id === notification.lead_id;
        });
        return `
          <article class="founder-card">
            <div class="founder-head">
              <strong>${escapeHtml(
                lead ? leadTitle(lead) : "Escalated lead"
              )}</strong>
              <span class="mono" style="font-size:12px;color:#667c73;">${escapeHtml(
                notification.urgency || "medium"
              )}</span>
            </div>
            <div class="subtext">${escapeHtml(
              lead ? leadMetaLine(lead) : "Lead details unavailable"
            )}</div>
            <div class="subtext" style="margin-top: 8px;">${escapeHtml(
              notification.summary || notification.reason || "Escalated for review"
            )}</div>
            <div class="toolbar" style="margin-top: 12px;">
              <button class="ghost" type="button" data-founder-open="${notification.lead_id || ""}">Open lead</button>
              <button class="outline" type="button" data-founder-assign="${notification.lead_id || ""}">Assign to human</button>
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(el.founderInbox.querySelectorAll("[data-founder-open]")).forEach(function (node) {
      node.addEventListener("click", function () {
        state.workspaceTab = "conversation";
        renderWorkspaceTabs();
        selectLead(node.getAttribute("data-founder-open"));
      });
    });

    Array.from(el.founderInbox.querySelectorAll("[data-founder-assign]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const leadId = node.getAttribute("data-founder-assign");
        updateLeadPatch(leadId, { owner: "human", status: "escalated" })
          .then(function () {
            setBulkStatus("Founder inbox updated.");
          })
          .catch(function (error) {
            setBulkStatus(error.message || "Unable to assign founder lead.", true);
          });
      });
    });
  }

  function renderBookings() {
    if (!hasPermission("view_reports")) {
      el.bookingsPanel.innerHTML =
        '<div class="value empty">Your role cannot access bookings.</div>';
      return;
    }

    if (!state.allDemos.length) {
      el.bookingsPanel.innerHTML =
        '<div class="value empty">No demo bookings available right now.</div>';
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

  function renderCommercial() {
    if (!(hasPermission("manage_commercial") || hasPermission("view_reports"))) {
      el.commercialPanel.innerHTML =
        '<div class="value empty">Your role cannot access commercial workflow.</div>';
      return;
    }

    const stages = ["lead", "discovery", "proposal", "quote", "negotiation", "procurement", "won", "lost"];
    const salesOwned = state.leads.filter(function (lead) {
      return lead.owner === "sales_agent";
    }).length;
    const proposalActive = state.allProposals.filter(function (proposal) {
      return ["draft", "sent"].includes(String(proposal.status || "").toLowerCase());
    }).length;
    const wonCount = state.leads.filter(function (lead) {
      return (lead.commercial_stage || "") === "won";
    }).length;
    const lostCount = state.leads.filter(function (lead) {
      return (lead.commercial_stage || "") === "lost";
    }).length;

    const columns = stages
      .map(function (stage) {
        const leads = state.leads.filter(function (lead) {
          return (lead.commercial_stage || "lead") === stage;
        });
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
                              displayValue(lead.next_action || lead.summary, "Open lead to review commercial next step")
                            )}</div>
                            <div class="board-card-actions">
                              <span class="subtext">${escapeHtml(displayValue(lead.project_type, "Project type pending"))}</span>
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
              <div class="subtext" style="margin-top:6px;">Drag leads across stages to move the deal forward.</div>
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
        state.workspaceTab = "conversation";
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

  function renderAudit() {
    if (!hasPermission("view_audit")) {
      el.auditPanel.innerHTML =
        '<div class="value empty">Your role cannot access the audit trail.</div>';
      return;
    }

    const query = state.auditQuery.trim().toLowerCase();
    const items = state.audit.filter(function (event) {
      if (!query) return true;
      return JSON.stringify(event).toLowerCase().includes(query);
    });

    if (!items.length) {
      el.auditPanel.innerHTML =
        '<div class="value empty">No audit events match this filter.</div>';
      return;
    }

    el.auditPanel.innerHTML = items
      .map(function (event) {
        return `
          <article class="trace-item">
            <div class="trace-head">
              <strong>${escapeHtml(event.action || "event")}</strong>
              <span>${escapeHtml(formatDate(event.created_at))}</span>
            </div>
            <div class="subtext">${escapeHtml(
              [event.actor_email || "system", event.actor_role || "", event.target_type || "", event.target_id || ""]
                .filter(Boolean)
                .join(" · ")
            )}</div>
            <div class="value" style="margin-top:8px;">${escapeHtml(JSON.stringify(event.metadata || {}))}</div>
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
        '<div class="value empty">Your role cannot access the notification inbox.</div>';
      return;
    }

    Array.from(el.notificationFilters.querySelectorAll("[data-notification-filter]")).forEach(
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
        '<div class="value empty">No notifications match this view right now.</div>';
      return;
    }

    el.notificationsPanel.innerHTML = items
      .map(function (notification) {
        const lead = state.leads.find(function (candidate) {
          return candidate.id === notification.lead_id;
        });
        return `
          <article class="notification-card">
            <div class="notification-head">
              <strong>${escapeHtml(
                notification.type === "founder_escalation"
                  ? "Founder escalation"
                  : notification.type === "sales_handoff"
                  ? "Sales handoff"
                  : notification.type === "demo_requested"
                  ? "Demo request"
                  : notification.type || "Notification"
              )}</strong>
              <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(
                notification.status || "open"
              )}</span>
            </div>
            <div class="subtext">${escapeHtml(
              lead ? leadTitle(lead) : "Lead record"
            )} · ${escapeHtml(notification.urgency || "medium")} · ${escapeHtml(
              formatDate(notification.created_at)
            )}</div>
            <div class="value" style="margin-top:8px;">${escapeHtml(
              notification.summary || notification.reason || "No summary recorded."
            )}</div>
            <div class="toolbar" style="margin-top:12px;">
              <button class="ghost" type="button" data-notification-open="${notification.lead_id || ""}">Open lead</button>
              <button class="outline" type="button" data-notification-status="${notification.id}" data-status-value="resolved">Mark resolved</button>
              <button class="outline" type="button" data-notification-status="${notification.id}" data-status-value="open">Reopen</button>
            </div>
          </article>
        `;
      })
      .join("");

    Array.from(el.notificationsPanel.querySelectorAll("[data-notification-open]")).forEach(function (
      node
    ) {
      node.addEventListener("click", function () {
        const leadId = node.getAttribute("data-notification-open");
        if (leadId) {
          state.workspaceTab = "conversation";
          renderWorkspaceTabs();
          selectLead(leadId);
        }
      });
    });

    Array.from(el.notificationsPanel.querySelectorAll("[data-notification-status]")).forEach(
      function (node) {
        node.addEventListener("click", function () {
          const notificationId = node.getAttribute("data-notification-status");
          const statusValue = node.getAttribute("data-status-value");
          updateNotificationStatus(notificationId, statusValue).catch(function (error) {
            setBulkStatus(error.message || "Notification update failed.", true);
          });
        });
      }
    );
  }

  function renderTeamPanel() {
    if (!hasPermission("view_users")) {
      el.teamPanel.innerHTML =
        '<div class="value empty">Your role cannot view admin users.</div>';
      el.createUserBtn.disabled = true;
      el.newUserName.disabled = true;
      el.newUserEmail.disabled = true;
      el.newUserRole.disabled = true;
      el.newUserPassword.disabled = true;
      setTeamStatus("Your role cannot access team administration.", true);
      setInviteStatus("Your role cannot create invite links.", true);
      return;
    }

    if (!state.adminUsers.length) {
      el.teamPanel.innerHTML = '<div class="value empty">No admin users loaded yet.</div>';
    } else {
      el.teamPanel.innerHTML = state.adminUsers
        .map(function (user) {
          const canManageUsers = hasPermission("manage_users");
          return `
            <article class="team-card">
              <div class="team-head">
                <strong>${escapeHtml(user.display_name || user.email)}</strong>
                <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(
                  roleLabel(user.role || "viewer")
                )}</span>
              </div>
              <div class="subtext">${escapeHtml(user.email)}</div>
              <div class="subtext" style="margin-top:6px;">Status: ${escapeHtml(
                user.status || "active"
              )}</div>
              <div class="subtext" style="margin-top:6px;">Last login: ${escapeHtml(
                user.last_login_at ? formatDate(user.last_login_at) : "Never"
              )}</div>
              <div class="toolbar" style="margin-top:12px;">
                <select class="mini-select" data-user-role="${user.id}" ${
                  canManageUsers ? "" : "disabled"
                }>
                  <option value="viewer" ${user.role === "viewer" ? "selected" : ""}>viewer</option>
                  <option value="operator" ${user.role === "operator" ? "selected" : ""}>operator</option>
                  <option value="sales" ${user.role === "sales" ? "selected" : ""}>sales</option>
                  <option value="founder" ${user.role === "founder" ? "selected" : ""}>founder</option>
                  <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
                </select>
                <select class="mini-select" data-user-status="${user.id}" ${
                  canManageUsers ? "" : "disabled"
                }>
                  <option value="active" ${user.status === "active" ? "selected" : ""}>active</option>
                  <option value="inactive" ${user.status === "inactive" ? "selected" : ""}>inactive</option>
                </select>
                <button class="ghost" type="button" data-user-save="${user.id}" ${
                  canManageUsers ? "" : "disabled"
                }>Save</button>
              </div>
              <div class="toolbar" style="margin-top:10px;">
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
            </article>
          `;
        })
        .join("");
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

    Array.from(el.teamPanel.querySelectorAll("[data-user-save]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const userId = node.getAttribute("data-user-save");
        const role = el.teamPanel.querySelector(`[data-user-role="${userId}"]`).value;
        const status = el.teamPanel.querySelector(`[data-user-status="${userId}"]`).value;
        updateAdminUser(userId, { role, status }).catch(function (error) {
          setTeamStatus(error.message || "Could not update admin user.", true);
        });
      });
    });

    Array.from(el.teamPanel.querySelectorAll("[data-user-reset]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const userId = node.getAttribute("data-user-reset");
        const passwordInput = el.teamPanel.querySelector(`[data-user-password="${userId}"]`);
        updateAdminUser(userId, { password: passwordInput.value || "" }).catch(function (error) {
          setTeamStatus(error.message || "Could not reset password.", true);
        });
      });
    });

    Array.from(el.teamPanel.querySelectorAll("[data-user-reset-link]")).forEach(function (node) {
      node.addEventListener("click", function () {
        const userId = node.getAttribute("data-user-reset-link");
        issueResetLink(userId).catch(function (error) {
          setTeamStatus(error.message || "Could not issue reset link.", true);
        });
      });
    });
  }

  function renderChannelState() {
    if (!state.selectedLead) {
      el.channelStatePanel.textContent = "No lead selected.";
      el.channelStatePanel.className = "value empty";
      return;
    }

    if (!state.channelState) {
      el.channelStatePanel.textContent =
        "No WhatsApp channel state recorded yet for this lead.";
      el.channelStatePanel.className = "value empty";
      return;
    }

    el.channelStatePanel.textContent = [
      `AI paused: ${state.channelState.ai_paused ? "yes" : "no"}`,
      `Human status: ${displayValue(state.channelState.human_status, "auto")}`,
      `Human owner: ${displayValue(state.channelState.human_owner, "Not assigned")}`,
      `Reason: ${displayValue(state.channelState.takeover_reason, "Not set")}`,
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
    ].join("\n\n");
    el.channelStatePanel.className = "value";
  }

  function renderTimeline() {
    if (!state.selectedLead) {
      el.timelinePanel.innerHTML = '<div class="value empty">Select a lead to inspect the CRM timeline.</div>';
      return;
    }

    if (!state.timeline.length) {
      el.timelinePanel.innerHTML = '<div class="value empty">No timeline events yet for this lead.</div>';
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
      return JSON.stringify(trace).toLowerCase().includes(query);
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
                trace.lead_id ? `lead ${trace.lead_id.slice(0, 8)}` : "",
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

  function renderWorkspaceTabs() {
    Array.from(el.workspaceTabs.querySelectorAll("[data-tab]")).forEach(function (node) {
      const tab = node.getAttribute("data-tab");
      const allowed = canAccessTab(tab);
      node.hidden = !allowed;
      node.classList.toggle("active", allowed && tab === state.workspaceTab);
    });
    if (!canAccessTab(state.workspaceTab)) {
      state.workspaceTab = "conversation";
    }
    Array.from(document.querySelectorAll("[data-panel]")).forEach(function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-panel") === state.workspaceTab);
    });
    renderFounderInbox();
    renderNotifications();
    renderReports();
    renderBookings();
    renderCommercial();
    renderTeamPanel();
    renderAudit();
    renderTraceExplorer();
    renderTimeline();
    updateHeaderActions();
    updateDetailRailState();
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
      el.detailTitle.textContent = "No lead selected";
      el.detailSubtitle.textContent = "Update ownership, score, summary, demos, and escalation notes.";
      el.detailSummaryPrimary.innerHTML = '<div class="value empty">Select a lead to inspect details and take action.</div>';
      el.detailSummaryMore.innerHTML = '<div class="value empty">More lead detail appears here.</div>';
      el.memoryPanel.textContent = "No lead selected.";
      el.memoryPanel.className = "value empty";
      el.tracePanel.innerHTML = '<div class="value empty">No lead selected.</div>';
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
      : "No demos yet";

    el.detailSummaryPrimary.innerHTML = [
      summaryField("Company", displayValue(state.selectedLead.company, "Not captured")),
      summaryField("Role", displayValue(state.selectedLead.role, "Not captured")),
      summaryField("Email", displayValue(state.selectedLead.email, "Not captured")),
      summaryField("Phone", displayValue(state.selectedLead.phone, "Not captured")),
    ].join("");

    el.detailSummaryMore.innerHTML = [
      summaryField("Source", displayValue(state.selectedLead.source, "Not captured")),
      summaryField("Location", displayValue(state.selectedLead.location, "Not captured")),
      summaryField("Project Type", displayValue(state.selectedLead.project_type, "Not captured")),
      summaryField(
        "Unit Count",
        state.selectedLead.unit_count ? String(state.selectedLead.unit_count) : "Not captured"
      ),
      summaryField("Status", displayValue(state.selectedLead.status, "new")),
      summaryField("Owner", ownerLabel(state.selectedLead.owner)),
      summaryField("Commercial Stage", displayValue(state.selectedLead.commercial_stage, "Not set")),
      summaryField("Lost Reason", displayValue(state.selectedLead.lost_reason, "Not set")),
      summaryField("Score", String(state.selectedLead.score || 0)),
      summaryField("Next Action", displayValue(state.selectedLead.next_action, "No next action yet")),
      summaryField("Summary", displayValue(state.selectedLead.summary, "No summary yet")),
      summaryField("Demo Pipeline", demos),
    ].join("");

    if (!state.memory) {
      el.memoryPanel.textContent = "No memory stored yet.";
      el.memoryPanel.className = "value empty";
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
    }
    renderChannelState();

    if (!hasPermission("view_traces")) {
      el.tracePanel.innerHTML =
        '<div class="value empty">Trace access is restricted for your role.</div>';
    } else {
      const relatedTraces = state.traces.filter(function (trace) {
        return trace.lead_id === state.selectedLead.id;
      }).slice(0, 8);

      if (!relatedTraces.length) {
        el.tracePanel.innerHTML = '<div class="value empty">No traces for this lead yet.</div>';
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
    }

    el.statusInput.value = "";
    el.ownerInput.value = "";
    el.projectTypeInput.value = state.selectedLead.project_type || "";
    el.unitCountInput.value = state.selectedLead.unit_count || "";
    el.commercialStageInput.value = state.selectedLead.commercial_stage || "";
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
    el.demoAtInput.disabled = !canManageDemos;
    el.demoNotesInput.disabled = !canManageDemos;
    el.createDemoBtn.disabled = !canManageDemos;
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
      el.proposalListPanel.innerHTML = '<div class="value empty">No proposals yet for this lead.</div>';
    } else {
      el.proposalListPanel.innerHTML = state.proposals
        .map(function (proposal) {
          return `
            <div class="trace-item">
              <div class="trace-head">
                <strong>${escapeHtml(proposal.title || proposal.tier_name || "Proposal")}</strong>
                <span>${escapeHtml(proposal.status || "draft")}</span>
              </div>
              <div class="subtext">${escapeHtml(proposal.tier_name || "Tier not set")}</div>
              <div class="value" style="margin-top:8px;">${escapeHtml(proposal.body || "")}</div>
            </div>
          `;
        })
        .join("");
    }

    el.proposalUnitsInput.value = state.selectedLead.unit_count || "";
    el.createProposalBtn.disabled = !hasPermission("manage_commercial");
    updateDetailRailState();
  }

  function setAgentChoice(choice) {
    el.agentSelect.value = choice;
    el.agentOmaBtn.classList.toggle("active", choice === "marketing");
    el.agentOsaBtn.classList.toggle("active", choice === "sales");
  }

  async function loadLeads() {
    const [leadData, traceData, notificationData, reportData, userData, demosData, proposalData, auditData] = await Promise.all([
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
    ]);
    state.leads = leadData.leads || [];
    state.traces = traceData.traces || [];
    state.notifications = notificationData.notifications || [];
    state.report = reportData.report || null;
    state.adminUsers = userData.users || [];
    state.allDemos = demosData.demos || [];
    state.allProposals = proposalData.proposals || [];
    state.audit = auditData.audit || [];

    if (
      state.selectedLeadId &&
      !state.leads.find(function (lead) {
        return lead.id === state.selectedLeadId;
      })
    ) {
      state.selectedLeadId = "";
      state.selectedLead = null;
      state.conversations = [];
      state.demos = [];
      state.memory = null;
    }

    if (!state.selectedLeadId && state.leads.length) {
      state.selectedLeadId = state.leads[0].id;
    }

    renderLeadList();
    renderReports();
    renderNotifications();
    renderFounderInbox();
    renderBookings();
    renderCommercial();
    renderTeamPanel();
    renderAudit();
    renderTraceExplorer();
    renderTimeline();

    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    } else {
      renderConversation();
      renderDetail();
    }
  }

  async function selectLead(leadId, skipRender) {
    state.selectedLeadId = leadId;
    state.selectedLead =
      state.leads.find(function (lead) {
        return lead.id === leadId;
      }) || null;

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
    const patch = { commercial_stage: nextStage };
    if (nextStage === "won") {
      patch.status = "closed";
    }
    if (nextStage === "lost") {
      patch.status = "lost";
    }
    if (["proposal", "quote", "negotiation", "procurement"].includes(nextStage)) {
      patch.status = "sales";
    }
    setDetailStatus(`Moving lead to ${nextStage}...`);
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
    renderNotifications();
    renderFounderInbox();
    setBulkStatus(`Notification marked ${status}.`);
  }

  async function updateChannelState(patch, leadOwner) {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
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
    setTeamStatus("Creating admin user...");
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
    el.newUserName.value = "";
    el.newUserEmail.value = "";
    el.newUserPassword.value = "";
    el.newUserRole.value = "viewer";
    renderTeamPanel();
    setTeamStatus(`Created admin user for ${email}.`);
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
    setInviteStatus(`Invite token: ${result.invite_token}`);
  }

  async function updateAdminUser(userId, patch) {
    if (!hasPermission("manage_users")) {
      throw new Error("Your role cannot update admin users.");
    }
    setTeamStatus("Updating admin user...");
    await api(`/api/lead-agents/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const userData = await api("/api/lead-agents/admin/users", { method: "GET" });
    state.adminUsers = userData.users || [];
    renderTeamPanel();
    setTeamStatus("Admin user updated.");
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
    setTeamStatus(`Reset token: ${result.reset_token}`);
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
      setComposerStatus("Select a lead first.", true);
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
      setDetailStatus("Select a lead first.", true);
      return;
    }
    if (!hasPermission("manage_leads")) {
      setDetailStatus("Your role cannot update leads.", true);
      return;
    }

    setDetailStatus("Updating lead...");
    await updateLeadPatch(state.selectedLead.id, {
      status: el.statusInput.value || undefined,
      owner: el.ownerInput.value || undefined,
      project_type: el.projectTypeInput.value || undefined,
      unit_count: el.unitCountInput.value ? Number(el.unitCountInput.value) : undefined,
      commercial_stage: el.commercialStageInput.value || undefined,
      lost_reason: el.lostReasonInput.value || undefined,
      score: el.scoreInput.value ? Number(el.scoreInput.value) : undefined,
      next_action: el.nextActionInput.value || undefined,
      summary: el.summaryInput.value || undefined,
    });
    setDetailStatus("Lead updated.");
  }

  async function createProposal() {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
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
        project_type: state.selectedLead.project_type || undefined,
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
      setDetailStatus("Select a lead first.", true);
      return;
    }
    if (!hasPermission("manage_demos")) {
      setDetailStatus("Your role cannot create demos.", true);
      return;
    }

    setDetailStatus("Creating demo...");
    await api(`/api/lead-agents/leads/${state.selectedLead.id}/demos`, {
      method: "POST",
      body: JSON.stringify({
        scheduled_for: el.demoAtInput.value
          ? new Date(el.demoAtInput.value).toISOString()
          : null,
        notes: el.demoNotesInput.value || "",
        status: "confirmed",
        update_lead_status: true,
        timezone: "Africa/Lagos",
      }),
    });
    await loadLeads();
    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    }
    el.demoAtInput.value = "";
    el.demoNotesInput.value = "";
    setDetailStatus("Demo created.");
  }

  async function escalate() {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
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
      await loadLeads();
      setAuthStatus(`Signed in as ${email}.`);
      setComposerStatus("");
      setDetailStatus("");
      setBulkStatus("");
      setTeamStatus("");
      setPasswordStatus("");
    } catch (error) {
      state.session = null;
      updateAuthUi();
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
      return true;
    } catch {
      state.session = null;
      updateAuthUi();
      return false;
    }
  }

  async function logout() {
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
    state.allDemos = [];
    state.proposals = [];
    state.allProposals = [];
    state.audit = [];
    state.timeline = [];
    state.adminUsers = [];
    state.channelState = null;
    state.traceQuery = "";
    state.notificationFilter = "open";
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
      renderLeadList();
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
  el.searchInput.addEventListener("input", renderLeadList);
  Array.from(el.queueGrid.querySelectorAll("[data-queue]")).forEach(function (node) {
    node.addEventListener("click", function () {
      state.activeQueue = node.getAttribute("data-queue");
      renderLeadList();
    });
  });
  Array.from(el.filterRow.querySelectorAll("[data-filter]")).forEach(function (node) {
    node.addEventListener("click", function () {
      state.activeFilter = node.getAttribute("data-filter");
      renderLeadList();
    });
  });
  Array.from(el.workspaceTabs.querySelectorAll("[data-tab]")).forEach(function (node) {
    node.addEventListener("click", function () {
      state.workspaceTab = node.getAttribute("data-tab");
      renderWorkspaceTabs();
    });
  });
  Array.from(el.notificationFilters.querySelectorAll("[data-notification-filter]")).forEach(
    function (node) {
      node.addEventListener("click", function () {
        state.notificationFilter = node.getAttribute("data-notification-filter");
        renderNotifications();
      });
    }
  );
  el.traceSearchInput.addEventListener("input", function () {
    state.traceQuery = el.traceSearchInput.value;
    renderTraceExplorer();
  });
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
      setTeamStatus(error.message || "Could not create admin user.", true);
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
  el.auditSearchInput.addEventListener("input", function () {
    state.auditQuery = el.auditSearchInput.value;
    renderAudit();
  });
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
  el.createDemoBtn.addEventListener("click", function () {
    createDemo().catch(function (error) {
      setDetailStatus(error.message || "Demo creation failed.", true);
    });
  });
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
        return loadLeads().then(function () {
          setAuthStatus(`Signed in as ${state.adminEmail}.`);
        });
      }
      setAuthStatus("Log in to access the lead desk.");
    })
    .catch(function () {
      setAuthStatus("Log in to access the lead desk.");
    });
})();
