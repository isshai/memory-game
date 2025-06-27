// Express server for memory game
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB!');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

const imageSchema = new mongoose.Schema({
    name: String, // e.g. pic1-a, pic1-b
    data: Buffer,
    contentType: String,
});
const Image = mongoose.model('Image', imageSchema);

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { originalname, buffer, mimetype } = req.file;
    const image = new Image({ name: originalname, data: buffer, contentType: mimetype });
    await image.save();
    res.json({ message: 'Image uploaded', id: image._id });
});

// Get all images (metadata only) from the 'photos' collection
app.get('/api/imagess', async (req, res) => {
    const db = mongoose.connection.useDb('memorygame');
    const Photo = db.model('Photo', new mongoose.Schema({
        name: String,
        data: Buffer,
        contentType: String,
    }, { collection: 'photos' }));
    const images = await Photo.find({}, 'name');
    res.json({ images: images.map(img => `/api/image/${img._id}`) });
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.join(__dirname, 'temp');
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

// Serve image by id from the 'photos' collection
app.get('/api/image/:id', async (req, res) => {
    const db = mongoose.connection.useDb('memorygame');
    const Photo = db.model('Photo', new mongoose.Schema({
        name: String,
        data: Buffer,
        contentType: String,
    }, { collection: 'photos' }));
    const img = await Photo.findById(req.params.id);
    if (!img) return res.status(404).send('Not found');
    res.set('Content-Type', img.contentType);
    res.send(img.data);
});

// One-time API to upload all images from the images folder to MongoDB (collection: photos)
import { readdirSync, readFileSync } from 'fs';

// Fix for collection name error: use mongoose.connection.useDb to ensure correct DB context
app.post('/api/init-upload-images', async (req, res) => {
    try {
        console.log('Starting one-time upload of images to MongoDB collection "photos"...');
        const db = mongoose.connection.useDb('memorygame');
        const Photo = db.model('Photo', new mongoose.Schema({
            name: String,
            data: Buffer,
            contentType: String,
        }, { collection: 'photos' }));
        const imagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'images');
        const files = readdirSync(imagesDir);
        let uploaded = 0;
        for (const file of files) {
            // Skip non-image files
            if (!/\.(jpg|jpeg|png|gif)$/i.test(file)) continue;
            // Check if already exists in DB
            const exists = await Photo.findOne({ name: file });
            if (exists) continue;
            const data = readFileSync(path.join(imagesDir, file));
            const contentType = `image/${file.split('.').pop().toLowerCase()}`;
            await Photo.create({ name: file, data, contentType });
            uploaded++;
        }
        res.json({ message: `Uploaded ${uploaded} new images to MongoDB collection 'photos'.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Download all photos from DB to /temp folder on server start ---
async function downloadAllPhotosToTemp() {
    try {
        // Use the Photo model for the 'photos' collection
        const db = mongoose.connection.useDb('memorygame');
        const Photo = db.model('Photo', new mongoose.Schema({
            name: String,
            data: Buffer,
            contentType: String,
        }, { collection: 'photos' }));
        const photos = await Photo.find({});
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        for (const photo of photos) {
            const filePath = path.join(tempDir, photo.name);
            fs.writeFileSync(filePath, photo.data);
        }
        console.log(`Downloaded ${photos.length} photos to /temp`);
    } catch (err) {
        console.error('Error downloading photos to /temp:', err);
    }
}

// Call the function after MongoDB is connected
mongoose.connection.once('open', downloadAllPhotosToTemp);

// Serve React build (client/dist) in production
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
