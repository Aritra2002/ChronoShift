import App from './App.js';
import { COLORS } from './constants.js';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    React.createElement(MaterialUI.ThemeProvider, {
        theme: MaterialUI.createTheme({
            palette: {
                primary: { main: COLORS.primary },
                secondary: { main: COLORS.secondary },
                background: { default: COLORS.bg }
            },
            typography: { fontFamily: 'Rajdhani, sans-serif' }
        })
    }, 
    React.createElement(MaterialUI.CssBaseline),
    React.createElement(App))
);
