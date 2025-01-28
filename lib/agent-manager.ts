import { UUID } from "crypto";
import { 
  AgentJSON, 
  AgentErrorContext,
  ModelOption, 
  MessageType, 
  Message,
  ChainType,
  ChainConfig,
  AgentTaskList,
  AgentTask,
  ToolResult,
  Thread,
  TaskList,
  UserActivationMappedConnector,
} from "./types";
import { ConversationManager } from './conversation-manager';
import { AgentError, ErrorTracker } from './error-tracker';
import { ChainFactory } from './chain/chain-factory';
import { ToolRegistry } from './tools/tool-registry';
import { ConnectorTool } from './tools/tool-registry';
import { Task } from "./types";

// Constants
export const modelOptions: ModelOption[] = [
  { name: "gpt-4o-mini", provider: "openai", contextWindow: 16384, maxTokens: 16384 },
  { name: "gpt-4", provider: "openai", contextWindow: 8192, maxTokens: 8192 },
  { name: "gpt-3.5-turbo", provider: "openai", contextWindow: 4096, maxTokens: 4096 },
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
              sourceAgentId: {
                type: "string",
                description: "Id of the agent creating the task",
              },
              sourceAgentName: {
                type: "string",
                description: "Name of the agent creating the task",
              },
              targetAgentId: {
                type: "string",
                description: "Id of the agent that should execute the task",
              },
              targetAgentName: {
                type: "string",
                description: "Name of the agent that should execute the task",
              },
              instruction: {
                type: "string",
                description: "The instruction or task to be executed",
              },
            },
            required: ["step", "sourceAgentId", "sourceAgentName", "targetAgentId", "targetAgentName", "instruction"],
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

export const toolExecutionSchema = {
  type: "json_schema",
  json_schema: {
    name: "tool_execution_plan",
    schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Explanation of why this tool and function were chosen"
        },
        toolExecution: {
          type: "object",
          properties: {
            tool: {
              type: "string",
              description: "Name of the tool to use"
            },
            function: {
              type: "string",
              description: "Name of the function to call"
            },
            arguments: {
              type: "object",
              description: "Arguments to pass to the function"
            }
          },
          required: ["tool", "function", "arguments"]
        }
      },
      required: ["reasoning", "toolExecution"]
    }
  }
};

export class AgentManager {
  private static instance: AgentManager | null = null;
  private conversationManager: ConversationManager;
  private errorTracker: ErrorTracker;
  private chainFactory: ChainFactory;
  private toolRegistry: ToolRegistry;
  public agents: Agent[] = [];
  private logger: Console = console;

  private constructor() {
    this.conversationManager = ConversationManager.getInstance();
    this.errorTracker = ErrorTracker.getInstance();
    this.chainFactory = ChainFactory.getInstance();
    this.toolRegistry = ToolRegistry.getInstance();
  }

