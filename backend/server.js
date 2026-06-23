require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { 
  User, 
  Task, 
  DailyLog, 
  Skill, 
  Feedback, 
  Notification,
  generateSalt, 
  hashPassword, 
  verifyPassword 
} = require('./db');

async function createNotification(userId, title, message) {
  try {
    const newNotif = new Notification({
      userId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString()
    });
    await newNotif.save();
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'intern_tracker_super_secret_key_12345';

app.use(cors());
app.use(express.json());

// Hierarchy Roles Definition
const ROLES = {
  intern: 1,
  employee: 2,
  manager: 3,
  admin: 4
};

function canManage(supervisorRole, subordinateRole) {
  if (supervisorRole === 'admin' && subordinateRole === 'admin') {
    return true;
  }
  return ROLES[supervisorRole] > ROLES[subordinateRole];
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Auth Routes

// Public Registration Sign-Up endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, email, role, internshipTitle, startDate, endDate } = req.body;
  if (!username || !password || !name || !email || !role) {
    return res.status(400).json({ error: "Missing required registration fields" });
  }

  // Restrict self-registration roles (Admins cannot be self-registered)
  const allowedRegistrationRoles = ['intern', 'employee', 'manager'];
  if (!allowedRegistrationRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role specified for self-registration." });
  }

  try {
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = generateSalt();
    const newUser = new User({
      username: username.toLowerCase(),
      salt,
      passwordHash: hashPassword(password, salt),
      role,
      name,
      email,
      internshipTitle: internshipTitle || '',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active'
    });

    await newUser.save();

    // Create JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;
    delete userResponse.salt;

    res.status(201).json({ token, user: userResponse });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: "Database error during registration." });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: "Account is inactive" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.salt;

    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server database connection error." });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.salt;
    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// General Subordinate Users Management
// Returns all users subordinate to the caller
app.get('/api/interns', authenticateToken, async (req, res) => {
  try {
    // Find roles subordinate to the caller
    const subordinateRoles = Object.keys(ROLES).filter(role => canManage(req.user.role, role));
    const subordinates = await User.find({ role: { $in: subordinateRoles } });
    
    // Exclude the caller themselves from the list
    const filteredSubordinates = subordinates.filter(u => String(u._id || u.id) !== String(req.user.id));
    
    res.json(filteredSubordinates.map(u => {
      const copy = u.toObject();
      delete copy.passwordHash;
      delete copy.salt;
      return copy;
    }));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subordinate profiles." });
  }
});

// Create User (Creator must have higher role than the role being assigned)
app.post('/api/interns', authenticateToken, async (req, res) => {
  const { username, password, name, email, role, internshipTitle, startDate, endDate } = req.body;
  if (!username || !password || !name || !email || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Enforce role hierarchy
  if (!canManage(req.user.role, role)) {
    return res.status(403).json({ error: "Insufficient permissions to create user with this role." });
  }

  try {
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = generateSalt();
    const newUser = new User({
      username: username.toLowerCase(),
      salt,
      passwordHash: hashPassword(password, salt),
      role,
      name,
      email,
      internshipTitle: internshipTitle || '',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active'
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;
    delete userResponse.salt;

    res.status(201).json(userResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user profile." });
  }
});

// Update User details
app.put('/api/interns/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, internshipTitle, startDate, endDate, status, password } = req.body;

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if supervisor can manage the target user
    if (!canManage(req.user.role, targetUser.role)) {
      return res.status(403).json({ error: "Insufficient permissions to modify this user." });
    }

    // If role is changing, verify supervisor can manage new role
    if (role && role !== targetUser.role && !canManage(req.user.role, role)) {
      return res.status(403).json({ error: "Insufficient permissions to assign this role." });
    }

    if (name) targetUser.name = name;
    if (email) targetUser.email = email;
    if (role) targetUser.role = role;
    if (internshipTitle) targetUser.internshipTitle = internshipTitle;
    if (startDate) targetUser.startDate = startDate;
    if (endDate) targetUser.endDate = endDate;
    if (status) targetUser.status = status;

    if (password && password.trim() !== '') {
      const salt = generateSalt();
      targetUser.salt = salt;
      targetUser.passwordHash = hashPassword(password, salt);
    }

    await targetUser.save();

    const userResponse = targetUser.toObject();
    delete userResponse.passwordHash;
    delete userResponse.salt;

    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user profile." });
  }
});

// Delete User
app.delete('/api/interns/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify permission
    if (!canManage(req.user.role, targetUser.role)) {
      return res.status(403).json({ error: "Insufficient permissions to delete this user." });
    }

    // Delete user
    await User.deleteOne({ _id: id });

    // Cascade delete associated records
    await Task.deleteMany({ internId: id });
    await DailyLog.deleteMany({ internId: id });
    await Skill.deleteMany({ internId: id });
    await Feedback.deleteMany({ internId: id });

    res.json({ success: true, message: "User and associated records deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user profile." });
  }
});

// Tasks Board Routes
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      const tasks = await Task.find();
      res.json(tasks);
    } else if (role === 'manager' || role === 'employee') {
      const subordinateRoles = Object.keys(ROLES).filter(r => canManage(role, r));
      const subordinates = await User.find({ role: { $in: subordinateRoles } });
      const subordinateIds = subordinates.map(s => s._id);
      
      const visibleTasks = await Task.find({
        $or: [
          { internId: req.user.id },
          { internId: { $in: subordinateIds } }
        ]
      });
      res.json(visibleTasks);
    } else {
      // Intern gets only their own tasks
      const internTasks = await Task.find({ internId: req.user.id });
      res.json(internTasks);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to load tasks list." });
  }
});

