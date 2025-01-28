import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Agent, modelOptions } from "@/lib/agent-manager";
import { UserActivationMappedConnector, ChainType, AgentError } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AgentConfigSidebarProps {
  agent: Agent;
  errors: AgentError[];
  connectors: UserActivationMappedConnector[];
  onUpdate: () => void;
}

export function AgentConfigSidebar({
  agent,
  errors,
  connectors,
  onUpdate
}: AgentConfigSidebarProps) {
  const [name, setName] = useState(agent.agentName);
  const [description, setDescription] = useState(agent.agentDescription);
  const [selectedModel, setSelectedModel] = useState(agent.selectedModel);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(agent.selectedTools);
  const [chainType, setChainType] = useState<ChainType>(agent.chainConfig?.type || ChainType.CONVERSATION);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setName(agent.agentName);
    setDescription(agent.agentDescription);
    setSelectedModel(agent.selectedModel);
    setSystemPrompt(agent.systemPrompt);
    setSelectedTools(agent.selectedTools);
    setChainType(agent.chainConfig?.type || ChainType.CONVERSATION);
    setHasUnsavedChanges(false);
  }, [agent]);

  const handleSave = () => {
    agent.editName(name);
    agent.editDescription(description);
    agent.selectModel(selectedModel);
    agent.setSystemPrompt(systemPrompt);
    agent.setTools(selectedTools);
    agent.chainConfig = {
      type: chainType,
      model: selectedModel,
      memory: true,
      tools: Array.from(selectedTools)
    };
    
    onUpdate();
    setHasUnsavedChanges(false);
  };

  return (
    <div className="w-96 border-l p-6 space-y-6 overflow-auto">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Configuration</h3>
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </Button>
        </div>
        {errors.length > 0 && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="text-sm text-destructive">
                  {error.message}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setHasUnsavedChanges(true);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setHasUnsavedChanges(true);
            }}
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
              <SelectValue />
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
          <Label>System Prompt</Label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              setHasUnsavedChanges(true);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Chain Type</Label>
          <Select
            value={chainType}
            onValueChange={(value: ChainType) => {
              setChainType(value);
              setHasUnsavedChanges(true);
            }}
          >
            <SelectTrigger>
              <SelectValue />
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
                <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs">
                  {connector.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1">{connector.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 