import { encryptText, decryptText } from '../utils/encryption';
export default function useEncryption() {
    return { encryptText, decryptText };
}
