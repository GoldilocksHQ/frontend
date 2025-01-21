"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  // CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  AgentManager,
  Agent,
  type ModelOption,
  modelOptions,
} from "@/lib/agent-manager";
import { UserMappedConnector } from "@/lib/types";
import { ConnectorManager } from "@/lib/connector-manager";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [connectors, setConnectors] = useState<UserMappedConnector[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    modelOptions[0]
  );
  const [selectedConnectors, setSelectedConnectors] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [, setError] = useState<string | null>(null);
  const [connectorManager, setConnectorManager] = useState<ConnectorManager | null>(null);
  const [agentManager, setAgentManager] = useState<AgentManager | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  

  useEffect(() => {
    initializeConnectorsAndAgents();
  }, []);
  
    useEffect(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, [messages]);  
  
  const initializeConnectorsAndAgents = async () => {
    try {
      setLoading(true);
      const manager = await ConnectorManager.getInstance();
      setConnectorManager(manager);
      const fetchedConnectors = await manager.getConnectors();
      setConnectors(fetchedConnectors);
      const agentMgr = await AgentManager.getInstance();
      setAgentManager(agentMgr);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Initialization failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!agentManager) return;

    const newAgent = new Agent(
      `Agent ${agents.length + 1}`,
      "New Agent Description",
      selectedModel,
      "Default system prompt",
      new Set()
    );
    agentManager.createAgent(newAgent);
    setAgents([...agents, newAgent]);
  };

  const handleDeleteAgent = (agent: Agent) => {
    if (!agentManager) return;
    agentManager.deleteAgent(agent);
    setAgents(agents.filter((a) => a !== agent));
    if (selectedAgent === agent) {
      setSelectedAgent(null);
      setMessages([]);
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedModel(agent.selectedModel);
    setSelectedConnectors(agent.selectedTools);
    setSystemPrompt(agent.systemPrompt);
    setMessages([]);
  };

  const handleUpdateAgent = () => {
    if (!selectedAgent) return;
    selectedAgent.selectModel(selectedModel);
    selectedAgent.setTools(selectedConnectors);
    selectedAgent.setSystemPrompt(systemPrompt);
    setAgents([...agents]); // Trigger re-render
    toast({
      title: "Configuration saved",
      description: "Agent settings have been updated successfully.",
    });
  };

  const handleToggleConnector = (connectorId: string) => {
    setSelectedConnectors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(connectorId)) {
        newSet.delete(connectorId);
      } else {
        newSet.add(connectorId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !agentManager || !selectedAgent) return;

    const userMessage = { role: "user", content: input };
    selectedAgent.addMessage(userMessage);

    setMessages(selectedAgent.messages);
    setInput("");
    try {
      const response = await agentManager?.chat(selectedAgent!);
      if (response) {
        selectedAgent.addMessage({
          role: response.role,
          content: response.content,
        });
        setMessages(selectedAgent.messages);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    }
  };

  const activatedConnectors = connectors.filter((c) => c.is_connected);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {!selectedAgent ? (
        // Agent Canvas View
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
            <Button onClick={handleAddAgent}>
              <Plus className="mr-2 h-4 w-4" /> Add Agent
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <TooltipProvider key={agent.agentName}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="cursor-pointer"
                      onClick={() => handleSelectAgent(agent)}
                    >
                      <Card className="hover:bg-accent transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-lg font-medium">
                            {agent.agentName}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAgent(agent);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Model: {agent.selectedModel.label}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {/* ... existing tooltip content ... */}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      ) : (
        // Chat Interface
        <div className="flex gap-4">
          {/* Configuration Sidebar */}
          <Card className="w-64 h-[750px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Model
                  </label>
                  <Select
                    value={selectedModel.value}
                    onValueChange={(value) =>
                      setSelectedModel(
                        modelOptions.find((model) => model.value === value) ||
                          modelOptions[0]
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    System Prompt
                  </label>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="h-32"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Active Connectors
                  </label>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {activatedConnectors.map((connector) => (
                        <button
                          key={connector.id}
                          onClick={() => handleToggleConnector(connector.id)}
                          className={`w-full flex items-center p-2 rounded-lg transition-colors
                            ${
                              selectedConnectors.has(connector.id)
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            }`}
                        >
                          <Image 
                            src={`/logos/${connector.connector_name}.svg`}
                            alt={connector.connector_display_name}
                            width={15}
                            height={15}
                            className="mr-2"
                          />
                          <span className="text-sm truncate">
                            {connector.connector_display_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              {/* Save button aligned with chat input */}
              <div className="mt-4">
                <Button className="w-full" onClick={handleUpdateAgent}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 h-[750px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Chat with {selectedAgent.agentName}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAgent(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col h-full overflow-hidden">
              <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="flex flex-col space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex items-start ${
                          message.role === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {message.role === "user" ? "U" : "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`mx-2 p-3 rounded-lg ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center space-x-2 mt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  onKeyUp={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend}>Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
