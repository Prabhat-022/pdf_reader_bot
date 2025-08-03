import express from 'express';
import cors from 'cors';
import { transformQuery, chatting } from './query.js';
import multer from 'multer'; ``
import bodyParser from 'body-parser';
import { createIndexing, DocumentIndexing, deleteIndexing } from './index.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public');
    },
    filename: function (req, file, cb) {
        // If the file is a PDF, always name it 'data.pdf'
        const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
        if (ext === '.pdf') {
            cb(null, 'data.pdf');
        } else {
            // Replace spaces in the filename (before extension) with underscores
            const name = file.originalname.substring(0, file.originalname.lastIndexOf('.')).replace(/\s+/g, '_');
            cb(null, name + ext);
        }
    }
});


app.post('/chat', async (req, res) => {
    console.log(req.body);
    const { question } = req.body;
    console.log('user question: ', question);
    const answer = await chatting(question);

    console.log('ai answer: ', answer);
    res.json({
        role: 'assistant',
        message: answer
    });
});

app.post('/upload', multer({ storage }).single('file'), async (req, res) => {
    console.log('file', req.file);
    const { filename } = req.file;
    let Index;

    if (!filename) {
        return res.status(400).json({ message: 'No file uploaded' });
    } else {
        const name = filename.split('.')[0].toLowerCase();

         Index = await createIndexing(name);
        if (Index) {
            await DocumentIndexing(filename, Index);
            res.json({ message: 'File uploaded successfully' });
        }
    }

    res.json({
        Index,
        success: true,
        message: 'File uploaded successfully'
    });
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
