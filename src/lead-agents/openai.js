const axios = require("axios");

class OpenAIResponsesClient {
  constructor(config) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.openaiBaseUrl,
      timeout: config.requestTimeoutMs,
      headers: {
        authorization: `Bearer ${config.openaiApiKey}`,
        "content-type": "application/json",
      },
    });
  }

  async createResponse(payload) {
    try {
      const response = await this.client.post("/responses", payload);
      return response.data;
    } catch (err) {
      if (err.response) {
        const detail = JSON.stringify(err.response.data);
        err.message = `${err.message} | OpenAI response: ${detail}`;
      }
      throw err;
    }
  }
}

module.exports = {
  OpenAIResponsesClient,
};
