use serde::{
    Deserialize, 
    Serialize
};
use process_macros::SerdeJsonInto;
use kinode_app_common::declare_types;


use crate::structs::{
    ResellerApiPacket,
    ResellerApiResponse,
    RemoteApiResponse,
    RemoteApiRequest
};

declare_types! {
    User {
        //PurchaseAccess PurchaseProof => Result<ApiToken>,
        CallApi ResellerApiPacket => ResellerApiResponse
    },
    Reseller {
        CallRemoteApi RemoteApiRequest => Result<RemoteApiResponse, String> // remote api call
    },
}