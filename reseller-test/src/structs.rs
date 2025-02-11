use serde::{
    Deserialize, 
    Serialize
};
use std::collections::{
    HashMap,
    BTreeSet,
    BTreeMap
};
use kinode_app_common::State;
use process_macros::SerdeJsonInto;
use kinode_process_lib::{
    set_state,
    kiprintln, 
    eth,
    kimap
};
use alloy_sol_types::SolEvent;

use dotenvy::dotenv;
use std::env;


/// The application state.
#[derive(Debug, Serialize, Deserialize)]
pub struct ResellerState {
    /// The Kimap instance.
    pub kimap: kimap::Kimap,
    /// Lookup table from name to namehash.
    pub names: HashMap<String, String>,
    /// Map from a namehash to its corresponding node.
    pub index: BTreeMap<String, Node>,

    /// The user-facing API keys.
    pub user_facing_api_keys: Vec<String>,
    /// The remote API keys.
    pub remote_api_keys: HashMap<String, String> ,
}

impl State for ResellerState {
    fn new() -> Self {
        dotenv().ok();
        let mut remote_api_keys = HashMap::new();

        // Check for ANTHROPIC_API_KEY and print if found or not.
        match env::var("ANTHROPIC_API_KEY") {
            Ok(api_key) => {
                kiprintln!("Found ANTHROPIC_API_KEY: {}", api_key);
                remote_api_keys.insert("anthropic".to_string(), api_key);
            }
            Err(e) => {
                kiprintln!("ANTHROPIC_API_KEY not found: {}", e);
            }
        }

        // Check for OPENAI_API_KEY and print if found or not.
        match env::var("OPENAI_API_KEY") {
            Ok(api_key) => {
                kiprintln!("Found OPENAI_API_KEY: {}", api_key);
                remote_api_keys.insert("openai".to_string(), api_key);
            }
            Err(e) => {
                kiprintln!("OPENAI_API_KEY not found: {}", e);
            }
        }

        let kimap = kimap::Kimap::default(60);

        // Start the subscription loop (with minimal pause parameters).
        kimap
            .provider
            .subscribe_loop(1, Self::make_filter(&kimap), 0, 0);


        let mut fresh_state= Self {
            kimap: kimap.clone(),
            names: HashMap::from([(String::new(), kimap::KIMAP_ROOT_HASH.to_string())]),
            index: BTreeMap::from([(
                kimap::KIMAP_ROOT_HASH.to_string(),
                Node {
                    parent_path: String::new(),
                    name: String::new(),
                    child_names: BTreeSet::new(),
                    data_keys: BTreeMap::new(),
                },
            )]),
            user_facing_api_keys: vec![],
            remote_api_keys
        };

        // Catch up on historical logs.
        loop {
            match kimap.provider.get_logs(&Self::make_filter(&kimap)) {
                Ok(logs) => {
                    for log in logs {
                        if let Err(e) = fresh_state.handle_log(&log) {
                            kiprintln!("log-handling error! {e:?}");
                        }
                    }
                    break;
                }
                Err(e) => {
                    kiprintln!("got eth error while fetching logs: {e:?}, trying again in 5s...");
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    continue;
                }
            }
        }

        fresh_state
    }

}

impl ResellerState {
    pub fn save(&self) {
        let serialized_state = rmp_serde::to_vec(self)
            .expect("Failed to serialize state with MessagePack");
        set_state(&serialized_state);
    }

    pub fn make_filter(kimap: &kimap::Kimap) -> eth::Filter {
        eth::Filter::new()
            .address(*kimap.address())
            .from_block(kimap::KIMAP_FIRST_BLOCK)
            .to_block(eth::BlockNumberOrTag::Latest)
            .events(vec![
                kimap::contract::Mint::SIGNATURE,
                kimap::contract::Note::SIGNATURE,
                kimap::contract::Fact::SIGNATURE,
            ])
    }

