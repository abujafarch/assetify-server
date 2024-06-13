const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { config } = require('dotenv');
const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f46fr3f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const database = client.db('assetify')
        const userCollection = database.collection('users')
        const companyCollection = database.collection('companies')
        const assetCollection = database.collection('assets')
        const assetRequestCollection = database.collection('assetRequests')


        //employee users create and send to database
        app.post('/users', async (req, res) => {
            const user = req.body
            console.log("i am user", user)
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        // hrManager users create and send to database
        app.post('/hr-users', async (req, res) => {
            const user = req.body
            const hrInsertingInfo = await userCollection.insertOne(user)
            if (hrInsertingInfo?.insertedId) {
                const companyName = user.companyName
                const hrId = hrInsertingInfo.insertedId
                const companyLogo = user.image
                const hrEmail = user.email
                const hrName = user.name

                const company = { companyName, hrEmail, hrId, companyLogo, hrName }
                const companyInsertingInfo = await companyCollection.insertOne(company)

                res.send({ hrInsertingInfo, companyInsertingInfo })
            }

        })

        //updating package limit information
        app.put('/package/:email', async (req, res) => {
            const email = req.params.email
            const purchasingPackage = parseInt(req.body.purchasingPackage)
            const filter = { hrEmail: email }
            const updatedDoc = {
                $set: {
                    package: purchasingPackage
                }
            }
            const result = await companyCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //getting company information
        app.get('/company/:email', async (req, res) => {
            const email = req.params.email
            const query = { hrEmail: email }
            const result = await companyCollection.findOne(query)
            res.send(result)
        })

        //getting employee info
        app.get('/employee-info/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const employee = await userCollection.findOne(query)
            if (employee.hired) {
                const query = { _id: new ObjectId(employee.companyId) }
                const companyInfo = await companyCollection.findOne(query)
                employee.companyName = companyInfo.companyName
                employee.companyLogo = companyInfo.companyLogo
                employee.hrName = companyInfo.hrName
                res.send(employee)
            }
            else {
                res.send(employee)
            }

        })

        //getting myCompany assets 
        app.get('/myCompany-assets/:companyId', async (req, res) => {
            const companyId = req.params.companyId
            const query = { companyId: companyId }
            const result = await assetCollection.find(query).toArray()
            res.send(result)
        })

        //getting my assets of employee
        app.get('/my-assets/:email', async (req, res) => {
            const email = req.params.email
            const query = { requesterEmail: email }
            const result = await assetRequestCollection.find(query).toArray()
            // console.log(result);
            res.send(result)
        })

        //deleting requested item 
        app.delete('/requested-item/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await assetRequestCollection.deleteOne(query)
            res.send(result)
        })

        //getting all requests of employees
        app.get('/all-requests/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                $and: [{ companyId: id }, { status: 'pending' }]
            }
            const result = await assetRequestCollection.find(query).toArray()
            res.send(result)
        })

        //approving asset process
        app.put('/approve-asset/:id', async (req, res) => {
            const id = req.params.id
            const filter = { assetId: id }
            const updatedDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const approvalResult = await assetRequestCollection.updateOne(filter, updatedDoc)
            if (approvalResult.modifiedCount > 0) {
                const assetDecrement = await assetCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { quantity: -1 } })
                res.send(assetDecrement)
            }
        })

        //rejecting employee request
        app.delete('/reject-asset/:assetId', async (req, res) => {
            const assetId = req.params.assetId
            const query = { assetId: assetId }
            const result = await assetRequestCollection.deleteOne(query)
            res.send(result)
        })

        //getting users requests functionality
        app.get('/users-requests/:companyId', async (req, res) => {
            const id = req.params.companyId
            const query = { companyId: id }
            const result = await assetRequestCollection.find(query).limit(5).toArray()
            res.send(result)
        })

        //getting my team information for a employee
        app.get('/my-team/:companyId', async (req, res) => {
            const companyId = req.params.companyId
            const query = { companyId: companyId }
            const company = await companyCollection.findOne({ _id: new ObjectId(companyId) })
            const hr = await userCollection.findOne({ email: company.hrEmail })
            const employees = await userCollection.find(query).toArray()
            const myTeam = [...employees, hr]
            res.send(myTeam)
        })

        //asset request post to request collection
        app.post('/asset-request', async (req, res) => {
            const requestItem = req.body
            const result = await assetRequestCollection.insertOne(requestItem)
            res.send(result)
        })

        //getting employees pending requests
        app.get('/pending-requests/:email', async (req, res) => {
            const email = req.params.email
            const query = {
                $and: [{ requesterEmail: email }, { status: 'pending' }]
            }
            const result = await assetRequestCollection.find(query).toArray()
            res.send(result)
        })


        //getting monthly requests for employee
        app.get('/monthly-requests/:email', async (req, res) => {
            const email = req.params.email
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

            const result = await assetRequestCollection.aggregate([
                {
                    $match: {
                        requesterEmail: email,
                        createdAt: { $gte: firstDayOfMonth.toISOString() }
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray()

            res.send(result)
        })

        //user affiliation functionality
        app.put('/user-affiliation/:email', async (req, res) => {
            const email = req.params.email
            const companyId = req.body.companyId
            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    companyId: companyId,
                    hired: true
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //access all employee that hr affiliated
        app.get('/my-employees/:companyId', async (req, res) => {
            const companyId = req.params.companyId
            const query = { companyId: companyId }
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })

        //add selected employee to the company
        app.put('/add-employees', async (req, res) => {
            const emails = req.body.employees
            const companyId = req.body.companyId

            const filter = {
                email: {
                    $in: emails
                }
            }

            const updatedDoc = {
                $set: {
                    hired: true,
                    companyId: companyId
                }
            }

            const result = await userCollection.updateMany(filter, updatedDoc)
            res.send(result)
        })

        //deleting user from team functionality
        app.delete('/delete-user/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    hired: false,
                    companyId: ''
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //getting all assets from database
        app.get('/assets/:id', async (req, res) => {
            const companyId = req.params.id
            const query = { companyId: companyId }
            const result = await assetCollection.find(query).toArray()
            res.send(result)
        })

        //adding asset to database
        app.post('/add-asset', async (req, res) => {
            const asset = req.body
            const result = await assetCollection.insertOne(asset)
            res.send(result)
        })

        //asset deleting from database
        app.delete('/asset/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await assetCollection.deleteOne(query)
            res.send(result)
        })

        //not hired employees
        app.get('/not-hired-employees', async (req, res) => {
            query = { hired: false }
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })

        //check user hr or employee and send data to client
        app.get('/user', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        //payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body
            const amount = parseInt(price * 100)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('assetify is running')
})

app.listen(port, () => {
    console.log('assetify is running on port: ', port);
})