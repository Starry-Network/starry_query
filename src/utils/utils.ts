export function hexToString(hex: string): string {{
    return Buffer.from(hex.toString().slice(2), "hex").toString()
}}