  static async getInstance(): Promise<AgentManager> {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
      await AgentManager.instance.initialize();
    }
    return AgentManager.instance;
  }

  private async initialize() {
    try {
      await this.toolRegistry.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize AgentManager:', error);
      throw new AgentError('Failed to initialize AgentManager', { error } as AgentErrorContext);
    }
  }


  // Agent Management
  private validateAgent(agent: Agent): void {
    if (!agent.agentName) throw new AgentError('Agent name is required');
    if (!agent.selectedModel) throw new AgentError('Agent model is required');
  }

  addAgent(agent: Agent) {
    try {
      this.validateAgent(agent);
    this.agents.push(agent);
      this.logger.info(`Agent added: ${agent.agentName}`);
    } catch (error) {
      this.logger.error('Failed to create agent:', error);
      throw new AgentError('Failed to create agent', { error, agentName: agent.agentName } as AgentErrorContext);
    }
  }

  deleteAgent(agent: Agent) {
    try {
    this.agents = this.agents.filter((a) => a !== agent);
      this.logger.info(`Agent deleted: ${agent.agentName}`);
    } catch (error) {
      this.logger.error('Failed to delete agent:', error);
      throw new AgentError('Failed to delete agent', { error, agentName: agent.agentName } as AgentErrorContext);
    }
  }

  getAgentById(agentId: UUID): Agent | undefined {
    return this.agents.find(agent => agent.id === agentId);
  }


  // Conversation Management
  async kickOffConversation(targetAgent: Agent, mode: string, threadId: UUID, sourceAgent?: Agent, judgementQuestion?: string, depth: number = 0): Promise<Message | AgentError> {
    try {
      if (depth > 10) {
        this.logger.error('Maximum recursion depth reached in kickOffMessaging');
        return new AgentError('Maximum recursion depth reached', { 
          agentName: targetAgent.agentName,
          mode,
          depth 
        } as AgentErrorContext);
      }

      // Get the agent's last message
      const lastMessage = this.conversationManager.getLastMessage(targetAgent.id);
      if (!lastMessage) {
        this.logger.error('No messages to process');
        return new AgentError('No messages to process', { 
          agentName: targetAgent.agentName,
          mode 
        } as AgentErrorContext);
      }

      const chainConfig: ChainConfig = {
        type: this.chainFactory.getChainType(mode),
        model: targetAgent.selectedModel,
        memory: true,
        tools: Array.from(targetAgent.selectedTools)
      };

      const chain = this.chainFactory.createChain(chainConfig);

      // Execute the chain based on mode
      switch (mode) {
        case "task_planning": {
          const result = await chain.invoke({ input: lastMessage.content });
          const agentTaskList = result.agentTaskList as AgentTaskList;
          
          // Record the plan in conversation store
          const message = this.conversationManager.addMessageToThread({
            threadId,
            role: "assistant",
            content: JSON.stringify(agentTaskList),
            messageType: MessageType.TASK_PLANNING,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now()
          } as Omit<Message, 'id'>);

          // Create task list
          const taskList = await this.createTaskList(targetAgent, threadId, agentTaskList);
          
          console.log(taskList);
          // return this.conversationManager.translateMessageToAgentMessage(message);
          return message;
        }

        case "task_execution": {
          // First, let the agent analyze the task and choose the tool
          const availableTools = Array.from(targetAgent.selectedTools).map((id) => {
            const tool = this.toolRegistry.getTool(id);
            return {
              name: tool.name,
              description: tool.description,
              // Get functions from tool definition
              functions: (tool as ConnectorTool).functions
            };
          })

          const executionSuggestion = await chain.invoke({ 
            input: {
              task: lastMessage.content,
              available_tools: availableTools
            }
          });

          const result = executionSuggestion.result

          // Extract tool execution plan from the result
          let response: string;
          if (result.execution) {
            // Extract tool execution plan from the result
            const { connectorName, functionName, parameters } = result.execution;

            // Get the tool from registry
            const tool = this.toolRegistry.getToolByName(connectorName);
            
            // Execute the tool with properly formatted input
            const toolResult = await tool.call({
              input: JSON.stringify({
                functionName,
                parameters
              }, null, 2)
            });

            // Parse and format the result
            response = typeof toolResult === 'string'
              ? toolResult
              : JSON.stringify(toolResult, null, 2);
          } else {
            response = typeof result.response === 'string'
              ? result.response
              : JSON.stringify(result.response, null, 2);
          }

          // Add the result to the thread
          const message = this.conversationManager.addMessageToThread({
            threadId,
            role: "assistant",
            content: response,
            messageType: MessageType.TASK_EXECUTION,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now(),
            metadata: {}
          });

          // Add message to agent's message list
          targetAgent.addMessage(message);

          return message;
        }

        case "conversation": {
          const result = await chain.invoke({ 
            input: {
              content: lastMessage.content,
              messageType: targetAgent.id ? MessageType.AGENT_TO_USER : MessageType.USER_TO_AGENT,
            }
          });
          const conversationResponse = result.conversationResponse as string;

          const message = this.conversationManager.addMessageToThread({
            threadId,
            role: "assistant",
            content: conversationResponse,
            messageType: targetAgent.id ? MessageType.AGENT_TO_USER : MessageType.USER_TO_AGENT,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now()
          } as Omit<Message, 'id'>);

          // return this.conversationManager.translateMessageToAgentMessage(message);
          return message;
        }

        case "judgement": {
          if (!judgementQuestion) throw new Error('Judgement question is required');
          
          const result = await chain.invoke({ 
            input: {
              requirement: judgementQuestion,
              response: lastMessage.content
            }
          });

          const judgementResponse = result.judgement as Message;
          const message = this.conversationManager.addMessageToThread({
            threadId,
            role: "assistant",
            content: JSON.stringify(judgementResponse),
            messageType: MessageType.JUDGEMENT,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now()
          } as Omit<Message, 'id'>);;

          // return this.conversationManager.translateMessageToAgentMessage(message);
          return message;
        }

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('Error in kickOffMessaging:', error);
      this.errorTracker.recordError(
        targetAgent.id,
        error,
        `Failed to process message (mode: ${mode}, depth: ${depth})`
      );
      throw new AgentError(
        'Failed to process message',
        { error, agentName: targetAgent.agentName, mode, depth } as AgentErrorContext
      );
    }
  }

  // Task Management
  async createTaskList(agent: Agent, threadId: UUID, agentTaskList: AgentTaskList): Promise<TaskList> {
    const taskList = this.conversationManager.createTaskList(
      threadId, 
      agent.id, {
      goal: agentTaskList.goal,
      reasoning: agentTaskList.reasoning
    });

    for (const agentTask of agentTaskList.tasks) {
      this.conversationManager.addTask(
        taskList.id, {
        step: agentTask.step,
        sourceAgentId: agent.id,
        targetAgentId: agentTask.requiredAgent,
        instruction: agentTask.instruction,
      } as Omit<Task, 'id' | 'listId'>);
    }

    return taskList;
  }


  async executeTask(agent: Agent, task: AgentTask, lastStepOutput: string): Promise<ToolResult> {
    try {
      const chain = this.chainFactory.createChain({
        type: ChainType.TASK_EXECUTION,
        model: agent.selectedModel,
        memory: true,
        tools: Array.from(agent.selectedTools)
      });

      const lastStepResult = lastStepOutput ? `\n\nLast step result: ${lastStepOutput}` : '';
      const result = await chain.invoke({ task: `${task.instruction}${lastStepResult}` });
      return result.result as ToolResult;
    } catch (error) {
      this.logger.error('Error executing task:', error);
      throw new AgentError(
        'Failed to execute task',
        { error, agentName: agent.agentName, task } as AgentErrorContext
      );
    }
  }

  // Error management methods
  recordAgentError(agentId: UUID, error: string | Error | unknown, context?: string): void {
    this.errorTracker.recordError(agentId, error, context);
  }

  getAgentErrors(agentId: UUID): AgentError[] {
    return this.errorTracker.getErrors(agentId);
  }

  clearAgentErrors(agentId: UUID): void {
    this.errorTracker.clearErrors(agentId);
  }

  // Public methods for thread management
  public createThread(): Thread {
    return this.conversationManager.createThread();
  }

  public addMessageToThread(message: Omit<Message, 'id'>) {
    return this.conversationManager.addMessageToThread(message);
  }

  public clearThread(threadId: UUID) {
    return this.conversationManager.clearThread(threadId);
  }

  public deleteThread(threadId: UUID) {
    return this.conversationManager.deleteThread(threadId);
  }

  public getThread(threadId: UUID): Thread | null {
    return this.conversationManager.getThread(threadId);
  }

  public getMessage(messageId: string): Message | null {
    return this.conversationManager.getMessage(messageId);
  }

  public getAllThreadsWithAgent(agentId: UUID): Thread[] {
    return this.conversationManager.getAllThreadsWithAgent(agentId);
  }

  public getAllMessages(agentId: UUID): Message[] {
    return this.conversationManager.getAllMessages(agentId);
  }

  public getConnectors(): UserActivationMappedConnector[] {
    return this.toolRegistry.getConnectors();
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
  public chainConfig?: ChainConfig;
  public messages: Message[] = [];

  constructor(
    id: UUID,
    agentName: string,
    agentDescription: string,
    selectedModel: ModelOption,
    systemPrompt: string,
    selectedTools: Set<string>,
    linkedAgentIds: Set<UUID>,
    chainConfig?: ChainConfig
  ) {
    this.id = id;
    this.agentName = agentName;
    this.agentDescription = agentDescription;
    this.selectedModel = selectedModel;
    this.systemPrompt = systemPrompt;
    this.selectedTools = selectedTools;
    this.linkedAgentIds = linkedAgentIds;
    this.chainConfig = chainConfig;
  }

  toJSON(): AgentJSON {
    return {
      id: this.id,
      agentName: this.agentName,
      agentDescription: typeof this.agentDescription === 'string' ? this.agentDescription : String(this.agentDescription),
      selectedModel: this.selectedModel,
      systemPrompt: this.systemPrompt,
      selectedTools: Array.from(this.selectedTools),
      linkedAgentIds: Array.from(this.linkedAgentIds),
      chainConfig: this.chainConfig
    };
  }

  static fromJSON(json: AgentJSON): Agent {
    // Ensure description is a string
    const description = typeof json.agentDescription === 'string' 
      ? json.agentDescription 
      : String(json.agentDescription);

    const agent = new Agent(
      json.id,
      json.agentName,
      description,
      json.selectedModel,
      json.systemPrompt,
      new Set(json.selectedTools),
      new Set(json.linkedAgentIds),
      json.chainConfig
    );
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

  addMessage(message: Message) {
    this.messages.push(message);
  }
}
