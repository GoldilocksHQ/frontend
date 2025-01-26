import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { Tool } from "@langchain/core/tools";
import { ToolResult } from "../../types";
import { z } from "zod";

const TASK_EXECUTION_TEMPLATE = `You are a task execution assistant. Your role is to execute tasks using the available tools.

Given a task, you should:
1. Analyze the task requirements and identify the necessary tools
2. Plan the sequence of tool executions
3. Execute each tool with appropriate inputs
4. Handle errors and retry if necessary
5. Summarize the results

Task to execute: {task}

Available tools:
{tools}
`;
// Respond with a JSON object in this format:
// {{
//   "success": true,
//   "result": "Summary of what was accomplished",
//   "error": "Error message if any"
// }}`;

const responseSchema = z.object({
  success: z.boolean().describe("Whether the task was successfully completed"),
  result: z.string().describe("The result of the task. This must be included in the response"),
  error: z.string().optional().describe("An error message if the task failed")
});


interface TaskExecutorInput {
  input: {
    task: string;
  }
}

interface TaskExecutorChainInput {
  model: ChatOpenAI;
  memory?: BufferMemory;
  tools?: Tool[];
}

export class TaskExecutorChain extends BaseChain {
  private model: ChatOpenAI;
  public memory?: BufferMemory;
  private tools: Tool[];
  private prompt: PromptTemplate;

  constructor(input: TaskExecutorChainInput) {
    super();
    this.model = input.model;
    this.memory = input.memory;
    this.tools = input.tools || [];
    this.prompt = new PromptTemplate({
      template: TASK_EXECUTION_TEMPLATE,
      inputVariables: ["task", "tools"]
    });
  }

  _chainType(): string {
    return "task_executor_chain";
  }

  get inputKeys(): string[] {
    return ["task", "tools"];
  }

  get outputKeys(): string[] {
    return ["result"];
  }

  async _call(values: TaskExecutorInput): Promise<{ toolResult: ToolResult }> {
    try {
      // Format tools for prompt
      let toolDescriptions = "";
      if (this.tools.length > 0) {
        toolDescriptions = this.tools.map(tool => 
          `- ${tool.name}: ${tool.description}`
        ).join("\n");
      }

      // Generate prompt
      const prompt = await this.prompt.format({
        task: values.input.task,
        tools: toolDescriptions
      });

      const modeWithStructuredOutput = this.model.withStructuredOutput(responseSchema);

      // Get completion from model
      const response = await modeWithStructuredOutput.invoke([
        { role: "system", content: prompt }
      ]);

      // Parse response into ToolResult
      const toolResult = response as ToolResult;

      // Validate result
      this.validateToolResult(toolResult);

      if (!toolResult.success) {
        throw new Error(`Task failed: ${toolResult.error}`);
      }

      return { toolResult };
    } catch (error) {
      throw new Error(`Failed to execute task: ${error}`);
    }
  }

  private validateToolResult(result: ToolResult): void {
    if (typeof result.success !== "boolean") {
      throw new Error("Tool result must include a boolean success flag");
    }

    if (!result.result || typeof result.result !== "string") {
      throw new Error("Tool result must include a result string");
    }

    if (result.error && typeof result.error !== "string") {
      throw new Error("Tool error must be a string if present");
    }
  }
} 