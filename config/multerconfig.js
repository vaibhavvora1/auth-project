const multer = require("multer"); // Import the multer library for handling file uploads
const crypto = require("crypto"); // Import the crypto library for generating random values (not used in the provided code snippet, but likely used elsewhere in the application)
const path = require("path"); // Import the path module for working with file paths
//disk storage

const storage = multer.diskStorage({
  // Configure the storage settings for multer
  destination: function (req, file, cb) {
    // Set the destination folder for uploaded files
    cb(null, "./public/images/uploads"); // Specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    // Set the filename for uploaded files
    crypto.randomBytes(16, function (err, bytes) {
      // Generate a random filename using crypto
      const fn = bytes.toString("hex") + path.extname(file.originalname); // Append the original file extension to the random filename
      cb(null, fn); // Set the generated filename as the final filename for the uploaded file
    });
  },
});

const upload = multer({ storage: storage }); // Create an instance of multer with the defined storage settings

// export upload variable
module.exports = upload; // Export the upload variable for use in other parts of the application (e.g., in routes where file uploads are handled)
