import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { MessageType } from "../../types";

const CONVERSATION_TEMPLATE = `You are a conversational assistant. Your role is to engage in natural dialogue while maintaining context.

Previous messages:
{history}

Current message:
{content}

Message type: {messageType}

Respond naturally and appropriately for the message type. Keep responses concise and focused.`;

interface ConversationInput {
  input: {
    content: string;
    messageType: MessageType;
  }
}

interface ConversationChainInput {
  model: ChatOpenAI;
  memory?: BufferMemory;
}

export class ConversationChain extends BaseChain {
  private model: ChatOpenAI;
  public memory?: BufferMemory;
  private prompt: PromptTemplate;

  constructor(input: ConversationChainInput) {
    super();
    this.model = input.model;
    this.memory = input.memory;
    this.prompt = new PromptTemplate({
      template: CONVERSATION_TEMPLATE,
      inputVariables: ["history", "content", "messageType"]
    });
  }

  _chainType(): string {
    return "conversation_chain";
  }

  get inputKeys(): string[] {
    return ["input"];
  }

  get outputKeys(): string[] {
    return ["response"];
  }

  async _call(values: ConversationInput): Promise<{ conversationResponse: string }> {
    try {
      // Get conversation history
      const history = this.memory 
        ? (await this.memory.loadMemoryVariables({})).history
        : "";

      // Generate prompt
      const prompt = await this.prompt.format({
        history,
        content: values.input.content,
        messageType: values.input.messageType
      });

      // Get completion from model
      const response = await this.model.invoke([
        { role: "system", content: prompt }
      ]);

      const conversationResponse = response.content as string;

      // Save to memory if available
      if (this.memory) {
        await this.memory.saveContext(
          { input: values.input.content },
          { output: response.content as string }
        );
      }

      return { conversationResponse };
    } catch (error) {
      throw new Error(`Failed to process conversation: ${error}`);
    }
  }
} 