use kinode_app_common::declare_types;
use serde::{
    Deserialize, 
    Serialize
};
use process_macros::SerdeJsonInto;
use kinode_process_lib::eth::{
    EthSubResult,
    EthSub
};

use crate::structs::{
    Node,
    ResellerApiPacket,
    //ResellerApiResponse,
    RemoteApiResponse,
    RemoteApiRequest,
    ApiKeyUpdate
};

declare_types! {
    User {
        CallApi ResellerApiPacket => String
        GetNode String => Node
        GetTba String => String
        UpdateApiKey ApiKeyUpdate => String
    },
    Reseller {
        CallRemoteApi RemoteApiRequest => Result<RemoteApiResponse, String>
    },
    Kinode {
        Eth EthSub => Result<EthSubResult, String>
        StateLog String => String
    }
}