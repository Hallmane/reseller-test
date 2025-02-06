use kinode_app_common::{erect, Binding, State};
use kinode_process_lib::{
    kiprintln,
    set_state,
};

mod http_handlers;
use http_handlers::http_handler;
use kinode_process_lib::http::server::HttpBindingConfig;

mod function_signatures;

mod structs;
use structs::ResellerState;

fn init_fn(state: &mut ResellerState) {
    kiprintln!("Initializing reseller-test: discarding old state and creating fresh state");

    let fresh_state = ResellerState::new();
    *state = fresh_state;

    match serde_json::to_vec(state) {
        Ok(serialized_state) => set_state(&serialized_state),
        Err(e) => kiprintln!("Failed to serialize state: {}", e),
    }

    kiprintln!("Fresh ResellerState: {:#?}", state);
    // Later: start checking eth logs for new tokens here
}

erect! {
    name: "reseller-test",
    icon: None,
    widget: None,
    ui: Some(HttpBindingConfig::default()),
    endpoints: [
        Binding::Http {
            path: "/api",
            config: HttpBindingConfig::new(false, true, false, None),
        },
    ],
    handlers: {
        http: http_handler,
        local: _,
        remote: _,
        ws: _,
    },
    init: init_fn,
    wit_world: "reseller-test-universal-dot-os-v1"
}


