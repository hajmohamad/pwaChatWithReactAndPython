import { decryptText } from './encryption';
import { MessageCache } from './messageCache';

function isDirectImageSource(value) {
    return (
        value.startsWith('data:image/') ||
        value.startsWith('blob:') ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/')
    );
}

export async function resolveMessageImageSource(image) {
    if (image === null || image === undefined) {
        return { src: null, revoke: false };
    }

    if (typeof image === 'string') {
        if (isDirectImageSource(image)) {
            return { src: image, revoke: false };
        }

        if (image.startsWith('ENC:') || image.startsWith('XOR:')) {
            const decrypted = await decryptText(image);
            return { src: decrypted, revoke: false };
        }

        const blob = await MessageCache.getImage(image);
        if (blob) {
            return { src: URL.createObjectURL(blob), revoke: true };
        }

        const decrypted = await decryptText(image);
        return { src: decrypted, revoke: false };
    }

    const blob = await MessageCache.getImage(image);
    if (blob) {
        return { src: URL.createObjectURL(blob), revoke: true };
    }

    return { src: null, revoke: false };
}
