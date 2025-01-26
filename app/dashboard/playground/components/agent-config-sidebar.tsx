import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Agent, modelOptions } from "@/lib/agent-manager";
import { UserActivationMappedConnector, ChainType, ModelOption } from "@/lib/types";
import { UUID } from "crypto";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AgentConfigSidebarProps {
  agent: Agent;
  connectors: UserActivationMappedConnector[];
  linkedAgents: Agent[];
  onSave: (agent: Agent) => void;
}

export function AgentConfigSidebar({
  agent,
  connectors,
  linkedAgents,
  onSave,
}: AgentConfigSidebarProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(agent.selectedTools);
  const [linkedAgentIds, setLinkedAgentIds] = useState<Set<UUID>>(agent.linkedAgentIds);
  const [selectedChainType, setSelectedChainType] = useState<ChainType>(
    agent.chainConfig?.type || ChainType.CONVERSATION
  );
  const [selectedModel, setSelectedModel] = useState<ModelOption>(agent.selectedModel);
  const [name, setName] = useState(agent.agentName);
  const [description, setDescription] = useState(agent.agentDescription);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  // Effect to update state when agent changes
  useEffect(() => {
    setSelectedTools(agent.selectedTools);
    setLinkedAgentIds(agent.linkedAgentIds);
    setSelectedChainType(agent.chainConfig?.type || ChainType.CONVERSATION);
    setSelectedModel(agent.selectedModel);
    setName(agent.agentName);
    setDescription(agent.agentDescription);
  }, [agent]);

  const handleSaveChanges = () => {
    agent.editName(name);
    agent.editDescription(description);
    agent.selectModel(selectedModel);
    agent.selectedTools = selectedTools;
    agent.linkedAgentIds = linkedAgentIds;
    agent.chainConfig = {
      ...agent.chainConfig,
      type: selectedChainType,
      model: selectedModel,
      memory: true,
      tools: Array.from(selectedTools)
    };
    
    onSave(agent);
    setHasUnsavedChanges(false);
  };

  return (
    <Card className="w-80 flex flex-col">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Agent Configuration</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Name</Label>
              <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4">
                    <Info className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agent Description</DialogTitle>
                    <DialogDescription>
                      Describe the purpose and capabilities of this agent.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Agent description"
                    className="min-h-[200px]"
                  />
                </DialogContent>
              </Dialog>
            </div>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Agent name"
            />
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={selectedModel.name}
              onValueChange={(value) => {
                const model = modelOptions.find(m => m.name === value);
                if (model) {
                  setSelectedModel(model);
                  setHasUnsavedChanges(true);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
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

          <div className="space-y-2">
            <Label>Chain Type</Label>
            <Select
              value={selectedChainType}
              onValueChange={(value: ChainType) => {
                setSelectedChainType(value);
                setHasUnsavedChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select chain type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ChainType.CONVERSATION}>Conversation</SelectItem>
                <SelectItem value={ChainType.TASK_PLANNING}>Task Planning</SelectItem>
                <SelectItem value={ChainType.TASK_EXECUTION}>Task Execution</SelectItem>
                <SelectItem value={ChainType.JUDGEMENT}>Judgement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tools</Label>
            <div className="space-y-1">
              {connectors.map((connector) => (
                <div
                  key={connector.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer text-sm",
                    selectedTools.has(connector.id) 
                      ? "bg-primary/10 hover:bg-primary/15" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => {
                    const newTools = new Set(selectedTools);
                    if (newTools.has(connector.id)) {
                      newTools.delete(connector.id);
                    } else {
                      newTools.add(connector.id);
                    }
                    setSelectedTools(newTools);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <img 
                    src={`/logos/${connector.name}.svg`} 
                    alt={connector.name}
                    className="w-5 h-5"
                  />
                  <span className="flex-1">{connector.displayName}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Linked Agents</Label>
            <div className="space-y-1">
              {linkedAgents.map((linkedAgent) => (
                <div
                  key={linkedAgent.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer text-sm",
                    linkedAgentIds.has(linkedAgent.id) 
                      ? "bg-primary/10 hover:bg-primary/15" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => {
                    const newLinkedAgents = new Set(linkedAgentIds);
                    if (newLinkedAgents.has(linkedAgent.id)) {
                      newLinkedAgents.delete(linkedAgent.id);
                    } else {
                      newLinkedAgents.add(linkedAgent.id);
                    }
                    setLinkedAgentIds(newLinkedAgents);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs">
                    {linkedAgent.agentName.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1">{linkedAgent.agentName}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button
          className="w-full"
          onClick={handleSaveChanges}
          disabled={!hasUnsavedChanges}
        >
          {hasUnsavedChanges ? "Save Changes" : "Saved"}
        </Button>
      </div>
    </Card>
  );
} 