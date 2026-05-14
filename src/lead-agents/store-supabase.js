const axios = require("axios");
const { normalizeEmail, normalizeLeadInput, normalizeLeadPatch, normalizeText } = require("./normalize-lead");
const { buildOfficeSnapshot, createOfficeSeedData } = require("./office-data");

class SupabaseLeadAgentsStore {
  constructor({ url, serviceRoleKey, requestTimeoutMs }) {
    this.url = String(url || "").replace(/\/$/, "");
    this.requestTimeoutMs = requestTimeoutMs;
    this.client = axios.create({
      baseURL: `${this.url}/rest/v1`,
      timeout: requestTimeoutMs,
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
    });
  }

  async init() {}

  selectHeaders() {
    return {
      Prefer: "return=representation",
    };
  }

  async safeGet(pathname) {
    try {
      const response = await this.client.get(pathname);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400 || status === 404 || status === 406) {
        return [];
      }
      throw error;
    }
  }

  async upsertRows(tableName, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    const response = await this.client.post(`/${tableName}`, rows, {
      headers: {
        ...this.selectHeaders(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  normalizeLead(row) {
    if (!row) return null;
    return {
      ...row,
      name: row.name || "",
      company: row.company || "",
      role: row.role || "",
      email: row.email || "",
      phone: row.phone || "",
      whatsapp_phone: row.whatsapp_phone || "",
      primary_channel: row.primary_channel || "",
      channel_last_seen_at: row.channel_last_seen_at || "",
      location: row.location || "",
      unit_count:
        row.unit_count === undefined || row.unit_count === null ? null : Number(row.unit_count),
      project_type: row.project_type || "",
      summary: row.summary || "",
      next_action: row.next_action || "",
      commercial_stage: row.commercial_stage || "",
      lost_reason: row.lost_reason || "",
    };
  }

  async appendTimelineEvent(input) {
    const response = await this.client.post(
      "/timeline_events",
      {
        lead_id: input.lead_id,
        event_type: input.event_type,
        actor: input.actor || "",
        title: input.title || "",
        body: input.body || "",
        metadata: input.metadata || {},
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
  }

  async createLead(input) {
    const payload = {
      ...normalizeLeadInput(input, input.source),
      score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
      status: normalizeText(input.status) || "new",
      owner: normalizeText(input.owner) || "marketing_agent",
    };

    const response = await this.client.post("/leads", payload, {
      headers: this.selectHeaders(),
    });
    const lead = this.normalizeLead(response.data[0]);
    await this.appendTimelineEvent({
      lead_id: lead.id,
      event_type: "lead_created",
      actor: lead.owner,
      title: "Lead created",
      body: lead.summary || "New lead record created.",
      metadata: {
        source: lead.source,
        primary_channel: lead.primary_channel || "",
      },
    });
    return lead;
  }

  async updateLead(leadId, patch) {
    const payload = Object.fromEntries(
      Object.entries(normalizeLeadPatch(patch)).filter(([, value]) => value !== undefined)
    );

    const response = await this.client.patch(`/leads?id=eq.${leadId}`, payload, {
      headers: this.selectHeaders(),
    });

    const lead = this.normalizeLead(response.data[0] || null);
    if (lead) {
      await this.appendTimelineEvent({
        lead_id: leadId,
        event_type: "lead_updated",
        actor: payload.owner || lead.owner || "",
        title: "Lead updated",
        body: payload.summary || payload.next_action || "Lead fields updated.",
        metadata: payload,
      });
    }
    return lead;
  }

  async getLead(leadId) {
    const response = await this.client.get(`/leads?id=eq.${leadId}&limit=1`);
    return this.normalizeLead(response.data[0] || null);
  }

  async findLeadByPhone(phone) {
    const normalized = normalizeText(phone);
    if (!normalized) return null;
    const response = await this.client.get(
      `/leads?or=(phone.eq.${encodeURIComponent(normalized)},whatsapp_phone.eq.${encodeURIComponent(normalized)})&limit=1`
    );
    return this.normalizeLead(response.data[0] || null);
  }

  async findLeadByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const response = await this.client.get(
      `/leads?email=eq.${encodeURIComponent(normalized)}&limit=1`
    );
    return this.normalizeLead(response.data[0] || null);
  }

  async listLeads() {
    const response = await this.client.get("/leads?order=updated_at.desc");
    return response.data.map((row) => this.normalizeLead(row));
  }

  async appendConversation(input) {
    const response = await this.client.post(
      "/conversations",
      {
        lead_id: input.lead_id,
        agent_name: input.agent_name,
        message_role: input.message_role,
        channel: input.channel || "website",
        external_message_id: input.external_message_id || null,
        parent_external_message_id: input.parent_external_message_id || null,
        content: input.content,
      },
      {
        headers: this.selectHeaders(),
      }
    );
    await this.appendTimelineEvent({
      lead_id: input.lead_id,
      event_type: input.message_role === "tool" ? "tool_event" : "conversation",
      actor: input.agent_name,
      title: input.message_role === "tool" ? "Tool activity" : `${input.message_role} message`,
      body: input.content,
      metadata: {
        message_role: input.message_role,
        channel: input.channel || "website",
        external_message_id: input.external_message_id || "",
      },
    });
    return response.data[0];
  }

  async listConversationsForLead(leadId, limit = 50) {
    const response = await this.client.get(
      `/conversations?lead_id=eq.${leadId}&order=created_at.asc&limit=${limit}`
    );
    return response.data;
  }

  async createDemo(input) {
    const response = await this.client.post(
      "/demos",
      {
        lead_id: input.lead_id,
        scheduled_for: input.scheduled_for || null,
        status: input.status || "pending",
        notes: input.notes || "",
      },
      {
        headers: this.selectHeaders(),
      }
    );
    await this.appendTimelineEvent({
      lead_id: input.lead_id,
      event_type: "demo_created",
      actor: "system",
      title: "Demo created",
      body: input.notes || "Demo record created.",
      metadata: response.data[0],
    });
    return response.data[0];
  }

  async listDemosForLead(leadId) {
    const response = await this.client.get(
      `/demos?lead_id=eq.${leadId}&order=created_at.desc`
    );
    return response.data;
  }

  async listDemos() {
    const [demos, leads] = await Promise.all([
      this.client.get("/demos?order=created_at.desc"),
      this.listLeads(),
    ]);
    return demos.data.map((demo) => ({
      ...demo,
      lead: leads.find((lead) => lead.id === demo.lead_id) || null,
    }));
  }

  async createProposal(input) {
    const response = await this.client.post(
      "/proposals",
      {
        lead_id: input.lead_id,
        title: input.title,
        tier_name: input.tier_name || "",
        unit_count: input.unit_count === undefined ? null : input.unit_count,
        monthly_price: input.monthly_price === undefined ? null : input.monthly_price,
        currency: input.currency || "NGN",
        status: input.status || "draft",
        body: input.body,
        metadata: input.metadata || {},
      },
      {
        headers: this.selectHeaders(),
      }
    );
    const proposal = response.data[0];
    await this.appendTimelineEvent({
      lead_id: input.lead_id,
      event_type: "proposal_created",
      actor: input.actor || "system",
      title: "Proposal created",
      body: proposal.title,
      metadata: proposal,
    });
    return proposal;
  }

  async listProposalsForLead(leadId) {
    const response = await this.client.get(`/proposals?lead_id=eq.${leadId}&order=created_at.desc`);
    return response.data;
  }

  async listProposals() {
    const [proposals, leads] = await Promise.all([
      this.client.get("/proposals?order=created_at.desc"),
      this.listLeads(),
    ]);
    return proposals.data.map((proposal) => ({
      ...proposal,
      lead: leads.find((lead) => lead.id === proposal.lead_id) || null,
    }));
  }

  async getProposal(proposalId) {
    const response = await this.client.get(`/proposals?id=eq.${proposalId}&limit=1`);
    return response.data[0] || null;
  }

  async updateProposal(proposalId, patch) {
    const response = await this.client.patch(`/proposals?id=eq.${proposalId}`, patch, {
      headers: this.selectHeaders(),
    });
    return response.data[0] || null;
  }

  async getLeadChannelState(leadId, channel) {
    const response = await this.client.get(
      `/lead_channel_states?lead_id=eq.${leadId}&channel=eq.${channel}&limit=1`
    );
    return response.data[0] || null;
  }

  async upsertLeadChannelState(leadId, channel, patch) {
    const response = await this.client.post(
      "/lead_channel_states",
      {
        lead_id: leadId,
        channel,
        ...patch,
      },
      {
        headers: {
          ...this.selectHeaders(),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
      }
    );
    return response.data[0];
  }

  async appendInboundEvent(input) {
    const response = await this.client.post(
      "/inbound_events",
      {
        channel: input.channel,
        provider: input.provider,
        event_type: input.event_type,
        lead_id: input.lead_id || null,
        external_event_id: input.external_event_id || null,
        payload: input.payload || {},
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
  }

  async createNotification(input) {
    const response = await this.client.post(
      "/notifications",
      {
        lead_id: input.lead_id || null,
        type: input.type || "internal",
        urgency: input.urgency || "medium",
        reason: input.reason || "",
        summary: input.summary || "",
        delivered: Boolean(input.delivered),
        channel: input.channel || "internal",
        response_code: input.response_code || null,
        status: input.status || "open",
        metadata: input.metadata || {},
      },
      {
        headers: this.selectHeaders(),
      }
    );
    const notification = response.data[0];
    if (notification.lead_id) {
      await this.appendTimelineEvent({
        lead_id: notification.lead_id,
        event_type: "notification",
        actor: notification.channel || "",
        title: notification.type || "notification",
        body: notification.summary || notification.reason || "",
        metadata: notification.metadata || {},
      });
    }
    return notification;
  }

  async listNotifications(limit = 100, filter = {}) {
    const query = new URLSearchParams();
    query.set("order", "created_at.desc");
    query.set("limit", String(limit));
    if (filter.status) query.set("status", `eq.${filter.status}`);
    if (filter.type) query.set("type", `eq.${filter.type}`);
    if (filter.lead_id) query.set("lead_id", `eq.${filter.lead_id}`);
    const response = await this.client.get(`/notifications?${query.toString()}`);
    return response.data;
  }

  async updateNotification(notificationId, patch) {
    const response = await this.client.patch(
      `/notifications?id=eq.${notificationId}`,
      patch,
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0] || null;
  }

  async appendTrace(input) {
    const response = await this.client.post(
      "/traces",
      {
        trace_id: input.trace_id || "",
        lead_id: input.lead_id || null,
        type: input.type,
        agent: input.agent || "",
        tool_name: input.tool_name || "",
        request_id: input.request_id || "",
        source: input.source || "",
        payload: input.payload || {},
      },
      {
        headers: this.selectHeaders(),
      }
    );
    const trace = response.data[0];
    if (trace.lead_id) {
      await this.appendTimelineEvent({
        lead_id: trace.lead_id,
        event_type: "trace",
        actor: trace.agent || "system",
        title: trace.type,
        body: trace.tool_name || "",
        metadata: trace.payload || {},
      });
    }
    return trace;
  }

  async listTraces(limit = 200, filter = {}) {
    const query = new URLSearchParams();
    query.set("order", "created_at.desc");
    query.set("limit", String(limit));
    if (filter.lead_id) query.set("lead_id", `eq.${filter.lead_id}`);
    if (filter.trace_id) query.set("trace_id", `eq.${filter.trace_id}`);
    const response = await this.client.get(`/traces?${query.toString()}`);
    return response.data;
  }

  async getLeadMemory(leadId) {
    const response = await this.client.get(`/lead_memories?lead_id=eq.${leadId}&limit=1`);
    return response.data[0] || null;
  }

  async upsertLeadMemory(leadId, memory) {
    const payload = {
      lead_id: leadId,
      known_fields: memory.known_fields || {},
      need_signals: memory.need_signals || [],
      open_questions: memory.open_questions || [],
      keywords: memory.keywords || [],
      last_user_message: memory.last_user_message || "",
      last_agent_message: memory.last_agent_message || "",
      last_status: memory.last_status || "",
      last_owner: memory.last_owner || "",
      last_summary: memory.last_summary || "",
      tool_calls: memory.tool_calls || [],
    };
    const response = await this.client.post("/lead_memories", payload, {
      headers: {
        ...this.selectHeaders(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
    });
    return response.data[0];
  }

  async listTimelineForLead(leadId, limit = 200) {
    const response = await this.client.get(
      `/timeline_events?lead_id=eq.${leadId}&order=created_at.asc&limit=${limit}`
    );
    return response.data;
  }

  async ensureAdminUser(input) {
    const existing = await this.getAdminUserByEmail(input.email);
    if (existing) {
      return existing;
    }
    const response = await this.client.post(
      "/admin_users",
      {
        email: normalizeEmail(input.email),
        password_hash: input.password_hash,
        role: input.role || "admin",
        status: input.status || "active",
        display_name: input.display_name || "",
        passport_photo_url: input.passport_photo_url || "",
        qr_credential: input.qr_credential || "",
        permission_scopes: Array.isArray(input.permission_scopes) ? input.permission_scopes : [],
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
  }

  async getAdminUserById(userId) {
    const response = await this.client.get(`/admin_users?id=eq.${userId}&limit=1`);
    return response.data[0] || null;
  }

  async getAdminUserByEmail(email) {
    const response = await this.client.get(
      `/admin_users?email=eq.${encodeURIComponent(normalizeEmail(email))}&limit=1`
    );
    return response.data[0] || null;
  }

  async listAdminUsers() {
    const response = await this.client.get("/admin_users?order=email.asc");
    return response.data;
  }

  async updateAdminUser(userId, patch) {
    const response = await this.client.patch(`/admin_users?id=eq.${userId}`, patch, {
      headers: this.selectHeaders(),
    });
    return response.data[0] || null;
  }

  async createAdminInvite(input) {
    const response = await this.client.post(
      "/admin_invites",
      {
        email: normalizeEmail(input.email),
        role: input.role || "viewer",
        display_name: input.display_name || "",
        token_hash: input.token_hash,
        status: input.status || "pending",
        invited_by: input.invited_by || "",
        expires_at: input.expires_at,
        accepted_at: input.accepted_at || null,
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
  }

  async getAdminInviteByTokenHash(tokenHash) {
    const response = await this.client.get(`/admin_invites?token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
    return response.data[0] || null;
  }

  async updateAdminInvite(inviteId, patch) {
    const response = await this.client.patch(`/admin_invites?id=eq.${inviteId}`, patch, {
      headers: this.selectHeaders(),
    });
    return response.data[0] || null;
  }

  async listAdminInvites() {
    const response = await this.client.get("/admin_invites?order=created_at.desc");
    return response.data;
  }

  async createPasswordResetToken(input) {
    const response = await this.client.post(
      "/password_reset_tokens",
      {
        admin_user_id: input.admin_user_id || null,
        email: normalizeEmail(input.email),
        token_hash: input.token_hash,
        status: input.status || "pending",
        requested_by: input.requested_by || "",
        expires_at: input.expires_at,
        used_at: input.used_at || null,
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
  }

  async getPasswordResetTokenByHash(tokenHash) {
    const response = await this.client.get(
      `/password_reset_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`
    );
    return response.data[0] || null;
  }

  async updatePasswordResetToken(tokenId, patch) {
    const response = await this.client.patch(`/password_reset_tokens?id=eq.${tokenId}`, patch, {
      headers: this.selectHeaders(),
    });
    return response.data[0] || null;
  }

  async appendAuditEvent(input) {
    const response = await this.client.post(
      "/audit_events",
      {
        actor_user_id: input.actor_user_id || null,
        actor_email: input.actor_email || "",
        actor_role: input.actor_role || "",
        action: input.action,
        target_type: input.target_type,
        target_id: input.target_id || "",
        metadata: input.metadata || {},
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
  }

  async listAuditEvents(limit = 200) {
    const response = await this.client.get(`/audit_events?order=created_at.desc&limit=${limit}`);
    return response.data;
  }

  async listOfficePackages() {
    return this.safeGet("/office_packages?order=name.asc");
  }

  async listOfficeEstates() {
    return this.safeGet("/office_estates?order=name.asc");
  }

  async listOfficeBuildings() {
    return this.safeGet("/office_buildings?order=name.asc");
  }

  async listOfficeHomes() {
    return this.safeGet("/office_homes?order=name.asc");
  }

  async listOfficeDevices() {
    return this.safeGet("/office_devices?order=name.asc");
  }

  async listOfficeWallets() {
    return this.safeGet("/office_wallets?order=label.asc");
  }

  async listOfficeAnalytics() {
    return this.safeGet("/office_analytics?order=label.asc");
  }

  async listOfficeSupportMappings() {
    return this.safeGet("/office_support_mappings?order=updated_at.desc");
  }

  async upsertOfficeCollections(input) {
    const collections = input || {};
    await this.upsertRows("office_packages", collections.packages);
    await this.upsertRows("office_estates", collections.estates);
    await this.upsertRows("office_buildings", collections.buildings);
    await this.upsertRows("office_homes", collections.homes);
    await this.upsertRows("office_devices", collections.devices);
    await this.upsertRows("office_wallets", collections.wallets);
    await this.upsertRows("office_analytics", collections.analytics);
    await this.upsertRows("office_support_mappings", collections.support_mappings);
    return this.getOfficeSnapshot();
  }

  async getOfficeSnapshot() {
    const [packages, estates, buildings, homes, devices, wallets, analytics, supportMappings] =
      await Promise.all([
        this.listOfficePackages(),
        this.listOfficeEstates(),
        this.listOfficeBuildings(),
        this.listOfficeHomes(),
        this.listOfficeDevices(),
        this.listOfficeWallets(),
        this.listOfficeAnalytics(),
        this.listOfficeSupportMappings(),
      ]);

    const officeCollections =
      packages.length ||
      estates.length ||
      buildings.length ||
      homes.length ||
      devices.length ||
      wallets.length ||
      analytics.length ||
      supportMappings.length
        ? {
            packages,
            estates,
            buildings,
            homes,
            devices,
            wallets,
            analytics,
            support_mappings: supportMappings,
          }
        : createOfficeSeedData();

    const [report, leads, notifications, adminUsers, audit, traces] = await Promise.all([
      this.getReportingSummary(),
      this.listLeads(),
      this.listNotifications(500),
      this.listAdminUsers(),
      this.listAuditEvents(200),
      this.listTraces(200),
    ]);

    return buildOfficeSnapshot({
      ...officeCollections,
      leads,
      report,
      notifications,
      adminUsers,
      audit,
      traces,
    });
  }

  async getReportingSummary() {
    const [leads, demos, notifications, proposals] = await Promise.all([
      this.listLeads(),
      this.client.get("/demos?select=id,status,scheduled_for"),
      this.client.get("/notifications?select=id,type"),
      this.client.get("/proposals?select=id,status"),
    ]);
    const totalLeads = leads.length || 1;
    const salesReady = leads.filter((lead) => ["sales", "booked", "closed"].includes(lead.status)).length;
    const scoredLeads = leads.filter((lead) => Number.isFinite(Number(lead.score)) && Number(lead.score) > 0);
    const hotLeads = leads.filter((lead) => Number(lead.score || 0) >= 70).length;
    const upcomingDemos = demos.data
      .filter((demo) => demo.scheduled_for)
      .sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)))
      .slice(0, 5);

    return {
      totals: {
        leads: leads.length,
        demos: demos.data.length,
        escalations: notifications.data.filter((item) => item.type === "founder_escalation").length,
        sales_handoff_conversion_pct: Math.round((salesReady / totalLeads) * 100),
        hot_leads: hotLeads,
        average_score: scoredLeads.length
          ? Math.round(
              scoredLeads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) /
                scoredLeads.length
            )
          : 0,
      },
      by_source: leads.reduce((acc, lead) => {
        const key = lead.source || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      by_status: leads.reduce((acc, lead) => {
        const key = lead.status || "new";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      by_owner: leads.reduce((acc, lead) => {
        const key = lead.owner || "unassigned";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      by_commercial_stage: leads.reduce((acc, lead) => {
        const key = lead.commercial_stage || "unassigned";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      demos_booked: demos.data.filter((demo) => ["requested", "pending", "confirmed"].includes(demo.status)).length,
      demos_confirmed: demos.data.filter((demo) => demo.status === "confirmed").length,
      upcoming_demos: upcomingDemos,
      proposals_total: proposals.data.length,
      proposals_sent: proposals.data.filter((item) => ["sent", "accepted"].includes(item.status)).length,
      deals_won: leads.filter((lead) => lead.commercial_stage === "won").length,
      deals_lost: leads.filter((lead) => lead.commercial_stage === "lost").length,
    };
  }

  async stats() {
    const [
      leads,
      conversations,
      demos,
      proposals,
      notifications,
      traces,
      adminUsers,
      auditEvents,
      estates,
      packages,
      buildings,
      homes,
      devices,
      wallets,
      analytics,
      supportMappings,
    ] = await Promise.all([
      this.client.get("/leads?select=id"),
      this.client.get("/conversations?select=id"),
      this.client.get("/demos?select=id"),
      this.client.get("/proposals?select=id"),
      this.client.get("/notifications?select=id"),
      this.client.get("/traces?select=id"),
      this.client.get("/admin_users?select=id"),
      this.client.get("/audit_events?select=id"),
      this.safeGet("/office_estates?select=id"),
      this.safeGet("/office_packages?select=id"),
      this.safeGet("/office_buildings?select=id"),
      this.safeGet("/office_homes?select=id"),
      this.safeGet("/office_devices?select=id"),
      this.safeGet("/office_wallets?select=id"),
      this.safeGet("/office_analytics?select=id"),
      this.safeGet("/office_support_mappings?select=id"),
    ]);

    return {
      leads: leads.data.length,
      conversations: conversations.data.length,
      demos: demos.data.length,
      proposals: proposals.data.length,
      notifications: notifications.data.length,
      traces: traces.data.length,
      admin_users: adminUsers.data.length,
      audit_events: auditEvents.data.length,
      estates: estates.length,
      packages: packages.length,
      buildings: buildings.length,
      homes: homes.length,
      devices: devices.length,
      wallets: wallets.length,
      analytics: analytics.length,
      support_mappings: supportMappings.length,
    };
  }
}

module.exports = {
  SupabaseLeadAgentsStore,
};
