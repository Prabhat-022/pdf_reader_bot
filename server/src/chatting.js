
import * as dotenv from 'dotenv';
dotenv.config();
import readlineSync from 'readline-sync';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
let History = [];

console.log('pinecone index name: ', process.env.PINECONE_INDEX_NAME);
console.log('History: ', History);

async function transformQuery(question) {

    History.push({
        role: 'user',
        parts: [{ text: question }]
    })

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: History,
        config: {
            systemInstruction: `You are a query rewriting expert. Based on the provided chat history, rephrase the "Follow Up user Question" into a complete, standalone question that can be understood without the chat history.
            Only output the rewritten question and nothing else.
          `,
        },
    });

    History.pop()

    return response.text

}

export async function chatting(userProblem) {
    // console.log('History: ', History);

    // const queries = await transformQuery(userProblem);
    // console.log('queries: ', queries);
    History.push({
        role: 'user',
        parts: [{ text: userProblem }]
    })

    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'text-embedding-004',
    });


    const queryVector = await embeddings.embedQuery(userProblem);
    //  query vector
    // make connection with pinecone
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);


    const searchResults = await pineconeIndex.query({
        topK: 10,
        vector: queryVector,
        includeMetadata: true,
    });

    //   console.log(searchResults);  

    //   top 10 documents: 10 metadata text part 10 documebnt

    const context = searchResults.matches
        .map(match => match.metadata.text)
        .join("\n\n---\n\n");

    History.push({
        role: 'user',
        parts: [{ text: context }]
    })

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: History,
        config: {
            systemInstruction: `You have to behave like a pdf Expert.
        You will be given a context of relevant information and a user question.
        Your task is to answer the user's question based ONLY on the provided context.
        If the answer is not in the context, you must say "I could not find the answer in the provided document."
        Keep your answers clear, concise, and educational.

          Context: ${context}
          `,
        },
    });

    History.push({
        role: 'model',
        parts: [{ text: response.text }]
    })

    console.log("\n");
    return response.text;
}

// async function main() {
//     const userProblem = readlineSync.question("Ask me anything--> ");
//     const response = await chatting(userProblem);

//     console.log('response: ', response);
//     main();
// }


// main();