export interface ResellerApiPacket {
    provider: 'OpenAi' | 'Anthropic';
    message: string;
}

export interface ResellerApiResponse {
    response: string;
}

export interface ApiKeyUpdate {
    provider: 'Anthropic' | 'OpenAi';
    key: string;
  }