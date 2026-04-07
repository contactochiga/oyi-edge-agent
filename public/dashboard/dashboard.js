(function () {
  const API_KEY_STORAGE = "ochiga_lead_desk_api_key";

  const state = {
    apiKey: window.localStorage.getItem(API_KEY_STORAGE) || "",
    leads: [],
    filteredLeads: [],
    selectedLeadId: "",
    selectedLead: null,
    conversations: [],
    demos: [],
  };

  const el = {
    apiKey: document.getElementById("apiKey"),
    saveKeyBtn: document.getElementById("saveKeyBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    authStatus: document.getElementById("authStatus"),
    searchInput: document.getElementById("searchInput"),
    leadList: document.getElementById("leadList"),
    threadTitle: document.getElementById("threadTitle"),
    threadSubtitle: document.getElementById("threadSubtitle"),
    threadCanvas: document.getElementById("threadCanvas"),
    agentSelect: document.getElementById("agentSelect"),
    reloadLeadBtn: document.getElementById("reloadLeadBtn"),
    composerInput: document.getElementById("composerInput"),
    sendBtn: document.getElementById("sendBtn"),
    composerStatus: document.getElementById("composerStatus"),
    detailTitle: document.getElementById("detailTitle"),
    detailSubtitle: document.getElementById("detailSubtitle"),
    detailSummary: document.getElementById("detailSummary"),
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

  el.apiKey.value = state.apiKey;

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

  function authHeaders() {
    return {
      "content-type": "application/json",
      "x-api-key": state.apiKey,
    };
  }

  async function api(path, options) {
    if (!state.apiKey) {
      throw new Error("Paste the dashboard API key first.");
    }

    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options && options.headers ? options.headers : {}),
        ...authHeaders(),
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

  function statusClass(status) {
    return `status-${String(status || "new").toLowerCase()}`;
  }

  function filterLeads() {
    const query = el.searchInput.value.trim().toLowerCase();
    if (!query) {
      state.filteredLeads = [...state.leads];
      return;
    }
    state.filteredLeads = state.leads.filter(function (lead) {
      const haystack = [
        lead.name,
        lead.company,
        lead.role,
        lead.status,
        lead.owner,
        lead.summary,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  function renderLeadList() {
    filterLeads();

    if (state.filteredLeads.length === 0) {
      el.leadList.innerHTML =
        '<div class="empty-state">No leads match this filter yet.</div>';
      return;
    }

    el.leadList.innerHTML = state.filteredLeads
      .map(function (lead) {
        const isActive = lead.id === state.selectedLeadId ? "active" : "";
        return `
          <article class="lead-card ${isActive}" data-lead-id="${lead.id}">
            <div class="lead-top">
              <div>
                <div class="lead-name">${escapeHtml(
                  lead.name && lead.name !== "unknown" ? lead.name : lead.company || "Unknown lead"
                )}</div>
                <div class="subtext" style="margin-top:6px;">${escapeHtml(
                  [lead.company, lead.role].filter(Boolean).join(" · ") || "No role details"
                )}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px;color:#678377;">${escapeHtml(
                  String(lead.score || 0)
                )}</div>
              </div>
            </div>
            <div class="pill-row">
              <span class="pill status ${statusClass(lead.status)}">${escapeHtml(
                lead.status || "new"
              )}</span>
              <span class="pill" style="background:rgba(10,44,34,0.08);color:#214238;">${escapeHtml(
                lead.owner || "unknown"
              )}</span>
            </div>
            <div class="subtext" style="margin-top:10px;">${escapeHtml(
              lead.summary || lead.next_action || "No summary yet"
            )}</div>
          </article>
        `;
      })
      .join("");

    Array.from(el.leadList.querySelectorAll("[data-lead-id]")).forEach(function (node) {
      node.addEventListener("click", function () {
        selectLead(node.getAttribute("data-lead-id"));
      });
    });
  }

  function renderThread() {
    if (!state.selectedLead) {
      el.threadTitle.textContent = "Select a lead";
      el.threadSubtitle.textContent =
        "Review the message history and continue the conversation as Oma or Osa.";
      el.threadCanvas.innerHTML =
        '<div class="empty-state">Choose a lead from the left to review qualification, Sales handoff, or escalation.</div>';
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
      el.threadCanvas.innerHTML =
        '<div class="empty-state">No conversation history yet for this lead.</div>';
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
        return `
          <div class="message ${role}">
            ${escapeHtml(item.content)}
            <div style="margin-top:8px;font-size:11px;opacity:0.65;">${escapeHtml(
              `${item.agent_name || "agent"} · ${formatDate(item.created_at)}`
            )}</div>
          </div>
        `;
      })
      .join("");

    el.threadCanvas.scrollTop = el.threadCanvas.scrollHeight;
  }

  function summaryField(label, value) {
    return `
      <div class="summary-card">
        <div class="key">${escapeHtml(label)}</div>
        <div class="value ${value ? "" : "empty"}">${escapeHtml(value || "unknown")}</div>
      </div>
    `;
  }

  function renderDetail() {
    if (!state.selectedLead) {
      el.detailTitle.textContent = "No lead selected";
      el.detailSubtitle.textContent =
        "Update ownership, status, score, notes, demos, and escalations.";
      el.detailSummary.innerHTML =
        '<div class="empty-state" style="padding:0;">Select a lead to inspect details and take action.</div>';
      return;
    }

    el.detailTitle.textContent =
      state.selectedLead.name !== "unknown" ? state.selectedLead.name : state.selectedLead.company;
    el.detailSubtitle.textContent = `Lead ID: ${state.selectedLead.id}`;

    const demos = state.demos.length
      ? state.demos.map(function (demo) {
          return `${formatDate(demo.scheduled_for)} · ${demo.status}`;
        }).join("\n")
      : "No demos yet";

    el.detailSummary.innerHTML = [
      summaryField("Company", state.selectedLead.company),
      summaryField("Role", state.selectedLead.role),
      summaryField("Email", state.selectedLead.email),
      summaryField("Phone", state.selectedLead.phone),
      summaryField("Source", state.selectedLead.source),
      summaryField("Location", state.selectedLead.location),
      summaryField("Status", state.selectedLead.status),
      summaryField("Owner", state.selectedLead.owner),
      summaryField("Score", String(state.selectedLead.score || 0)),
      summaryField("Next Action", state.selectedLead.next_action),
      summaryField("Summary", state.selectedLead.summary),
      summaryField("Demo Pipeline", demos),
    ].join("");

    el.statusInput.value = "";
    el.ownerInput.value = "";
    el.scoreInput.value = state.selectedLead.score || "";
    el.nextActionInput.value = state.selectedLead.next_action || "";
    el.summaryInput.value = state.selectedLead.summary || "";
  }

  async function loadLeads() {
    const data = await api("/api/lead-agents/leads", { method: "GET" });
    state.leads = data.leads || [];
    if (
      state.selectedLeadId &&
      !state.leads.find(function (lead) {
        return lead.id === state.selectedLeadId;
      })
    ) {
      state.selectedLeadId = "";
      state.selectedLead = null;
    }
    if (!state.selectedLeadId && state.leads.length) {
      state.selectedLeadId = state.leads[0].id;
    }
    renderLeadList();
    if (state.selectedLeadId) {
      await selectLead(state.selectedLeadId, true);
    } else {
      renderThread();
      renderDetail();
    }
  }

  async function selectLead(leadId, skipListRender) {
    state.selectedLeadId = leadId;
    state.selectedLead =
      state.leads.find(function (lead) {
        return lead.id === leadId;
      }) || null;

    const [conversationData, demosData] = await Promise.all([
      api(`/api/lead-agents/leads/${leadId}/conversations`, { method: "GET" }),
      api(`/api/lead-agents/leads/${leadId}/demos`, { method: "GET" }),
    ]);

    state.conversations = conversationData.conversations || [];
    state.demos = demosData.demos || [];

    if (!skipListRender) {
      renderLeadList();
    } else {
      renderLeadList();
    }
    renderThread();
    renderDetail();
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
    state.conversations = data.conversations || [];
    state.leads = state.leads.map(function (lead) {
      return lead.id === data.lead.id ? data.lead : lead;
    });
    renderLeadList();
    renderThread();
    renderDetail();
    el.composerInput.value = "";
    setComposerStatus("Message sent through agent.");
  }

  async function updateLead() {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
      return;
    }

    setDetailStatus("Updating lead...");
    const data = await api(`/api/lead-agents/leads/${state.selectedLead.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: el.statusInput.value || undefined,
        owner: el.ownerInput.value || undefined,
        score: el.scoreInput.value ? Number(el.scoreInput.value) : undefined,
        next_action: el.nextActionInput.value || undefined,
        summary: el.summaryInput.value || undefined,
      }),
    });

    state.selectedLead = data.lead;
    state.leads = state.leads.map(function (lead) {
      return lead.id === data.lead.id ? data.lead : lead;
    });
    renderLeadList();
    renderDetail();
    setDetailStatus("Lead updated.");
  }

  async function createDemo() {
    if (!state.selectedLead) {
      setDetailStatus("Select a lead first.", true);
      return;
    }

    setDetailStatus("Creating demo record...");
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

    await selectLead(state.selectedLead.id, true);
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

    await loadLeads();
    el.escalationReasonInput.value = "";
    el.escalationSummaryInput.value = "";
    setDetailStatus("Escalation sent.");
  }

  async function connect() {
    state.apiKey = el.apiKey.value.trim();
    if (!state.apiKey) {
      setAuthStatus("Paste the dashboard API key first.", true);
      return;
    }
    window.localStorage.setItem(API_KEY_STORAGE, state.apiKey);
    setAuthStatus("Connecting...");
    try {
      await loadLeads();
      setAuthStatus("Connected to lead desk.");
      setComposerStatus("");
      setDetailStatus("");
    } catch (error) {
      setAuthStatus(error.message || "Unable to connect.", true);
    }
  }

  el.saveKeyBtn.addEventListener("click", connect);
  el.refreshBtn.addEventListener("click", function () {
    loadLeads()
      .then(function () {
        setAuthStatus("Lead list refreshed.");
      })
      .catch(function (error) {
        setAuthStatus(error.message || "Refresh failed.", true);
      });
  });
  el.searchInput.addEventListener("input", renderLeadList);
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

  if (state.apiKey) {
    connect();
  }
})();
