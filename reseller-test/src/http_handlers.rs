use crate::function_signatures::UserRequest;
use url::Url;

use kinode_process_lib::http::{
    Method,
    server::HttpResponse,
    client::send_request_await_response,
};

use kinode_process_lib::kiprintln;

use crate::structs::{
    ResellerState,
    RemoteApiRequest,
    RemoteApiResponse,
    RemoteApiProvider,
    ResellerApiPacket,
    RemoteApiMessage,
    ResellerApiResponse,
    create_anthropic_message,
};

/// Handle HTTP requests
/// A user makes a simple call to the reseller to use the api
pub fn http_handler(
    _state: &mut ResellerState,
    request: UserRequest
) -> (HttpResponse, Vec<u8>) { 
    kiprintln!("request: {:?}", request);
     match request {
        UserRequest::CallApi(reseller_api_packet) => {
            let remote_response = call_remote_api(_state, reseller_api_packet);
            let reseller_response = ResellerApiResponse {
                response: remote_response.unwrap().content[0].text.clone(),
            };
            kiprintln!("reseller_response: {:?}", reseller_response);
            (HttpResponse::new(200 as u16), serde_json::to_vec(&reseller_response).unwrap())
        }
     };
    (HttpResponse::new(200 as u16), vec![])
}

fn call_remote_api(
    state: &mut ResellerState,
    request: ResellerApiPacket,
) -> Result<RemoteApiResponse, String> {
    // Create the RemoteApiRequest based on the provider in the reseller_api_packet.
    let remote_api_request = match request.provider {
        RemoteApiProvider::Anthropic => {
            // Use the helper to create an AnthropicMessage with all necessary details.
            let anth_message = create_anthropic_message(request.message, state);
            RemoteApiRequest {
                provider: RemoteApiProvider::Anthropic,
                endpoint: anth_message.endpoint.clone(),
                headers: anth_message.headers.clone(),
                message: RemoteApiMessage::Anthropic(anth_message.clone()),
            }
        },
        RemoteApiProvider::OpenAi => {
            // For OpenAi you would similarly create an OpenAiMessage (not shown here)
            unimplemented!("OpenAi message creation is not implemented yet")
        }
    };

    // Now, call the remote API using the anth_message created.
    // Depending on the signature of send_request_await_response, you might use either the method-based call or pass the full request.
    // For example, if send_request_await_response accepts a RemoteApiRequest:
    let response = send_request_await_response(
        Method::GET, 
        Url::parse(&remote_api_request.endpoint).unwrap(), 
        Some(remote_api_request.headers), 
        5000, 
        vec![]
    ).map_err(|e| e.to_string())?;
    let response_body = response.body();
    let remote_api_response: RemoteApiResponse = serde_json::from_slice(&response_body).map_err(|e| e.to_string())?;

    // Process the result as needed. For this example, we simply return it.
    Ok(remote_api_response)
}
