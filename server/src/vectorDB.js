
//create the vectorIndex 
//load the pdf file
//creating chunk of text
//than upload to pinecone
//then create the query
import * as dotenv from 'dotenv';
dotenv.config();

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

const pinecone = new Pinecone();


//create index or create the database name
export async function createIndex() {
    try {
        // Check if index exists using listIndexes()
        const indexList = await pinecone.listIndexes();
        const indexExists = indexList.indexes?.some(index => index.name === process.env.PINECONE_INDEX_NAME);
        
        if (indexExists) {
            await deleteIndex(process.env.PINECONE_INDEX_NAME);
            console.log('Index deleted successfully');
        }
        
        await pinecone.createIndex({
            name: process.env.PINECONE_INDEX_NAME,
            dimension: 768,
            metric: 'cosine', // or 'euclidean', 'dotproduct'
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            },
            waitUntilReady: true,
        });
        console.log('Index created successfully');

    } catch (error) {

        console.error('Error creating index:', error);

        if (error.message?.includes('already exists')) {
            console.log('Index already exists');
        }
    }
}

//delete the index after one day 
export async function deleteIndex(indexName) {
    try {
        await pinecone.deleteIndex(indexName);
        console.log('Index deleted successfully');
    } catch (error) {
        console.error('Error deleting index:', error);
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
            console.log('Index does not exist');
        }
    }
}

//delete the index after one day 
setInterval(() => {
    deleteIndex(process.env.PINECONE_INDEX_NAME);
}, 24 * 60 * 60 * 1000);

//load the pdf from the public folder and split the text into chunks
export async function loadPDF(file) {
    try {
        const PDF_PATH = `./public/${file}`;
        const pdfLoader = new PDFLoader(PDF_PATH);
        const rowDocs = await pdfLoader.load();

        console.log('PDF loaded successfully');

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunkedDocs = await textSplitter.splitDocuments(rowDocs);
        console.log("Chunking Completed");
        saveInDatabase(chunkedDocs);

    } catch (error) {
        console.error(error);
        console.log('Failed to load PDF');
    }
}

//save the chunked documents in the database
export async function saveInDatabase(chunkedDocs) {
    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'text-embedding-004',
        });

        console.log("Embedding model configured")
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
        console.log("Pinecone configured")

        try {
            await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
                pineconeIndex,
                maxConcurrency: 5,
            });
            console.log("***Data Stored succesfully***");

        } catch (error) {
            console.error(error);
            console.log('Failed to save in database');
        }
        console.log("***Data Stored succesfully***");

    } catch (error) {
        console.error(error);
        console.log('Failed to save in database');
    }
}
