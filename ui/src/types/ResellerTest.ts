export interface ResellerTestMessage {
  author: string
  content: string
}

export interface NewMessage {
  reseller_test: string
  author: string
  content: string
}

export interface SendResellerTestMessage {
  Send: {
    target: string
    message: string
  }
}

// ResellerTests consists of a map of counterparty to an array of messages
export interface ResellerTests {
  [counterparty: string]: ResellerTestMessage[]
}
