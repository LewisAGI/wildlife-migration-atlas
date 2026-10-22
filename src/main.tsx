import 'maplibre-gl/dist/maplibre-gl.css';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './style.css';

const root = document.querySelector('#app');
if (!root) throw new Error('Missing #app');
createRoot(root).render(<App />);
