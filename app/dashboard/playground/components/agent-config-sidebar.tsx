import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Agent, AgentConfig } from "@/lib/managers/agent-manager";
import { ManagedError } from "@/lib/managers/error-manager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChainConfig, ChainType, ModelConfig } from "@/lib/managers/chain-manager";
import { AgentManager } from "@/lib/managers/agent-manager";
import Image from "next/image";
interface AgentConfigSidebarProps {
  agent: Agent;
  errors: ManagedError[];
  agentManager: AgentManager;
}

export function AgentConfigSidebar({ agent, errors, agentManager }: AgentConfigSidebarProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(agent.toolIds || []));
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(agentManager.getAvailableModels()[0]);
  const [chainType, setChainType] = useState<ChainType>(ChainType.CONVERSATION);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description);
    setSelectedTools(new Set(agent.toolIds || []));

    // Load chain config if exists
    const chain = agent.chainId ? agentManager.getChain(agent.chainId) : undefined;
    if (chain) {
      setSelectedModel(chain.model);
      setChainType(chain.type);
    }

    setHasUnsavedChanges(false);
  }, [agent]);

  const handleSave = async () => {
    try {
      // Create or update chain
      const newChainConfig: ChainConfig = {
        type: chainType,
        model: selectedModel,
        memory: true,
        tools: Array.from(selectedTools)
      };

      const newAgentConfig: AgentConfig = {
        name: name,
        description: description,
        chainType: chainType,
        modelName: selectedModel.name,
        toolIds: Array.from(selectedTools)
      };

      // Update agent with new chain and basic info
      await agentManager.updateAgent(agent.id, newAgentConfig, newChainConfig);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to update agent:', error);
    }
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
              {errors.map((error) => (
                <div key={error.id} className="text-sm text-destructive">
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
              const model = agentManager.getAvailableModels().find(m => m.name === value);
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
              {agentManager.getAvailableModels().map((model) => (
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
              {agentManager.getAvailableChainTypes().map((type) => (
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
            {agentManager.getAllAvailableTools().map((tool) => (
              <div
                key={tool.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer text-sm",
                  selectedTools.has(tool.id) 
                    ? "bg-primary/10 hover:bg-primary/15" 
                    : "hover:bg-muted"
                )}
                onClick={() => {
                  const newTools = new Set(selectedTools);
                  if (newTools.has(tool.id)) {
                    newTools.delete(tool.id);
                  } else {
                    newTools.add(tool.id);
                  }
                  setSelectedTools(newTools);
                  setHasUnsavedChanges(true);
                }}
              >
                <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs overflow-hidden">
                  <Image
                    src={`/logos/${tool.name.toLowerCase()}.svg`}
                    alt={tool.name}
                    width={20}
                    height={20}
                    className="object-contain p-1"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span className="flex-1">{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 