    pub fn handle_log(&mut self, log: &eth::Log) -> anyhow::Result<()> {
        match log.topics()[0] {
            kimap::contract::Mint::SIGNATURE_HASH => {
                let decoded = kimap::contract::Mint::decode_log_data(log.data(), true).unwrap();

                let parent_hash = decoded.parenthash.to_string();
                let child_hash = decoded.childhash.to_string();
                let label = String::from_utf8(decoded.label.to_vec())?;

                self.add_mint(&parent_hash, child_hash, label)?;
            }
            kimap::contract::Note::SIGNATURE_HASH => {
                let decoded = kimap::contract::Note::decode_log_data(log.data(), true).unwrap();

                let parent_hash = decoded.parenthash.to_string();
                let note_label = String::from_utf8(decoded.label.to_vec())?;

                self.add_note(&parent_hash, note_label, decoded.data)?;
            }
            kimap::contract::Fact::SIGNATURE_HASH => {
                let decoded = kimap::contract::Fact::decode_log_data(log.data(), true).unwrap();

                let parent_hash = decoded.parenthash.to_string();
                let fact_label = String::from_utf8(decoded.label.to_vec())?;

                self.add_fact(&parent_hash, fact_label, decoded.data)?;
            }
            _ => {}
        }
        self.save();
        Ok(())
    }

    pub fn add_mint(
        &mut self,
        parent_hash: &str,
        child_hash: String,
        name: String,
    ) -> anyhow::Result<()> {
        let parent_node: &mut Node = self
            .index
            .get_mut(parent_hash)
            .ok_or(anyhow::anyhow!("parent for child {child_hash} not found!"))?;

        let parent_path: String = if parent_hash == kimap::KIMAP_ROOT_HASH {
            String::new()
        } else if parent_node.parent_path.is_empty() {
            format!(".{}", parent_node.name)
        } else {
            format!(".{}{}", parent_node.name, parent_node.parent_path)
        };

        let full_name = format!("{}{}", name, parent_path);

        parent_node.child_names.insert(full_name.clone());
        self.names.insert(full_name, child_hash.clone());
        self.index.insert(
            child_hash,
            Node {
                parent_path,
                name,
                child_names: BTreeSet::new(),
                data_keys: BTreeMap::new(),
            },
        );
        self.save();
        Ok(())
    }

    pub fn add_note(
        &mut self,
        parent_hash: &str,
        note_label: String,
        data: eth::Bytes,
    ) -> anyhow::Result<()> {
        let parent: &mut Node = self.index.get_mut(parent_hash).ok_or(anyhow::anyhow!(
            "parent {parent_hash} not found for note {note_label}"
        ))?;

        match parent.data_keys.entry(note_label) {
            std::collections::btree_map::Entry::Vacant(e) => {
                e.insert(DataKey::Note(vec![data]));
            }
            std::collections::btree_map::Entry::Occupied(mut e) => {
                if let DataKey::Note(ref mut notes) = e.get_mut() {
                    notes.push(data);
                }
            }
        }
        self.save();
        Ok(())
    }

    pub fn add_fact(
        &mut self,
        parent_hash: &str,
        fact_label: String,
        data: eth::Bytes,
    ) -> anyhow::Result<()> {
        let parent: &mut Node = self.index.get_mut(parent_hash).ok_or(anyhow::anyhow!(
            "parent {parent_hash} not found for fact {fact_label}"
        ))?;

        // this should never ever happen
        if parent.data_keys.contains_key(&fact_label) {
            return Err(anyhow::anyhow!(
                "fact {fact_label} already exists on parent {parent_hash}"
            ));
        }

        parent.data_keys.insert(fact_label, DataKey::Fact(data));
        self.save();
        Ok(())
    }

