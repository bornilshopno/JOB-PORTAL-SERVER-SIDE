require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken")
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000

//       // https://server-side-job-portal.vercel.app

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

const logger = (req, res, next) => {
  console.log('inside the logger');
  next();
}

const verifyToken = (req, res, next) => {
  console.log('middleware for cookies', req.cookies)
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorised Access" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorised Access" })
    }

    req.user = decoded;
    next()
  })


}

app.get("/", (req, res) => {
  res.send("Server Running")
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pqwog.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const jobCollection = client.db("jobDB").collection("jobs")
    const applicationCollection = client.db("jobDB").collection("applications")

    // Auth related API
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false, //http://localhost:5000 and true in production

        })
        .send({ success: true });
    })

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result)

    })

    app.get("/jobs", logger, async (req, res) => {
      console.log('now inside the API callback')
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email }
      }
      const cursor = jobCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      //not the best way. best way is use aggregate
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const myJob = await jobCollection.findOne(query);

      let count = 0;
      if (myJob.applicationCount) {
        count = myJob.applicationCount + 1
      }
      else {
        count = 1;
      }
      //now update the job info
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          applicationCount: count
        }
      }
      const updatedResult = await jobCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.get("/job-applications", async (req, res) => {
      const cursor = applicationCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId } // need to understand
      const result = await applicationCollection.find(query).toArray();
      res.send(result)
    })

    app.delete("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await applicationCollection.deleteOne(query);
      res.send(result)

    })

    app.get("/job-application", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: " forbidden access" })
      }

      console.log("cookies got:", req.cookies)


      const result = await applicationCollection.find(query).toArray();

      //fokira way to get data from other collection of this database DB
      for (const apply of result) {
        const query1 = { _id: new ObjectId(apply.job_id) };
        const job = await jobCollection.findOne(query1);

        if (job) {
          apply.title = job.title;
          apply.jobType = job.jobType;
          apply.company = job.company;
          apply.company_logo = job.company_logo;
          apply.location = job.location;
          apply.description = job.description;
        }
      }
      res.send(result)
    })

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result)
    })

    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const data = req.body;
      console.log(data)
      const updatedDoc = {
        $set: {
          status: data.status
        }

      }
      const result = await applicationCollection.updateOne(filter, updatedDoc)
      res.send(result)



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




app.listen(port, () => { console.log(`server is running at port: ${port}`) })

