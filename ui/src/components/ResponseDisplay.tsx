interface ResponseDisplayProps {
    response: string;
  }
  
  export function ResponseDisplay({ response }: ResponseDisplayProps) {
    if (!response) return null;
  
    return (
      <div className="response">
        <h2>Response:</h2>
        <pre>{response}</pre>
      </div>
    );
  }