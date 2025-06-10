// Express server for memory game
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.join(__dirname, 'images');
app.use('/images', express.static(imagesDir));

app.get('/api/images', (req, res) => {
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read images directory' });
        }
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|svg)$/i.test(f));
        const images = imageFiles.map(f => `/images/${f}`);
        res.json({ images });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