// Assign Task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { internId, title, description, dueDate } = req.body;
  if (!internId || !title || !description || !dueDate) {
    return res.status(400).json({ error: "Missing required task fields" });
  }

  try {
    const targetUser = await User.findById(internId);
    if (!targetUser) {
      return res.status(400).json({ error: "Target user not found" });
    }

    // Check hierarchy restriction
    if (!canManage(req.user.role, targetUser.role)) {
      return res.status(403).json({ error: "Insufficient permissions to assign tasks to this user." });
    }

    const newTask = new Task({
      internId,
      title,
      description,
      status: 'todo',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate,
      feedback: ''
    });

    await newTask.save();
    
    // Auto-create notification for assignee
    await createNotification(
      internId,
      "New Task Assigned",
      `Task "${title}" has been assigned to you by ${req.user.name}. Due: ${dueDate}`
    );

    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to record task assignment." });
  }
});

// Update Task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, title, description, dueDate, feedback } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const targetUser = await User.findById(task.internId);

    if (task.internId.toString() === req.user.id) {
      // Assignee updating status
      if (status) {
        const allowedStatuses = ['todo', 'in_progress', 'review', 'completed'];
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid task status" });
        }
        task.status = status;
      }
    } else if (targetUser && canManage(req.user.role, targetUser.role)) {
      // Supervisor updating subordinate task
      if (status) task.status = status;
      if (title) task.title = title;
      if (description) task.description = description;
      if (dueDate) task.dueDate = dueDate;
      if (feedback !== undefined) task.feedback = feedback;
    } else {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task." });
  }
});

// Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const targetUser = await User.findById(task.internId);

    if (targetUser && canManage(req.user.role, targetUser.role)) {
      await Task.deleteOne({ _id: id });
      res.json({ success: true, message: "Task deleted successfully" });
    } else {
      res.status(403).json({ error: "Insufficient permissions to delete this task." });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task." });
  }
});

// Daily Tracker Logs Routes
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      const logs = await DailyLog.find();
      res.json(logs);
    } else if (role === 'manager' || role === 'employee') {
      const subordinateRoles = Object.keys(ROLES).filter(r => canManage(role, r));
      const subordinates = await User.find({ role: { $in: subordinateRoles } });
      const subordinateIds = subordinates.map(s => s._id);

      const visibleLogs = await DailyLog.find({
        $or: [
          { internId: req.user.id },
          { internId: { $in: subordinateIds } }
        ]
      });
      res.json(visibleLogs);
    } else {
      // Intern gets only their own logs
      const internLogs = await DailyLog.find({ internId: req.user.id });
      res.json(internLogs);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to load worksheets." });
  }
});

// Submit log
app.post('/api/logs', authenticateToken, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: "Admins do not submit daily logs." });
  }
  const { date, hours, description } = req.body;
  if (!date || !hours || !description) {
    return res.status(400).json({ error: "Missing required fields (date, hours, description)" });
  }

  try {
    const newLog = new DailyLog({
      internId: req.user.id,
      date,
      hours: parseFloat(hours),
      description,
      status: 'pending',
      comments: ''
    });

    await newLog.save();
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: "Failed to save daily worksheet." });
  }
});

// Review/Approve Log
app.put('/api/logs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body;

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: "Valid status is required ('approved', 'rejected')" });
  }

  try {
    const log = await DailyLog.findById(id);
    if (!log) {
      return res.status(404).json({ error: "Log entry not found" });
    }

    const targetUser = await User.findById(log.internId);

    if (targetUser && canManage(req.user.role, targetUser.role)) {
      log.status = status;
      log.comments = comments || '';
      
      await log.save();
      
      // Auto-create notification for log owner
      await createNotification(
        log.internId,
        status === 'approved' ? "Daily Log Approved" : "Daily Log Rejected",
        `Your worksheet log for ${log.date} was ${status} by ${req.user.name}. ${comments ? `Feedback: "${comments}"` : ''}`
      );

      res.json(log);
    } else {
      res.status(403).json({ error: "Insufficient permissions to review this log." });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to update worksheet status." });
  }
});

