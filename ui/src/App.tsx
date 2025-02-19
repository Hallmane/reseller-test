import { useState } from "react";
import {
  ResellerApiPacket,
  ResellerApiResponse,
  ApiKeyUpdate,
} from "./types/ResellerTest";
import { MessageForm } from "./components/MessageForm";
import { ApiKeyForm } from "./components/ApiKeyForm";
import { ErrorMessage } from "./components/ErrorMessage";
import { ResponseDisplay } from "./components/ResponseDisplay";
import KimapExplorer from "./components/KimapExplorer";
import "./App.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import '@rainbow-me/rainbowkit/styles.css';

const BASE_URL = import.meta.env.BASE_URL;
if (window.our) window.our.process = BASE_URL?.replace("/", "");

type ActiveTab = "api test" | "apikey" | "explorer";

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("api test");

  // ------ State for Call API ---
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ------ State for API Key Update ---
  const [keyResponse, setKeyResponse] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keyIsLoading, setKeyIsLoading] = useState(false);

  const handleSubmit = async (packet: ResellerApiPacket) => {
    setIsLoading(true);
    setError("");
    setResponse("");

    try {
      const result = await fetch(`${BASE_URL}/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ CallApi: packet }),
      });

      if (!result.ok)
        throw new Error(`HTTP error! status: ${result.status}`);

      const data = await result.json();
      if ('Json' in data) {
        setResponse(data.Json.response);
      } else if ('Text' in data) {
        setResponse(data.Text);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeyUpdate = async (update: ApiKeyUpdate) => {
    setKeyIsLoading(true);
    setKeyError("");
    setKeyResponse("");

    try {
      const result = await fetch(`${BASE_URL}/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ UpdateApiKey: update }),
      });

      if (!result.ok)
        throw new Error(`HTTP error! status: ${result.status}`);

      const data = await result.json();
      if ('Text' in data) {
        setKeyResponse(data.Text);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setKeyIsLoading(false);
    }
  };

  return (
    <>
      <ConnectButton />
      <div className="container">
        <h1>API Reseller Test Interface</h1>
      <div className="tabs">
        <button
          onClick={() => setActiveTab("api test")}
          className={activeTab === "api test" ? "active" : ""}
        >
          API Test
        </button>
        <button
          onClick={() => setActiveTab("apikey")}
          className={activeTab === "apikey" ? "active" : ""}
        >
          Update API Key
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          className={activeTab === "explorer" ? "active" : ""}
        >
          Hypermap API Explorer
        </button>
      </div>

      {activeTab === "api test" && (
        <>
          <MessageForm onSubmit={handleSubmit} isLoading={isLoading} />
          <ErrorMessage error={error} />
          <ResponseDisplay response={response} />
        </>
      )}

      {activeTab === "apikey" && (
        <>
          <ApiKeyForm onSubmit={handleApiKeyUpdate} isLoading={keyIsLoading} />
          <ErrorMessage error={keyError} />
          <ResponseDisplay response={keyResponse} />
        </>
      )}

      {activeTab === "explorer" && (
        <>
          <KimapExplorer />
        </>
      )}
    </div>
    </>
  );
}

export default App;
