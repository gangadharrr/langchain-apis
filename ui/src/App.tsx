import { ToolProvider } from './contexts/ToolContext';
import { ChatContainer } from './components/ChatContainer';

export default function App() {
  return (
    <ToolProvider>
      <ChatContainer />
    </ToolProvider>
  );
}
