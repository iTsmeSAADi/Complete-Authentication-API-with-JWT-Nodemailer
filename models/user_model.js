import mongoose from "mongoose";

const user_schema = mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, trim: true},
    password: {type: String, required: true, trim: true},
    tc: {type: String, required: true}
})

const user_model = mongoose.model("user", user_schema)

export default user_model