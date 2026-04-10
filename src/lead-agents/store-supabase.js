const axios = require("axios");
const { normalizeEmail, normalizeLeadInput, normalizeLeadPatch, normalizeText } = require("./normalize-lead");

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

  normalizeLead(row) {
    if (!row) return null;
    return {
      ...row,
      notes: row.notes || "",
      name: row.name || "",
      company: row.company || "",
      role: row.role || "",
      email: row.email || "",
      phone: row.phone || "",
      location: row.location || "",
      summary: row.summary || "",
      next_action: row.next_action || "",
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
      },
      {
        headers: this.selectHeaders(),
      }
    );
    return response.data[0];
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

  async getReportingSummary() {
    const [leads, demos, notifications] = await Promise.all([
      this.listLeads(),
      this.client.get("/demos?select=id,status"),
      this.client.get("/notifications?select=id,type"),
    ]);
    const totalLeads = leads.length || 1;
    const salesReady = leads.filter((lead) => ["sales", "booked", "closed"].includes(lead.status)).length;

    return {
      totals: {
        leads: leads.length,
        demos: demos.data.length,
        escalations: notifications.data.filter((item) => item.type === "founder_escalation").length,
        sales_handoff_conversion_pct: Math.round((salesReady / totalLeads) * 100),
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
      demos_booked: demos.data.filter((demo) => ["requested", "pending", "confirmed"].includes(demo.status)).length,
    };
  }

  async stats() {
    const [leads, conversations, demos, notifications, traces, adminUsers] =
      await Promise.all([
        this.client.get("/leads?select=id"),
        this.client.get("/conversations?select=id"),
        this.client.get("/demos?select=id"),
        this.client.get("/notifications?select=id"),
        this.client.get("/traces?select=id"),
        this.client.get("/admin_users?select=id"),
      ]);

    return {
      leads: leads.data.length,
      conversations: conversations.data.length,
      demos: demos.data.length,
      notifications: notifications.data.length,
      traces: traces.data.length,
      admin_users: adminUsers.data.length,
    };
  }
}

module.exports = {
  SupabaseLeadAgentsStore,
};
