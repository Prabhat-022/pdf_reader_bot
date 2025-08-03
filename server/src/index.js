
// PDF load karne ka index.js file
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import fs from 'fs';


import * as dotenv from 'dotenv';
dotenv.config('./env');


export async function createIndexing(pdfName) {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

    // Check if index exists
    const existingIndexes = await pc.listIndexes();
    console.log("Existing indexes:", existingIndexes);

    // Pinecone v2 returns { indexes: [...] }
    const indexNames = (existingIndexes.indexes || []).map(idx => idx.name);

    // If the index already exists, delete it

    if (indexNames.includes(pdfName)) {

        console.log(`Index '${pdfName}' already exists. Deleting...`);
        await deleteIndexing(pdfName);

    }

    const vectorStore = await pc.createIndex({
        name: pdfName,
        vectorType: 'dense',
        dimension: 768,
        metric: 'cosine',
        spec: {
            serverless: {
                cloud: 'aws',
                region: 'us-east-1'
            }
        },
        deletionProtection: 'disabled',
        tags: { environment: 'development' },
    });

    console.log("Indexing complete");
    console.log("vectorStore", vectorStore);
    return vectorStore;


}

// delete indexing  in pinecone
export async function deleteIndexing(pdfName) {
    const pinecone = new Pinecone();
    await pinecone.deleteIndex(pdfName);
    console.log("Indexing deleted");
    return true;
}


export async function DocumentIndexing(pdfName, vectorStores) {
    console.log("vectorStores", vectorStores);
    try {
        console.log(`Starting document indexing for: ${pdfName}`);

        // 1. Load PDF
        const PDF_PATH = `./public/${pdfName}`;
        console.log(`Loading PDF from: ${PDF_PATH}`);

        const pdfLoader = new PDFLoader(PDF_PATH);
        const rawDocs = await pdfLoader.load();
        console.log(`PDF loaded successfully: ${rawDocs.length} pages`);

        if (rawDocs.length === 0) {
            throw new Error("No content found in PDF");
        }

        // 2. Chunk PDF
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chunkedDocs = await textSplitter.splitDocuments(rawDocs);
        console.log(`PDF chunked successfully: ${chunkedDocs.length} chunks`);

        if (chunkedDocs.length === 0) {
            throw new Error("No chunks created from PDF");
        }

        // 3. Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        console.log("Pinecone client initialized");

        // 4. Get Pinecone index
        const indexName = `${vectorStores.name}`;
        if (!indexName) {
            throw new Error("PINECONE_INDEX_NAME environment variable not set");
        }

        console.log(`Connecting to index: ${indexName}`);
        const index = pinecone.index(indexName);

        // Check if index exists by trying to describe it
        try {
            const indexStats = await index.describeIndexStats();
            console.log("Index stats:", indexStats);
        } catch (error) {
            throw new Error(`Index '${indexName}' not found or not accessible: ${error.message}`);
        }

        // 5. Initialize embedding model
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'text-embedding-004',
        });
        console.log("Embedding model initialized");

        // Test embedding with a sample text
        try {
            const testEmbedding = await embeddings.embedQuery("test");
            console.log(`Embedding dimension: ${testEmbedding.length}`);
        } catch (error) {
            throw new Error(`Embedding test failed: ${error.message}`);
        }

        // 6. Add metadata to chunks for better organization
        const documentsWithMetadata = chunkedDocs.map((chunk, index) => ({
            ...chunk,
            metadata: {
                ...chunk.metadata,
                source: pdfName,
                chunkIndex: index,
                timestamp: new Date().toISOString(),
            }
        }));

        console.log("Starting to store embeddings in Pinecone...");

        // 7. Store embeddings in Pinecone with better error handling
        const vectorStore = await PineconeStore.fromDocuments(
            documentsWithMetadata,
            embeddings,
            {
                pineconeIndex: index,
                maxConcurrency: 3, // Reduced concurrency to avoid rate limits
                namespace: `pdf_${pdfName.replace(/[^a-zA-Z0-9]/g, '_')}`, // Optional: use namespace
            }
        );

        console.log("***Data saved successfully to Pinecone***");

        // 8. Verify data was stored
        const indexStats = await index.describeIndexStats();
        console.log("Updated index stats:", indexStats);

        //delete the file after indexing
        fs.unlinkSync(`./public/${pdfName}`);


        return {
            success: true,
            chunksProcessed: chunkedDocs.length,
            indexStats: indexStats
        };

    } catch (error) {
        console.error("Error during document indexing:", error);

        // More detailed error logging
        if (error.response) {
            console.error("API Response Error:", error.response.data);
        }
        if (error.request) {
            console.error("Request Error:", error.request);
        }

        throw error; // Re-throw to handle upstream
    }
}

// deleteIndexing('dsa');