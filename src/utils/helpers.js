export function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function nowTime() {
    return new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export async function readFileAsBase64(file) {
    const MAX_DIM  = 1280;
    const QUALITY  = 0.5;
    const MAX_SIZE = 5 * 1024 * 1024;

    if (!file.type.startsWith('image/')) {
        throw new Error('فقط فایل تصویری پذیرفته می‌شود');
    }
    if (file.size > MAX_SIZE) {
        throw new Error('حجم فایل بیشتر از ۵ مگابایت است');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIM) / width);
                        width  = MAX_DIM;
                    } else {
                        width  = Math.round((width * MAX_DIM) / height);
                        height = MAX_DIM;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width  = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', QUALITY));
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
