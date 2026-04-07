const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

class FileLeadAgentsStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.state = {
      leads: [],
      conversations: [],
      demos: [],
      notifications: [],
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
        conversations: Array.isArray(parsed.conversations)
          ? parsed.conversations
          : [],
        demos: Array.isArray(parsed.demos) ? parsed.demos : [],
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications
          : [],
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

  async createLead(input) {
    const lead = {
      id: crypto.randomUUID(),
      name: input.name || "unknown",
      company: input.company || "unknown",
      role: input.role || "unknown",
      email: input.email || "",
      phone: input.phone || "",
      source: input.source,
      location: input.location || "unknown",
      status: input.status || "new",
      owner: input.owner || "marketing_agent",
      score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
      summary: input.summary || "",
      next_action: input.next_action || "",
      notes: input.notes || "",
      created_at: this.nowIso(),
      updated_at: this.nowIso(),
    };

    this.state.leads.push(lead);
    await this.persist();
    return lead;
  }

  async updateLead(leadId, patch) {
    const index = this.state.leads.findIndex((lead) => lead.id === leadId);
    if (index === -1) {
      return null;
    }

    const current = this.state.leads[index];
    const updated = {
      ...current,
      ...Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined)
      ),
      updated_at: this.nowIso(),
    };

    this.state.leads[index] = updated;
    await this.persist();
    return updated;
  }

  async getLead(leadId) {
    return this.state.leads.find((lead) => lead.id === leadId) || null;
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
      content: input.content,
      created_at: this.nowIso(),
    };

    this.state.conversations.push(item);
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
    await this.persist();
    return demo;
  }

  async listDemosForLead(leadId) {
    return this.state.demos
      .filter((item) => item.lead_id === leadId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  async createNotification(input) {
    const notification = {
      id: crypto.randomUUID(),
      lead_id: input.lead_id || null,
      urgency: input.urgency || "medium",
      reason: input.reason,
      summary: input.summary,
      delivered: Boolean(input.delivered),
      channel: input.channel || "internal",
      response_code: input.response_code || null,
      created_at: this.nowIso(),
    };

    this.state.notifications.push(notification);
    await this.persist();
    return notification;
  }

  async stats() {
    return {
      leads: this.state.leads.length,
      conversations: this.state.conversations.length,
      demos: this.state.demos.length,
      notifications: this.state.notifications.length,
    };
  }
}

module.exports = {
  FileLeadAgentsStore,
};
