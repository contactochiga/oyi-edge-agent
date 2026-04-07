const fs = require("fs/promises");
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
  constructor({ config, store, openaiClient, toolExecutor, log }) {
    this.config = config;
    this.store = store;
    this.openaiClient = openaiClient;
    this.toolExecutor = toolExecutor;
    this.log = log;
    this.toolsPromise = null;
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
      name: request.profile?.name || "unknown",
      company: request.profile?.company || "unknown",
      role: request.profile?.role || "unknown",
      email: request.profile?.email || "",
      phone: request.profile?.phone || "",
      location: request.profile?.location || "unknown",
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
    const agentKey = request.agent === "sales" ? "sales" : "marketing";
    const agentPack = await loadPromptPack(this.config.promptPackRoot, agentKey);
    const tools = await this.getToolDefinitions();
    const lead = await this.ensureLead(request);
    const history = await this.store.listConversationsForLead(
      lead.id,
      this.config.maxConversationMessages
    );

    await this.store.appendConversation({
      lead_id: lead.id,
      agent_name: agentPack.agentName,
      message_role: "user",
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
          content: JSON.stringify({
            tool: call.name,
            arguments: args,
            result,
          }),
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
      content: assistantMessage,
    });

    return {
      agent: agentPack.agentName,
      lead: await this.store.getLead(context.leadId),
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
