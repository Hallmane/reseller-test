use kinode_process_lib::{
    Message, 
    http::server::HttpServer
};
use crate::ResellerState;
use kinode_process_lib::{
    kiprintln,
    //set_state,
    eth::{
        EthSub, 
        //EthSubResult, 
        SubscriptionResult
    }
};
use crate::function_signatures::KinodeRequest;

// Make note in future docs that this can be used to debug a process
pub fn local_handler(
    message: &Message,
    state: &mut ResellerState,
    _server: &mut HttpServer,
    request: KinodeRequest,
) {
    kiprintln!("kino_local state: {:?}", state);
    kiprintln!("kino_local message: {:#?}", message);

    match request {
        KinodeRequest::Eth(eth_sub) => {
            match handle_eth(state, eth_sub) {
                Ok(()) => {kiprintln!("Successfully handled eth arm")}
                Err(e) => kiprintln!("Error handling eth arm: {:?}", e)
            }
        }
        KinodeRequest::StateLog(state_log) => {
            kiprintln!("Received state log: {:?}", state_log);
        }
        _ => {
            kiprintln!("Received unhandled kinode request: {:?}", request);
        }
    }
}

pub fn handle_eth(
    state: &mut ResellerState,
    eth_sub: EthSub,
) -> anyhow::Result<()> {
    // Attempt to deserialize the inner `result` from the EthSub message.
    let sub_result = serde_json::from_value::<SubscriptionResult>(eth_sub.result)
        .map_err(|e| anyhow::anyhow!("Deserialization error: {}", e))?;
    
    match sub_result {
        SubscriptionResult::Log(log) => {
            kiprintln!("Received eth log: {:?}", log);
            state.handle_log(&log).map_err(|e| anyhow::anyhow!("Log handling error: {}", e))?;
            //Ok(EthSubResult::Success) // Replace with however you define success.
            Ok(())
        },
        other => {
            kiprintln!("Received unhandled eth subscription result: {:?}", other);
            Err(anyhow::anyhow!("Unhandled subscription result: {:?}", other))
        }
    }
}