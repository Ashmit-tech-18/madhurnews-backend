// File: backend/controllers/authController.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber'); 

// 1. Register
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body; 
  if (!name || !email || !password) return res.status(400).json({ message: 'Please add all fields' });
  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = await User.create({ name, email, password: hashedPassword, role: role || 'user' });

  if (user) {
    res.status(201).json({
      _id: user.id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id),
    });
  } else { res.status(400).json({ message: 'Invalid user data' }); }
};

// 2. Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password'); 
  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id),
    });
  } else { res.status(400).json({ message: 'Invalid credentials' }); }
};

// 3. Get Me
const getMe = async (req, res) => { res.status(200).json(req.user); };

// 4. Update Self Details (Password/Name) - 🔥 NEW
const updateDetails = async (req, res) => {
    try {
        const fieldsToUpdate = { name: req.body.name, email: req.body.email };
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            fieldsToUpdate.password = await bcrypt.hash(req.body.password, salt);
        }
        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: user });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- TEAM MANAGEMENT ---

// 5. Get Editors
const getEditors = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// 6. Delete User
const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'User removed' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// 7. Update User (Role/Data by Admin)
const updateUser = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        
        // Data object banayein
        const updateData = { name, email, role };

        // Sirf tabhi hash karein agar naya password dala gaya ho
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        
        res.status(200).json(user);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// --- SUBSCRIBERS ---

// 8. Subscribe
const subscribeUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const existing = await Subscriber.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Already subscribed' });
    await Subscriber.create({ email });
    res.status(201).json({ message: 'Subscribed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 9. Get Subscribers
const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.status(200).json(subscribers);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 🔥 EXPORTS (Check names carefully)
module.exports = {
  registerUser, loginUser, getMe, 
  updateDetails, // <--- Make sure this is here
  getEditors, deleteUser, updateUser, 
  subscribeUser, getSubscribers
};