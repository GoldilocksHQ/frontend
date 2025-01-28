"use client";

import { useEffect, useState } from "react";
import { AgentManager, Agent } from "@/lib/agent-manager";
import { useToast } from "@/hooks/use-toast";
import { UUID } from "crypto";
import { AgentCard } from "./components/agent-card";
import { AgentConfigSidebar } from "./components/agent-config-sidebar";
import { ChatInterface } from "./components/chat-interface";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { UserActivationMappedConnector, MessageType } from "@/lib/types";
import { useStores } from "@/lib/stores";
import { LoadingState, LoadingWrapper } from "@/app/components/common/loading-state";
import { AgentError } from "@/lib/agent-manager";

export default function PlaygroundPage() {
  const { ui, agent, thread } = useStores();
  const [agentManager, setAgentManager] = useState<AgentManager | null>(null);
  const [connectors, setConnectors] = useState<UserActivationMappedConnector[]>([]);
  const [input, setInput] = useState("");

  const { toast } = useToast();

  // Initialize Connectors and Agents Managers
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        ui.setLoading(true);
        
        // Initialize the Agent Manager
        const manager = await AgentManager.getInstance();
        setAgentManager(manager);

        // Initialize the Connector Manager and load connectors
        const loadedConnectors = await manager.getConnectors();
        setConnectors(loadedConnectors);

        // Create a new thread if none exists
        if (!thread.currentThread) {
          const newThread = manager.createThread();
          thread.setCurrentThread(newThread);
        }

        // Add existing agents to the manager
        agent.agents.forEach(savedAgent => {
          try {
            manager.addAgent(savedAgent);
          } catch (error) {
            console.error(`Error adding agent to manager:`, error);
            if (error instanceof AgentError) {
              console.warn(`Invalid agent data:`, error.message);
              // Remove invalid agent from store
              agent.removeAgent(savedAgent.id);
            }
            toast({
              title: "Warning",
              description: `Failed to load agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
              variant: "destructive",
            });
          }
        });
      } catch (error) {
        console.error("Failed to initialize managers:", error);
        toast({
          title: "Error",
          description: "Failed to initialize application managers",
          variant: "destructive",
        });
      } finally {
        ui.setLoading(false);
      }
    };

    initializeManagers();
  }, []);

  const handleAddAgent = async () => {
    if (!agentManager) {
      toast({
        title: "Error",
        description: "Agent manager not initialized",
        variant: "destructive"
      });
      return;
    }

    try {
      const newAgent = new Agent(
        crypto.randomUUID() as UUID,
        `Agent ${agent.agents.length + 1}`,
        "New Agent Description",
        agent.selectedModel,
        "Default system prompt",
        new Set<string>(),
        new Set<UUID>(),
      );
      
      agentManager.addAgent(newAgent);
      agent.addAgent(newAgent);
      
      toast({
        title: "Success",
        description: "New agent created successfully.",
      });
    } catch (error) {
      console.error('Error adding agent:', error);
      toast({
        title: "Error",
        description: "Failed to create new agent",
        variant: "destructive"
      });
    }
  };

  const handleSend = async (message: string) => {
    if (!agent.selectedAgent || !thread.currentThread || !agentManager) {
      toast({
        title: "Error",
        description: "Please select an agent first",
        variant: "destructive"
      });
      return;
    }

    try {
      ui.setWorking(true);
      ui.setWorkingStatus("Processing message...");

      // Add user message to thread
      const userMessage = agentManager.addMessageToThread({
        threadId: thread.currentThread.id,
        role: "user",
        content: message,
        messageType: MessageType.USER_TO_AGENT,
        targetAgentId: agent.selectedAgent.id,
        timestamp: Date.now(),
        metadata: {}
      });
      
      // Update UI with user message
      thread.addMessage(userMessage);

      // Get the chain type from agent's configuration or default to conversation
      const chainType = agent.selectedAgent.chainConfig?.type?.toLowerCase() || "conversation";

      // Execute conversation
      const result = await agentManager.kickOffConversation(
        agent.selectedAgent, 
        chainType, 
        thread.currentThread.id as UUID
      );

      if (result instanceof Error) {
        console.error("Error:", result);
        handleError(result.message);
      } else {
        // Add agent's response to the thread store
        thread.addMessage(result);
      }

      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        handleError(error.message);
      }
    } finally {
      ui.setWorking(false);
      ui.setWorkingStatus("");
    }
  };

  const handleError = (error: string, context?: string) => {
    if (agentManager && agent.selectedAgent) {
      agentManager.recordAgentError(agent.selectedAgent.id, error, context);
      const agentErrors = agentManager.getAgentErrors(agent.selectedAgent.id);
      ui.setErrors(agentErrors);
    }
  };

  if (ui.isLoading || !agentManager) {
    return (
      <LoadingState 
        message="Initializing agents and connectors..." 
        className="min-h-screen"
      />
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-80 p-4 border-r flex flex-col gap-4">
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
            {agent.agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                isSelected={a.id === agent.selectedAgent?.id}
                onSelect={() => {
                  agent.setSelectedAgent(a);
                  // Load or create thread for this agent
                  if (agentManager) {
                    const existingThread = thread.getThreadFromHistory(a.id);
                    if (existingThread) {
                      // This will also load the messages
                      thread.setCurrentThread(existingThread);
                    } else {
                      const newThread = agentManager.createThread();
                      thread.setCurrentThread(newThread);
                      thread.addThreadToHistory(newThread);
                    }
                  }
                }}
                onDelete={() => agent.removeAgent(a.id)}
              />
            ))}
          </div>
        </LoadingWrapper>
      </div>

      <div className="flex-1 flex">
        {agent.selectedAgent ? (
          <>
            <div className="flex-1 flex flex-col">
              <ChatInterface
                messages={thread.messages}
                onSendMessage={handleSend}
                input={input}
                setInput={setInput}
                isWorking={ui.isWorking}
                workingStatus={ui.workingStatus}
              />
            </div>
            <AgentConfigSidebar
              agent={agent.selectedAgent}
              errors={ui.errors}
              connectors={connectors}
              onUpdate={() => agent.updateAgent(agent.selectedAgent!)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select an agent to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
