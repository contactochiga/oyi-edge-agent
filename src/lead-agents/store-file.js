const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { normalizeEmail, normalizeLeadInput, normalizeLeadPatch, normalizeText } = require("./normalize-lead");

class FileLeadAgentsStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.state = {
      leads: [],
      conversations: [],
      demos: [],
      notifications: [],
      traces: [],
      lead_memories: [],
      admin_users: [],
      timeline_events: [],
      lead_channel_states: [],
      inbound_events: [],
    };
    this.pendingWrite = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.state = {
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        demos: Array.isArray(parsed.demos) ? parsed.demos : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        traces: Array.isArray(parsed.traces) ? parsed.traces : [],
        lead_memories: Array.isArray(parsed.lead_memories) ? parsed.lead_memories : [],
        admin_users: Array.isArray(parsed.admin_users) ? parsed.admin_users : [],
        timeline_events: Array.isArray(parsed.timeline_events) ? parsed.timeline_events : [],
        lead_channel_states: Array.isArray(parsed.lead_channel_states)
          ? parsed.lead_channel_states
          : [],
        inbound_events: Array.isArray(parsed.inbound_events) ? parsed.inbound_events : [],
      };
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
      await this.persist();
    }
  }

  persist() {
    this.pendingWrite = this.pendingWrite.then(() =>
      fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2))
    );
    return this.pendingWrite;
  }

  nowIso() {
    return new Date().toISOString();
  }

  withDefaults(input) {
    return {
      name: input.name || "",
      company: input.company || "",
      role: input.role || "",
      email: input.email || "",
      phone: input.phone || "",
      whatsapp_phone: input.whatsapp_phone || "",
      primary_channel: input.primary_channel || "",
      channel_last_seen_at: input.channel_last_seen_at || "",
      source: input.source || "",
      location: input.location || "",
      status: input.status || "new",
      owner: input.owner || "marketing_agent",
      score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
      summary: input.summary || "",
      next_action: input.next_action || "",
    };
  }

  async appendTimelineEvent(input) {
    const event = {
      id: crypto.randomUUID(),
      lead_id: input.lead_id,
      event_type: input.event_type,
      actor: input.actor || "",
      title: input.title || "",
      body: input.body || "",
      metadata: input.metadata || {},
      created_at: this.nowIso(),
    };
    this.state.timeline_events.push(event);
    await this.persist();
    return event;
  }

  async createLead(input) {
    const normalized = this.withDefaults(normalizeLeadInput(input, input.source));
    const lead = {
      id: crypto.randomUUID(),
      ...normalized,
      created_at: this.nowIso(),
      updated_at: this.nowIso(),
    };

    this.state.leads.push(lead);
    await this.appendTimelineEvent({
      lead_id: lead.id,
      event_type: "lead_created",
      actor: lead.owner,
      title: "Lead created",
      body: lead.summary || "New lead record created.",
      metadata: {
        source: lead.source,
        primary_channel: lead.primary_channel,
      },
    });
    await this.persist();
    return lead;
  }

  async updateLead(leadId, patch) {
    const index = this.state.leads.findIndex((lead) => lead.id === leadId);
    if (index === -1) {
      return null;
    }

    const current = this.state.leads[index];
    const normalizedPatch = normalizeLeadPatch(patch);
    const updated = {
      ...current,
      ...Object.fromEntries(
        Object.entries(normalizedPatch).filter(([, value]) => value !== undefined)
      ),
      updated_at: this.nowIso(),
    };

    this.state.leads[index] = updated;
    await this.appendTimelineEvent({
      lead_id: leadId,
      event_type: "lead_updated",
      actor: normalizedPatch.owner || current.owner || "",
      title: "Lead updated",
      body: normalizeText(normalizedPatch.summary) || normalizeText(normalizedPatch.next_action) || "Lead fields updated.",
      metadata: normalizedPatch,
    });
    await this.persist();
    return updated;
  }

  async getLead(leadId) {
    return this.state.leads.find((lead) => lead.id === leadId) || null;
  }

  async findLeadByPhone(phone) {
    const normalized = normalizeText(phone);
    if (!normalized) return null;
    return (
      this.state.leads.find(
        (lead) => lead.phone === normalized || lead.whatsapp_phone === normalized
      ) || null
    );
  }

  async listLeads() {
    return [...this.state.leads].sort((a, b) =>
      String(b.updated_at).localeCompare(String(a.updated_at))
    );
  }

  async appendConversation(input) {
    const item = {
      id: crypto.randomUUID(),
      lead_id: input.lead_id,
      agent_name: input.agent_name,
      message_role: input.message_role,
      channel: input.channel || "website",
      external_message_id: input.external_message_id || "",
      parent_external_message_id: input.parent_external_message_id || "",
      content: input.content,
      created_at: this.nowIso(),
    };

    this.state.conversations.push(item);
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
    await this.persist();
    return item;
  }

  async listConversationsForLead(leadId, limit = 50) {
    return this.state.conversations
      .filter((item) => item.lead_id === leadId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(-limit);
  }

  async createDemo(input) {
    const demo = {
      id: crypto.randomUUID(),
      lead_id: input.lead_id,
      scheduled_for: input.scheduled_for || null,
      status: input.status || "pending",
      notes: input.notes || "",
      created_at: this.nowIso(),
    };

    this.state.demos.push(demo);
    await this.appendTimelineEvent({
      lead_id: input.lead_id,
      event_type: "demo_created",
      actor: "system",
      title: "Demo created",
      body: demo.notes || "Demo record created.",
      metadata: demo,
    });
    await this.persist();
    return demo;
  }

  async listDemosForLead(leadId) {
    return this.state.demos
      .filter((item) => item.lead_id === leadId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  async getLeadChannelState(leadId, channel) {
    return (
      this.state.lead_channel_states.find(
        (item) => item.lead_id === leadId && item.channel === channel
      ) || null
    );
  }

  async upsertLeadChannelState(leadId, channel, patch) {
    const index = this.state.lead_channel_states.findIndex(
      (item) => item.lead_id === leadId && item.channel === channel
    );
    const value = {
      id:
        index === -1
          ? crypto.randomUUID()
          : this.state.lead_channel_states[index].id,
      lead_id: leadId,
      channel,
      ai_paused: patch.ai_paused ?? (index === -1 ? false : this.state.lead_channel_states[index].ai_paused),
      human_owner: patch.human_owner ?? (index === -1 ? "" : this.state.lead_channel_states[index].human_owner),
      human_status: patch.human_status || (index === -1 ? "auto" : this.state.lead_channel_states[index].human_status),
      takeover_started_at:
        patch.takeover_started_at ?? (index === -1 ? null : this.state.lead_channel_states[index].takeover_started_at),
      takeover_reason:
        patch.takeover_reason ?? (index === -1 ? "" : this.state.lead_channel_states[index].takeover_reason),
      resume_mode: patch.resume_mode || (index === -1 ? "manual_only" : this.state.lead_channel_states[index].resume_mode),
      customer_service_window_expires_at:
        patch.customer_service_window_expires_at ??
        (index === -1
          ? null
          : this.state.lead_channel_states[index].customer_service_window_expires_at),
      last_external_message_id:
        patch.last_external_message_id ??
        (index === -1 ? "" : this.state.lead_channel_states[index].last_external_message_id),
      last_inbound_at:
        patch.last_inbound_at ?? (index === -1 ? null : this.state.lead_channel_states[index].last_inbound_at),
      last_outbound_at:
        patch.last_outbound_at ?? (index === -1 ? null : this.state.lead_channel_states[index].last_outbound_at),
      created_at: index === -1 ? this.nowIso() : this.state.lead_channel_states[index].created_at,
      updated_at: this.nowIso(),
    };
    if (index === -1) {
      this.state.lead_channel_states.push(value);
    } else {
      this.state.lead_channel_states[index] = value;
    }
    await this.persist();
    return value;
  }

  async appendInboundEvent(input) {
    const event = {
      id: crypto.randomUUID(),
      channel: input.channel,
      provider: input.provider,
      event_type: input.event_type,
      lead_id: input.lead_id || null,
      external_event_id: input.external_event_id || "",
      payload: input.payload || {},
      created_at: this.nowIso(),
    };
    this.state.inbound_events.push(event);
    await this.persist();
    return event;
  }

  async createNotification(input) {
    const notification = {
      id: crypto.randomUUID(),
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
      created_at: this.nowIso(),
      updated_at: this.nowIso(),
    };

    this.state.notifications.push(notification);
    if (notification.lead_id) {
      await this.appendTimelineEvent({
        lead_id: notification.lead_id,
        event_type: "notification",
        actor: notification.channel,
        title: notification.type,
        body: notification.summary || notification.reason,
        metadata: notification.metadata,
      });
    }
    await this.persist();
    return notification;
  }

  async listNotifications(limit = 100, filter = {}) {
    return this.state.notifications
      .filter((item) => {
        if (filter.status && item.status !== filter.status) return false;
        if (filter.type && item.type !== filter.type) return false;
        if (filter.lead_id && item.lead_id !== filter.lead_id) return false;
        return true;
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }

  async updateNotification(notificationId, patch) {
    const index = this.state.notifications.findIndex((item) => item.id === notificationId);
    if (index === -1) return null;
    const updated = {
      ...this.state.notifications[index],
      ...patch,
      updated_at: this.nowIso(),
    };
    this.state.notifications[index] = updated;
    await this.persist();
    return updated;
  }

  async appendTrace(input) {
    const trace = {
      id: crypto.randomUUID(),
      trace_id: input.trace_id || "",
      lead_id: input.lead_id || null,
      type: input.type,
      agent: input.agent || "",
      tool_name: input.tool_name || "",
      request_id: input.request_id || "",
      source: input.source || "",
      payload: input.payload || {},
      created_at: this.nowIso(),
    };
    this.state.traces.push(trace);
    if (trace.lead_id) {
      await this.appendTimelineEvent({
        lead_id: trace.lead_id,
        event_type: "trace",
        actor: trace.agent || "system",
        title: trace.type,
        body: trace.tool_name || "",
        metadata: trace.payload,
      });
    }
    await this.persist();
    return trace;
  }

  async listTraces(limit = 200, filter = {}) {
    return this.state.traces
      .filter((item) => {
        if (filter.lead_id && item.lead_id !== filter.lead_id) return false;
        if (filter.trace_id && item.trace_id !== filter.trace_id) return false;
        return true;
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }

  async getLeadMemory(leadId) {
    return this.state.lead_memories.find((item) => item.lead_id === leadId) || null;
  }

  async upsertLeadMemory(leadId, memory) {
    const index = this.state.lead_memories.findIndex((item) => item.lead_id === leadId);
    const value = {
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
      updated_at: this.nowIso(),
    };

    if (index === -1) {
      this.state.lead_memories.push(value);
    } else {
      this.state.lead_memories[index] = value;
    }
    await this.persist();
    return value;
  }

  async listTimelineForLead(leadId, limit = 200) {
    return this.state.timeline_events
      .filter((item) => item.lead_id === leadId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(-limit);
  }

  async ensureAdminUser(input) {
    const email = normalizeEmail(input.email);
    const index = this.state.admin_users.findIndex((item) => item.email === email);
    if (index === -1) {
      const adminUser = {
        id: crypto.randomUUID(),
        email,
        password_hash: input.password_hash,
        role: input.role || "admin",
        status: input.status || "active",
        display_name: input.display_name || "",
        created_at: this.nowIso(),
        updated_at: this.nowIso(),
      };
      this.state.admin_users.push(adminUser);
      await this.persist();
      return adminUser;
    }
    return this.state.admin_users[index];
  }

  async getAdminUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    return this.state.admin_users.find((item) => item.email === normalizedEmail) || null;
  }

  async listAdminUsers() {
    return [...this.state.admin_users].sort((a, b) => a.email.localeCompare(b.email));
  }

  async getReportingSummary() {
    const leads = await this.listLeads();
    const demos = this.state.demos;
    const notifications = this.state.notifications;
    const totalLeads = leads.length || 1;
    const salesReady = leads.filter((lead) => ["sales", "booked", "closed"].includes(lead.status)).length;

    return {
      totals: {
        leads: leads.length,
        demos: demos.length,
        escalations: notifications.filter((item) => item.type === "founder_escalation").length,
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
      demos_booked: demos.filter((demo) => ["requested", "pending", "confirmed"].includes(demo.status)).length,
    };
  }

  async stats() {
    return {
      leads: this.state.leads.length,
      conversations: this.state.conversations.length,
      demos: this.state.demos.length,
      notifications: this.state.notifications.length,
      traces: this.state.traces.length,
      admin_users: this.state.admin_users.length,
    };
  }
}

module.exports = {
  FileLeadAgentsStore,
};
