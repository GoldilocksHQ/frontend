import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Agent } from "@/lib/agent-manager";
import { UserMappedConnector, ModelOption } from "@/lib/types";
import Image from "next/image";
import { UUID } from "crypto";

interface AgentConfigSidebarProps {
  selectedAgent: Agent;
  agents: Agent[];
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;
  modelOptions: ModelOption[];
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  activatedConnectors: UserMappedConnector[];
  selectedConnectors: Set<string>;
  handleToggleConnector: (connector: UserMappedConnector) => void;
  linkedAgentIds: Set<UUID>;
  handleToggleLinkedAgent: (agentId: UUID) => void;
  onUpdateAgent: () => void;
  onAgentNameChange: (name: string) => void;
  onAgentDescriptionChange: (description: string) => void;
}

export function AgentConfigSidebar({
  selectedAgent,
  agents,
  selectedModel,
  setSelectedModel,
  modelOptions,
  systemPrompt,
  setSystemPrompt,
  activatedConnectors,
  selectedConnectors,
  handleToggleConnector,
  linkedAgentIds,
  handleToggleLinkedAgent,
  onUpdateAgent,
  onAgentNameChange,
  onAgentDescriptionChange,
}: AgentConfigSidebarProps) {
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [customToolDialogOpen, setCustomToolDialogOpen] = useState(false);
  const [customToolSchema, setCustomToolSchema] = useState("");

  const handleCustomToolSubmit = () => {
    try {
      if (!customToolSchema.trim()) {
        // TODO: Add toast notification
        return;
      }
      const schema = JSON.parse(customToolSchema);
      console.log('Custom tool schema:', schema);
      setCustomToolDialogOpen(false);
      setCustomToolSchema("");
    } catch (error) {
      console.error('Error adding custom tool:', error);
    }
  };

  return (
    <Card className="w-80 flex-none flex flex-col">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Agent Configuration</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 px-4 -mx-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Agent Name</label>
              <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    Add Description
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agent Description</DialogTitle>
                    <DialogDescription>Add a description for your agent.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Textarea
                      value={selectedAgent?.agentDescription || ""}
                      onChange={(e) => onAgentDescriptionChange(e.target.value)}
                      placeholder="Enter a description for your agent..."
                      className="h-[150px]"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setDescriptionDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <input
              type="text"
              value={selectedAgent?.agentName || ""}
              onChange={(e) => onAgentNameChange(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
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
            <label className="text-sm font-medium mb-2 block">System Prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="h-32"
            />
          </div>

          <div className="flex-1 min-h-0">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium block">Active Connectors</label>
              <Dialog open={customToolDialogOpen} onOpenChange={setCustomToolDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    Add Custom Tool
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Tool Function</DialogTitle>
                    <DialogDescription>
                      Enter the JSON schema for your custom tool function.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Textarea
                      value={customToolSchema}
                      onChange={(e) => setCustomToolSchema(e.target.value)}
                      placeholder='{
  "name": "my_function",
  "description": "Description of what the function does",
  "parameters": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Description of param1"
      }
    },
    "required": ["param1"]
  }
}'
                      className="h-[300px] font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setCustomToolDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCustomToolSubmit}>Add Tool</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[calc(100%-2rem)]">
              <div className="space-y-2 pr-4">
                {activatedConnectors.map((connector) => (
                  <button
                    key={connector.connectorName}
                    onClick={() => handleToggleConnector(connector)}
                    className={`w-full flex items-center p-2 rounded-lg transition-colors
                      ${
                        selectedConnectors.has(connector.connectorName)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                  >
                    <Image 
                      src={`/logos/${connector.connectorName}.svg`}
                      alt={connector.connectorDisplayName}
                      width={15}
                      height={15}
                      className="mr-2"
                    />
                    <span className="text-sm truncate">
                      {connector.connectorDisplayName}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium block">Connected Agents</label>
            </div>
            <ScrollArea className="h-[120px]">
              <div className="space-y-2 pr-4">
                {agents.filter(a => a !== selectedAgent).map((agent) => (
                  <button
                    key={agent.agentName}
                    onClick={() => handleToggleLinkedAgent(agent.id)}
                    className={`w-full flex items-center p-2 rounded-lg transition-colors
                      ${
                        linkedAgentIds.has(agent.id)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                  >
                    <span className="text-sm truncate">{agent.agentName}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t sticky bottom-0 bg-card">
          <Button className="w-full" onClick={onUpdateAgent}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 