"use client";

import { useEffect, useState } from "react";
import { AgentManager, Agent, modelOptions } from "@/lib/agent-manager";
import { useToast } from "@/hooks/use-toast";
import { UUID } from "crypto";
import { AgentCard } from "./components/agent-card";
import { AgentConfigSidebar } from "./components/agent-config-sidebar";
import { ChatInterface } from "./components/chat-interface";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { AgentError } from "@/lib/error-tracker";
import { UserActivationMappedConnector, Thread, MessageType, Message } from "@/lib/types";

export default function PlaygroundPage() {
  const [agentManager, setAgentManager] = useState<AgentManager | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [, setSystemPrompt] = useState("");
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [historicMessages, setHistoricMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [workingStatus, setWorkingStatus] = useState<string>("");
  const [errors, setErrors] = useState<AgentError[]>([]);
  const [, setSelectedConnectors] = useState<Set<string>>(new Set());
  const [, setLinkedAgentIds] = useState<Set<UUID>>(new Set());
  const [connectors, setConnectors] = useState<UserActivationMappedConnector[]>([]);

  const { toast } = useToast();


  // Initialize Connectors and Agents Managers
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        // Then, initialize the Agent Manager
        const manager = await AgentManager.getInstance();
        setAgentManager(manager);

        // First, initialize the Connector Manager
        const connectors = await manager.getConnectors();
        setConnectors(connectors);

        // Load agents after both managers are initialized
        loadAgents(manager);
      } catch (error) {
        console.error("Failed to initialize managers:", error);
        toast({
          title: "Error",
          description: "Failed to initialize application managers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeManagers();
  }, []);
  

  // Configure agent when selected
  useEffect(() => {
    if (!agentManager) return;
    
    if (selectedAgent) {
      try {
        const agentErrors = agentManager.getAgentErrors(selectedAgent.id);
        setErrors(agentErrors as AgentError[]);
        setSelectedConnectors(selectedAgent.selectedTools);
        setLinkedAgentIds(selectedAgent.linkedAgentIds);
        
        // Create a new thread when selecting an agent
        const thread = agentManager.createThread();
        if (thread) {
          setCurrentThread(thread);
        }

        // Load the agent's previous messages
        const messages = agentManager.getAllMessages(selectedAgent.id);
        setHistoricMessages(messages);

      } catch (error) {
        console.error("Error setting up agent:", error);
        toast({
          title: "Error",
          description: "Failed to set up agent",
          variant: "destructive",
        });
      }
    } else {
      setErrors([]);
      setSelectedConnectors(new Set());
      setLinkedAgentIds(new Set());
      setCurrentThread(null);
    }
  }, [agentManager, selectedAgent]);

  // Load agents and threads from localStorage on mount
  useEffect(() => {
    const savedAgents = localStorage.getItem('agents');
    if (savedAgents) {
      localStorage.removeItem('agents'); // Clean up old format
    }

    if (agentManager) {
      loadAgents(agentManager);
    }

    const savedThreads = localStorage.getItem('threads');
    if (savedThreads) {
      const parsedThreads = JSON.parse(savedThreads);
      Object.entries(parsedThreads).forEach(([threadId, threadData]) => {
        if (threadId && agentManager) {
          const thread = agentManager.createThread();
          if (thread) {
            // Ensure message content is always a string
            const safeThreadData = {
              ...threadData as Thread,
              messages: (threadData as Thread).messages?.map((msg: Message) => ({
                ...msg,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)
              })) || []
            };
            Object.assign(thread, safeThreadData);
            setCurrentThread(thread);
          }
        }
      });
    }
  }, [agentManager]);

  // Save agents to localStorage whenever they change
  useEffect(() => {
    if (agents.length > 0) {
      // Save each agent individually instead of as a collection
      agents.forEach(agent => {
        localStorage.setItem(`agent-${agent.id}`, JSON.stringify(agent));
      });
      // Remove the collective agents storage
      localStorage.removeItem('agents');
    }
  }, [agents]);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (currentThread) {
      const threads = JSON.parse(localStorage.getItem('threads') || '{}');
      threads[selectedAgent?.id || ''] = currentThread;
      localStorage.setItem('threads', JSON.stringify(threads));
    }
  }, [currentThread, selectedAgent]);

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
      agentManager.addAgent(newAgent);
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
    localStorage.removeItem(`agent-${agent.id}`); // Change from agent.agentName to agent.id
    setAgents(agents.filter((a) => a !== agent));
    if (selectedAgent === agent) {
      setSelectedAgent(null);
      setCurrentThread(null);
    }
  };

  const handleSelectAgent = async (agent: Agent) => {
    if (!agentManager) return;
    
    try {
      setSelectedAgent(agent);
      setSelectedModel(agent.selectedModel);
      setSystemPrompt(agent.systemPrompt);
      setSelectedConnectors(agent.selectedTools);
      setLinkedAgentIds(agent.linkedAgentIds);
      setHistoricMessages(agentManager.getAllMessages(agent.id));
      
      const agentErrors = agentManager.getAgentErrors(agent.id);
      setErrors(agentErrors as AgentError[]);
      
      // Create a new thread when selecting an agent
      const thread = agentManager.createThread();
      setCurrentThread(thread);
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
      // selectedAgent.selectModel(selectedModel);
      // selectedAgent.setSystemPrompt(systemPrompt);
      // selectedAgent.setTools(selectedConnectors);
      // selectedAgent.setLinkedAgentIds(linkedAgentIds);
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

  const handleClearMessages = () => {
    if (!agentManager || !selectedAgent || !currentThread) return;
    
    // get a list of unique threadIds
    const threadIds = [...new Set(historicMessages.map(message => message.threadId as string))];

    // Clear thread from agent manager
    agentManager.clearThread(currentThread.id);
    setCurrentThread(null);
    setHistoricMessages([]);
    
    // Clear thread from localStorage
    const threads = JSON.parse(localStorage.getItem('threads') || '{}');
    for (const threadId of threadIds) {
      agentManager.deleteThread(threadId as UUID);
      delete threads[threadId];
    }
    localStorage.setItem('threads', JSON.stringify(threads));
    
    // Create new thread
    const newThread = agentManager.createThread();
    setCurrentThread(newThread);
  };

  const handleSend = async (input: string) => {
    if (!selectedAgent || !currentThread || !agentManager) return;

    try {
      setIsWorking(true);
      setWorkingStatus("Processing message...");

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

      // Get the chain type from agent's configuration or default to conversation
      const chainType = selectedAgent.chainConfig?.type?.toLowerCase() || "conversation";

      // Execute conversation
      const result = await agentManager.kickOffConversation(selectedAgent, chainType, currentThread.id);

      if (result instanceof AgentError) {
        console.error("Error:", result);
        handleError(result.message, result.context ? JSON.stringify(result.context) : undefined);
      } else {

        // Force update the thread state to trigger a re-render
        const updatedThread = agentManager.getThread(currentThread.id);
        if (updatedThread) {
          setCurrentThread({ ...updatedThread });
        }

        // Force a re-render of the agents statec
        setAgents([...agents]);
      }

      // Save updated thread to localStorage
      const threads = JSON.parse(localStorage.getItem('threads') || '{}');
      threads[currentThread.id] = currentThread;
      localStorage.setItem('threads', JSON.stringify(threads));

    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        handleError(error.message);
      }
    } finally {
      setIsWorking(false);
      setWorkingStatus("");
      setInput("");
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

  const loadAgents = (manager: AgentManager) => {
    try {
      // Clear existing agents first
      manager.agents = [];
      
      // Iterate through localStorage to find agent entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('agent-')) {
          const agentData = localStorage.getItem(key);
          if (agentData) {
            try {
              const agentJSON = JSON.parse(agentData);
              const agent = Agent.fromJSON(agentJSON);
              manager.addAgent(agent);
            } catch (parseError) {
              console.error('Error parsing agent data:', parseError);
              // Remove corrupted data
              localStorage.removeItem(key);
            }
          }
        }
      }

      // Update the agents state with the loaded agents
      setAgents([...manager.agents]);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error",
        description: "Failed to load saved agents",
        variant: "destructive"
      });
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

  if (loading || !agentManager) {
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
                agent={selectedAgent}
                connectors={connectors}
                linkedAgents={agents.filter(a => a.id !== selectedAgent.id)}
                onSave={handleUpdateAgent}
              />
              <ChatInterface
                selectedAgent={selectedAgent}
                currentThread={currentThread}
                historicMessages={historicMessages}
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
