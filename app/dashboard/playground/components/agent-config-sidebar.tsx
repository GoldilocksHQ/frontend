import { useState } from "react";
import { Info } from "lucide-react";
import { Agent } from "@/lib/agent-manager";
import { UserActivationMappedConnector, ModelOption, ChainType } from "@/lib/types";
import { UUID } from "crypto";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

interface AgentConfigSidebarProps {
  agents: Agent[];
  selectedAgent: Agent;
  selectedModel: ModelOption;
  handleModelChange: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  modelOptions: ModelOption[];
  handleUpdateAgent: () => void;
  isUpdating: boolean;
  connectors: UserActivationMappedConnector[];
  selectedConnectors: Set<string>;
  handleToggleConnector: (connector: UserActivationMappedConnector) => void;
  linkedAgentIds: Set<UUID>;
  handleToggleLinkedAgent: (agentId: UUID) => void;
  selectedChainType: ChainType;
  setSelectedChainType: (chainType: ChainType) => void;
}

export function AgentConfigSidebar({
  agents,
  selectedAgent,
  selectedModel,
  handleModelChange,
  systemPrompt,
  setSystemPrompt,
  modelOptions,
  handleUpdateAgent,
  isUpdating,
  connectors,
  selectedConnectors,
  handleToggleConnector,
  linkedAgentIds,
  handleToggleLinkedAgent,
  selectedChainType,
  setSelectedChainType,
}: AgentConfigSidebarProps) {
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [tempDescription, setTempDescription] = useState(selectedAgent.agentDescription);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleDescriptionUpdate = () => {
    selectedAgent.agentDescription = tempDescription;
    setHasUnsavedChanges(true);
    setIsDescriptionDialogOpen(false);
  };

  const handleSaveChanges = () => {
    handleUpdateAgent();
    setHasUnsavedChanges(false);
  };

  return (
    <Card className="w-80 flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Agent Name and Description Section */}
          <div className="space-y-2">
            <Label>Agent Name</Label>
            <div className="flex items-center gap-2">
              <Input 
                value={selectedAgent.agentName}
                onChange={(e) => {
                  selectedAgent.agentName = e.target.value;
                  setHasUnsavedChanges(true);
                }}
                className="flex-1"
              />
              <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agent Description</DialogTitle>
                    <DialogDescription>Update the description for {selectedAgent.agentName}</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsDescriptionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDescriptionUpdate}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Model Selection Section */}
          <div className="space-y-2">
            <Label>Model</Label>
            <Select defaultValue="gpt-4o-mini" value={selectedModel.name} onValueChange={(value) => {
              handleModelChange(value);
              setHasUnsavedChanges(true);
            }}>
              <SelectTrigger>
                <SelectValue>{selectedModel.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chain Type Selection */}
          <div className="space-y-2">
            <Label>Chain Type</Label>
            <Select 
              value={selectedChainType} 
              onValueChange={(value) => {
                setSelectedChainType(value as ChainType);
                setHasUnsavedChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue>{selectedChainType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(ChainType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt Section */}
          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Tools Section */}
          <div className="space-y-2">
            <Label>Tools</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {connectors.map((connector) => (
                <div
                  key={connector.name}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                    selectedConnectors.has(connector.name) ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    handleToggleConnector(connector);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <Image 
                    src={`/logos/${connector.name}.svg`}
                    alt={connector.displayName}
                    width={16}
                    height={16}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm">{connector.displayName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Agents Section */}
          <div className="space-y-2">
            <Label>Linked Agents</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {agents
                .filter((agent) => agent.id !== selectedAgent.id)
                .map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                      linkedAgentIds.has(agent.id) ? "bg-accent" : ""
                    }`}
                    onClick={() => {
                      handleToggleLinkedAgent(agent.id);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium">
                        {agent.agentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">{agent.agentName}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Save Changes Button */}
      <div className="p-4 border-t mt-auto">
        <Button
          className="w-full"
          onClick={handleSaveChanges}
          disabled={isUpdating || !hasUnsavedChanges}
        >
          {isUpdating ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "No Changes"}
        </Button>
      </div>
    </Card>
  );
} 