import { useState } from "react";
import { ResellerApiPacket } from "../types/ResellerTest";

interface MessageFormProps {
  onSubmit: (packet: ResellerApiPacket) => Promise<void>;
  isLoading: boolean;
}

export function MessageForm({ onSubmit, isLoading }: MessageFormProps) {
  const [provider, setProvider] = useState<'Anthropic' | 'OpenAi'>('Anthropic');
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ provider, message });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="provider">Provider:</label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'Anthropic' | 'OpenAi')}
        >
          <option value="Anthropic">Anthropic</option>
          <option value="OpenAi">OpenAI</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="message">Message:</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your prompt here..."
          rows={4}
        />
      </div>

      <button type="submit" disabled={isLoading || !message}>
        {isLoading ? 'Sending...' : 'Send Request'}
      </button>
    </form>
  );
}