const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB connections
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mpr3cem.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(client);

// Added JWT acces toke::after check jwt localStorage Then decleare this function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    // console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    // console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            console.log(err);
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

// Start MongoDb collection acsess
async function run() {
    try {
        const categoriesCollection = client.db("laptopShop").collection("homeCategories");
        const productsCollection = client.db("laptopShop").collection("productsCategory");
        const usersCollection = client.db("laptopShop").collection("users");
        const bookingsCollection = client.db("laptopShop").collection("bookings");
        const paymentsCollection = client.db("laptopShop").collection("payments");

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

        // Add Product get
        app.get('/brandNames', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).project({ brandName: 1 }).toArray();
            res.send(result);
        });

        // post & create new product in MongoDb stores
        app.post('/addproduct', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        // booikg post save Booking to MongoDB database
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const query = {
                productTitle: booking.productTitle,
                buyerEmail: booking.buyerEmail,
                meetLocation: booking.meetLocation
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.appoinmentDate}`;
                return res.send({ acknowledged: false, message });
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        // using for stripe payment from: https://stripe.com/docs/payments/quickstart
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        });

        //  save paymet price in database
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // after post api now get my bookings myorder
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { buyerEmail: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        // using for pay option click pay work bellow
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
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

        // 03.check buyer or not Then access & show spacific routes
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role == 'buyer' });
            // console.log(user);
        });

        //  Update set users admin role in update user
        app.put('/users/admin/:id', async (req, res) => {
            // verifyAdmin func niye jawr por upore call kore, ei code comment korsi [86-91]
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden accesss' })
            }
        });

        // get all users
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        // delete seller and buyer
        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await usersCollection.deleteOne(query);
            res.send(user);
        });
        productTitle: data.productTitle,
            // sellerVerified
            app.put('/sellerVerified/:id', async (req, res) => {
                const id = req.params.id;
                // console.log(id);
                const filter = { _id: ObjectId(id) };
                const option = {
                    upsert: true
                }
                const docUpdate = {
                    $set: {
                        isVerified: true
                    }
                }
                const result = await usersCollection.updateOne(filter, docUpdate, option);
                res.send(result);
            });

        // Reported items
        app.get('/reportedproducts', async (req, res) => {
            const query = { isReported: true };
            const reportedproducts = await productsCollection.find(query).toArray();
            res.send(reportedproducts);
        });

        // Put Reported items
        app.put('/reportedproducts/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    isReported: true
                }
            };
            const reportedproducts = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(reportedproducts);
        });

        // reportedproducts deletes
        app.delete('/reportedproducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await productsCollection.deleteOne(query);
            res.send(user);
        });
        // temporary data insert in databases == send from Thander Client
        // app.get('/addTepmData', async (req, res) => {
        //     const filter = {}
        //     const options = { upsert: true }
        //     const updatedDoc = {
        //         $set: {
        //             productStatus: "Excellent"
        //         }
        //     }
        //     const result = await productsCollection.updateMany(filter, updatedDoc, options);
        //     res.send(result);
        // });

        // my products for seller
        app.get('/myproducts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
            // console.log(email) 
        });

        // myproduct
        app.delete('/myproduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        // Put advertiseds items
        app.put('/advertiseds/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    isAdvertiseds: true
                }
            };
            const reportedproducts = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(reportedproducts);
        });

        // my advertiseds for seller
        app.get('/advertiseds', async (req, res) => {
            const query = { isAdvertiseds: true }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });
    }
    finally { }
}
run().catch(console.log);

// Initial and Basic Setup
app.get('/', (req, res) => {
    res.send('RH-Laptop-Shop is running...');
});
app.listen(port, () => {
    console.log(`RH-Laptop-Shop is running: ${port}`);
});