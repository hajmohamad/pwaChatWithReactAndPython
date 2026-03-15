import { useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

export default function useDarkMode() {
    const { darkMode, setDarkMode, username } = useChatContext();

    useEffect(() => {
        if (username === "mohamad"|| username === "anita") {
            setDarkMode(true);
        }
    }, [username, setDarkMode]);

    useEffect(() => {
        document.body.classList.toggle('dark', darkMode);
    }, [darkMode]);

    const toggleDark = () => setDarkMode(prev => !prev);

    return { darkMode, toggleDark };
}
