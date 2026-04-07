const { getSolutionFit } = require("./solution-fit");

class ToolExecutor {
  constructor({ store, config, log, webhooks }) {
    this.store = store;
    this.config = config;
    this.log = log;
    this.webhooks = webhooks;
  }

  async execute(name, rawArgs, context) {
    switch (name) {
      case "create_lead":
        return this.createLead(rawArgs, context);
      case "update_lead_status":
        return this.updateLeadStatus(rawArgs, context);
      case "get_solution_fit":
        return this.getSolutionFit(rawArgs);
      case "schedule_demo":
        return this.scheduleDemo(rawArgs, context);
      case "notify_founder":
        return this.notifyFounder(rawArgs, context);
      default:
        throw new Error(`Unsupported tool: ${name}`);
    }
  }

  async createLead(args, context) {
    let lead;
    if (context.leadId && (await this.store.getLead(context.leadId))) {
      lead = await this.store.updateLead(context.leadId, {
        name: args.name,
        company: args.company,
        role: args.role,
        email: args.email,
        phone: args.phone,
        source: args.source || context.source || this.config.defaultLeadSource,
        location: args.location,
        summary: args.notes,
      });
    } else {
      lead = await this.store.createLead({
        ...args,
        source: args.source || context.source || this.config.defaultLeadSource,
        owner: context.agentName,
        status: "new",
      });
    }

    context.leadId = lead.id;
    return {
      ok: true,
      lead,
    };
  }

  async updateLeadStatus(args, context) {
    const leadId = args.lead_id || context.leadId;
    if (!leadId) {
      throw new Error("update_lead_status requires lead_id");
    }

    const updated = await this.store.updateLead(leadId, {
      status: args.status,
      owner: args.owner,
      score: args.score,
      summary: args.summary,
      next_action: args.next_action,
    });

    if (!updated) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    context.leadId = leadId;
    return {
      ok: true,
      lead: updated,
    };
  }

  async getSolutionFit(args) {
    return {
      ok: true,
      solution_fit: getSolutionFit(args),
    };
  }

  async scheduleDemo(args, context) {
    const leadId = args.lead_id || context.leadId;
    if (!leadId) {
      throw new Error("schedule_demo requires lead_id");
    }

    const demo = await this.store.createDemo({
      lead_id: leadId,
      scheduled_for: args.preferred_time || null,
      status: args.preferred_time ? "requested" : "pending",
      notes: JSON.stringify({
        name: args.name || "",
        email: args.email || "",
        phone: args.phone || "",
        timezone: args.timezone || "unknown",
      }),
    });

    const lead = await this.store.updateLead(leadId, {
      status: "booked",
      owner: "sales_agent",
      next_action: args.preferred_time
        ? "Confirm scheduled demo"
        : "Collect preferred time for demo",
    });

    const webhookResult = await this.webhooks.notifyDemo({
      lead_id: leadId,
      preferred_time: args.preferred_time || null,
      timezone: args.timezone || "unknown",
      demo_id: demo.id,
      lead,
    });

    context.leadId = leadId;
    return {
      ok: true,
      demo,
      lead,
      webhook: webhookResult,
    };
  }

  async notifyFounder(args, context) {
    const payload = {
      lead_id: args.lead_id || context.leadId || null,
      urgency: args.urgency || "medium",
      reason: args.reason,
      summary: args.summary,
    };

    const webhookResult = await this.webhooks.notifyFounder(payload);

    const notification = await this.store.createNotification({
      ...payload,
      delivered: webhookResult.delivered,
      channel: "founder_webhook",
      response_code: webhookResult.response_code,
    });

    if (payload.lead_id) {
      await this.store.updateLead(payload.lead_id, {
        status: "escalated",
        owner: "human",
        next_action: payload.reason,
      });
    }

    return {
      ok: true,
      notification,
      delivered: webhookResult.delivered,
      webhook: webhookResult,
    };
  }
}

module.exports = {
  ToolExecutor,
};
