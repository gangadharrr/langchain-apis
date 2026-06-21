import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react';
import type { ToolDefinition, ToolMetadata } from '../types';

interface ToolContextValue {
  registerTool: (tool: ToolDefinition) => void;
  unregisterTool: (name: string) => void;
  getTool: (name: string) => ToolDefinition | undefined;
  getToolMetadata: () => ToolMetadata[];
}

const ToolContext = createContext<ToolContextValue | null>(null);

export function ToolProvider({ children }: { children: ReactNode }) {
  const toolsRef = useRef<Map<string, ToolDefinition>>(new Map());

  const registerTool = useCallback((tool: ToolDefinition) => {
    toolsRef.current.set(tool.name, tool);
  }, []);

  const unregisterTool = useCallback((name: string) => {
    toolsRef.current.delete(name);
  }, []);

  const getTool = useCallback((name: string) => {
    return toolsRef.current.get(name);
  }, []);

  const getToolMetadata = useCallback(() => {
    const metadata: ToolMetadata[] = [];
    toolsRef.current.forEach((tool) => {
      metadata.push({ name: tool.name, description: tool.description, schema: tool.schema });
    });
    return metadata;
  }, []);

  return (
    <ToolContext.Provider value={{ registerTool, unregisterTool, getTool, getToolMetadata }}>
      {children}
    </ToolContext.Provider>
  );
}

export function useToolContext() {
  const ctx = useContext(ToolContext);
  if (!ctx) {
    throw new Error('useToolContext must be used within a ToolProvider');
  }
  return ctx;
}