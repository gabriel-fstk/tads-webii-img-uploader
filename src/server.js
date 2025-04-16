// src/server.js
import express from 'express';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'public/uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
const IMAGES_FILE = path.resolve(__dirname, '..', 'images.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.urlencoded({ extended: true }));

let images = [];

if (fs.existsSync(IMAGES_FILE)) {
    try {
      const raw = fs.readFileSync(IMAGES_FILE, 'utf-8');
      images = raw.trim() ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Erro ao ler images.json:", err.message);
      images = [];
    }
}else
    fs.writeFileSync(IMAGES_FILE, '[]');  

const saveImages = () => fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));
const IMAGES_PER_PAGE = 6;

app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const totalPages = Math.ceil(images.length / IMAGES_PER_PAGE);
  const start = (page - 1) * IMAGES_PER_PAGE;
  const paginated = images.slice().reverse().slice(start, start + IMAGES_PER_PAGE);
  res.render('template', {
    images: paginated,
    currentPage: page,
    totalPages
  });
});

app.post('/upload', (req, res) => {
  const form = formidable({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE,
    multiples: false
  });

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(400).send('Erro no upload: ' + err.message);

    const file = files.photo?.[0];
    const title = fields.title || '';

    if (!file) return res.status(400).send('Arquivo não enviado.');

    const validTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'];
    console.log('Tipo de arquivo:', file.mimetype);
    if (!validTypes.includes(file.mimetype?.toLowerCase())) {
        if (file.filepath)
            fs.unlinkSync(file.filepath);
      return res.status(400).send('Formato de imagem inválido. Use JPG, PNG ou GIF.');
    }

    const url = '/uploads/' + path.basename(file.filepath);
    images.push({ url, title });
    saveImages();
    res.redirect('/');
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
