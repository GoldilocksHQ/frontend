import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Agent } from "@/lib/managers/agent-manager";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function AgentCard({ agent, isSelected, onSelect, onDelete }: AgentCardProps) {
  return (
    <Card 
      className={cn(
        "relative group hover:shadow-md transition-all cursor-pointer",
        isSelected && "border-primary"
      )}
      onClick={onSelect}
    >
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {agent.description}
        </p>
      </CardContent>
    </Card>
  );
} 