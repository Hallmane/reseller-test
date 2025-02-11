interface ErrorMessageProps {
    error: string;
  }
  
  export function ErrorMessage({ error }: ErrorMessageProps) {
    if (!error) return null;
    
    return (
      <div className="error">
        Error: {error}
      </div>
    );
  }