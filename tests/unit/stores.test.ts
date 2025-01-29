import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../../lib/stores/ui-store';
import { useAgentStore } from '../../lib/stores/agent-store';
import { useThreadStore } from '../../lib/stores/thread-store';
import { Agent } from '../../backup/agent-manager';
import { UUID } from 'crypto';
import { ThreadStatus, Message, MessageType, Thread } from '../../backup/types_legacy';

describe('Store Tests', () => {
  beforeEach(() => {
    // Clear all stores before each test
    useUIStore.setState({
      isLoading: false,
      isWorking: false,
      workingStatus: '',
      errors: []
    });

    useAgentStore.setState({
      agents: [],
      selectedAgent: null,
      linkedAgents: new Map(),
      selectedModel: { name: 'gpt-4', provider: 'openai', contextWindow: 8192, maxTokens: 4096 }
    });

    useThreadStore.setState({
      currentThread: null,
      messages: [],
      threadHistory: new Map()
    });
  });

  describe('UI Store', () => {
    it('should update loading state', () => {
      const { setLoading } = useUIStore.getState();
      setLoading(true);
      expect(useUIStore.getState().isLoading).toBe(true);
    });

    it('should update working state and status', () => {
      const { setWorking, setWorkingStatus } = useUIStore.getState();
      setWorking(true);
      setWorkingStatus('Processing...');
      const state = useUIStore.getState();
      expect(state.isWorking).toBe(true);
      expect(state.workingStatus).toBe('Processing...');
    });

    it('should manage errors', () => {
      const { addError, clearErrors } = useUIStore.getState();
      const error = { message: 'Test error', timestamp: Date.now() };
      
      addError(error);
      expect(useUIStore.getState().errors).toHaveLength(1);
      expect(useUIStore.getState().errors[0]).toEqual(error);

      clearErrors();
      expect(useUIStore.getState().errors).toHaveLength(0);
    });
  });

  describe('Agent Store', () => {
    const mockAgent = new Agent(
      crypto.randomUUID() as UUID,
      'Test Agent',
      'Test Description',
      { name: 'gpt-4', provider: 'openai', contextWindow: 8192, maxTokens: 4096 },
      'Test prompt',
      new Set(),
      new Set()
    );

    it('should add and remove agents', () => {
      const { addAgent, removeAgent } = useAgentStore.getState();
      
      addAgent(mockAgent);
      expect(useAgentStore.getState().agents).toHaveLength(1);
      
      removeAgent(mockAgent.id);
      expect(useAgentStore.getState().agents).toHaveLength(0);
    });

    it('should select and update agents', () => {
      const { addAgent, setSelectedAgent, updateAgent } = useAgentStore.getState();
      
      addAgent(mockAgent);
      setSelectedAgent(mockAgent);
      expect(useAgentStore.getState().selectedAgent).toBe(mockAgent);

      const updatedAgent = new Agent(
        mockAgent.id,
        'Updated Name',
        mockAgent.agentDescription,
        mockAgent.selectedModel,
        mockAgent.systemPrompt,
        mockAgent.selectedTools,
        mockAgent.linkedAgentIds
      );
      
      updateAgent(updatedAgent);
      expect(useAgentStore.getState().agents[0].agentName).toBe('Updated Name');
    });
  });

  describe('Thread Store', () => {
    const mockThread: Thread = {
      id: crypto.randomUUID() as UUID,
      messages: [],
      taskLists: [],
      status: 'active' as ThreadStatus,
      startTime: Date.now(),
      metadata: {}
    };

    it('should manage current thread', () => {
      const { setCurrentThread } = useThreadStore.getState();
      
      setCurrentThread(mockThread);
      expect(useThreadStore.getState().currentThread).toBe(mockThread);
      
      setCurrentThread(null);
      expect(useThreadStore.getState().currentThread).toBeNull();
    });

    it('should manage messages', () => {
      const { addMessage, setMessages } = useThreadStore.getState();
      const mockMessage: Message = {
        id: crypto.randomUUID() as UUID,
        threadId: mockThread.id,
        role: 'user',
        content: 'Test message',
        messageType: 'user_to_agent' as MessageType,
        timestamp: Date.now(),
        targetAgentId: crypto.randomUUID() as UUID,
        metadata: {}
      };

      addMessage(mockMessage);
      expect(useThreadStore.getState().messages).toHaveLength(1);
      
      setMessages([]);
      expect(useThreadStore.getState().messages).toHaveLength(0);
    });

    it('should manage thread history', () => {
      const { addThreadToHistory, getThreadFromHistory } = useThreadStore.getState();
      
      addThreadToHistory(mockThread);
      const retrieved = getThreadFromHistory(mockThread.id);
      expect(retrieved).toBe(mockThread);
    });
  });
}); 