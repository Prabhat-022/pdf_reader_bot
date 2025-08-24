import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
import { createIndex, loadPDF } from '../src/vectorDB.js';
import { chatting } from '../src/chatting.js';


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get('/get', (req, res) => {
    res.json({
        message: 'Hello World'
    });
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const { originalname, filename } = req.file;
    console.log('file: ',  req.file);   



    if (!filename) {
        return res.status(400).json({
            message: 'No file uploaded'
        });
    }

    createIndex();
    loadPDF(filename);
    res.json({
        role: 'assistant',
        message: 'File uploaded successfully'
    });
});

app.post('/chat', async (req, res) => {
    const { question } = req.body;

    console.log('question: ', question);

    const answer = await chatting(question);
    res.json({
        role: 'assistant',
        message: answer
    });

});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
