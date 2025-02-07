"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { AgentCard } from "./components/agent-card";
import { AgentConfigSidebar } from "./components/agent-config-sidebar";
import { ChatInterface } from "./components/chat-interface";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import {
  LoadingState,
  LoadingWrapper,
} from "@/app/components/common/loading-state";
import { AgentManager } from "@/lib/managers/agent-manager";
import { ConversationManager } from "@/lib/managers/conversation-manager";
import { useStores } from "@/lib/stores";
import { ConnectorManager } from "@/lib/managers/connector-manager";
import {
  Interaction,
  InteractionStatus,
  InteractionType,
  Message,
  MessageRole,
} from "@/lib/core/thread";
import { ErrorBoundary } from "@/app/components/common/error-boundary";
import { debounce } from 'lodash-es';

export default function PlaygroundPage() {
  const { uiState: ui, agentState: agent } = useStores();
  const [, setConnectorManager] = useState<ConnectorManager | null>(null);
  const [agentManager, setAgentManager] = useState<AgentManager | null>(null);
  const [conversationManager, setConversationManager] =
    useState<ConversationManager | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionHistory, setInteractionHistory] = useState<Interaction[]>(
    []
  );
  const [isMounted, setIsMounted] = useState(true);
  const { toast } = useToast();

  // Initialize Managers
  useEffect(() => {
    const abortController = new AbortController();
    setIsMounted(true);

    const initializeManagers = async () => {
      try {
        if (!isMounted) return;

        ui.setLoading(true);

        // Reset working state on mount
        ui.setWorking(false);
        ui.setWorkingStatus("");

        // Initialize managers
        const connectorMgr = ConnectorManager.getInstance();
        await connectorMgr.initialize();
        setConnectorManager(connectorMgr);

        const agentMgr = AgentManager.getInstance(
          connectorMgr.getToolManager()
        );
        await agentMgr.initialize();
        setAgentManager(agentMgr);

        const conversationMgr = ConversationManager.getInstance();
        await conversationMgr.initialize();
        setConversationManager(conversationMgr);

        // setInteractionHistory(conversationMgr.getInteractionsByAgent(agent.selectedAgent?.id as string));
      } catch (error) {
        if (isMounted) {
          console.error("Failed to initialize managers:", error);
          toast({
            title: "Error",
            description: "Failed to initialize application managers",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          ui.setLoading(false);
        }
      }
    };

    initializeManagers();

    return () => {
      setIsMounted(false);
      abortController.abort();
    };
  }, []);

  // Load messages when agent is selected
  useEffect(() => {
    if (agent.selectedAgent && conversationManager) {
      // Get all messages for this agent
      const agentInteractions = conversationManager.getInteractionsByAgent(
        agent.selectedAgent.id
      );
      const messageHistory = agentInteractions
        .filter(
          (interaction) =>
            interaction.type === InteractionType.MESSAGE &&
            (interaction as Message).content !== "" &&
            // either the message is a user message or an assistant message with no target agent id, i.e. to the user
            ((interaction as Message).role == MessageRole.USER ||
              ((interaction as Message).role == MessageRole.ASSISTANT &&
                (interaction as Message).sourceAgentId == agent.selectedAgent!.id))
        )
        .sort((a, b) => a.createdAt - b.createdAt) as Message[];

      const agentThreads = conversationManager.getThreadsByAgent(
        agent.selectedAgent?.id as string
      );
      const agentThreadsInteractions = agentThreads
        .flatMap((thread) => thread.interactions)
        .sort((a, b) => a.createdAt - b.createdAt);

      setMessages(messageHistory);
      setInteractionHistory(agentThreadsInteractions);
    } else {
      setMessages([]);
      setInteractionHistory([]);
    }
  }, [agent.selectedAgent, conversationManager]);

  // Memoize message filtering
  const { messages: memoizedMessages, interactionHistory: memoizedInteractionHistory } = useMemo(() => {
    if (!agent.selectedAgent || !conversationManager) {
      return { messages: [], interactionHistory: [] };
    }

    const agentInteractions = conversationManager.getInteractionsByAgent(
      agent.selectedAgent.id
    );
    
    const messageHistory = agentInteractions
      .filter(
        (interaction) =>
          interaction.type === InteractionType.MESSAGE &&
          (interaction as Message).content !== "" &&
          // either the message is a user message or an assistant message with no target agent id, i.e. to the user
          ((interaction as Message).role == MessageRole.USER ||
            ((interaction as Message).role == MessageRole.ASSISTANT &&
              (interaction as Message).sourceAgentId == agent.selectedAgent!.id))
      )
      .sort((a, b) => a.createdAt - b.createdAt) as Message[];

    const agentThreads = conversationManager.getThreadsByAgent(
      agent.selectedAgent.id
    );
    
    const agentThreadsInteractions = agentThreads
      .flatMap((thread) => thread.interactions)
      .sort((a, b) => a.createdAt - b.createdAt);

    return { 
      messages: messageHistory, 
      interactionHistory: agentThreadsInteractions 
    };
  }, [agent.selectedAgent, conversationManager]);

  // Debounce state updates
  const debouncedSetMessages = useMemo(
    () => debounce(setMessages, 300, { leading: true, trailing: true }),
    []
  );

  const debouncedSetInteractionHistory = useMemo(
    () => debounce(setInteractionHistory, 300, { leading: true, trailing: true }),
    []
  );

  useEffect(() => {
    debouncedSetMessages(memoizedMessages);
    debouncedSetInteractionHistory(memoizedInteractionHistory);
    
    return () => {
      debouncedSetMessages.cancel();
      debouncedSetInteractionHistory.cancel();
    };
  }, [memoizedMessages, memoizedInteractionHistory, debouncedSetMessages, debouncedSetInteractionHistory]);

  const handleAddAgent = async () => {
    if (!agentManager) {
      toast({
        title: "Error",
        description: "Agent manager not initialized",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the agent - AgentManager will handle chain creation internally
      await agentManager.createAgent({
        name: `Agent ${agentManager.getAllAgents().length + 1}`,
        description: "New Agent Description",
        chainType: agentManager.getAvailableChainTypes()[0],
        modelName: agentManager.getAvailableModels()[0].name,
        toolIds: [],
        linkedAgentIds: [],
      });
      toast({
        title: "Success",
        description: "New agent created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create new agent",
        variant: "destructive",
      });
    }
  };

  const handleSend = async (message: string) => {
    if (!agent.selectedAgent || !conversationManager) {
      toast({
        title: "Error",
        description: "Please select an agent first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a new thread for this message
      const threadId = await conversationManager.createThread(
        agent.selectedAgent.id
      );

      // Create and add user message immediately
      const userMessage: Message = {
        id: crypto.randomUUID(),
        threadId,
        type: InteractionType.MESSAGE,
        role: MessageRole.USER,
        content: message,
        targetAgentId: agent.selectedAgent.id,
        status: InteractionStatus.PENDING,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Clear previous statuses
      ui.clearWorkingStatus();

      setMessages((prev) => (isMounted ? [...prev, userMessage] : prev));
      setInput(""); // Clear input immediately after showing message

      // Start processing
      ui.setWorking(true);
      ui.setWorkingStatus("Processing message...");

      // Send message through conversation manager
      await conversationManager.handleUserMessage(
        agent.selectedAgent.id,
        threadId,
        message
      );

      // Update messages with the agent's response
      const thread = conversationManager.getThread(threadId);
      if (thread && isMounted) {
        const agentMessages = thread.messages.filter(
          (m) => m.role === MessageRole.ASSISTANT &&
            m.sourceAgentId == agent.selectedAgent!.id
        );
        setMessages((prev) => [...prev, ...agentMessages]);

        const agentThreads = conversationManager.getThreadsByAgent(
          agent.selectedAgent?.id as string
        );
        const agentThreadsInteractions = agentThreads.flatMap(thread => thread.interactions)
          .sort((a, b) => a.createdAt - b.createdAt);
        setInteractionHistory(agentThreadsInteractions);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      ui.setWorking(false);
      ui.setWorkingStatus("");
    }
  };

  if (ui.isLoading || !agentManager || !conversationManager) {
    return (
      <LoadingState
        message="Initializing managers..."
        className="min-h-screen"
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden max-w-[calc(100vw-15rem)]">
      <div className="w-80 p-4 border-r flex flex-col gap-4 overflow-hidden max-w-[15rem]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agents</h2>
          <Button
            onClick={handleAddAgent}
            size="icon"
            variant="outline"
            disabled={ui.isLoading}
          >
            {ui.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        <LoadingWrapper
          isLoading={ui.isLoading}
          message="Loading agents..."
          className="flex-1"
        >
          <div className="flex flex-col gap-2 overflow-auto">
            {agentManager.getAllAgents().map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                isSelected={a.id === agent.selectedAgent?.id}
                onSelect={() => {
                  agent.setSelectedAgent(a);
                }}
                onDelete={() => {
                  agentManager.deleteAgent(a.id);
                }}
              />
            ))}
          </div>
        </LoadingWrapper>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-[calc(100vw-15rem)]">
        {agent.selectedAgent ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <ErrorBoundary>
                <ChatInterface
                  interfaceMessages={messages}
                  fullInteractionHistory={interactionHistory}
                  onSendMessage={handleSend}
                  isWorking={ui.isWorking}
                  workingStatus={ui.workingStatus}
                  input={input}
                  setInput={setInput}
                  agentManager={agentManager}
                  />
              </ErrorBoundary>
            </div>
              <AgentConfigSidebar
                agent={agent.selectedAgent}
                errors={ui.errors}
                agentManager={agentManager}
              />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select an agent to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
