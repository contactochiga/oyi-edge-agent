const fs = require("fs/promises");
const crypto = require("crypto");
const { loadPromptPack } = require("./prompt-packs");

function toInputMessage(role, text) {
  return {
    role,
    content: [
      {
        type: "input_text",
        text,
      },
    ],
  };
}

function extractTextFromResponse(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const messages = Array.isArray(response.output)
    ? response.output.filter((item) => item.type === "message")
    : [];

  const texts = [];
  for (const message of messages) {
    for (const content of message.content || []) {
      if (content.type === "output_text" && content.text) {
        texts.push(content.text);
      }
      if (content.type === "text" && content.text) {
        texts.push(content.text);
      }
    }
  }
  return texts.join("\n").trim();
}

function parseToolArguments(raw) {
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

class LeadAgentRuntime {
  constructor({
    config,
    store,
    openaiClient,
    toolExecutor,
    log,
    knowledgeBase,
  }) {
    this.config = config;
    this.store = store;
    this.openaiClient = openaiClient;
    this.toolExecutor = toolExecutor;
    this.log = log;
    this.toolsPromise = null;
    this.knowledgeBase = knowledgeBase;
  }

  serializeLeadMemory(memory) {
    if (!memory) {
      return "No lead memory stored yet.";
    }

    return [
      `Known fields: ${JSON.stringify(memory.known_fields || {})}`,
      `Need signals: ${(memory.need_signals || []).join(", ") || "none"}`,
      `Open questions: ${(memory.open_questions || []).join(", ") || "none"}`,
      `Keywords: ${(memory.keywords || []).join(", ") || "none"}`,
      `Last status: ${memory.last_status || "unknown"}`,
      `Last owner: ${memory.last_owner || "unknown"}`,
      `Last summary: ${memory.last_summary || "none"}`,
      `Last user message: ${memory.last_user_message || "none"}`,
      `Last agent message: ${memory.last_agent_message || "none"}`,
    ].join("\n");
  }

  tokenize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  detectNeeds(text) {
    const value = String(text || "").toLowerCase();
    const pairs = [
      ["demo", ["demo", "call", "discovery"]],
      ["pricing", ["pricing", "price", "cost", "quote"]],
      ["proposal", ["proposal", "scope", "rfp"]],
      ["deployment", ["deployment", "implementation", "rollout"]],
      ["access control", ["access", "gate", "visitor"]],
      ["monitoring", ["monitoring", "surveillance", "cctv"]],
      ["facility management", ["facility", "maintenance", "operations"]],
      ["resident experience", ["resident", "tenant", "community"]],
    ];
    return pairs
      .filter(([, keywords]) => keywords.some((keyword) => value.includes(keyword)))
      .map(([label]) => label);
  }

  buildOpenQuestions(lead) {
    const questions = [];
    if (!lead.company) questions.push("Confirm company");
    if (!lead.role) questions.push("Confirm role");
    if (!lead.location) questions.push("Confirm location");
    if (!lead.next_action) questions.push("Define next action");
    return questions;
  }

  async updateLeadMemory(lead, userMessage, assistantMessage, toolCalls) {
    const current = (await this.store.getLeadMemory(lead.id)) || {
      known_fields: {},
      need_signals: [],
      open_questions: [],
      keywords: [],
    };

    const unique = (values) => Array.from(new Set(values.filter(Boolean)));
    const memory = {
      known_fields: {
        name: lead.name || current.known_fields.name || "",
        company: lead.company || current.known_fields.company || "",
        role: lead.role || current.known_fields.role || "",
        email: lead.email || current.known_fields.email || "",
        phone: lead.phone || current.known_fields.phone || "",
        location: lead.location || current.known_fields.location || "",
        source: lead.source || current.known_fields.source || "",
      },
      need_signals: unique([
        ...(current.need_signals || []),
        ...this.detectNeeds(userMessage),
      ]),
      open_questions: this.buildOpenQuestions(lead),
      keywords: unique([
        ...(current.keywords || []),
        ...this.tokenize(userMessage).slice(0, 12),
      ]).slice(-20),
      last_user_message: userMessage || current.last_user_message || "",
      last_agent_message: assistantMessage || current.last_agent_message || "",
      last_status: lead.status || current.last_status || "",
      last_owner: lead.owner || current.last_owner || "",
      last_summary: lead.summary || current.last_summary || "",
      tool_calls: (toolCalls || []).map((item) => item.name),
    };

    return this.store.upsertLeadMemory(lead.id, memory);
  }

  async getToolDefinitions() {
    if (!this.toolsPromise) {
      this.toolsPromise = fs
        .readFile(this.config.toolsPath, "utf8")
        .then((raw) => JSON.parse(raw));
    }
    return this.toolsPromise;
  }

  async ensureLead(request) {
    if (request.lead_id) {
      const existing = await this.store.getLead(request.lead_id);
      if (!existing) {
        const error = new Error(`Lead not found: ${request.lead_id}`);
        error.statusCode = 404;
        throw error;
      }
      return existing;
    }

    return this.store.createLead({
      source: request.source || this.config.defaultLeadSource,
      name: request.profile?.name || "",
      company: request.profile?.company || "",
      role: request.profile?.role || "",
      email: request.profile?.email || "",
      phone: request.profile?.phone || "",
      location: request.profile?.location || "",
      owner: request.agent === "sales" ? "sales_agent" : "marketing_agent",
      status: "new",
      summary: "Lead shell created before first model turn.",
    });
  }

  buildHistoryMessages(conversations) {
    return conversations
      .filter(
        (item) => item.message_role === "user" || item.message_role === "assistant"
      )
      .map((item) =>
        toInputMessage(
          item.message_role === "assistant" ? "assistant" : "user",
          item.content
        )
      );
  }

  async runChat(request) {
    const traceId = request.trace_id || crypto.randomUUID();
    const channel = request.channel || "website";
    const agentKey = request.agent === "sales" ? "sales" : "marketing";
    const agentPack = await loadPromptPack(this.config.promptPackRoot, agentKey);
    const tools = await this.getToolDefinitions();
    const lead = await this.ensureLead(request);
    const history = await this.store.listConversationsForLead(
      lead.id,
      this.config.maxConversationMessages
    );
    const leadMemory = await this.store.getLeadMemory(lead.id);
    const knowledgeResults = this.knowledgeBase
      ? this.knowledgeBase.search(
          [
            request.message,
            lead.company,
            lead.role,
            lead.location,
            lead.summary,
          ]
            .filter(Boolean)
            .join(" ")
        )
      : [];

    await this.store.appendTrace({
        type: "chat_started",
        trace_id: traceId,
        lead_id: lead.id,
        agent: agentPack.agentName,
        source: request.source || lead.source || this.config.defaultLeadSource,
        request_id: request.request_id || "",
        payload: {
          user_message: request.message,
        },
      });

    await this.store.appendConversation({
      lead_id: lead.id,
      agent_name: agentPack.agentName,
      message_role: "user",
      channel,
      external_message_id: request.external_message_id || "",
      parent_external_message_id: request.parent_external_message_id || "",
      content: request.message,
    });

    const context = {
      agentName: agentPack.agentName,
      leadId: lead.id,
      source: request.source || lead.source || this.config.defaultLeadSource,
    };

    let input = [
      toInputMessage(
        "user",
        `Runtime context: agent=${agentPack.agentName}; lead_id=${lead.id}; source=${lead.source}. A lead record already exists for this conversation.`
      ),
      toInputMessage(
        "user",
        `Lead memory:\n${
          this.serializeLeadMemory(leadMemory)
        }`
      ),
      toInputMessage(
        "user",
        `Relevant knowledge:\n${
          this.knowledgeBase
            ? this.knowledgeBase.serializeForPrompt(knowledgeResults)
            : "Knowledge base unavailable."
        }`
      ),
      ...this.buildHistoryMessages(history),
      toInputMessage("user", request.message),
    ];

    let response = await this.openaiClient.createResponse({
      model: this.config.openaiModel,
      instructions: agentPack.instructions,
      input,
      tools,
      store: true,
    });

    const executedTools = [];

    for (let round = 0; round < this.config.maxToolRounds; round += 1) {
      const functionCalls = (response.output || []).filter(
        (item) => item.type === "function_call"
      );

      if (functionCalls.length === 0) {
        break;
      }

      const toolOutputs = [];

      for (const call of functionCalls) {
        const args = parseToolArguments(call.arguments);
        const result = await this.toolExecutor.execute(call.name, args, context);
        executedTools.push({
          name: call.name,
          arguments: args,
          result,
        });

        await this.store.appendConversation({
          lead_id: context.leadId,
          agent_name: agentPack.agentName,
          message_role: "tool",
          channel,
          content: JSON.stringify({
            tool: call.name,
            arguments: args,
            result,
          }),
        });

        await this.store.appendTrace({
            type: "tool_executed",
            trace_id: traceId,
            lead_id: context.leadId,
            agent: agentPack.agentName,
            tool_name: call.name,
            payload: {
              arguments: args,
              result,
            },
          });

        toolOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      }

      response = await this.openaiClient.createResponse({
        model: this.config.openaiModel,
        instructions: agentPack.instructions,
        previous_response_id: response.id,
        input: toolOutputs,
        tools,
        store: true,
      });
    }

    const assistantMessage = extractTextFromResponse(response);
    await this.store.appendConversation({
      lead_id: context.leadId,
      agent_name: agentPack.agentName,
      message_role: "assistant",
      channel,
      parent_external_message_id: request.external_message_id || "",
      content: assistantMessage,
    });

    const updatedLead = await this.store.getLead(context.leadId);
    const memory = await this.updateLeadMemory(
      updatedLead,
      request.message,
      assistantMessage,
      executedTools
    );

    await this.store.appendTrace({
        type: "chat_completed",
        trace_id: traceId,
        lead_id: context.leadId,
        agent: agentPack.agentName,
        payload: {
          response_id: response.id || "",
          tool_count: executedTools.length,
          knowledge_hits: knowledgeResults.map((item) => item.id),
          memory_updated: Boolean(memory),
          assistant_message: assistantMessage,
        },
      });

    return {
      agent: agentPack.agentName,
      lead: updatedLead,
      trace_id: traceId,
      lead_memory: memory,
      knowledge_hits: knowledgeResults,
      assistant_message: assistantMessage,
      tools: executedTools,
      conversations: await this.store.listConversationsForLead(
        context.leadId,
        this.config.maxConversationMessages
      ),
    };
  }
}

module.exports = {
  LeadAgentRuntime,
};
