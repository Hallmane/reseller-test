use std::collections::HashMap;
use serde::Serialize;
use serde_json::Value;
use url::Url;

use crate::function_signatures::UserRequest;

use kinode_process_lib::{
    http::{
        client::send_request_await_response, server::{
            //HttpResponse, 
            send_response, 
            //HttpServerError
        }, 
        Method, 
        Response, 
        StatusCode
    }, kiprintln
};
use crate::structs::{
    ResellerState,
    ResellerApiPacket,
    ResellerApiResponse,
    RemoteApiResponse,
    RemoteApiRequest,
    RemoteApiProvider,
    RemoteApiMessage,
    ApiKeyUpdate,
    //DataKey,
    Node
};
use crate::helpers::create_anthropic_message;

/// Add this enum near the top with your other types
#[derive(Serialize)]
#[serde(untagged)]
enum HttpResponse {
    Json(ResellerApiResponse),
    Node(Node),
    Text(String),
}

/// Handles incoming HTTP requests.
pub fn http_handler(
    state: &mut ResellerState,
    path: &str,
    request: UserRequest,
) {
    kiprintln!("HTTP request received at path: {:?}", path);
    kiprintln!("Request: {:#?}", request);

    // Process the server request and prepare an appropriate response
    let (status, response) = match request {
        UserRequest::CallApi(packet) => match process_api_call(state, packet) {
            Ok(resp) => (StatusCode::OK, HttpResponse::Json(resp)),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, HttpResponse::Text(e)),
        },
        UserRequest::GetNode(name_hash) => match get_node(state, name_hash) {
            Ok(resp) => (StatusCode::OK, HttpResponse::Node(resp)),
            Err(e) => (StatusCode::NOT_FOUND, HttpResponse::Text(e)),
        },
        UserRequest::GetTba(name_hash) => match get_tba(state, name_hash) {
            Ok(bytes) => (StatusCode::OK, HttpResponse::Text(String::from_utf8_lossy(&bytes).into_owned())),
            Err(e) => (StatusCode::NOT_FOUND, HttpResponse::Text(e)),
        },
        UserRequest::UpdateApiKey(update) => match update_api_key(state, update) {
            Ok(bytes) => (StatusCode::OK, HttpResponse::Text(String::from_utf8_lossy(&bytes).into_owned())),
            Err(e) => (StatusCode::BAD_REQUEST, HttpResponse::Text(e)),
        },
    };

    // Send the response to the client/user
    send_http_response(status, response);
}

/// Processes the API call from the client.
fn process_api_call(
    state: &mut ResellerState,
    packet: ResellerApiPacket,
) -> Result<ResellerApiResponse, String> {
    let remote_response = call_remote_api(state, packet)?;

    if remote_response.content.is_empty() {
        return Err("Remote API returned empty content".to_string());
    }
    Ok(ResellerApiResponse {
        response: remote_response.content[0].text.clone(),
    })
}

/// gets the node from the namehash in the state
fn get_node(
    state: &mut ResellerState,
    name_hash: String,
) -> Result<Node, String> {
    let node = state
        .index
        .get(&name_hash)
        .ok_or_else(|| format!("Node not found for hash: {}", name_hash))?;

    Ok(node.clone())
}

/// gets the tba from the namehash in the state
fn get_tba(
    state: &mut ResellerState,
    name_hash: String,
) -> Result<Vec<u8>, String> {
    let Ok((tba, owner, data)) = state.kimap.get(&name_hash) else {
        return Err("name not found".to_string());
    };
    let info = serde_json::json!({
        "tba": tba,
        "owner": owner,
        "data": data,
    });
    serde_json::to_vec(&info).map_err(|e| format!("Serialization error: {}", e))
}

/// Builds and sends the remote API request, then extracts and deserializes the response body into a RemoteApiResponse.
fn call_remote_api(
    state: &mut ResellerState,
    packet: ResellerApiPacket,
) -> Result<RemoteApiResponse, String> {
    let remote_request = build_remote_request(state, packet)?;
    log_remote_request(&remote_request);

    let request_body = extract_request_body(&remote_request);
    let http_response = send_remote_api_request(&remote_request.endpoint, &remote_request.headers, request_body)?;
    log_remote_response(&http_response);

    if let Some(err) = inspect_api_error(&http_response) {
        return Err(err);
    }

    let body_bytes = http_response.body();
    if body_bytes.is_empty() {
        return Err("HTTP response body is empty; expected blob bytes with the response".into());
    }

    serde_json::from_slice(body_bytes)
        .map_err(|e| format!("Deserialization error: {}", e))
}

