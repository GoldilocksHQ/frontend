import { UUID } from "crypto";
import { APIKeyManager } from "./api-key-manager";
import { AgentJSON, AgentRequestBody, AgentExecution, Message, ModelOption, Task, AgentExecutionType } from "./types";

// Constants
export const modelOptions: ModelOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "gpt-4", label: "GPT-4", provider: "OpenAI" },
  { value: "o1-mini", label: "GPT-o1 Mini", provider: "OpenAI" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "OpenAI" },
];

export const judgementSchema = {
  type: "json_schema",
  json_schema: {
    name: "judgement_response",
    schema: {
      type: "object",
      properties: {
        judgement: {
          type: "boolean",
          description: "Answer to the yes/no question at the end",
        },
      },
      required: ["judgement"],
      additionalProperties: false,
    },
  },
};

export const taskSchema = {
  type: "json_schema",
  json_schema: {
    name: "tasks_response",
    schema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: {
                type: "number",
                description: "The step number of the task",
              },
              sourceAgent: {
                type: "string",
                description: "Name of the agent creating the task",
              },
              targetAgent: {
                type: "string",
                description: "Name of the agent that should execute the task",
              },
              instruction: {
                type: "string",
                description: "The instruction or task to be executed",
              },
            },
            required: ["step", "sourceAgent", "targetAgent", "instruction"],
            additionalProperties: false,
          },
        },
      },
      required: ["tasks"],
      additionalProperties: false,
    },
    strict: true,
  },
};

