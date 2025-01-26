import { UUID } from "crypto";
import { APIKeyManager } from "./api-key-manager";
import { 
  AgentJSON, 
  AgentMessage, 
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
  TaskListStatus,
  TaskStatus
} from "./types";
import { ConversationManager } from './conversation-manager';
import { AgentError, ErrorTracker } from './error-tracker';
import { ChainFactory } from './chain/chain-factory';
import { ToolRegistry } from './tools/tool-registry';
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

export class AgentManager {
  private static instance: AgentManager | null = null;
  private apiKeyManager: APIKeyManager | null = null;
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
    this.apiKeyManager = await APIKeyManager.getInstance();
      await this.toolRegistry.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize AgentManager:', error);
      throw new AgentError('Failed to initialize AgentManager', { error } as AgentErrorContext);
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

  async kickOffConversation(targetAgent: Agent, mode: string = "task", threadId?: UUID, sourceAgent?: Agent, judgementQuestion?: string, depth: number = 0): Promise<AgentMessage | AgentError> {
    try {
      if (depth > 10) {
        this.logger.error('Maximum recursion depth reached in kickOffMessaging');
        return new AgentError('Maximum recursion depth reached', { 
          agentName: targetAgent.agentName,
          mode,
          depth 
        } as AgentErrorContext);
      }

      // Check if there are any messages to process
      if (!targetAgent.messages || targetAgent.messages.length === 0) {
        this.logger.error('No messages to process');
        return new AgentError('No messages to process', { 
          agentName: targetAgent.agentName,
          mode 
        } as AgentErrorContext);
      }

      const chainConfig: ChainConfig = {
        type: this.getChainType(mode),
        model: targetAgent.selectedModel,
        memory: true,
        tools: Array.from(targetAgent.selectedTools)
      };

      const chain = this.chainFactory.createChain(chainConfig);

      if (!threadId) {
        threadId = this.conversationManager.createThread().id;
      }
      
      // Get the last message content
      const lastMessage = targetAgent.messages[targetAgent.messages.length - 1];
      if (!lastMessage || !lastMessage.content) {
        this.logger.error('Invalid message format');
        return new AgentError('Invalid message format', { 
          agentName: targetAgent.agentName,
          mode 
        } as AgentErrorContext);
      }

      // Execute the chain based on mode
      switch (mode) {
        case "task_planning": {
          const result = await chain.invoke({ input: lastMessage.content });
          const agentTaskList = result.agentTaskList as AgentTaskList;
          
          // Record the plan in conversation store
          const message = this.conversationManager.addMessage({
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
          return message;

          // Execute each task
          // let taskOutputSummary: string = "";
          // let lastStepOutput: string = `Goal: ${taskPlan.goal}\n\n`;
          // for (const task of taskPlan.tasks) {
          //   const result = await this.executeTask(agent, task, lastStepOutput);
          //   lastStepOutput = result.result;
          //   taskOutputSummary += `
          //     Task ${task.description}
          //     Output: ${result.result}
          //   `;
          // }

          // Add the last step output to the conversation
          // const messageId = this.conversationManager.addMessage({
          //   threadId,
          //   role: "assistant",
          //   content: taskOutputSummary,
          //   messageType: MessageType.AGENT_TO_USER,
          //   sourceAgentId: agent.id,
          //   timestamp: Date.now()
          // } as Omit<Message, 'id'>);
          // TODO: Need to send message to Agent for final output, but this workflow needs to go outside of this function

          // return {
          //   role: "assistant",
          //   content: `Task execution completed. See message ${messageId} for details.`,
          //   timestamp: Date.now()
          // };
        }

        case "task_execution": {
          // Handle task execution
          const result = await chain.invoke({ 
            input: {
              task: targetAgent.messages[targetAgent.messages.length - 1].content,
            }
          });
          const toolResult = result.toolResult as ToolResult;

          const message = this.conversationManager.addMessage({
            threadId,
            role: "assistant",
            content: JSON.stringify(toolResult),
            messageType: MessageType.TASK_EXECUTION,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now()
          } as Omit<Message, 'id'>);

          return message;

          // return {
          //   role: "assistant",
          //   content: result.response,
          //   timestamp: Date.now()
          // };
        }

        case "conversation": {
          const result = await chain.invoke({ 
            input: {
              content: targetAgent.messages[targetAgent.messages.length - 1].content,
              messageType: targetAgent.id ? MessageType.AGENT_TO_USER : MessageType.USER_TO_AGENT,
            }
          });
          const conversationResponse = result.conversationResponse as string;

          const message = this.conversationManager.addMessage({
            threadId,
            role: "assistant",
            content: conversationResponse,
            messageType: targetAgent.id ? MessageType.AGENT_TO_USER : MessageType.USER_TO_AGENT,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now()
          } as Omit<Message, 'id'>);

          return message;
        }

        case "judgement": {
          if (!judgementQuestion) throw new Error('Judgement question is required');
          
          const result = await chain.invoke({ 
            input: {
              requirement: judgementQuestion,
              response: targetAgent.messages[targetAgent.messages.length - 1].content
            }
          });

          const judgementResponse = result.judgement as Message;
          const message = this.conversationManager.addMessage({
            threadId,
            role: "assistant",
            content: JSON.stringify(judgementResponse),
            messageType: MessageType.JUDGEMENT,
            targetAgentId: targetAgent.id,
            sourceAgentId: sourceAgent?.id,
            timestamp: Date.now()
          } as Omit<Message, 'id'>);

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

  async createTaskList(agent: Agent, threadId: UUID, agentTaskList: AgentTaskList): Promise<TaskList> {
    const taskList: TaskList = {
      id: crypto.randomUUID() as UUID,
      threadId: threadId,
      sourceAgentId: agent.id,
      tasks: [],
      status: TaskListStatus.PENDING,
      startTime: Date.now(),
      executionFlow: [],
      metadata: {
        goal: agentTaskList.goal,
        reasoning: agentTaskList.reasoning
      }
    };

    for (const agentTask of agentTaskList.tasks) {
      const task: Task = {
        id: crypto.randomUUID() as UUID,
        listId: taskList.id,
        step: agentTask.step,
        sourceAgentId: agent.id,
        targetAgentId: agentTask.requiredAgent,
        instruction: agentTask.instruction,
        status: TaskStatus.PENDING,
        startTime: Date.now(),
        metadata: {
          goal: agentTaskList.goal,
          reasoning: agentTaskList.reasoning
        },
      }
      taskList.tasks.push(task);
    }

    return taskList;
  }


  async executeTask(agent: Agent, task: AgentTask, lastStepOutput: string): Promise<ToolResult> {
    try {
      const chain = this.chainFactory.createChain({
        type: ChainType.TASK_EXECUTION,
        model: agent.selectedModel,
        memory: true,
        tools: task.tools
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

  private getChainType(mode: string): ChainType {
    switch (mode) {
      case "task_planning":
        return ChainType.TASK_PLANNING;
      case "task_execution":
        return ChainType.TASK_EXECUTION;
      case "conversation":
        return ChainType.CONVERSATION;
      case "judgement":
        return ChainType.JUDGEMENT;
      default:
        throw new Error(`Unknown mode: ${mode}`);
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
    return this.conversationManager.addMessage(message);
  }

  public clearThread(threadId: UUID) {
    return this.conversationManager.clearThread(threadId);
  }

  public getThread(threadId: UUID): Thread | null {
    return this.conversationManager.getThread(threadId);
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
  public messages: AgentMessage[];
  public chainConfig?: ChainConfig;

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
      chainConfig: this.chainConfig
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
      new Set(json.linkedAgentIds),
      json.chainConfig
    );
    agent.messages = json.messages;
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

  addMessage(message: AgentMessage) {
    this.messages.push({
      ...message,
      timestamp: Date.now()
    });
  }

  removeMessage(index: number) {
    this.messages.splice(index, 1);
  }

  editMessage(index: number, message: AgentMessage) {
    this.messages[index] = {
      ...message,
      timestamp: Date.now()
    };
  }
}
