"use client";

import { useEffect, useState } from "react";
import { AgentManager, Agent, modelOptions } from "@/lib/agent-manager";
import { ConnectorManager } from "@/lib/connector-manager";
import { useToast } from "@/hooks/use-toast";
import { UUID } from "crypto";
import { AgentCard } from "./components/agent-card";
import { AgentConfigSidebar } from "./components/agent-config-sidebar";
import { ChatInterface } from "./components/chat-interface";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { AgentError } from "@/lib/error-tracker";
import { UserActivationMappedConnector, Thread, ChainType, MessageType } from "@/lib/types";

export default function PlaygroundPage() {
  const [agentManager, setAgentManager] = useState<AgentManager | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [workingStatus, setWorkingStatus] = useState<string>("");
  const [errors, setErrors] = useState<AgentError[]>([]);
  const [selectedConnectors, setSelectedConnectors] = useState<Set<string>>(new Set());
  const [linkedAgentIds, setLinkedAgentIds] = useState<Set<UUID>>(new Set());
  const [connectors, setConnectors] = useState<UserActivationMappedConnector[]>([]);
  const [selectedChainType, setSelectedChainType] = useState<ChainType>(ChainType.CONVERSATION);

  const { toast } = useToast();

  useEffect(() => {
    initializeConnectorsAndAgents();
  }, []);
  
  const initializeConnectorsAndAgents = async () => {
    try {
      setLoading(true);
      const connectorManager = await ConnectorManager.getInstance();
      const fetchedConnectors = await connectorManager.getConnectors();
      setConnectors(fetchedConnectors);
      const agentManager = await AgentManager.getInstance();
      setAgentManager(agentManager);
      loadAgents(agentManager);
      setAgents(agentManager.agents);
    } catch (error) {
      console.error("Failed to initialize agent manager:", error);
      toast({
        title: "Error",
        description: "Failed to initialize agent manager",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentManager && selectedAgent) {
      const agentErrors = agentManager.getAgentErrors(selectedAgent.id);
      setErrors(agentErrors as AgentError[]);
      setSelectedConnectors(selectedAgent.selectedTools);
      setLinkedAgentIds(selectedAgent.linkedAgentIds);
      
      // Create a new thread when selecting an agent
      const thread = agentManager.createThread();
      setCurrentThread(thread);
    } else {
      setErrors([]);
      setSelectedConnectors(new Set());
      setLinkedAgentIds(new Set());
      setCurrentThread(null);
    }
  }, [agentManager, selectedAgent]);

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
        `Agent ${agents.length + 1}`,
        "New Agent Description",
        selectedModel,
        "Default system prompt",
        new Set<string>(),
        new Set<UUID>(),
      );
      await agentManager.createAgent(newAgent);
      saveAgent(newAgent);
      setAgents([...agentManager.agents]);
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

  const handleDeleteAgent = (agent: Agent) => {
    if (!agentManager) return;
    agentManager.deleteAgent(agent);
    localStorage.removeItem(`agent-${agent.agentName}`);
    setAgents(agents.filter((a) => a !== agent));
    if (selectedAgent === agent) {
      setSelectedAgent(null);
      setCurrentThread(null);
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    try {
      setSelectedAgent(agent);
      setSelectedModel(agent.selectedModel);
      setSystemPrompt(agent.systemPrompt);
      setSelectedConnectors(agent.selectedTools);
      setLinkedAgentIds(agent.linkedAgentIds);
      if (agentManager) {
        const agentErrors = agentManager.getAgentErrors(agent.id);
        setErrors(agentErrors as AgentError[]);
        
        // Create a new thread when selecting an agent
        const thread = agentManager.createThread();
        setCurrentThread(thread);
      }
    } catch (error) {
      console.error("Error selecting agent:", error);
      toast({
        title: "Error",
        description: "Failed to load agent configuration",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAgent = () => {
    if (!selectedAgent) {
      toast({
        title: "Error",
        description: "No agent selected",
        variant: "destructive"
      });
      return;
    }

    try {
      selectedAgent.selectModel(selectedModel);
      selectedAgent.setSystemPrompt(systemPrompt);
      selectedAgent.setTools(selectedConnectors);
      selectedAgent.setLinkedAgentIds(linkedAgentIds);
      setAgents([...agents]); // Trigger re-render
      saveAgent(selectedAgent);
      toast({
        title: "Success",
        description: "Agent settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: "Failed to update agent settings",
        variant: "destructive"
      });
    }
  };

  const handleToggleConnector = (connector: UserActivationMappedConnector) => {
    setSelectedConnectors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(connector.name)) {
        newSet.delete(connector.name);
      } else {
        newSet.add(connector.name);
      }
      return newSet;
    });
  };

  const handleToggleLinkedAgent = (agentId: UUID) => {
    setLinkedAgentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const handleClearMessages = () => {
    if (!selectedAgent || !currentThread || !agentManager) return;
    agentManager.clearThread(currentThread.id);
    const newThread = agentManager.createThread();
    setCurrentThread(newThread);
    toast({
      title: "Messages cleared",
      description: "All messages have been cleared.",
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || !currentThread || !agentManager) {
      toast({
        title: "Cannot send message",
        description: "Please ensure an agent is selected and message is not empty.",
        variant: "destructive"
      });
      return;
    }

    setIsWorking(true);
    setWorkingStatus("Thinking...");

    try {
      // Add user message to thread
      agentManager.addMessageToThread({
        threadId: currentThread.id,
        role: "user",
        content: input,
        messageType: MessageType.USER_TO_AGENT,
        targetAgentId: selectedAgent.id,
        timestamp: Date.now(),
        metadata: {}
      });

      // Add message to agent's messages array
      selectedAgent.addMessage({
        role: "user",
        content: input,
        timestamp: Date.now()
      });

      const response = await agentManager.kickOffConversation(
        selectedAgent,
        selectedChainType,
        currentThread.id
      );

      if (response instanceof AgentError) {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        });
        return;
      }

      // Clear input
      setInput("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsWorking(false);
      setWorkingStatus("");
    }
  };

  const saveAgent = (agent: Agent) => {
    try {
      localStorage.setItem(`agent-${agent.id}`, JSON.stringify(agent));
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: "Failed to save agent configuration",
        variant: "destructive"
      });
    }
  };

  const loadAgents = (agentManager: AgentManager) => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('agent-')) {
          const agentData = localStorage.getItem(key);
          if (agentData) {
            try {
              const agentJSON = JSON.parse(agentData);
              agentManager.createAgent(Agent.fromJSON(agentJSON));
            } catch (parseError) {
              console.error('Error parsing agent data:', parseError);
              // Remove corrupted data
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error",
        description: "Failed to load saved agents",
        variant: "destructive"
      });
    }
  };

  const handleModelChange = (value: string) => {
    const model = modelOptions.find(model => model.name === value);
    if (model) {
      setSelectedModel(model);
    }
  };

  const handleError = (error: string, context?: string) => {
    if (agentManager && selectedAgent) {
      agentManager.recordAgentError(selectedAgent.id, error, context);
      const agentErrors = agentManager.getAgentErrors(selectedAgent.id);
      setErrors(agentErrors as AgentError[]);
    }
  };

  const handleClearErrors = () => {
    if (agentManager && selectedAgent) {
      agentManager.clearAgentErrors(selectedAgent.id);
      setErrors([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-8 py-6 overflow-hidden">
          {!selectedAgent ? (
            // Agent Canvas View
            <div className="h-full overflow-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
                  <Button onClick={handleAddAgent}>
                    <Plus className="mr-2 h-4 w-4" /> Add Agent
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onSelect={handleSelectAgent}
                      onDelete={handleDeleteAgent}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Chat Interface
            <div className="flex gap-6 h-full max-h-full overflow-hidden">
              <AgentConfigSidebar
                agents={agents}
                selectedAgent={selectedAgent}
                selectedModel={selectedModel}
                handleModelChange={handleModelChange}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                modelOptions={modelOptions}
                handleUpdateAgent={handleUpdateAgent}
                isUpdating={isWorking}
                connectors={connectors}
                selectedConnectors={selectedConnectors}
                handleToggleConnector={handleToggleConnector}
                linkedAgentIds={linkedAgentIds}
                handleToggleLinkedAgent={handleToggleLinkedAgent}
                selectedChainType={selectedChainType}
                setSelectedChainType={setSelectedChainType}
              />
              <ChatInterface
                selectedAgent={selectedAgent}
                currentThread={currentThread}
                input={input}
                setInput={setInput}
                isWorking={isWorking}
                workingStatus={workingStatus}
                onSend={handleSend}
                onClearMessages={handleClearMessages}
                onBack={() => setSelectedAgent(null)}
                errors={errors}
                onError={handleError}
                onClearErrors={handleClearErrors}
                agentManager={agentManager}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
