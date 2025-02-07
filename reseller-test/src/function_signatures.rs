use serde::{
    Deserialize, 
    Serialize
};
use kinode_app_common::declare_types;
use process_macros::SerdeJsonInto;
use kinode_process_lib::eth::{
    EthSubResult,
    EthSub
};

use crate::structs::{
    ResellerApiPacket,
    ResellerApiResponse,
    RemoteApiResponse,
    RemoteApiRequest,
    Node
};

declare_types! {
    User {
        CallApi ResellerApiPacket => ResellerApiResponse
        GetNode String => Node
        GetTba String => String
    },
    Reseller {
        CallRemoteApi RemoteApiRequest => Result<RemoteApiResponse, String>
    },
    Kinode {
        Eth EthSub => Result<EthSubResult, String> 
    }
}
