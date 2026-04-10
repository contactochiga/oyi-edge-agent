(function () {
  const ADMIN_EMAIL_STORAGE = "ochiga_lead_desk_admin_email";

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
    traceQuery: "",
  };

  const el = {
    adminEmail: document.getElementById("adminEmail"),
    adminPassword: document.getElementById("adminPassword"),
    loginBtn: document.getElementById("loginBtn"),
    authStatus: document.getElementById("authStatus"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    accountMenuWrap: document.getElementById("accountMenuWrap"),
    accountButton: document.getElementById("accountButton"),
    accountAvatar: document.getElementById("accountAvatar"),
    accountName: document.getElementById("accountName"),
    accountSubtitle: document.getElementById("accountSubtitle"),
    accountEmailMenu: document.getElementById("accountEmailMenu"),
    queueGrid: document.getElementById("queueGrid"),
    filterRow: document.getElementById("filterRow"),
    countAll: document.getElementById("countAll"),
    countOma: document.getElementById("countOma"),
    countOsa: document.getElementById("countOsa"),
    countEscalated: document.getElementById("countEscalated"),
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
    threadCanvas: document.getElementById("threadCanvas"),
    founderInbox: document.getElementById("founderInbox"),
    traceExplorer: document.getElementById("traceExplorer"),
    traceSearchInput: document.getElementById("traceSearchInput"),
    openFounderQueueBtn: document.getElementById("openFounderQueueBtn"),
    agentSelect: document.getElementById("agentSelect"),
    reloadLeadBtn: document.getElementById("reloadLeadBtn"),
    composerInput: document.getElementById("composerInput"),
    sendBtn: document.getElementById("sendBtn"),
    composerStatus: document.getElementById("composerStatus"),
    detailTitle: document.getElementById("detailTitle"),
    detailSubtitle: document.getElementById("detailSubtitle"),
    detailSummary: document.getElementById("detailSummary"),
    memoryPanel: document.getElementById("memoryPanel"),
    tracePanel: document.getElementById("tracePanel"),
    statusInput: document.getElementById("statusInput"),
    ownerInput: document.getElementById("ownerInput"),
    scoreInput: document.getElementById("scoreInput"),
    nextActionInput: document.getElementById("nextActionInput"),
    summaryInput: document.getElementById("summaryInput"),
    updateLeadBtn: document.getElementById("updateLeadBtn"),
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
    return owner || "unknown";
  }

  function toolSummary(content) {
    try {
      const parsed = JSON.parse(content);
      return `${parsed.tool || "tool"} · ${parsed.arguments ? Object.keys(parsed.arguments).join(", ") : ""}`;
    } catch {
      return content;
    }
  }

  function updateAuthUi() {
    const loggedIn = Boolean(state.session && state.adminEmail);
    document.body.classList.toggle("logged-out", !loggedIn);
    if (loggedIn) {
      const initials = initialsFromEmail(state.adminEmail);
      el.accountAvatar.textContent = initials;
      el.accountName.textContent = initials;
      el.accountSubtitle.textContent = state.adminEmail;
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

    Array.from(el.queueGrid.querySelectorAll("[data-queue]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-queue") === state.activeQueue);
    });
    Array.from(el.filterRow.querySelectorAll("[data-filter]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-filter") === state.activeFilter);
    });
    el.selectedCount.textContent = `${state.selectedLeadIds.size} selected`;
  }

  function renderLeadList() {
    filterLeads();
    updateQueueCards();

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
                  lead.name && lead.name !== "unknown" ? lead.name : lead.company || "Unknown lead"
                )}</div>
                <div class="subtext" style="margin-top: 6px;">${escapeHtml(
                  [lead.company, lead.role, lead.location].filter(Boolean).join(" · ") || "No company details"
                )}</div>
                <div class="pill-row">
                  <span class="pill ${statusClass(lead.status)}">${escapeHtml(lead.status || "new")}</span>
                  <span class="pill" style="background:rgba(10,44,34,0.08);color:#214238;">${escapeHtml(ownerLabel(lead.owner))}</span>
                  <span class="pill" style="background:rgba(239,198,111,0.14);color:#6d5113;">score ${escapeHtml(String(lead.score || 0))}</span>
                </div>
                <div class="subtext" style="margin-top: 10px;">${escapeHtml(
                  lead.summary || lead.next_action || "No summary yet"
                )}</div>
              </div>
            </div>
            <div class="lead-quick-row" style="margin-top: 12px;">
              <select class="mini-select" data-inline-owner="${lead.id}">
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
      return;
    }

    el.threadTitle.textContent =
      state.selectedLead.name !== "unknown" ? state.selectedLead.name : state.selectedLead.company;
    el.threadSubtitle.textContent = [
      state.selectedLead.company,
      state.selectedLead.role,
      state.selectedLead.location,
    ]
      .filter(Boolean)
      .join(" · ");

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
              `${item.agent_name || "agent"} · ${formatDate(item.created_at)}`
            )}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderFounderInbox() {
    const items = state.leads.filter(function (lead) {
      return lead.status === "escalated" || lead.owner === "human";
    });

    if (!items.length) {
      el.founderInbox.innerHTML = '<div class="value empty">No founder escalations right now.</div>';
      return;
    }

    el.founderInbox.innerHTML = items
      .map(function (lead) {
        return `
          <article class="founder-card">
            <div class="founder-head">
              <strong>${escapeHtml(
                lead.name && lead.name !== "unknown" ? lead.name : lead.company || "Unknown lead"
              )}</strong>
              <span class="mono" style="font-size:12px;color:#667c73;">${escapeHtml(
                String(lead.score || 0)
              )}</span>
            </div>
            <div class="subtext">${escapeHtml(
              [lead.company, lead.role, lead.location].filter(Boolean).join(" · ")
            )}</div>
            <div class="subtext" style="margin-top: 8px;">${escapeHtml(
              lead.summary || lead.next_action || "Escalated for review"
            )}</div>
            <div class="toolbar" style="margin-top: 12px;">
              <button class="ghost" type="button" data-founder-open="${lead.id}">Open lead</button>
              <button class="outline" type="button" data-founder-assign="${lead.id}">Assign to human</button>
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

  function renderTraceExplorer() {
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
                formatDate(trace.ts)
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
              trace.assistant_message || trace.user_message || JSON.stringify(trace.arguments || trace.result || {})
            )}</div>
          </article>
        `;
      })
      .join("");
  }

  function renderWorkspaceTabs() {
    Array.from(el.workspaceTabs.querySelectorAll("[data-tab]")).forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-tab") === state.workspaceTab);
    });
    Array.from(document.querySelectorAll("[data-panel]")).forEach(function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-panel") === state.workspaceTab);
    });
    renderFounderInbox();
    renderTraceExplorer();
  }

  function summaryField(label, value) {
    return `
      <div class="detail-card">
        <div class="key">${escapeHtml(label)}</div>
        <div class="value ${value ? "" : "empty"}">${escapeHtml(value || "unknown")}</div>
      </div>
    `;
  }

  function renderDetail() {
    if (!state.selectedLead) {
      el.detailTitle.textContent = "No lead selected";
      el.detailSubtitle.textContent = "Update ownership, score, summary, demos, and escalation notes.";
      el.detailSummary.innerHTML = '<div class="value empty">Select a lead to inspect details and take action.</div>';
      el.memoryPanel.textContent = "No lead selected.";
      el.memoryPanel.className = "value empty";
      el.tracePanel.innerHTML = '<div class="value empty">No lead selected.</div>';
      return;
    }

    el.detailTitle.textContent =
      state.selectedLead.name !== "unknown" ? state.selectedLead.name : state.selectedLead.company;
    el.detailSubtitle.textContent = `Lead ID: ${state.selectedLead.id}`;

    const demos = state.demos.length
      ? state.demos
          .map(function (demo) {
            return `${formatDate(demo.scheduled_for)} · ${demo.status}`;
          })
          .join("\n")
      : "No demos yet";

    el.detailSummary.innerHTML = [
      summaryField("Company", state.selectedLead.company),
      summaryField("Role", state.selectedLead.role),
      summaryField("Email", state.selectedLead.email),
      summaryField("Phone", state.selectedLead.phone),
      summaryField("Source", state.selectedLead.source),
      summaryField("Location", state.selectedLead.location),
      summaryField("Status", state.selectedLead.status),
      summaryField("Owner", ownerLabel(state.selectedLead.owner)),
      summaryField("Score", String(state.selectedLead.score || 0)),
      summaryField("Next Action", state.selectedLead.next_action),
      summaryField("Summary", state.selectedLead.summary),
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
                <span class="mono" style="font-size:11px;color:#667c73;">${escapeHtml(formatDate(trace.ts))}</span>
              </div>
              <div class="subtext">${escapeHtml(trace.tool_name || trace.agent || "")}</div>
            </div>
          `;
        })
        .join("");
    }

    el.statusInput.value = "";
    el.ownerInput.value = "";
    el.scoreInput.value = state.selectedLead.score || "";
    el.nextActionInput.value = state.selectedLead.next_action || "";
    el.summaryInput.value = state.selectedLead.summary || "";
  }

  async function loadLeads() {
    const [leadData, traceData] = await Promise.all([
      api("/api/lead-agents/leads", { method: "GET" }),
      api("/api/lead-agents/admin/traces", { method: "GET" }),
    ]);
    state.leads = leadData.leads || [];
    state.traces = traceData.traces || [];

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
    renderFounderInbox();
    renderTraceExplorer();

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

    const [conversationData, demosData, memoryData] = await Promise.all([
      api(`/api/lead-agents/leads/${leadId}/conversations`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/demos`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/memory`, { method: "GET" }),
    ]);

    state.conversations = conversationData.conversations || [];
    state.demos = demosData.demos || [];
    state.memory = memoryData.memory || null;

    if (!skipRender) {
      renderLeadList();
    } else {
      renderLeadList();
    }
    renderConversation();
    renderDetail();
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
    return data.lead;
  }

  async function applyBulkAction() {
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
    state.traces = await api("/api/lead-agents/admin/traces", { method: "GET" }).then(
      function (payload) {
        return payload.traces || [];
      }
    );
    state.leads = state.leads.map(function (lead) {
      return lead.id === data.lead.id ? data.lead : lead;
    });

    renderLeadList();
    renderConversation();
    renderDetail();
    renderFounderInbox();
    renderTraceExplorer();
    el.composerInput.value = "";
    setComposerStatus("Message sent through agent.");
  }

  async function updateLead() {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
      return;
    }

    setDetailStatus("Updating lead...");
    await updateLeadPatch(state.selectedLead.id, {
      status: el.statusInput.value || undefined,
      owner: el.ownerInput.value || undefined,
      score: el.scoreInput.value ? Number(el.scoreInput.value) : undefined,
      next_action: el.nextActionInput.value || undefined,
      summary: el.summaryInput.value || undefined,
    });
    setDetailStatus("Lead updated.");
  }

  async function createDemo() {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
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
        status: "pending",
        update_lead_status: true,
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
    state.traceQuery = "";
    el.adminPassword.value = "";
    el.traceSearchInput.value = "";
    updateAuthUi();
    renderLeadList();
    renderConversation();
    renderFounderInbox();
    renderTraceExplorer();
    renderDetail();
    setAuthStatus("Signed out.");
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
  document.addEventListener("click", function (event) {
    if (!el.accountMenuWrap.contains(event.target)) {
      el.accountMenuWrap.classList.remove("open");
    }
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
  renderLeadList();
  renderConversation();
  renderFounderInbox();
  renderTraceExplorer();
  renderDetail();
  renderWorkspaceTabs();

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
