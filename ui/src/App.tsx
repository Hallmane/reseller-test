import { useState } from "react";
import { ResellerApiPacket, ResellerApiResponse } from "./types/ResellerTest";
import "./App.css";

const BASE_URL = import.meta.env.BASE_URL;
if (window.our) window.our.process = BASE_URL?.replace("/", "");

function App() {
  const [provider, setProvider] = useState<'Anthropic' | 'OpenAi'>('Anthropic');
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResponse("");

    const packet: ResellerApiPacket = {
      provider,
      message
    };

    try {
      const result = await fetch(`${BASE_URL}/api`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ CallApi: packet })
      });

      if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
      
      const data: ResellerApiResponse = await result.json();
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>API Reseller Test Interface</h1>
      
      <form onSubmit={sendMessage} className="form">
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

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {response && (
        <div className="response">
          <h2>Response:</h2>
          <pre>{response}</pre>
        </div>
      )}
    </div>
  );
}

export default App;