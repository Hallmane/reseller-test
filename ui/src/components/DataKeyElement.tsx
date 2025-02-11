import React, { useState } from 'react';

export interface DataKey {
    Note?: string[],
    Fact?: string
}

interface DataKeyElementProps {
    dataKey: string;
    dataValue: DataKey;
}

export const DataKeyElement: React.FC<DataKeyElementProps> = ({ dataKey, dataValue }) => {
    const [valueVisible, setValueVisible] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const toggleValue = () => setValueVisible(!valueVisible);

    const handleCopy = async (hexString: string) => {
        try {
            // Decode the hex string first
            const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
            const hexPairs = cleanHex.match(/.{1,2}/g);
            if (!hexPairs) return;
            const bytes = new Uint8Array(hexPairs.map(byte => parseInt(byte, 16)));
            const decoded = new TextDecoder('utf-8').decode(bytes);
            
            // Try to parse as JSON and format it nicely
            try {
                const parsed = JSON.parse(decoded);
                const formatted = JSON.stringify(parsed, null, 2);
                await navigator.clipboard.writeText(formatted);
            } catch {
                // If not JSON, just copy the decoded string
                await navigator.clipboard.writeText(decoded);
            }
            
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const formatJSON = (text: string) => {
        try {
            // Try to parse and format as JSON
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed, null, 2)
                .replace(/(".*?")/g, '<span class="json-string">$1</span>')
                .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>')
                .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
                .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
                .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
                .replace(/[{]/g, '<span class="json-brace">{</span>')
                .replace(/[}]/g, '<span class="json-brace">}</span>')
                .replace(/\[/g, '<span class="json-bracket">[</span>')
                .replace(/\]/g, '<span class="json-bracket">]</span>');
        } catch {
            return text;
        }
    };

    const tryParseUtf8 = (hexString: string) => {
        try {
            const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
            const hexPairs = cleanHex.match(/.{1,2}/g);
            if (!hexPairs) return hexString;
            const bytes = new Uint8Array(hexPairs.map(byte => parseInt(byte, 16)));
            const decoded = new TextDecoder('utf-8').decode(bytes);
            
            // Try to parse as JSON first
            try {
                return formatJSON(decoded);
            } catch {
                // If it's not JSON, return the decoded string if it's printable ASCII
                if (/^[\x20-\x7E]*$/.test(decoded)) {
                    return decoded;
                }
            }
        } catch (error) {
            console.warn('Failed to parse as UTF-8:', error);
        }
        return hexString;
    };

    return (
        <div className="data-key">
            <span className="data-key-label">{dataKey}</span>
            <button className="info-button" onClick={toggleValue}>📄</button>
            {valueVisible && (
                <div className="info-container">
                    {dataValue.Note && (
                        <div className="note-history">
                            <div className="note-history-label">
                                Note History (newest to oldest):
                                <button 
                                    className={`copy-button ${copySuccess ? 'success' : ''}`}
                                    onClick={() => handleCopy(dataValue.Note!.join('\n'))}
                                >
                                    {copySuccess ? '✓' : '📋'}
                                </button>
                            </div>
                            {[...dataValue.Note].reverse().map((note, index) => (
                                <div key={index} className="note-revision">
                                    <span className="revision-number">V.{dataValue.Note!.length - index}:</span>
                                    <div dangerouslySetInnerHTML={{ __html: tryParseUtf8(note) }} />
                                </div>
                            ))}
                        </div>
                    )}
                    {dataValue.Fact && (
                        <div>
                            <button 
                                className={`copy-button ${copySuccess ? 'success' : ''}`}
                                onClick={() => handleCopy(dataValue.Fact!)}
                            >
                                {copySuccess ? '✓' : '📋'}
                            </button>
                            <div dangerouslySetInnerHTML={{ __html: tryParseUtf8(dataValue.Fact) }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataKeyElement;