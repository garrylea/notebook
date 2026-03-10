import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.VITE_PORT || 1111;
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

console.log(`Starting frontend proxy server...`);
console.log(`Port: ${port}`);
console.log(`API Target: ${apiTarget}`);

app.use('/api', createProxyMiddleware({ target: apiTarget, changeOrigin: true }));
app.use('/uploads', createProxyMiddleware({ target: apiTarget, changeOrigin: true }));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Frontend production server running at http://0.0.0.0:${port}`);
    console.log(`Proxying API requests to ${apiTarget}`);
});
