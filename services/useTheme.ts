import { useState, useCallback, useEffect } from 'react';

export const THEME_KEY = 'socflow-theme';

export const getTheme = (): 'light' | 'dark' =>
    (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'dark';

export const useTheme = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(getTheme());

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem(THEME_KEY, next);
            document.documentElement.setAttribute('data-theme', next);
            if (next === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return next;
        });
    }, []);

    return { theme, toggleTheme };
};