    pub fn tree(&self, root_hash: &str, nest_level: usize) -> String {
        let Some(root) = self.index.get(root_hash) else {
            return String::new();
        };

        format!(
            "{}{}{}{}",
            if root.name.is_empty() {
                ".".to_string()
            } else {
                format!("└─ {}", root.name)
            },
            if root.parent_path.is_empty() {
                String::new()
            } else {
                root.parent_path.to_string()
            },
            if root.data_keys.is_empty() {
                String::new()
            } else {
                format!(
                    "\r\n{}",
                    root.data_keys
                        .iter()
                        .map(|(label, data_key)| format!(
                            "{}└─ {}: {} bytes",
                            " ".repeat(nest_level * 4),
                            label,
                            match data_key {
                                // note will never have an empty vector
                                DataKey::Note(notes) => notes.last().unwrap().len(),
                                DataKey::Fact(bytes) => bytes.len(),
                            }
                        ))
                        .collect::<Vec<String>>()
                        .join("\r\n")
                )
            },
            if root.child_names.is_empty() {
                String::new()
            } else {
                format!(
                    "\r\n{}",
                    root.child_names
                        .iter()
                        .map(|name| if let Some(namehash) = self.names.get(name) {
                            format!(
                                "{}{}",
                                " ".repeat(nest_level * 4),
                                self.tree(namehash, nest_level + 1)
                            )
                        } else {
                            String::new()
                        })
                        .collect::<Vec<String>>()
                        .join("\r\n")
                )
            }
        )
    }

    pub fn add_api_key(&mut self, key: String, value: String) {
        kiprintln!("Current state of remote_api_keys: {:#?}", self.remote_api_keys);
        // Update the in-memory state.
        kiprintln!("Adding API key: {key} = {value}");
        self.remote_api_keys.insert(key.clone(), value.clone());
        self.save();
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

/// A response from the remote API
/// 
/// # Example
/// ```
/// let response = RemoteApiResponse {
///     id: "123".to_string(),
///     model: "gpt-3.5-turbo".to_string(),
///     role: "user".to_string(),
///     content: vec![ContentBlock {
///         type_: "text".to_string(),
///         text: "The meaning of life is 42".to_string(),
///     }],
///     stop_reason: None,
///     usage: Usage { input_tokens: 10, output_tokens: 20 },
/// };
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

/// Which type of message to send to the remote API
/// 
/// # Example
/// ```
/// let message = RemoteApiMessage::Anthropic(AnthropicMessage { content: "What is the meaning of life?".to_string() });
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub enum RemoteApiMessage {
    OpenAi(OpenAiMessage),
    Anthropic(AnthropicMessage)
}

/// Which remote API provider to use
/// 
/// # Example
/// ```
/// let provider = RemoteApiProvider::Anthropic;
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub enum RemoteApiProvider {
    OpenAi,
    Anthropic
}

/// A message to send to the OpenAI API
/// 
/// # Example
/// ```
/// let message = OpenAiMessage { content: "What is the meaning of life?".to_string() };
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct OpenAiMessage {
    pub role: String,
    pub content: String
}

/// A message to send to the Anthropic API
/// 
/// # Example
/// ```
/// let message = AnthropicMessage { content: "What is the meaning of life?".to_string() };
/// ```
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct AnthropicMessage {
    pub endpoint: String,
    pub headers: HashMap<String, String>,
    pub body: String, // maybe unnecessary
    pub content: String,
}

/// A node in the kimap
/// 
#[derive(Debug, Deserialize, Serialize, SerdeJsonInto, Clone)]
pub struct Node {
    /// everything that comes before a name, from root, with dots separating and a leading dot
    pub parent_path: String,
    /// the name of the node -- a string.
    pub name: String,
    /// the children of the node
    pub child_names: BTreeSet<String>,
    /// the node's data keys
    pub data_keys: BTreeMap<String, DataKey>,
}

/// A key in the node's data keys
/// 
/// Either a kimap Fact or a kimap Note
#[derive(Debug, Deserialize, Serialize, SerdeJsonInto, Clone)]
pub enum DataKey {
    /// facts are immutable
    Fact(eth::Bytes),
    /// notes are mutable: we store all versions of the note, most recent last
    /// if indexing full history, this will be the note's full history --
    /// it is also possible to receive a snapshot and not have updates from before that.
    Note(Vec<eth::Bytes>),
}

/// update api key. Which provider, and the value of the key.
#[derive(Debug, Serialize, Deserialize, SerdeJsonInto, Clone)]
pub struct ApiKeyUpdate {
    pub provider: RemoteApiProvider,
    pub key: String,
}