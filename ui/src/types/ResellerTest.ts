export interface ResellerApiPacket {
    provider: 'Anthropic' | 'OpenAi';
    message: string;
}

export interface ResellerApiResponse {
    response: string;
}

export interface ApiKeyUpdate {
    provider: 'Anthropic' | 'OpenAi';
    key: string;
  }

export type HttpResponse = {
  Json?: ResellerApiResponse;
  Node?: Node;
  Text?: string;
}