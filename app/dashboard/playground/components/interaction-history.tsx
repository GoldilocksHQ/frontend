import { Interaction, InteractionType, Judgement, Message, ToolCall, Plan, Task } from "@/lib/core/thread";
import { AgentManager } from "@/lib/managers/agent-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import React from "react";
import { Virtuoso } from "react-virtuoso";

interface InteractionHistoryProps {
  fullInteractionHistory: Interaction[];
  agentManager: AgentManager;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
}

export function InteractionHistory({
  fullInteractionHistory,
  agentManager,
  isHistoryOpen,
  setIsHistoryOpen
}: InteractionHistoryProps) {
  const [selectedType, setSelectedType] = useState<InteractionType | 'all'>('all');
  const [expandedInteractionId, setExpandedInteractionId] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);

  const filteredInteractions = fullInteractionHistory.filter(interaction =>
    selectedType === 'all' ? true : interaction.type === selectedType
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHistoryOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [isHistoryOpen, filteredInteractions]);

  useEffect(() => {
    if(expandedInteractionId && expandedInteractionId !== lastExpandedId) {
      setLastExpandedId(expandedInteractionId);
      // Auto-collapse after 2 minutes
      const timer = setTimeout(() => {
        setExpandedInteractionId(null);
      }, 300_000);
      return () => clearTimeout(timer);
    }
  }, [expandedInteractionId]);

  const formatInteractionContent = useCallback((interaction: Interaction) => {
    try {
      const content = (() => {
        if (interaction.error) {
          return interaction.error;
        }
  
        switch (interaction.type) {
          case InteractionType.MESSAGE:
            try {
              const messageContent = (interaction as Message).content;
              if (messageContent.includes('Completed Task')) {
                return formatTaskOutput(messageContent);
              }
              const parsed = JSON.parse(messageContent);
              return parsed;
            } catch {
              return (interaction as Message).content;
            }
          case InteractionType.TASK:
            return {
              instruction: (interaction as Task).instruction,
              keyInputs: (interaction as Task).keyInputs,
              status: (interaction as Task).status,
              result: (interaction as Task).result
            };
          case InteractionType.PLAN:
            return {
              goal: (interaction as Plan).goal,
              tasks: (interaction as Plan).tasks.map((task: Task) => ({
                step: task.step,
                instruction: task.instruction,
                keyInputs: task.keyInputs,
                targetAgentId: task.targetAgentId,
                status: task.status,
                error: {
                  code: task.error?.code,
                  message: task.error?.message,
                  details: task.error?.details
                },
                result: task.result,
                dependencies: task.dependencies
              })),
              reasoning: (interaction as Plan).reasoning
            };
          case InteractionType.JUDGEMENT:
            return {
              satisfied: (interaction as Judgement).satisfied,
              score: (interaction as Judgement).score,
              analysis: {
                ...(interaction as Judgement).analysis,
                strengths: (interaction as Judgement).analysis?.strengths || [],
                weaknesses: (interaction as Judgement).analysis?.weaknesses || [],
                missing: (interaction as Judgement).analysis?.missing || []
              },
              feedback: (interaction as Judgement).feedback || "No feedback provided"
            };
          case InteractionType.TOOL_CALL:
            const toolCall = interaction as ToolCall;
            return {
              tool: toolCall.toolName,
              function: toolCall.functionName,
              parameters: toolCall.parameters,
              error: toolCall.error,
              result: typeof toolCall.result === 'string' 
                ? JSON.parse(toolCall.result)
                : toolCall.result,
            };
          default:
            return interaction;
        }
      })();
  
      if (React.isValidElement(content)) {
        return content;
      }
  
      if (typeof content === 'string') {
        return content;
      }
  
      const formattedJson = JSON.stringify(content, null, 2)
        .replace(/{/g, '<span class="text-muted-foreground">{</span>')
        .replace(/}/g, '<span class="text-muted-foreground">}</span>')
        .replace(/[\[\]]/g, (match) => `<span class="text-muted-foreground">${match}</span>`)
        .replace(/"([^"]+)":/g, '<span class="text-primary">"$1"</span>:')
        .replace(/: ("[^"]*"|\d+|true|false|null)/g, (_, value) => 
          `: <span class="${value.startsWith('"') ? 'text-chart-2' : 'text-chart-5'}">${value}</span>`
        );
      return <pre dangerouslySetInnerHTML={{ __html: formattedJson }} />;
    } catch (error) {
      return `Error formatting content: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }, [agentManager]);

  const formatTaskOutput = (content: string) => {
    if (!content.includes('Completed Task')) return content;
  
    const tasks = content.split('\nCompleted Task').filter(Boolean);
    return (
      <div className="space-y-4">
        {tasks.map((task, index) => {
          const [taskDescription, outputStr] = task.split(' - Output: ');
          try {
            const output = JSON.parse(outputStr);
            return (
              <div key={index} className="border-l-2 border-slate-200 pl-4">
                <div className="font-medium text-slate-700">
                  {index === 0 ? taskDescription : `Completed Task${taskDescription}`}
                </div>
                {output.type === 'tool_call' && (
                  <div className="mt-2 space-y-2">
                    <div className="text-sm text-slate-600">
                      Tool: {output.toolName}.{output.functionName}
                    </div>
                    <pre className="text-xs bg-slate-50 p-2 rounded-md overflow-x-auto">
                      {JSON.stringify(JSON.parse(output.result), null, 2)}
                    </pre>
                  </div>
                )}
                {output.type === 'message' && (
                  <div className="mt-2 text-sm text-slate-600">
                    {output.content}
                  </div>
                )}
              </div>
            );
          } catch {
            return (
              <div key={index} className="border-l-2 border-slate-200 pl-4">
                <div className="font-medium text-slate-700">
                  {index === 0 ? taskDescription : `Completed Task${taskDescription}`}
                </div>
                <div className="mt-2 text-sm text-slate-600">{outputStr}</div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  const VirtuosoList = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
    function VirtuosoList(props, ref) {
      return (
        <div ref={ref} {...props} className="space-y-4 pt-4">
          {props.children}
        </div>
      );
    }
  );

  const InteractionItem = memo(({ 
    interaction,
    expanded,
    onToggle 
  }: {
    interaction: Interaction
    expanded: boolean
    onToggle: () => void
  }) => {
    const content = useMemo(
      () => formatInteractionContent(interaction),
      [interaction, formatInteractionContent]
    );

    return (
      <div className="bg-muted/50 p-4 rounded-lg space-y-2 max-w-[calc(60vw-3rem)]">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {interaction.sourceAgentId ? 
                agentManager.getAgent(interaction.sourceAgentId)?.name || interaction.sourceAgentId 
                : "You"} 
              {"->"}
              {interaction.targetAgentId ? 
                agentManager.getAgent(interaction.targetAgentId)?.name || interaction.targetAgentId 
                : "You"}
            </p>
            <div className="text-xs text-muted-foreground">
              <span>Type: {interaction.type}</span>
              <span className="mx-2">•</span>
              <span>
                {new Date(interaction.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <button 
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
        <div className={`overflow-hidden transition-all ${
          expanded ? 'opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="pt-2 text-sm font-mono whitespace-pre-wrap break-words 
            overflow-x-auto bg-background/50 p-2 rounded">
            {content}
          </div>
        </div>
      </div>
    );
  });
  InteractionItem.displayName = "InteractionItem";
  return (
    <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
      <DialogContent className="max-w-[60vw] max-h-[80vh] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Interaction History</DialogTitle>
        </DialogHeader>
        
        {/* Type Tabs */}
        <div className="flex gap-2 pb-4 border-b">
          {['all', ...Object.values(InteractionType)].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type as InteractionType | 'all')}
              className={`px-3 py-1 rounded-md text-sm ${
                selectedType === type 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {type.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>

        {/* Interactions List */}
        <div className="flex-1 overflow-y-auto space-y-4 pt-4">
          <Virtuoso
            data={filteredInteractions}
            initialTopMostItemIndex={filteredInteractions.length - 1}
            itemContent={(index, interaction) => (
              <InteractionItem
                interaction={interaction}
                expanded={expandedInteractionId === interaction.id}
                onToggle={() => setExpandedInteractionId(
                  expandedInteractionId === interaction.id ? null : interaction.id
                )}
              />
            )}
            overscan={500}
            increaseViewportBy={{ top: 200, bottom: 200 }}
            components={{
              List: VirtuosoList
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}