class AgentError extends Error {
  constructor(
    message: string, 
    public readonly context?: {
      error?: unknown;
      agentName?: string;
      status?: number;
      taskChain?: Task[];
      mode?: string;
      depth?: number;
      currentTask?: Task;
    }
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class AgentManager {
  private static instance: AgentManager | null = null;
  private apiKeyManager: APIKeyManager | null = null;
  private headers: HeadersInit | undefined;
  public agents: Agent[] = [];
  public taskChain: Task[] = [];
  private logger: Console = console;

  static async getInstance(): Promise<AgentManager> {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
      await AgentManager.instance.initialize();
    }
    return AgentManager.instance;
  }

  private async initialize() {
    try {
      this.apiKeyManager = await APIKeyManager.getInstance();
      this.headers = {
        "Content-Type": "application/json",
        "x-api-key": this.apiKeyManager?.getKey(),
      };
    } catch (error) {
      this.logger.error('Failed to initialize AgentManager:', error);
      throw new AgentError('Failed to initialize AgentManager', { error });
    }
  }

  private validateAgent(agent: Agent): void {
    if (!agent.agentName) throw new AgentError('Agent name is required');
    if (!agent.selectedModel) throw new AgentError('Agent model is required');
  }

  createAgent(agent: Agent) {
    try {
      this.validateAgent(agent);
      this.agents.push(agent);
      this.logger.info(`Agent created: ${agent.agentName}`);
    } catch (error) {
      this.logger.error('Failed to create agent:', error);
      throw new AgentError('Failed to create agent', { error, agentName: agent.agentName });
    }
  }

  deleteAgent(agent: Agent) {
    try {
      this.agents = this.agents.filter((a) => a !== agent);
      this.logger.info(`Agent deleted: ${agent.agentName}`);
    } catch (error) {
      this.logger.error('Failed to delete agent:', error);
      throw new AgentError('Failed to delete agent', { error, agentName: agent.agentName });
    }
  }

  getAgentById(agentId: UUID): Agent | undefined {
    return this.agents.find(agent => agent.id === agentId);
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  async kickOffMessaging(agent: Agent, mode: string = "task", judgementQuestion?: string, depth: number = 0): Promise<Message | AgentError> {
    try {
      // Add maximum recursion depth protection
      if (depth > 10) {
        this.logger.error('Maximum recursion depth reached in kickOffMessaging');
        return new AgentError('Maximum recursion depth reached', { 
          agentName: agent.agentName,
          mode,
          depth 
        });
      }

      if (!this.apiKeyManager) {
        await this.initialize();
      }

      const systemPrompt = await this.setSystemPrompt(agent);
      const response = await this.sendMessage(agent, systemPrompt, mode, judgementQuestion);

      if (response instanceof AgentError) {
        return response;
      }

      const responseData = await response.json();
      this.logger.info('Agent API response:', { 
        agent: agent.agentName, 
        mode,
        depth,
        response: responseData 
      });

      if (responseData) {
        // Check if the content is JSON
        if (this.isValidJSON(responseData.content)) {
          const content = JSON.parse(responseData.content);
          
          // Only process as task chain if it has the expected structure
          if (content.tasks && Array.isArray(content.tasks)) {
            this.taskChain = content.tasks as Task[];
            
            if (this.taskChain) {
              const executionFlow = await this.executeTaskChain(this.taskChain);
              if (executionFlow instanceof AgentError) {
                return executionFlow;
              }
            }
          }
        }
        return responseData;
      }

      return { role: "assistant", content: "No response received" };
    } catch (error) {
      this.logger.error('Error in kickOffMessaging:', error);
      throw new AgentError(
        'Failed to process message',
        { error, agentName: agent.agentName, mode, depth }
      );
    }
  }

  private async setSystemPrompt(agent: Agent): Promise<string> {
    try {
      if (agent.linkedAgentIds.size === 0) return agent.systemPrompt;

      const linkedAgentsMenu = this.createdLinkedAgentMenu(agent.linkedAgentIds);
      return `${agent.systemPrompt}\n\nYour name is ${agent.agentName}. Following are the agents you can use:\n\n${linkedAgentsMenu}`;
    } catch (error) {
      this.logger.error('Error setting system prompt:', error);
      throw new AgentError('Failed to set system prompt', { error, agentName: agent.agentName });
    }
  }

  private async sendMessage(agent: Agent, systemPrompt: string, mode: string, judgementQuestion?: string): Promise<Response | AgentError> {
    try {
      const body: AgentRequestBody = {
        model: agent.selectedModel.value,
        messages: agent.messages,
        systemPrompt,
        userId: this.apiKeyManager?.getUserId() || "",
      };

      // Add tools if the agent has any
      if (agent.selectedTools.size > 0) {
        body.selectedTools = Array.from(agent.selectedTools);
      }

      // Add task schema if the agent has any linked agents and mode is task
      if (agent.linkedAgentIds.size > 0 && mode === "task") {
        body.firstResponseFormat = taskSchema;
      } else if (mode === "judgement" && judgementQuestion) {
        body.firstResponseFormat = judgementSchema;
        body.messages.push({ role: "user", content: judgementQuestion });
      }

      this.logger.info('Sending message to API:', { 
        agent: agent.agentName, 
        model: body.model,
        toolsCount: body.selectedTools?.length
      });

      return fetch("/api/agents", {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return new AgentError('Failed to send message', { error, agentName: agent.agentName });
    }
  }

  private async executeTaskChain(taskChain: Array<Task>): Promise<Array<AgentExecution> | AgentError> {
    const executionFlow: Array<AgentExecution> = [];
    let agentInstruction: Message = {
      role: "user",
      content: `Instruction:\nStep ${taskChain[0].step}: ${taskChain[0].instruction}`,
    };

    try {
      for (let i = 0; i < taskChain.length; i++) {
        const task = taskChain[i];
        const sourceAgent = this.agents.find(agent => agent.agentName === task.sourceAgent);
        const targetAgent = this.agents.find(agent => agent.agentName === task.targetAgent);
        
        if (!sourceAgent || !targetAgent) {
          throw new AgentError(
            `Agent not found: ${!sourceAgent ? task.sourceAgent : task.targetAgent}`,
            { taskChain, currentTask: task }
          );
        }

        this.logger.info('Executing task:', { 
          step: task.step,
          sourceAgent: task.sourceAgent,
          targetAgent: task.targetAgent
        });

        targetAgent.addMessage(agentInstruction);
        executionFlow.push({
          senderAgent: sourceAgent.agentName,
          receiverAgent: targetAgent.agentName,
          content: agentInstruction.content,
          type: AgentExecutionType.INSTRUCTION,
        });

        let taskCompleted = false;
        let mentionTask = false;
        let targetResponse: Message | AgentError = {
          role: "assistant",
          content: "No response from target agent"
        };
        let judgementCount = 0;
        const maxAttempts = 3; // Limit the number of attempts

        while (!taskCompleted && judgementCount < maxAttempts) {
          // Get response from target agent with depth parameter
          targetResponse = await this.kickOffMessaging(targetAgent, "conversation", undefined, judgementCount + 1);
          if (targetResponse instanceof AgentError) {
            this.logger.error('Error executing task:', targetResponse);
            return targetResponse;
          }

          targetAgent.addMessage({ role: "assistant", content: targetResponse.content });
          executionFlow.push({
            senderAgent: targetAgent.agentName,
            receiverAgent: sourceAgent.agentName,
            content: targetResponse.content,
            type: AgentExecutionType.RESPONSE,
          });

          if (!mentionTask) {
            mentionTask = true;
            sourceAgent.addMessage({ 
              role: "assistant", 
              content: `Your instruction:\nstep ${task.step}: ${task.instruction}` 
            });
          }

          sourceAgent.addMessage({ 
            role: "assistant", 
            content: `Outputs from ${targetAgent.agentName}:\n${targetResponse.content}` 
          });

          // Ask for judgement with depth parameter
          const judgementResponse = await this.kickOffMessaging(
            sourceAgent, 
            "judgement", 
            "Does the above provides what you need?",
            judgementCount + 1
          );

          if (judgementResponse instanceof AgentError) {
            this.logger.error('Error in judgement:', judgementResponse);
            return judgementResponse;
          }

          try {
            const judgementContent = JSON.parse(judgementResponse.content);
            if (judgementContent.judgement === true) {
              taskCompleted = true;
            } else {
              judgementCount++;
              if (judgementCount < maxAttempts) {
                // Get clarification with depth parameter
                const sourceResponse = await this.kickOffMessaging(
                  sourceAgent, 
                  "conversation",
                  undefined,
                  judgementCount + 1
                );
                
                if (sourceResponse instanceof AgentError) {
                  this.logger.error('Error getting clarification:', sourceResponse);
                  return sourceResponse;
                }

                sourceAgent.addMessage({ role: "assistant", content: sourceResponse.content });
                targetAgent.addMessage({ role: "user", content: sourceResponse.content });
                executionFlow.push({
                  senderAgent: targetAgent.agentName,
                  receiverAgent: sourceAgent.agentName,
                  content: sourceResponse.content,
                  type: AgentExecutionType.INSTRUCTION,
                });
              }
            }
          } catch (error) {
            this.logger.error('Error parsing judgement:', error);
            judgementCount++;
          }
        }

        if (!taskCompleted) {
          this.logger.warn('Task not completed after maximum attempts', {
            task,
            attempts: maxAttempts
          });
        }

        if (i + 1 < taskChain.length) {
          agentInstruction = {
            role: "user",
            content: `Instruction:\nStep ${taskChain[i + 1].step}: ${taskChain[i + 1].instruction}\n\nOutputs from ${targetAgent.agentName}:\n${targetResponse.content}`
          };
        }
      }

      const primarySourceAgent = this.agents.find(agent => agent.agentName === taskChain[0].sourceAgent)
      if (primarySourceAgent) {
        primarySourceAgent.addMessage({ 
          role: "assistant", 
          content: `Task execution completed. Summary: ${JSON.stringify(executionFlow)}. Provide your final output.`
        });
        const finalResult = await this.kickOffMessaging(primarySourceAgent, "conversation");
        if (finalResult instanceof AgentError) {
          this.logger.error('Error getting final result:', finalResult);
          return finalResult;
        }
        primarySourceAgent?.addMessage({ 
          role: "assistant", 
          content: finalResult.content
        });
      }
      
      return executionFlow;
    } catch (error) {
      this.logger.error('Error executing task chain:', error);
      throw new AgentError('Failed to execute task chain', { error, taskChain });
    }
  }

  private createdLinkedAgentMenu(linkedAgentIds: Set<UUID>): string {
    try {
      const allLinkedAgentInfo = Array.from(linkedAgentIds)
        .map((agentId) => {
          const agent = this.getAgentById(agentId);
          if (!agent) {
            this.logger.warn(`Linked agent not found: ${agentId}`);
            return null;
          }
          return {
            agentId: agent.id,
            agentName: agent.agentName,
            agentDescription: agent.agentDescription,
            agentTools: Array.from(agent.selectedTools || []),
          };
        })
        .filter(Boolean);

      return JSON.stringify(allLinkedAgentInfo);
    } catch (error) {
      this.logger.error('Error creating linked agent menu:', error);
      throw new AgentError('Failed to create linked agent menu', { error });
    }
  }
}

export class Agent {
  public id: UUID;
  public agentName: string;
  public agentDescription: string;
  public selectedModel: ModelOption;
  public systemPrompt: string;
  public selectedTools: Set<string>;
  public linkedAgentIds: Set<UUID>;
  public messages: Array<{ role: string; content: string }>;

  constructor(
    id: UUID,
    agentName: string,
    agentDescription: string,
    selectedModel: ModelOption,
    systemPrompt: string,
    selectedTools: Set<string>,
    linkedAgentIds: Set<UUID>
  ) {
    this.id = id;
    this.agentName = agentName;
    this.agentDescription = agentDescription;
    this.selectedModel = selectedModel;
    this.systemPrompt = systemPrompt;
    this.selectedTools = selectedTools;
    this.linkedAgentIds = linkedAgentIds;
    this.messages = [];
  }

  toJSON(): AgentJSON {
    return {
      id: this.id,
      agentName: this.agentName,
      agentDescription: this.agentDescription,
      selectedModel: this.selectedModel,
      systemPrompt: this.systemPrompt,
      selectedTools: Array.from(this.selectedTools),
      linkedAgentIds: Array.from(this.linkedAgentIds),
      messages: this.messages,
    };
  }

  static fromJSON(json: AgentJSON): Agent {
    const agent = new Agent(
      json.id,
      json.agentName,
      json.agentDescription,
      json.selectedModel,
      json.systemPrompt,
      new Set(json.selectedTools),
      new Set(json.linkedAgentIds)
    );
    agent.messages = json.messages || [];
    return agent;
  }

  editName(name: string) {
    this.agentName = name;
  }

  editDescription(description: string) {
    this.agentDescription = description;
  }

  selectModel(model: ModelOption) {
    this.selectedModel = model;
  }

  setTools(tools: Set<string>) {
    this.selectedTools = tools;
  }

  setLinkedAgentIds(agentIds: Set<UUID>) {
    this.linkedAgentIds = agentIds;
  }

  setSystemPrompt(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
  }

  addMessage(message: { role: string; content: string }) {
    this.messages.push(message);
  }

  removeMessage(index: number) {
    this.messages.splice(index, 1);
  }

  editMessage(index: number, message: { role: string; content: string }) {
    this.messages[index] = message;
  }
}
