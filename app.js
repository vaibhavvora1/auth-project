const cookieParser = require("cookie-parser"); // Import the cookie-parser middleware
const express = require("express"); // Import the Express framework
const app = express(); // Create an instance of the Express application

const upload = require("./config/multerconfig"); // Import the multer configuration for handling file uploads
const path = require("path"); // Import the path module for working with file paths

const bcrypt = require("bcrypt"); // Import the bcrypt library for password hashing

const usermodel = require("./models/user"); // Import the user model
const postmodel = require("./models/post"); // Import the post model (not used in the provided code snippet, but likely used elsewhere in the application)
const jwt = require("jsonwebtoken"); // Import the jsonwebtoken library for handling JWTs

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded request bodies (e.g., form submissions)
app.set("view engine", "ejs"); // Set EJS as the templating engine for rendering views
app.use(cookieParser()); // Use the cookie-parser middleware to parse cookies in incoming requests
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" directory (e.g., CSS, JavaScript, images)

app.get("/", function (req, res) {
  // Define a route for the root URL ("/")
  res.render("index"); // Render the "index" view
});

app.get("/login", function (req, res) {
  // Define a route for the "/login" URL
  res.render("login"); // Render the "login" view
});

app.post("/register", async function (req, res) {
  // Define a route for the "/register" URL
  const { name, username, age, email, password } = req.body; // Extract the name, username, age, email, and password from the request body

  const user = await usermodel.findOne({ email }); // Check if a user with the provided email already exists in the database
  if (user) {
    return res.redirect("/login"); // If a user with the email already exists, redirect to the login page
  }
  bcrypt.genSalt(10, function (err, salt) {
    // Generate a salt for hashing the password with a cost factor of 10
    bcrypt.hash(password, salt, async function (err, hash) {
      // Hash the password using the generated salt
      const user = await usermodel.create({
        // Create a new user with the provided details
        name,
        username,
        age,
        email,
        password: hash, // Store the hashed password in the database
      });
      let token = jwt.sign({ email, id: user._id }, "secretkey"); // Generate a JWT token for the user
      res.cookie("token", token); // Set the JWT token as a cookie

      res.redirect("/login"); // After successful registration, redirect the user to the login page
    });
  });
});

app.post("/login", async function (req, res) {
  // Define a route for handling login requests at the "/login" URL
  const { email, password } = req.body; // Extract the email and password from the request body

  let user = await usermodel.findOne({ email }); // Look up the user in the database by their email address
  if (!user) {
    return res.status(500).send("Something went wrong"); // If no user is found, return an error response
  }

  bcrypt.compare(password, user.password, function (err, result) {
    // Compare the provided password with the hashed password stored in the database
    if (result) {
      let token = jwt.sign({ email, id: user._id }, "secretkey"); // If the password is correct, generate a JWT token for the user
      res.cookie("token", token); // Set the JWT token as a cookie in the user's browser
      res.redirect("/profile"); // Redirect the user to the profile page after successful login
    } else {
      res.redirect("/login"); // If the password is incorrect, redirect the user to the login page
    }
  });
});

app.get("/profile", isLoggedIn, async function (req, res) {
  let user = await usermodel.findOne({ email: req.user.email }); // Define a route for the "/profile" URL that requires the user to be logged in. Look up the user's information in the database using their email address, which is retrieved from the decoded JWT token attached to the request object by the isLoggedIn middleware.

  // Populate the user's posts (if the user model has a reference to posts) to include the post details in the user object
  await user.populate("post");

  res.render("profile", { user }); // Render the "profile" view and pass the user data to the template for display
});

app.get("/profile/upload", isLoggedIn, function (req, res) {
  res.render("profileupload"); // Define a route for the "/profile/upload" URL that requires the user to be logged in. Render the "profileupload" view, which likely contains a form for uploading a profile picture
});

app.post(
  "/upload",
  upload.single("image"),
  isLoggedIn,
  async function (req, res) {
    let user = await usermodel.findOne({ email: req.user.email });

    user.profilepic = req.file.filename; // Define a route for handling profile picture uploads at the "/upload" URL that requires the user to be logged in. Use the multer middleware to handle the file upload and extract the filename of the uploaded image from the request object. Update the user's profile picture in the database with the new filename.
    await user.save();
    res.redirect("/profile"); // Save the updated user document to the database
  },
);

app.post("/post", isLoggedIn, async function (req, res) {
  let user = await usermodel.findOne({ email: req.user.email });
  let { title, content } = req.body; // Define a route for handling post creation at the "/post" URL that requires the user to be logged in. Extract the title and content of the post from the request body.

  let post = await postmodel.create({
    user: user._id,
    title,
    content,
  });

  user.post.push(post._id); // Create a new post in the database with the user's ID, title, and content. After creating the post, add the post's ID to the user's list of posts.
  await user.save(); // Save the updated user document to the database
  res.redirect("/profile"); // Redirect the user back to the profile page after creating the post
});

app.get("/like/:id", isLoggedIn, async function (req, res) {
  let post = await postmodel.findOne({ _id: req.params.id }).populate("user"); // Define a route for handling likes at the "/like/:id" URL // Look up the post in the database using the ID provided in the URL parameters and populate the user field to include the details of the user who created the post

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid); // Add the ID of the currently logged-in user (retrieved from the decoded JWT token) to the post's list of likes
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1); // If the user has already liked the post, remove their ID from the list of likes (unlike the post)
  }

  await post.save();
  res.redirect("/profile"); // Save the updated post document to the database and redirect the user back to the profile page
});

app.get("/edit/:id", isLoggedIn, async function (req, res) {
  let post = await postmodel.findOne({ _id: req.params.id }).populate("user");

  res.render("edit", { post }); // Define a route for handling post editing at the "/edit/:id" URL that requires the user to be logged in. Look up the post in the database using the ID provided in the URL parameters and populate the user field to include the details of the user who created the post. Render the "edit" view and pass the post data to the template for display
});

app.post("/update/:id", isLoggedIn, async function (req, res) {
  let post = await postmodel.findOneAndUpdate(
    { _id: req.params.id },
    { title: req.body.title, content: req.body.content },
  );

  res.redirect("/profile"); // Redirect the user back to the profile page after updating the post
});

app.get("/logout", function (req, res) {
  // Define a route for handling logout requests at the "/logout" URL
  res.clearCookie("token"); // Clear the JWT token from the user's browser
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token === undefined) {
    return res.redirect("/login"); // If there is no token in the cookies, redirect to the login page
  } else {
    let data = jwt.verify(req.cookies.token, "secretkey"); // If there is a token, verify it using the secret key to decode the token and retrieve the user data
    req.user = data; // Attach the decoded user data to the request object for use in subsequent middleware or route handlers
  }
  next(); // If there is a token, proceed to the next middleware or route handler
}

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
