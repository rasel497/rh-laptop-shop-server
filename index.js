const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


// MongoDB connections
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mpr3cem.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(client);


// Start MongoDb collection acsess
async function run() {
    try {
        const categoriesCollection = client.db("laptopShop").collection("homeCategories");


        app.get('/homeCategories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

    }
    finally {

    }
}
run().catch(console.log);


// Initial and Basic Setup
app.get('/', (req, res) => {
    res.send('RH-Laptop-Shop is running...');
});

app.listen(port, () => {
    console.log(`RH-Laptop-Shop is running: ${port}`);
});