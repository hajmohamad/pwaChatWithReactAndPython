import { useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

export default function useDarkMode() {
    const { darkMode, setDarkMode } = useChatContext();

    useEffect(() => {
        document.body.classList.toggle('dark', darkMode);
    }, [darkMode]);

    const toggleDark = () => setDarkMode(prev => !prev);

    return { darkMode, toggleDark };
}
