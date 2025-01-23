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
import { UserMappedConnector, ModelOption } from "@/lib/types";

export default function PlaygroundPage() {
  const [agentManager, setAgentManager] = useState<AgentManager | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [linkedAgentIds, setLinkedAgentIds] = useState<Set<UUID>>(new Set()); 
  const [, setConnectorManager] = useState<ConnectorManager | null>(null);
  const [connectors, setConnectors] = useState<UserMappedConnector[]>([]);
  const [selectedConnectors, setSelectedConnectors] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<ModelOption>(modelOptions[0]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [workingStatus, setWorkingStatus] = useState<string>("");
  const [, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    initializeConnectorsAndAgents();
  }, []);
  
  const initializeConnectorsAndAgents = async () => {
    try {
      setLoading(true);
      const manager = await ConnectorManager.getInstance();
      setConnectorManager(manager);
      const fetchedConnectors = await manager.getConnectors();
      setConnectors(fetchedConnectors);
      const agentManager = await AgentManager.getInstance();
      setAgentManager(agentManager);
      loadAgents(agentManager);
      setAgents(agentManager.agents);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Initialization failed");
    } finally {
      setLoading(false);
    }
  };

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
      setMessages([]);
      setLinkedAgentIds(new Set());
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    try {
      setSelectedAgent(agent);
      setSelectedModel(agent.selectedModel);
      setSelectedConnectors(agent.selectedTools);
      setLinkedAgentIds(agent.linkedAgentIds);
      setSystemPrompt(agent.systemPrompt);
      setMessages(agent.messages);
    } catch (error) {
      console.error('Error selecting agent:', error);
      toast({
        title: "Error",
        description: "Failed to load agent configuration",
        variant: "destructive"
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
      selectedAgent.setTools(selectedConnectors);
      selectedAgent.setLinkedAgentIds(linkedAgentIds);
      selectedAgent.setSystemPrompt(systemPrompt);
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

  const handleToggleConnector = (connector: UserMappedConnector) => {
    setSelectedConnectors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(connector.connectorName)) {
        newSet.delete(connector.connectorName);
      } else {
        newSet.add(connector.connectorName);
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
    if (!selectedAgent) return;
    selectedAgent.messages = [];
    setMessages([]);
    saveAgent(selectedAgent);
    toast({
      title: "Messages cleared",
      description: "All messages have been cleared.",
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) {
      toast({
        title: "Cannot send message",
        description: "Please ensure an agent is selected and message is not empty.",
        variant: "destructive"
      });
      return;
    }

    const userMessage = { role: "user", content: input };
    selectedAgent.addMessage(userMessage);
    setMessages([...selectedAgent.messages]);
    setInput("");
    
    setIsWorking(true);
    setWorkingStatus("Thinking...");

    try {
      const response = await agentManager?.kickOffMessaging(selectedAgent);

      if (response && "message" in response) {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        });
        selectedAgent.addMessage({
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request.",
        });
        setMessages([...selectedAgent.messages]);
        return;
      }

      if (response && "role" in response && "content" in response) {
        selectedAgent.addMessage({
          role: response.role,
          content: response.content,
        });
        setMessages([...selectedAgent.messages]);
        saveAgent(selectedAgent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      selectedAgent.addMessage({
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request.",
      });
      setMessages([...selectedAgent.messages]);
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

  const handleModelChange = (model: ModelOption) => {
    setSelectedModel(model);
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
                      key={agent.agentName}
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
            <div className="flex gap-6 h-full max-h-full">
              <AgentConfigSidebar
                selectedAgent={selectedAgent}
                agents={agents}
                selectedModel={selectedModel}
                setSelectedModel={handleModelChange}
                modelOptions={modelOptions}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                activatedConnectors={connectors.filter(c => c.isConnected)}
                selectedConnectors={selectedConnectors}
                handleToggleConnector={handleToggleConnector}
                linkedAgentIds={linkedAgentIds}
                handleToggleLinkedAgent={handleToggleLinkedAgent}
                onUpdateAgent={handleUpdateAgent}
                onAgentNameChange={(name) => {
                  if (selectedAgent) {
                    selectedAgent.agentName = name;
                    setAgents([...agents]);
                  }
                }}
                onAgentDescriptionChange={(description) => {
                  if (selectedAgent) {
                    const updatedAgent = { ...selectedAgent, agentDescription: description };
                    Object.assign(selectedAgent, updatedAgent);
                    setAgents([...agents]);
                  }
                }}
              />
              <ChatInterface
                selectedAgent={selectedAgent}
                messages={messages}
                input={input}
                setInput={setInput}
                isWorking={isWorking}
                workingStatus={workingStatus}
                onSend={handleSend}
                onClearMessages={handleClearMessages}
                onBack={() => setSelectedAgent(null)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
