import axios from 'axios';

// ============================================
// CHANGE THIS to your computer's IP if needed
// Find IP: Mac/Linux → ifconfig | Windows → ipconfig
// ============================================
const API_URL = 'http://192.168.100.76:5001/api';

const API = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default API;
