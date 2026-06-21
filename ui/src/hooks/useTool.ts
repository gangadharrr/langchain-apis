import { useEffect } from 'react';
import { useToolContext } from '../contexts/ToolContext';
import type { ToolDefinition } from '../types';

export function useTool<TInput, TOutput>(def: ToolDefinition<TInput, TOutput>) {
  const { registerTool, unregisterTool } = useToolContext();

  useEffect(() => {
    registerTool(def as ToolDefinition);
    return () => unregisterTool(def.name);
  }, [def, registerTool, unregisterTool]);
}
