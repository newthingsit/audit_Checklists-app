import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import './styles/animations.css';
import App from './App';

// Configure axios base URL for API calls
const API_URL = process.env.REACT_APP_API_URL || '';
if (API_URL) {
  axios.defaults.baseURL = API_URL;
}
console.log('API Base URL:', API_URL || 'Using relative URLs');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

