const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/miniproject");

const userschema = new mongoose.Schema({
  name: String,
  username: String,
  age: Number,
  email: String,
  password: String,
  profilepic: {
    type: String,
    default: "default.jpg",
  },
  post: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
  ],
});

module.exports = mongoose.model("user", userschema);
