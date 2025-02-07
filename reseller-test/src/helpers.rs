use crate::structs::{
    AnthropicMessage,
    ResellerState
};
use std::collections::HashMap;
use serde_json::json;

/// Create a message for the anthropic api
/// 
/// # Example
/// ```
/// let message = create_anthropic_message("What is the meaning of life?".to_string());
/// ```
/// ## Output
/// ```
/// let message = AnthropicMessage { 
///     endpoint: "https://api.anthropic.com/v1/messages".to_string(),
///     headers: HashMap::new(),
///     body: "".to_string(),
///     content: "What is the meaning of life?".to_string()
/// };
pub fn create_anthropic_message(content: String, state: &ResellerState) -> AnthropicMessage {
    let endpoint = "https://api.anthropic.com/v1/messages".to_string();

    let mut headers = HashMap::new();
    headers.insert("Content-Type".to_string(), "application/json".to_string());
    headers.insert("x-api-key".to_string(), state.remote_api_keys.get("anthropic").unwrap().to_string());
    headers.insert("anthropic-version".to_string(), "2023-06-01".to_string());

    let body = json!({
        "model": "claude-3-5-sonnet-20240620",
        "max_tokens": 1024,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ]
  });
    AnthropicMessage { 
        endpoint, 
        headers, 
        body: body.to_string(), 
        content 
    }
}