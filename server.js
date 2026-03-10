require("dotenv").config();
require("express-async-errors");

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log("Starting server...");
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
};

startServer();





//  const x ={
//     name: "John",
//     age: 30,
//     city: "New York",
//     sayHello: function() {    
//       console.log(this.name); // Output: John  
//       console.log("Hello!");
//     } 
//  }

//  coanol.log(x.name); // Output: John
//  x.sayHello(); // Output: Hello!


// const function1 =async (req,re) => {
//   console.log("Function 1");

// }

// function1();  

// console.log(function1);







// setTimeout(() => {
//   console.log("This will be printed after 2 seconds");
// }, 2000);

// console.log("This will be printed immediately");  