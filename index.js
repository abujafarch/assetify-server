const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
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



        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        //employee users create and send to database
        app.post('/users', async (req, res) => {
            const user = req.body
            // console.log("i am user", user)
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        //login with google user data creation
        app.post('/google-users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const checkUser = await userCollection.findOne(query)
            console.log(checkUser)
            if (checkUser) {
                return res.send({ userAlreadyExist: true })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        //filtering assets by availability and returnability
        app.get('/filter-assets', async (req, res) => {
            const companyId = req.query.companyId
            const returnability = req.query.returnability
            const availability = req.query.availability

            if (availability === 'select') {
                const query = {
                    $and: [{ companyId: companyId }, { returnability: returnability }]
                }
                const result = await assetCollection.find(query).toArray()
                res.send(result)
            }

            else if (returnability === 'select') {
                const quantity = availability === 'available' ? { $gt: 0 } : 0
                const query = {
                    $and: [{ companyId: companyId }, { quantity: quantity }]
                }
                const result = await assetCollection.find(query).toArray()
                res.send(result)
            }

            else {
                const quantity = availability === 'available' ? { $gt: 0 } : 0
                const query = {
                    $and: [{ companyId: companyId }, { quantity: quantity }, { returnability: returnability }]
                }
                const result = await assetCollection.find(query).toArray()
                res.send(result)
            }
        })

        //filtering request asset for employee
        app.get('/filter-request-assets', async (req, res) => {
            const companyId = req.query.companyId
            const returnability = req.query.returnability
            const availability = req.query.availability

            if (availability === 'select') {
                const query = {
                    $and: [{ companyId: companyId }, { returnability: returnability }]
                }
                const result = await assetCollection.find(query).toArray()
                res.send(result)
            }

            else if (returnability === 'select') {
                const quantity = availability === 'available' ? { $gt: 0 } : 0
                const query = {
                    $and: [{ companyId: companyId }, { quantity: quantity }]
                }
                const result = await assetCollection.find(query).toArray()
                res.send(result)
            }

            else {
                const quantity = availability === 'available' ? { $gt: 0 } : 0
                const query = {
                    $and: [{ companyId: companyId }, { quantity: quantity }, { returnability: returnability }]
                }
                const result = await assetCollection.find(query).toArray()
                res.send(result)
            }
        })

        //filtering my assets for employee
        app.get('/my-assets-filter', async (req, res) => {
            const employeeEmail = req.query.employeeEmail
            const approvalStatus = req.query.approvalStatus
            const returnability = req.query.returnability

            if (approvalStatus === 'select') {
                const query = { $and: [{ requesterEmail: employeeEmail }, { returnability: returnability }] }
                const result = await assetRequestCollection.find(query).toArray()
                res.send(result)
            }

            else if (returnability === 'select') {
                const query = { $and: [{ requesterEmail: employeeEmail }, { status: approvalStatus }] }
                const result = await assetRequestCollection.find(query).toArray()
                res.send(result)
            }

            else {
                const query = { $and: [{ requesterEmail: employeeEmail }, { returnability: returnability }, { status: approvalStatus }] }
                const result = await assetRequestCollection.find(query).toArray()
                res.send(result)
            }
        })

        //my-asset searching for employee
        app.get('/my-asset-search', async (req, res) => {
            const employeeEmail = req.query.employeeEmail
            const keyWord = req.query.keyWord
            const query = {
                $and: [{ requesterEmail: employeeEmail }, { assetName: { $regex: keyWord, $options: 'i' } }]
            }
            const result = await assetRequestCollection.find(query).toArray()
            res.send(result)
        })

        //searching asset 
        app.get('/search-asset', async (req, res) => {
            const companyId = req.query.companyId
            const keyWord = req.query.keyWord
            const query = {
                $and: [{ companyId: companyId }, { assetName: { $regex: keyWord, $options: 'i' } }]
            }
            const result = await assetCollection.find(query).toArray()
            res.send(result)
        })

        //searching request asset for employee 
        app.get('/search-request-asset', async (req, res) => {
            const companyId = req.query.companyId
            const keyWord = req.query.keyWord
            const query = {
                $and: [{ companyId: companyId }, { assetName: { $regex: keyWord, $options: 'i' } }]
            }
            const result = await assetCollection.find(query).toArray()
            res.send(result)
        })

        ///sorting by quantity
        app.get('/sort-by-quantity', async (req, res) => {
            const companyId = req.query.companyId
            const sortValue = req.query.sortValue
            const sortOrder = sortValue === 'high to low' ? -1 : 1
            const query = { companyId: companyId }
            const result = await assetCollection.find(query).sort({ quantity: sortOrder }).toArray()
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
        app.put('/approve-asset', async (req, res) => {
            const assetId = req.query.assetId
            const requestId = req.query.requestId
            // console.log(id)

            const quantityResult = await assetCollection.findOne({ _id: new ObjectId(assetId) })
            // console.log(quantityResult)
            if (quantityResult.quantity === 0) {
                return res.send({ quantity: 0 })
            }

            const filter = { _id: new ObjectId(requestId) }
            const updatedDoc = {
                $set: {
                    status: 'approved',
                    approveDate: new Date().toLocaleDateString('en-GB')
                }
            }
            // const options = { upsert: true }

            const approvalResult = await assetRequestCollection.updateOne(filter, updatedDoc)

            console.log(approvalResult);

            if (approvalResult.modifiedCount > 0) {
                const assetDecrement = await assetCollection.updateOne({ _id: new ObjectId(assetId) }, { $inc: { quantity: -1 } })
                res.send(assetDecrement)
            }
        })

        //rejecting employee request
        app.delete('/reject-asset/:requestId', async (req, res) => {
            const requestId = req.params.requestId
            const query = { _id: new ObjectId(requestId) }
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

        //get limited assets
        app.get('/limited-assets/:companyId', async (req, res) => {
            const companyId = req.params.companyId
            const query = {
                $and: [{ companyId: companyId }, { quantity: { $lt: 10 } }]
            }
            const result = await assetCollection.find(query).toArray()
            res.send(result)
        })

        //getting returnable and non-returnable item that requested by employee
        app.get('/employee-returnability/:companyId', async (req, res) => {
            const companyId = req.params.companyId

            const result = await assetRequestCollection.aggregate([
                {
                    $match: { companyId: companyId }
                },
                {
                    $addFields: { assetIdObj: { $toObjectId: '$assetId' } }
                },
                {
                    $lookup: {
                        from: 'assets',
                        localField: 'assetIdObj',
                        foreignField: '_id',
                        as: 'assetItem'
                    }
                },
                {
                    $unwind: '$assetItem'
                },
                {
                    $group: {
                        _id: '$assetItem.returnability',
                        quantity: { $sum: 1 }
                    }
                }
            ]).toArray()

            res.send(result)
        })

        //getting max asset users 
        app.get('/max-asset-users/:companyId', async (req, res) => {
            const companyId = req.params.companyId

            const result = await assetRequestCollection.aggregate([
                {
                    $match: {
                        companyId: companyId,
                        status: 'approved'
                    }
                },
                {
                    $group: {
                        _id: {
                            userName: '$requesterName',
                            userEmail: '$requesterEmail'
                        },
                        quantity: { $sum: 1 }
                    }
                },
                {
                    $sort: { quantity: -1 }
                },
                {
                    $limit: 3
                },
                {
                    $project: {
                        _id: 0,
                        userName: '$_id.userName',
                        userEmail: '$_id.userEmail',
                        quantity: 1
                    }
                }

            ]).toArray()

            res.send(result)
        })

        ///getting most requested assets 
        app.get('/most-requested/:companyId', async (req, res) => {

            const companyId = req.params.companyId

            const result = await assetRequestCollection.aggregate([
                {
                    $match: { companyId: companyId, status: 'pending' }
                },
                {
                    $group: {
                        _id: {
                            assetId: '$assetId',
                            assetName: '$assetName',
                            assetType: '$assetType'
                        },
                        requestCount: { $sum: 1 },
                    }
                },

                { $sort: { requestCount: -1 } },
                { $limit: 4 },

                {
                    $project: {
                        _id: 0,
                        assetId: '$_id.assetId',
                        assetName: '$_id.assetName',
                        assetType: '$_id.assetType',
                        requestCount: 1
                    }
                }
            ]).toArray()

            res.send(result)
        })

        //returning asset 
        app.put('/return-asset', async (req, res) => {
            const requestId = req.query.requestId
            const assetId = req.query.assetId
            const filter = { _id: new ObjectId(requestId) }

            const requestAssetUpdatedDoc = { $set: { status: 'returned' } }

            const assetUpdatedDoc = { $inc: { quantity: 1 } }

            const updatedRequest = await assetRequestCollection.updateOne(filter, requestAssetUpdatedDoc)

            if (updatedRequest.modifiedCount > 0) {
                const finalResult = await assetCollection.updateOne({ _id: new ObjectId(assetId) }, assetUpdatedDoc)
                res.send(finalResult)
            }
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