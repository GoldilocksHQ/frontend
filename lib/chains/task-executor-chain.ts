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
2. If no tools are required, provide your answer to the task directly
`;

const responseSchema = z.object({
  response: z.string().describe("If no tools is required, provide your answer to the task here. If a tool is required, leave this empty."),
  execution: z.object({
    connectorName: z.string().describe("Name of the connector to use"),
    functionName: z.string().describe("Name of the function to call"),
    parameters: z.record(z.any()).describe("Parameters that match the function's parameter schema"),
  }).describe("If a tool is required, provide the execution plan here. If no tool is required, insert blank inputs for all parameters.")
});

interface TaskExecutorInput {
  input: {
    task: string;
    available_tools: Array<ToolDefinition>;
  }
}

interface TaskExecutorChainInput {
  model: ChatOpenAI;
  memory?: BufferMemory;
}

export class TaskExecutorChain extends BaseChain {
  public id: string;
  private model: ChatOpenAI;
  public memory?: BufferMemory;
  private prompt: PromptTemplate;

  constructor(input: TaskExecutorChainInput) {
    super();
    this.id = crypto.randomUUID() as string;
    this.model = input.model;
    this.memory = input.memory;
    this.prompt = new PromptTemplate({
      template: TASK_EXECUTION_TEMPLATE,
      inputVariables: ["task", "tools"]
    });
  }

  _chainType(): string {
    return "task_executor_chain";
  }

  get inputKeys(): string[] {
    return ["task", "available_tools"];
  }

  get outputKeys(): string[] {
    return ["result"];
  }

  async _call(values: TaskExecutorInput): Promise<{ agentToolCall: AgentToolCall }> {
    try {
      // Format tools for prompt
      const toolDescriptions = values.input.available_tools.map(tool => {
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

      return { agentToolCall };
    } catch (error) {
      throw new Error(`Failed to execute task: ${error}`);
    }
  }
} 