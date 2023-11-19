const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "secretkey";
const app = express()
const cors = require('cors')
const { body, validationResult } = require('express-validator');
const User = require("./models/User");
const Todo = require("./models/Todo");

app.use(cors())
app.use(bodyParser.json())

const dbURI = "mongodb+srv://test:12345@cluster0.xekq0gn.mongodb.net/?retryWrites=true&w=majority"
mongoose
    .connect(dbURI, {

    })
    .then(() => {
        app.listen(5000, () => {
            console.log("Server is connected to port 5000 and connected to MongoDb")
        })
    })
    .catch((error) => {
        console.log('Unable to connect to server and/or MongoDb')
    })


app.post('/register', [
    body("name", "Enter a Valid Name").isLength({ min: 3 }),
    body("email", "Enter a Email").isEmail(),
    body("password", "Enter a Password").isLength({ min: 3 })
], async (req, res) => {
    let success = false
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: success, erros: errors.array() });
    }
    let user = await User.findOne({ email: req.body.email })
    try {
        if (user) {
            return res.status(400).json({ success: success, error: "User exists" })

        }
        const salt = await bcrypt.genSalt(10);
        hassPassword = await bcrypt.hash(req.body.password, salt)
        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hassPassword,
        });
        const data = {
            user: {
                id: user.id,
                name: user.name
            }
        };
        let name = data.user.name;
        const authToken = jwt.sign(data, JWT_SECRET)
        success = true;
        res.json({ authToken, success, name });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
})



app.post('/login', [
    body("email", "Enter a Email").isEmail(),
    body("password", "Password cant be empty").exists(),
], async (req, res) => {
    let success = false
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: success, erros: errors.array() });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: success, error: "User not exists" });
        }
        const passwordCompare = await bcrypt.compare(password, user.password)
        if (!passwordCompare) {
            return res.status(400).json({ success: success, error: "Invalid" });
        }

        const payload = {
            user: {
                id: user.id,
                name: user.name
            }
        }
        success = true;
        let name = payload.user.name
        const authToken = jwt.sign(payload, JWT_SECRET)
        res.json({ authToken, success, name })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
})


const fetchuser = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Please Authenticate using a valid token" })
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data.user;
        next();

    } catch (error) {
        res.status(401).send({ error: "Please Authenticate using a valid token" })
    }

}



app.post("/get", fetchuser, async (req, res) => {

    try {
        userId = req.user.id;
        const user = await User.findById(userId).select("-password")
        res.send(user)
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error")
    }
})


app.post("/todo", fetchuser, [
    body("title", "Enter the Title").isLength({ min: 3 }),
    body("task", "Enter the Task").isLength({ min: 3 }),
],
    async (req, res) => {
        try {
            const { title, task, isComplete } = req.body;
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: success, erros: errors.array() });
            }

            const todo = new Todo({
                title, task, isComplete, user: req.user.id,
            });

            const saveTodo = await todo.save();
            res.json(saveTodo);
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)



app.put("/updatetodo/:id", fetchuser, [
    body("title", "Enter the Title").isLength({ min: 3 }),
    body("task", "Enter the Task").isLength({ min: 3 }),

],
    async (req, res) => {
        try {
            const { title, task, isComplete } = req.body;
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: success, erros: errors.array() });
            }

            const newTodo = {};
            if (title) {
                newTodo.title = title
            }
            if (task) {
                newTodo.task = task
            }
            if (isComplete) {
                newTodo.isComplete = isComplete
            }
            let todo = await Todo.findById(req.params.id);
            if (!todo) {
                res.status(404).send("Not Found")
            }
            if (todo.user.toString() !== req.user.id) {
                res.status(401).send("Not Allowed")
            }

            todo = await Todo.findByIdAndUpdate(req.params.id, { $set: newTodo },
                { new: true })
            res.json({ todo })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
)



app.delete("/deletetodo/:id",
    fetchuser,
    async (req, res) => {
        try {
            let todo = await Todo.findById(req.params.id);
            if (!todo) {
                res.status(404).send("Not Found")
            }

            if (todo.user.toString() !== req.user.id) {
                return res.status(401).send("Not allowed");
            }
            todo = await Todo.findByIdAndDelete(req.params.id)
            res.json({ "success": "deleted Todo" })
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
    }
);


app.get("/fetchalltodo", fetchuser, async (req, res) => {
    const todo = await Todo.find({ user: req.user.id });
    res.json(todo);
  });



