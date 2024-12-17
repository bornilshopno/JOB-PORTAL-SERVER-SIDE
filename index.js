const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express();
const port= process.env.PORT || 5000



app.use(cors())
app.use(express.json())

app.get("/",(req,res)=>{
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
    await client.connect();

const jobCollection=client.db("jobDB").collection("jobs")
const applicationCollection=client.db("jobDB").collection("applications")

app.get("/jobs", async(req,res)=>{
    const cursor=jobCollection.find()
    const result=await cursor.toArray()
    res.send(result)
})

app.post("/job-applications", async(req,res)=>{
  const application=req.body;
  const result= await applicationCollection.insertOne(application);
  res.send(result)
})

app.get("/job-applications", async(req,res)=>{
  const cursor=applicationCollection.find();
  const result= await cursor.toArray();
  res.send(result);
})

app.delete("/job-applications/:id", async(req,res)=>{
const id=req.params.id;
const query={_id: new ObjectId(id)}
const result=await applicationCollection.deleteOne(query);
res.send(result)

})

app.get("/job-application", async(req,res)=>{
  const email=req.query.email;
  const query={applicant_email:email};
  const result=await applicationCollection.find(query).toArray();

  //fokira way to get data from other collection of this database DB
for (const apply of result){
  const query1={_id: new ObjectId(apply.job_id)};
  const job=await jobCollection.findOne(query1);

  if(job){
    apply.title=job.title;
    apply.jobType=job.jobType;
    apply.company=job.company;
    apply.company_logo=job.company_logo;
    apply.location=job.location;
    apply.description=job.description;
  }
}
  res.send(result)
})

app.get("/jobs/:id", async(req,res)=>{
  const id=req.params.id;
  const query={_id: new ObjectId(id)};
  const result=await jobCollection.findOne(query);
  res.send(result)
})


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port,()=>{console.log(`server is running at port: ${port}`)})

