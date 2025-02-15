import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { type AgentPlan} from "../../../core/entities/thread";
import { z } from "zod";

// TASK_PLANNING_TEMPLATE

const TASK_PLANNING_TEMPLATE = `You are a task planning assistant. Your role is to break down complex tasks into manageable steps.

Given a task, you should:
1. Analyze the requirements and identify the key components
2. Break down the task into smaller, logical steps
3. For each step:
   - Provide a clear description
   - Identify which agents (use agent IDs) and tools are needed from the EXACT list below
   - Include key information or crucial inputs in instruction. If you don't have any, just leave blank.
   - Note any dependencies on other steps
   - Include reasoning for the approach
4. Ensure the steps are ordered correctly
5. Validate that all requirements are covered
6. Ensure the assigned agents are capable of completing the task
7. If there are specialised planner agents, let them plan the tasks instead of yourself. You only need to provide them the goal and high level instructions.

Task to plan: {input}

Available agents:
{agents}

IMPORTANT WARNINGS:
- You can ONLY use tools that are listed above. Do not reference any tools that are not in the provided list.
- ONLY provide key inputs that you have information about. Do not make up information.
- ONLY provide the ID of the agent that is required to complete the task.
- If a task cannot be completed with the available tools, state this in the reasoning.
`;

const responseSchema = z.object({
  goal: z.string().describe("The main objective of the task"),
  tasks: z.array(z.object({
    step: z.number().describe("The unique identifier for the task"),
    instruction: z.string().describe("The instruction of the task"),
    keyInputs: z.array(z.string()).default([]).describe("The key inputs for the task and tool calls"),
    tools: z.array(z.string().optional().describe("The tools that are needed to complete the task")),
    dependencies: z.array(z.number()).describe("The tasks that must be completed before this task can be started"),
    requiredAgentId: z.string().describe("The ID of the agent that is required to complete the task. Do not use agent names, only ID"),
    reasoning: z.string().describe("The reasoning behind the task planning")
  })).describe("The tasks that need to be completed to achieve the goal"),
  reasoning: z.string().describe("The overall reasoning behind the task planning")
});

interface TaskPlannerInput {
  input: {
    request: string;
  }
}

interface TaskPlannerChainInput {
  model: ChatOpenAI;
  memory?: BufferMemory;
  linkedAgents?: object;
}

export class TaskPlannerChain extends BaseChain {
  public id: string;
  private model: ChatOpenAI;
  public memory?: BufferMemory;
  private linkedAgents: object;
  private prompt: PromptTemplate;

  constructor(input: TaskPlannerChainInput) {
    super();
    this.id = crypto.randomUUID() as string;
    this.model = input.model;
    this.memory = input.memory;
    this.linkedAgents = input.linkedAgents || [];
    this.prompt = new PromptTemplate({
      template: TASK_PLANNING_TEMPLATE,
      inputVariables: ["input", "agents"]
    });
  }

  _chainType(): string {
    return "task_planner_chain";
  }

  get inputKeys(): string[] {
    return ["input"];
  }

  get outputKeys(): string[] {
    return ["agentPlan"];
  }

  async _call(values: TaskPlannerInput): Promise<{ agentPlan: AgentPlan }> {
    try {
      // // Format tools for prompt
      // const toolDescriptions = this.tools.map(tool => 
      //   `- ${tool.name}\nFunctions:\n ${tool.functions.map(func => `- ${func.name}: ${func.description}`).join("\n")}`
      // ).join("\n\n");

      // Generate prompt
      const prompt = await this.prompt.format({
        input: values.input.request,
        agents: JSON.stringify(this.linkedAgents),
      });

      const modeWithStructuredOutput = this.model.withStructuredOutput(responseSchema);

      let isValid = false;  
      let invokeCount = 0;
      let agentPlan: AgentPlan = {
        goal: "",
        tasks: [],
        reasoning: ""
      };

      while (!isValid && invokeCount < 3) {
          // Get completion from model
        const response = await modeWithStructuredOutput.invoke([
          { role: "system", content: prompt }
        ]);

        // Convert to a Plan
        agentPlan = {
          goal: response.goal,
          tasks: response.tasks.map((task) => {
            return {
              step: task.step,
              instruction: task.instruction,
              keyInputs: task.keyInputs && task.keyInputs.length > 0 ? task.keyInputs : [],
              tools: task.tools.filter((tool): tool is string => tool !== undefined),
              dependencies: task.dependencies.map((dependency) => dependency.toString()),
              requiredAgentId: task.requiredAgentId,
              reasoning: task.reasoning
            };
          }),
          reasoning: response.reasoning,
        };

        // Validate task list
        const error = this.validateAgentPlan(agentPlan);
        if (error) {
          invokeCount++;
          if (invokeCount >= 3) {
            throw error;
          }
        } else {
          isValid = true;
        }
      }

      return { agentPlan };
    } catch (error) {
      throw new Error(`Failed to create task plan: ${error}`);
    }
  }

  private validateAgentPlan(agentPlan: AgentPlan): Error | null {
    if (!agentPlan.goal || typeof agentPlan.goal !== "string") {
      return new Error("Task plan must include a goal string");
    }

    if (!Array.isArray(agentPlan.tasks) || agentPlan.tasks.length === 0) {
      return new Error("Task plan must include at least one task");
    }

    for (const task of agentPlan.tasks) {
      if (!task.step || typeof task.step !== "number") {
        return new Error("Each task must have a number step");
      }

      if (!task.instruction || typeof task.instruction !== "string") {
        return new Error("Each task must have a string instruction");
      }

      if (!task.requiredAgentId || typeof task.requiredAgentId !== "string") {
        return new Error("Each task must have a string requiredAgent");
      }

      if (!Array.isArray(task.dependencies)) {
        return new Error("Each task must have a dependencies array");
      }

      if (!task.reasoning || typeof task.reasoning !== "string") {
        return new Error("Each task must have a string reasoning");
      }
    }

    if (!agentPlan.reasoning || typeof agentPlan.reasoning !== "string") {
      return new Error("Task plan must include overall reasoning");
    }

    return null;
  }
} 