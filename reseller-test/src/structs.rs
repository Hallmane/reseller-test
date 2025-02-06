use serde::{
    Deserialize, 
    Serialize
};
use serde_json::json;
use std::collections::HashMap;
use kinode_app_common::State;
use process_macros::SerdeJsonInto;
use kinode_process_lib::kiprintln;

#[derive(Debug, Serialize, Deserialize)]
pub struct ResellerState {
    user_facing_api_keys: Vec<String>,
    remote_api_keys: HashMap<String, String> 
}

impl State for ResellerState {
    fn new() -> Self {
        let mut remote_api_keys = HashMap::new();
        remote_api_keys.insert("anthropic".to_string(), "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".to_string());
        
        let fresh_state = Self { 
            user_facing_api_keys: vec![],
            remote_api_keys
        };

        kiprintln!("ResellerState created: {:#?}", &fresh_state);
        fresh_state
    }
}


/// A packet sent from the user to the reseller
/// 
/// # Example
/// ```
/// let packet = ResellerApiPacket {
///     provider: RemoteApiProvider::Anthropic,
///     message: "What is the meaning of life?".to_string(),
/// };
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct ResellerApiPacket {
    pub provider: RemoteApiProvider,
    pub message: String,
}

/// A packet sent from the reseller back to the user
/// 
/// # Example
/// ```
/// let packet = ResellerApiResponse {
///     response: "The meaning of life is 42".to_string(),
/// };
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct ResellerApiResponse {
    pub response: String
}

/// bla
/// 
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct RemoteApiResponse {
    pub id: String,
    pub model: String,
    pub role: String,
    pub content: Vec<ContentBlock>,
    pub stop_reason: Option<String>,
    pub usage: Usage,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContentBlock {
    #[serde(rename = "type")]
    pub type_: String,  // "text" for standard responses
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}



//_________________

/// A request to the remote api
/// 
/// # Example
/// ```
/// let request = RemoteApiRequest {
///     provider: RemoteApiProvider::Anthropic,
///     endpoint: "https://api.anthropic.com/v1/messages".to_string(),
///     message: RemoteApiMessage::Anthropic(AnthropicMessage { content: "What is the meaning of life?".to_string() })],
/// };
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct RemoteApiRequest {
    pub provider: RemoteApiProvider,
    pub endpoint: String,
    pub headers: HashMap<String, String>,
    pub message: RemoteApiMessage
}

#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub enum RemoteApiMessage {
    OpenAi(OpenAiMessage),
    Anthropic(AnthropicMessage)
}

#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub enum RemoteApiProvider {
    OpenAi,
    Anthropic
}

#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct OpenAiMessage {
    pub role: String,
    pub content: String
}

#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct AnthropicMessage {
    pub endpoint: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub content: String,
}

/// Create a message for the anthropic api
/// 
/// # Example
/// ```
/// let message = create_anthropic_message("What is the meaning of life?".to_string());
/// ```
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
