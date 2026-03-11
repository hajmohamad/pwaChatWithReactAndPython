const SECRET_KEY = 'my_super_secret_chat_key_12345';

function getKeyBytes() {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < SECRET_KEY.length && i < 32; i++) {
        bytes[i] = SECRET_KEY.charCodeAt(i);
    }
    return bytes;
}

let _cachedKey = null;

async function getKey() {
    if (_cachedKey) return _cachedKey;
    _cachedKey = await crypto.subtle.importKey(
        'raw',
        getKeyBytes(),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
    return _cachedKey;
}

export async function encryptText(text) {
    try {
        const key = await getKey();
        const iv  = crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder().encode(text);
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
        const ivB64  = btoa(String.fromCharCode(...iv));
        const ctB64  = btoa(String.fromCharCode(...new Uint8Array(cipher)));
        return `ENC:${ivB64}:${ctB64}`;
    } catch {
        return text;
    }
}

export async function decryptText(cipher) {
    if (!cipher || !cipher.startsWith('ENC:')) return cipher;
    try {
        const key = await getKey();
        const [, ivB64, ctB64] = cipher.split(':');
        const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
        const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
        const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        return new TextDecoder().decode(dec);
    } catch {
        return '[رمزگشایی ناموفق]';
    }
}
