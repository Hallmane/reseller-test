export interface ResellerApiPacket {
    provider: 'OpenAi' | 'Anthropic';
    message: string;
}

export interface ResellerApiResponse {
    response: string;
}