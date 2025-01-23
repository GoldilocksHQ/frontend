import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Agent } from "@/lib/agent-manager";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect, onDelete }: AgentCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer" onClick={() => onSelect(agent)}>
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
                    onDelete(agent);
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
          <p>{agent.agentDescription || "No description available"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 