/// Updates the API key in the state.
fn update_api_key(
    state: &mut ResellerState,
    update: ApiKeyUpdate,
) -> Result<Vec<u8>, String> {
    match update.provider {
        RemoteApiProvider::Anthropic => {
            //state.remote_api_keys.insert(update.key.clone(), update.key.clone());
            state.add_api_key("anthropic".to_string(), update.key.clone());
            Ok("API key updated".to_string().into_bytes())
        }
        _ => {
            Ok("Unsupported provider".to_string().into_bytes())
        }
    }
}

/// Builds the remote API request based on the provider specified in the packet.
fn build_remote_request(
    state: &mut ResellerState,
    packet: ResellerApiPacket,
) -> Result<RemoteApiRequest, String> {
    match packet.provider {
        RemoteApiProvider::Anthropic => {
            let anth_msg = create_anthropic_message(packet.message, state)
                .map_err(|e| format!("Failed to create Anthropic message: {}", e))?;
            kiprintln!("Constructed Anthropic message: {:#?}", anth_msg);
            Ok(RemoteApiRequest {
                provider: RemoteApiProvider::Anthropic,
                endpoint: anth_msg.endpoint.clone(),
                headers: anth_msg.headers.clone(),
                message: RemoteApiMessage::Anthropic(anth_msg),
            })
        }
        RemoteApiProvider::OpenAi => Err("OpenAi provider not implemented".to_string()),
    }
}

/// Extracts the request body from the remote request.
fn extract_request_body(remote_req: &RemoteApiRequest) -> String {
    match &remote_req.message {
        RemoteApiMessage::Anthropic(msg) => msg.body.clone(),
        _ => String::new(),
    }
}

/// Sends the HTTP request to the remote API endpoint using the HTTP client,
/// logs the response body as a string, and returns the full Response (status, headers, and blob bytes).
fn send_remote_api_request(
    endpoint: &str,
    headers: &HashMap<String, String>,
    body: String,
) -> Result<Response<Vec<u8>>, String> {
    let url = Url::parse(endpoint).map_err(|e| e.to_string())?;

    let response = send_request_await_response(
        Method::POST,
        url,
        Some(headers.clone()),
        8000,
        body.into_bytes(),
    )
    .map_err(|e| {
        kiprintln!("HTTP request failed: {}", e);
        e.to_string()
    })?;

    // Log the response body (converted to a string for debugging).
    let body_str = std::str::from_utf8(response.body()).unwrap_or("<invalid utf8>");
    kiprintln!("Converted Response body to string: {}", body_str);

    Ok(response)
}

/// Logs details of the remote API request.
fn log_remote_request(req: &RemoteApiRequest) {
    kiprintln!("===== Remote API Request =====");
    kiprintln!("Endpoint: {}", req.endpoint);
    kiprintln!("Headers: {:#?}", req.headers);
    let body = match &req.message {
        RemoteApiMessage::Anthropic(msg) => &msg.body,
        _ => "<none>",
    };
    kiprintln!("Body: {}", body);
    kiprintln!("===============================");
}

/// Logs details of the remote API response.
fn log_remote_response(resp: &Response<Vec<u8>>) {
    let body_str = std::str::from_utf8(resp.body()).unwrap_or("<invalid utf8>");
    kiprintln!("===== Remote API Response =====");
    kiprintln!("Raw response: {:#?}", body_str);
    kiprintln!("===============================");
}

/// Inspects the response for an error payload.
/// Returns Some(error_message) if an error is found.
fn inspect_api_error(resp: &Response<Vec<u8>>) -> Option<String> {
    if let Ok(json_val) = serde_json::from_slice::<Value>(resp.body()) {
        if json_val.get("type").and_then(|t| t.as_str()) == Some("error") {
            let err_msg = json_val
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or("Unknown error");
            kiprintln!("Remote API error: {}", err_msg);
            return Some(err_msg.to_string());
        }
    } else {
        kiprintln!("Failed to parse response for error inspection");
    }
    None
}

/// Sends an HTTP response with standard headers.
pub fn send_http_response<T: Serialize>(status_code: StatusCode, response: T) {
    let headers = HashMap::from([
        ("Content-Type".to_string(), "application/json".to_string()),
        ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ("Access-Control-Allow-Methods".to_string(), "POST, OPTIONS".to_string()),
        (
            "Access-Control-Allow-Headers".to_string(),
            "Content-Type, Authorization".to_string(),
        ),
    ]);
    send_response(
        status_code,
        Some(headers),
        serde_json::to_vec(&response).unwrap(),
    );
}
