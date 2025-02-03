import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { ToolDefinition } from "../managers/tool-manager";
import { AgentToolCall } from "../core/thread";

const TASK_EXECUTION_TEMPLATE = `You are a task execution assistant. Your role is to analyze tasks and determine which connector and function to use to accomplish them.

Given a task and available connectors with their functions, you should:
1. Analyze the task requirements
2. Choose the most appropriate connector and function, only from what is available
3. Format the function parameters correctly according to the function's parameter schema

Task to execute: {task}

Available connectors and their functions:
{tools}

Respond with a JSON object containing:
1. The execution plan with connector name, function name, and parameters that match the parameter schema. All three are required.
2. Do not leave any fields blank or undefined.
3. If no tools are required, provide your answer to the task directly
`;

const responseSchema = z.object({
  // response: z.string().describe("If no tools are required, provide your answer here. Leave empty if using a tool.").optional(),
  execution: z.object({
    connectorName: z.string().describe("Name of the connector to use, must not be blank"),
    functionName: z.string().describe("Name of the function to call, must not be blank"),
    parameters: z.record(z.any()).describe("Parameters matching the function's schema, must not be blank")
  }).required()
  
  // .optional()
// }).refine(
//   (data) => 
//     // XOR check - exactly one must be present
//     (data.response ? 1 : 0) + (data.execution ? 1 : 0) === 1,
//   {
//     message: "Must provide either response or execution, not both",
//     path: ["response"] // Points to the field that failed validation
  }
);

interface TaskExecutorInput {
  input: {
    task: string;
  }
}

interface TaskExecutorChainInput {
  model: ChatOpenAI;
  memory?: BufferMemory;
  tools: Array<ToolDefinition>;
}

export class TaskExecutorChain extends BaseChain {
  public id: string;
  private model: ChatOpenAI;
  public memory?: BufferMemory;
  private prompt: PromptTemplate;
  private tools: Array<ToolDefinition>;

  constructor(input: TaskExecutorChainInput) {
    super();
    this.id = crypto.randomUUID() as string;
    this.model = input.model;
    this.memory = input.memory;
    this.tools = input.tools;
    this.prompt = new PromptTemplate({
      template: TASK_EXECUTION_TEMPLATE,
      inputVariables: ["task", "tools"]
    });
  }

  _chainType(): string {
    return "task_executor_chain";
  }

  get inputKeys(): string[] {
    return ["input"];
  }

  get outputKeys(): string[] {
    return ["result"];
  }

  async _call(values: TaskExecutorInput): Promise<{ agentToolCall: AgentToolCall }> {
    try {
      // Format tools for prompt
      const toolDescriptions = this.tools.map(tool => {
        const functionDescriptions = tool.functions.map(func => 
          `    - ${func.name}: ${func.description}\n      Parameters: ${JSON.stringify(func.parameters, null, 2)}`
        ).join('\n');
        
        return `- ${tool.name}: Functions:\n${functionDescriptions}`;
      }).join('\n\n');

      // Generate prompt
      const prompt = await this.prompt.format({
        task: values.input.task,
        tools: toolDescriptions
      });

      const modelWithStructuredOutput = this.model.withStructuredOutput(responseSchema);

      // Get completion from model
      const agentToolCall = await modelWithStructuredOutput.invoke([
        { role: "system", content: prompt }
      ]);

      this.validateAgentToolCall(agentToolCall);

      return { agentToolCall };
    } catch (error) {
      throw new Error(`Failed to execute task: ${error}`);
    }
  }

  private validateAgentToolCall(agentToolCall: AgentToolCall): void {
    if (!agentToolCall.execution.connectorName || typeof agentToolCall.execution.connectorName !== "string") {
      throw new Error("Agent tool call must include a connector name");
    }

    if (!agentToolCall.execution.functionName || typeof agentToolCall.execution.functionName !== "string") {
      throw new Error("Agent tool call must include a function name");
    }

    if (!agentToolCall.execution.parameters || typeof agentToolCall.execution.parameters !== "object") {
      throw new Error("Agent tool call must include parameters");
    }
  }
} 
