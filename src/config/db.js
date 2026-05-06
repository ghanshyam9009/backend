
// const mongoose = require("mongoose");
// const dns = require("dns");

// // Force Node.js to use public DNS servers to resolve the MongoDB SRV record
// dns.setServers(["1.1.1.1", "8.8.8.8"]);

// const connectDB = async () => {
//   try {
//     console.log("🔹 Starting MongoDB connection...");

//     // Your connection string
//     const uri = "mongodb+srv://ghanshyamchoudhary9009_db_user:0F9LcyBemJUW8YtJ@cluster0.zavd4go.mongodb.net/?appName=Cluster0";

//     // Hide password in logs    
//     const safeUri = uri.replace(/:(.*)@/, ":******@");
//     console.log("🔹 Connection URI:", safeUri);
    
//     // Attempt connection
//     await mongoose.connect(uri);

//     console.log("✅ MongoDB connected successfully!");
//     console.log("🔹 Connection details:");
//     console.log("   Host:", mongoose.connection.host);
//     console.log("   Port:", mongoose.connection.port);
//     console.log("   Name:", mongoose.connection.name);
//   } catch (error) {
//     console.error("❌ MongoDB connection failed!");
//     console.error("Error name:", error.name);
//     console.error("Error message:", error.message);

//     if (error.name === "MongooseServerSelectionError") {
//       console.error(
//         "💡 Hint: Ensure your IP is whitelisted in [MongoDB Atlas Network Access](https://www.mongodb.com)."
//       );
//     }
    
//     process.exit(1);
//   }
// };

// module.exports = connectDB;


const mongoose = require("mongoose");
const dns = require("dns");

// Use public DNS servers for MongoDB SRV resolution
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  try {
    console.log("🔹 Starting MongoDB connection...");

    // Updated MongoDB Atlas URI with database name
    const uri =
      "mongodb+srv://ghanshyamchoudhary9009_db_user:0F9LcyBemJUW8YtJ@cluster0.zavd4go.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0";

    // Hide password in logs
    const safeUri = uri.replace(/:(.*)@/, ":******@");
    console.log("🔹 Connection URI:", safeUri);

    // Connect to MongoDB
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected successfully!");
    console.log("🔹 Connection details:");
    console.log("   Host:", mongoose.connection.host);
    console.log("   Port:", mongoose.connection.port);
    console.log("   Database:", mongoose.connection.name);
  } catch (error) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);

    if (error.name === "MongooseServerSelectionError") {
      console.log(
        "💡 Check MongoDB Atlas Network Access and allow 0.0.0.0/0"
      );
    }

    process.exit(1);
  }
};

module.exports = connectDB;