// Skills Log Routes
app.get('/api/skills', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    let visibleSkills = [];

    if (role === 'admin') {
      visibleSkills = await Skill.find().populate('internId', 'name');
    } else if (role === 'manager' || role === 'employee') {
      const subordinateRoles = Object.keys(ROLES).filter(r => canManage(role, r));
      const subordinates = await User.find({ role: { $in: subordinateRoles } });
      const subordinateIds = subordinates.map(s => s._id);
      
      visibleSkills = await Skill.find({
        $or: [
          { internId: req.user.id },
          { internId: { $in: subordinateIds } }
        ]
      }).populate('internId', 'name');
    } else {
      visibleSkills = await Skill.find({ internId: req.user.id }).populate('internId', 'name');
    }

    res.json(visibleSkills.map(s => {
      const obj = s.toObject();
      return {
        ...obj,
        internName: s.internId ? s.internId.name : 'Unknown'
      };
    }));
  } catch (err) {
    res.status(500).json({ error: "Failed to load skills portfolios." });
  }
});

// Add/Update skill for self
app.post('/api/skills', authenticateToken, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: "Admins do not log skill portfolios." });
  }
  const { name, proficiency, notes } = req.body;
  if (!name || !proficiency) {
    return res.status(400).json({ error: "Skill name and proficiency (1-5) are required." });
  }

  try {
    // Check if skill already exists for this user (case insensitive check)
    let skill = await Skill.findOne({ 
      internId: req.user.id, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (skill) {
      skill.proficiency = parseInt(proficiency);
      skill.notes = notes || '';
      skill.loggedAt = new Date().toISOString().split('T')[0];
    } else {
      skill = new Skill({
        internId: req.user.id,
        name,
        proficiency: parseInt(proficiency),
        loggedAt: new Date().toISOString().split('T')[0],
        notes: notes || ''
      });
    }

    await skill.save();
    res.status(201).json(skill);
  } catch (err) {
    res.status(500).json({ error: "Failed to save skill portfolio." });
  }
});

// Feedbacks Routes
app.get('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      const feedbacks = await Feedback.find();
      res.json(feedbacks);
    } else if (role === 'manager' || role === 'employee') {
      const subordinateRoles = Object.keys(ROLES).filter(r => canManage(role, r));
      const subordinates = await User.find({ role: { $in: subordinateRoles } });
      const subordinateIds = subordinates.map(s => s._id);

      // Returns review feedbacks written FOR them, OR written BY them, OR written FOR subordinates
      const visibleFeedbacks = await Feedback.find({
        $or: [
          { internId: req.user.id },
          { reviewerName: req.user.name },
          { internId: { $in: subordinateIds } }
        ]
      });
      res.json(visibleFeedbacks);
    } else {
      const internFeedback = await Feedback.find({ internId: req.user.id });
      res.json(internFeedback);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback logs." });
  }
});

// Submit Feedback
app.post('/api/feedback', authenticateToken, async (req, res) => {
  const { internId, performanceRating, communicationRating, technicalRating, comments } = req.body;
  if (!internId || !performanceRating || !communicationRating || !technicalRating || !comments) {
    return res.status(400).json({ error: "Missing required fields for feedback" });
  }

  try {
    const targetUser = await User.findById(internId);
    if (!targetUser) {
      return res.status(400).json({ error: "Target user not found" });
    }

    // Verify hierarchy
    if (!canManage(req.user.role, targetUser.role)) {
      return res.status(403).json({ error: "Insufficient permissions to write reviews for this user." });
    }

    const newFeedback = new Feedback({
      internId,
      date: new Date().toISOString().split('T')[0],
      performanceRating: parseInt(performanceRating),
      communicationRating: parseInt(communicationRating),
      technicalRating: parseInt(technicalRating),
      comments,
      reviewerName: req.user.name
    });

    await newFeedback.save();
    
    // Auto-create notification for user
    await createNotification(
      internId,
      "New Performance Review",
      `You received a new performance evaluation from ${req.user.name}.`
    );

    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: "Failed to record performance review." });
  }
});

// Notifications Endpoints
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user.id });
    const sorted = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to load notifications." });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (String(notif.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    notif.read = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification." });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user.id, read: false });
    for (const notif of list) {
      notif.read = true;
      await notif.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notifications as read." });
  }
});

// Start Express App
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
