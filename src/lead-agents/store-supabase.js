const axios = require("axios");

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
    };
  }

  async createLead(input) {
    const payload = {
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
    };

    const response = await this.client.post("/leads", payload, {
      headers: this.selectHeaders(),
    });
    return this.normalizeLead(response.data[0]);
  }

  async updateLead(leadId, patch) {
    const payload = Object.fromEntries(
      Object.entries({
        name: patch.name,
        company: patch.company,
        role: patch.role,
        email: patch.email,
        phone: patch.phone,
        source: patch.source,
        location: patch.location,
        status: patch.status,
        owner: patch.owner,
        score: patch.score,
        summary: patch.summary,
        next_action: patch.next_action,
      }).filter(([, value]) => value !== undefined)
    );

    const response = await this.client.patch(`/leads?id=eq.${leadId}`, payload, {
      headers: this.selectHeaders(),
    });

    return this.normalizeLead(response.data[0] || null);
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
    return response.data[0];
  }

  async listDemosForLead(leadId) {
    const response = await this.client.get(
      `/demos?lead_id=eq.${leadId}&order=created_at.desc`
    );
    return response.data;
  }

  async createNotification(input) {
    return {
      id: null,
      lead_id: input.lead_id || null,
      urgency: input.urgency || "medium",
      reason: input.reason,
      summary: input.summary,
      delivered: Boolean(input.delivered),
      channel: input.channel || "internal",
      response_code: input.response_code || null,
      created_at: new Date().toISOString(),
    };
  }

  async stats() {
    const [leads, conversations, demos] = await Promise.all([
      this.client.get("/leads?select=id"),
      this.client.get("/conversations?select=id"),
      this.client.get("/demos?select=id"),
    ]);

    return {
      leads: leads.data.length,
      conversations: conversations.data.length,
      demos: demos.data.length,
      notifications: 0,
    };
  }
}

module.exports = {
  SupabaseLeadAgentsStore,
};
