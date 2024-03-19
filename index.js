const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJwt = (req, res, next) => {
  const authorization = req.headers?.authorization;
  if (!authorization) {
    res.status(401).send({ error: true, message: "Unauthorized access!" });
  }
  const token = authorization?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access!" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized access!" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("assignment");
    const userCollection = db.collection("users");
    const suppliesCollection = db.collection("supplies");
    const volunteerCollection = db.collection("volunteers");
    const donationCollection = db.collection("donation");
    const categoryCollection = db.collection("category");
    const commentsCollection = db.collection("comments");
    const testimonialsCollection = db.collection("testimonials");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await userCollection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE

    //! get single user by email
    app.get("/api/v1/user", async (req, res) => {
      const email = req.query.email;
      const response = await userCollection.findOne({ email: email });
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //? post supplies
    app.post("/api/v1/supplies", verifyJwt, async (req, res) => {
      const body = req.body;
      const response = await suppliesCollection.insertOne(body);
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //* get supplies
    app.get("/api/v1/supplies", async (req, res) => {
      const response = await suppliesCollection.find().toArray();
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //& get supply by id
    app.get("/api/v1/supplies/:id", verifyJwt, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const response = await suppliesCollection.findOne(query);
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //! get supply by id
    app.delete("/api/v1/delete-supply/:id", verifyJwt, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const response = await suppliesCollection.deleteOne(query);
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //* update supply
    app.patch("/api/v1/supply/update/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const { title, quantity, category, description, image } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          title: title,
          quantity: quantity,
          description: description,
          category: category,
          image: image,
        },
      };
      const response = await suppliesCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.json({
        success: true,
        data: response,
      });
    });

    //& get donation category
    app.get("/api/v1/donation-category", verifyJwt, async (req, res) => {
      const response = await categoryCollection.find().toArray();
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //^ volunter post

    app.post("/api/v1/volunteer-signup", verifyJwt, async (req, res) => {
      const body = req.body;
      const response = await volunteerCollection.insertOne(body);
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    // get volunteer
    app.get("/api/v1/get-volunteers", async (req, res) => {
      const response = await volunteerCollection.find().toArray();
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //? donate supply
    app.post("/api/v1/donation", verifyJwt, async (req, res) => {
      const body = req.body;
      const category = body.category;
      //find category
      const options = { upsert: true };
      const findCategory = await categoryCollection.findOne({
        category: category,
      });
      const filterCategory = { _id: new ObjectId(findCategory?._id) };
      const updatedCategoryDoc = {
        $set: {
          totalDonate: findCategory?.totalDonate + 1,
        },
      };
      await categoryCollection.updateOne(
        filterCategory,
        updatedCategoryDoc,
        options
      );

      //! find exist user
      const existUser = await donationCollection.findOne({
        userEmail: body?.userEmail,
      });
      if (existUser) {
        const filterUser = { _id: new ObjectId(existUser?._id) };
        const updatedUserDoc = {
          $set: {
            donateSupply: existUser?.donateSupply + 1,
          },
        };
        await donationCollection.updateOne(filterUser, updatedUserDoc, options);
        res.status(200).json({
          success: true,
        });
      } else {
        const response = await donationCollection.insertOne(body);
        res.status(200).json({
          success: true,
          data: response,
        });
      }
    });

    //! get donner info

    app.get("/api/v1/donner-info", async (req, res) => {
      const response = await donationCollection.find().toArray();
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //! post users comments

    app.post("/api/v1/comments", verifyJwt, async (req, res) => {
      const body = req.body;
      const response = await commentsCollection.insertOne(body);
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    //? get comments

    app.get("/api/v1/comments", async (req, res) => {
      const response = await commentsCollection.find().toArray();
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    // ^ post testimonial
    app.post("/api/v1/testimonial", verifyJwt, async (req, res) => {
      const body = req.body;
      const response = await testimonialsCollection.insertOne(body);
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    // ~ get testimonials
    app.get("/api/v1/testimonial", async (req, res) => {
      const response = await testimonialsCollection.find().toArray();
      res.status(200).json({
        success: true,
        data: response,
      });
    });

    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
