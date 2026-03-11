const SECRET_KEY = 'my_super_secret_chat_key_12345';

async function getKey() {
    const enc    = new TextEncoder();
    const raw    = enc.encode(SECRET_KEY);
    const padded = new Uint8Array(32);
    padded.set(raw.slice(0, 32));
    return crypto.subtle.importKey('raw', padded, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function ab2b64(buf) {
    let s = '';
    new Uint8Array(buf).forEach(b => s += String.fromCharCode(b));
    return btoa(s);
}

function b642u8(b64) {
    return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

export async function encryptText(text) {
    if (!text) return text;
    const key       = await getKey();
    const iv        = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)
    );
    return 'ENC:' + ab2b64(iv) + ':' + ab2b64(encrypted);
}

export async function decryptText(cipher) {
    if (typeof cipher !== 'string' || !cipher.startsWith('ENC:')) return cipher || '';
    const parts = cipher.slice(4).split(':');
    if (parts.length !== 2) return cipher;
    try {
        const iv        = b642u8(parts[0]);
        const data      = b642u8(parts[1]);
        const key       = await getKey();
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new TextDecoder().decode(decrypted);
    } catch {
        return '[رمزگشایی ناموفق]';
    }
}
