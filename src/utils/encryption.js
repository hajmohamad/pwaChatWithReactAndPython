const SECRET_KEY = 'my_super_secret_chat_key_12345';

// Check if Web Crypto API is available (requires HTTPS / secure context)
const isCryptoAvailable =
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined';

// ─── XOR-based fallback for HTTP / non-secure contexts ───────────────────────
function xorEncrypt(text, key) {
    const textBytes = new TextEncoder().encode(text);
    const keyBytes  = new TextEncoder().encode(key);
    const out = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
        out[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    let s = '';
    out.forEach(b => s += String.fromCharCode(b));
    return 'XOR:' + btoa(s);
}

function xorDecrypt(cipher) {
    if (!cipher.startsWith('XOR:')) return cipher;
    try {
        const bytes    = Uint8Array.from(atob(cipher.slice(4)), c => c.charCodeAt(0));
        const keyBytes = new TextEncoder().encode(SECRET_KEY);
        const out      = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }
        return new TextDecoder().decode(out);
    } catch {
        return '[رمزگشایی ناموفق]';
    }
}

// ─── AES-GCM helpers ──────────────────────────────────────────────────────────
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

// ─── Public API ───────────────────────────────────────────────────────────────
export async function encryptText(text) {
    if (!text) return text;

    if (!isCryptoAvailable) {
        return xorEncrypt(text, SECRET_KEY);
    }

    const key       = await getKey();
    const iv        = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)
    );
    return 'ENC:' + ab2b64(iv) + ':' + ab2b64(encrypted);
}

export async function decryptText(cipher) {
    if (typeof cipher !== 'string') return '';
    if (!cipher) return '';

    // XOR fallback cipher (sent from HTTP context)
    if (cipher.startsWith('XOR:')) {
        return xorDecrypt(cipher);
    }

    // AES-GCM cipher
    if (cipher.startsWith('ENC:')) {
        if (!isCryptoAvailable) {
            // crypto.subtle unavailable (HTTP) — cannot decrypt AES, show placeholder
            return '[نیاز به HTTPS برای رمزگشایی]';
        }
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

    // Plain text (unencrypted message)
    return cipher;
}
