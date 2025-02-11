import React, { useState } from "react";
import { ApiKeyUpdate } from "../types/ResellerTest";

interface ApiKeyFormProps {
  onSubmit: (update: ApiKeyUpdate) => Promise<void>;
  isLoading: boolean;
}

export function ApiKeyForm({ onSubmit, isLoading }: ApiKeyFormProps) {
  const [provider, setProvider] = useState<"Anthropic" | "OpenAi">("Anthropic");
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ provider, key: apiKey });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2>Update API Key</h2>
      <div className="form-group">
        <label htmlFor="provider">Provider:</label>
        <select
          id="provider"
          value={provider}
          onChange={(e) =>
            setProvider(e.target.value as "Anthropic" | "OpenAi")
          }
        >
          <option value="Anthropic">Anthropic</option>
          <option value="OpenAi">OpenAI</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="apiKey">API Key:</label>
        <input
          type="text"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API key here"
        />
      </div>
      <button type="submit" disabled={isLoading || !apiKey}>
        {isLoading ? "Updating..." : "Update API Key"}
      </button>
    </form>
  );
}