const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const productsCollection = client.db("laptopShop").collection("productsCategory");
        const usersCollection = client.db("laptopShop").collection("users");

        // get homeCategory from MongoDb
        app.get('/homeCategories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        // get productsCategory from MongoDb
        app.get('/productsCategory', async (req, res) => {
            const query = {};
            const categories = await productsCollection.find(query).toArray();
            res.send(categories);
        });

        // get jwt token step-01 then step-02 client signUp.js 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '30D' });
                return res.send({ accessToken: token });
            }
            // console.log(user); //check first time without [L-47-50]
            res.status(403).send({ accessToken: '' });
        });


        // create users save to MongoDb store
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // get id wise spacific single product card
        app.get("/catagory/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const catagory = await categoriesCollection.findOne(query)
            const brandName = catagory.brandName;
            const filter = { brandName: brandName }
            const result = await productsCollection.find(filter).toArray()
            res.send(result)
        });


        // 01.check admin or not Then access & isAdmin show spacific routes
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role == 'admin' });
        });

        // 02.check seller or not Then access & show spacific routes
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role == 'seller' });
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