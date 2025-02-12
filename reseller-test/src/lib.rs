use kinode_app_common::{erect, Binding, State};
use kinode_process_lib::{
    kiprintln,
    http::server::HttpBindingConfig,
};

mod function_signatures;

mod http_handlers;
use http_handlers::http_handler;

mod local_handlers;
use local_handlers::local_handler;

mod structs;
use structs::ResellerState;

mod helpers;

fn init_fn(_state: &mut ResellerState) {
    kiprintln!("Initializing reseller-test");

}

erect! {
    name: "reseller-test",
    icon: None,
    widget: None,
    ui: Some(HttpBindingConfig::default()),
    endpoints: [
        Binding::Http {
            path: "/api",
            config: HttpBindingConfig::new(false, false, false, None),
        },
    ],
    handlers: {
        http: http_handler,
        local: local_handler,
        remote: _,
        ws: _,
    },
    init: init_fn,
    wit_world: "reseller-test-universal-dot-os-v1"
}