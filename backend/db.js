require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intern_tracker';
const JSON_DB_PATH = path.join(__dirname, 'data', 'database.json');

let dbMode = 'mongo'; // 'mongo' | 'json'

// Hashing Helpers
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, hash) {
  const checkHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
}

// ----------------------------------------------------
// 1. MONGOOSE REAL SCHEMAS & MODELS DEFINITION
// ----------------------------------------------------
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'manager', 'employee', 'intern'] },
  name: { type: String, required: true },
  email: { type: String, required: true },
  internshipTitle: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] }
});
const UserModel = mongoose.model('User', UserSchema);

const TaskSchema = new mongoose.Schema({
  internId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'todo', enum: ['todo', 'in_progress', 'review', 'completed'] },
  assignedDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  feedback: { type: String, default: '' }
});
const TaskModel = mongoose.model('Task', TaskSchema);

const DailyLogSchema = new mongoose.Schema({
  internId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  hours: { type: Number, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  comments: { type: String, default: '' }
});
const DailyLogModel = mongoose.model('DailyLog', DailyLogSchema);

const SkillSchema = new mongoose.Schema({
  internId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  proficiency: { type: Number, required: true, min: 1, max: 5 },
  loggedAt: { type: String, required: true },
  notes: { type: String, default: '' }
});
const SkillModel = mongoose.model('Skill', SkillSchema);

const FeedbackSchema = new mongoose.Schema({
  internId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  performanceRating: { type: Number, required: true, min: 1, max: 5 },
  communicationRating: { type: Number, required: true, min: 1, max: 5 },
  technicalRating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: true },
  reviewerName: { type: String, required: true }
});
const FeedbackModel = mongoose.model('Feedback', FeedbackSchema);


// Connect to MongoDB
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 })
  .then(() => {
    console.log('Connected successfully to MongoDB.');
    dbMode = 'mongo';
    seedDatabaseMongo();
  })
  .catch(err => {
    console.warn(`\n⚠️  MongoDB connection failed: ${err.message}`);
    console.warn(`⚠️  Falling back to Local JSON Database (${JSON_DB_PATH})\n`);
    dbMode = 'json';
    seedDatabaseJson();
  });


// ----------------------------------------------------
// 2. SEED DATA DECLARATIONS (Clean seed with Admin only)
// ----------------------------------------------------
function getSeedData() {
  const adminSalt = generateSalt();
  const adminId = new mongoose.Types.ObjectId().toString();

  return {
    users: [
      {
        id: adminId, _id: adminId,
        username: "admin",
        salt: adminSalt,
        passwordHash: hashPassword("admin123", adminSalt),
        role: "admin",
        name: "Sarah Jenkins",
        email: "sarah.j@sannainnovations.com",
        status: "active"
      }
    ],
    tasks: [],
    dailyLogs: [],
    skills: [],
    feedbacks: []
  };
}

async function seedDatabaseMongo() {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount > 0) return;
    console.log('Seeding MongoDB with Admin account...');
    const seed = getSeedData();
    await UserModel.insertMany(seed.users);
    console.log('MongoDB Seeded successfully.');
  } catch (err) {
    console.error('MongoDB seed error:', err);
  }
}

// ----------------------------------------------------
// 3. LOCAL JSON DATABASE FALLBACK DRIVER
// ----------------------------------------------------
function ensureDirExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function readDB() {
  ensureDirExists(JSON_DB_PATH);
  if (!fs.existsSync(JSON_DB_PATH)) {
    const seed = getSeedData();
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], tasks: [], dailyLogs: [], skills: [], feedbacks: [] };
  }
}

function writeDB(data) {
  ensureDirExists(JSON_DB_PATH);
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function seedDatabaseJson() {
  // Always regenerate local database to clean mock data
  const seed = getSeedData();
  writeDB(seed);
  console.log('JSON Local Database Reset and Seeded with Admin Account.');
}

// Helper to wrap JSON plain objects to simulate Mongoose Document behaviors
function wrapDoc(obj, collectionName) {
  if (!obj) return null;
  return {
    ...obj,
    id: obj.id || obj._id,
    _id: obj.id || obj._id,
    toObject: function() {
      const copy = { ...this };
      delete copy.toObject;
      delete copy.save;
      return copy;
    },
    save: async function() {
      const db = readDB();
      const collection = db[collectionName];
      const targetId = this.id || this._id;
      const index = collection.findIndex(item => (item.id || item._id) === targetId);
      
      const cleanObj = this.toObject();
      if (index !== -1) {
        collection[index] = cleanObj;
      } else {
        collection.push(cleanObj);
      }
      writeDB(db);
      return this;
    }
  };
}

// Mock Model Helpers
function makeMockModel(collectionName) {
  return {
    find: async (filter = {}) => {
      const db = readDB();
      let list = db[collectionName] || [];
      
      // Basic query filters implementation
      Object.keys(filter).forEach(key => {
        const val = filter[key];
        if (val && typeof val === 'object') {
          if (val.$in) {
            list = list.filter(item => val.$in.map(v => String(v)).includes(String(item[key])));
          }
          if (key === '$or') {
            list = list.filter(item => {
              return val.some(condition => {
                return Object.keys(condition).every(ckey => {
                  const cval = condition[ckey];
                  if (cval && typeof cval === 'object' && cval.$in) {
                    return cval.$in.map(v => String(v)).includes(String(item[ckey]));
                  }
                  return String(item[ckey]) === String(cval);
                });
              });
            });
          }
        } else {
          list = list.filter(item => String(item[key]) === String(val));
        }
      });
      return list.map(item => wrapDoc(item, collectionName));
    },
    findOne: async (filter = {}) => {
      const db = readDB();
      let list = db[collectionName] || [];
      
      const match = list.find(item => {
        return Object.keys(filter).every(key => {
          const val = filter[key];
          if (val && val.$regex) {
            return val.test(item[key]);
          }
          return String(item[key]).toLowerCase() === String(val).toLowerCase();
        });
      });
      return match ? wrapDoc(match, collectionName) : null;
    },
    findById: async (id) => {
      const db = readDB();
      const list = db[collectionName] || [];
      const match = list.find(item => String(item.id || item._id) === String(id));
      return match ? wrapDoc(match, collectionName) : null;
    },
    deleteOne: async (filter = {}) => {
      const db = readDB();
      let list = db[collectionName] || [];
      const initialLength = list.length;
      
      list = list.filter(item => {
        return !Object.keys(filter).every(key => String(item[key]) === String(filter[key]));
      });
      
      db[collectionName] = list;
      writeDB(db);
      return { deletedCount: initialLength - list.length };
    },
    deleteMany: async (filter = {}) => {
      const db = readDB();
      let list = db[collectionName] || [];
      const initialLength = list.length;
      
      list = list.filter(item => {
        return !Object.keys(filter).every(key => String(item[key]) === String(filter[key]));
      });
      
      db[collectionName] = list;
      writeDB(db);
      return { deletedCount: initialLength - list.length };
    },
    populate: function(docs, field) {
      const db = readDB();
      const usersList = db.users;
      return docs.map(doc => {
        const userId = doc[field];
        const user = usersList.find(u => String(u.id || u._id) === String(userId));
        return {
          ...doc,
          [field]: user ? { name: user.name } : null
        };
      });
    }
  };
}

// Constructor Mock Builder
function makeMockConstructor(collectionName) {
  return function(data) {
    const docId = data.id || data._id || new mongoose.Types.ObjectId().toString();
    const doc = {
      ...data,
      id: docId,
      _id: docId
    };
    return wrapDoc(doc, collectionName);
  };
}

// ----------------------------------------------------
// 4. UNIFIED GATEWAY OBJECTS
// ----------------------------------------------------
const UserGateway = {
  find: (q) => dbMode === 'mongo' ? UserModel.find(q) : makeMockModel('users').find(q),
  findOne: (q) => dbMode === 'mongo' ? UserModel.findOne(q) : makeMockModel('users').findOne(q),
  findById: (id) => dbMode === 'mongo' ? UserModel.findById(id) : makeMockModel('users').findById(id),
  deleteOne: (q) => dbMode === 'mongo' ? UserModel.deleteOne(q) : makeMockModel('users').deleteOne(q),
  create: (d) => dbMode === 'mongo' ? UserModel.create(d) : makeMockConstructor('users')(d),
  new: (d) => dbMode === 'mongo' ? new UserModel(d) : makeMockConstructor('users')(d)
};

const TaskGateway = {
  find: (q) => dbMode === 'mongo' ? TaskModel.find(q) : makeMockModel('tasks').find(q),
  findById: (id) => dbMode === 'mongo' ? TaskModel.findById(id) : makeMockModel('tasks').findById(id),
  deleteOne: (q) => dbMode === 'mongo' ? TaskModel.deleteOne(q) : makeMockModel('tasks').deleteOne(q),
  deleteMany: (q) => dbMode === 'mongo' ? TaskModel.deleteMany(q) : makeMockModel('tasks').deleteMany(q),
  new: (d) => dbMode === 'mongo' ? new TaskModel(d) : makeMockConstructor('tasks')(d)
};

const DailyLogGateway = {
  find: (q) => dbMode === 'mongo' ? DailyLogModel.find(q) : makeMockModel('dailyLogs').find(q),
  findById: (id) => dbMode === 'mongo' ? DailyLogModel.findById(id) : makeMockModel('dailyLogs').findById(id),
  deleteMany: (q) => dbMode === 'mongo' ? DailyLogModel.deleteMany(q) : makeMockModel('dailyLogs').deleteMany(q),
  new: (d) => dbMode === 'mongo' ? new DailyLogModel(d) : makeMockConstructor('dailyLogs')(d)
};

const SkillGateway = {
  find: async (q) => {
    if (dbMode === 'mongo') {
      return SkillModel.find(q);
    } else {
      const docs = await makeMockModel('skills').find(q);
      return makeMockModel('skills').populate(docs, 'internId');
    }
  },
  findOne: (q) => dbMode === 'mongo' ? SkillModel.findOne(q) : makeMockModel('skills').findOne(q),
  deleteMany: (q) => dbMode === 'mongo' ? SkillModel.deleteMany(q) : makeMockModel('skills').deleteMany(q),
  new: (d) => dbMode === 'mongo' ? new SkillModel(d) : makeMockConstructor('skills')(d)
};

const FeedbackGateway = {
  find: (q) => dbMode === 'mongo' ? FeedbackModel.find(q) : makeMockModel('feedbacks').find(q),
  deleteMany: (q) => dbMode === 'mongo' ? FeedbackModel.deleteMany(q) : makeMockModel('feedbacks').deleteMany(q),
  new: (d) => dbMode === 'mongo' ? new FeedbackModel(d) : makeMockConstructor('feedbacks')(d)
};

const UserClass = function(d) { return UserGateway.new(d); };
const TaskClass = function(d) { return TaskGateway.new(d); };
const DailyLogClass = function(d) { return DailyLogGateway.new(d); };
const SkillClass = function(d) { return SkillGateway.new(d); };
const FeedbackClass = function(d) { return FeedbackGateway.new(d); };

UserClass.find = UserGateway.find;
UserClass.findOne = UserGateway.findOne;
UserClass.findById = UserGateway.findById;
UserClass.deleteOne = UserGateway.deleteOne;

TaskClass.find = TaskGateway.find;
TaskClass.findById = TaskGateway.findById;
TaskClass.deleteOne = TaskGateway.deleteOne;
TaskClass.deleteMany = TaskGateway.deleteMany;

DailyLogClass.find = DailyLogGateway.find;
DailyLogClass.findById = DailyLogGateway.findById;
DailyLogClass.deleteMany = DailyLogGateway.deleteMany;

SkillClass.find = SkillGateway.find;
SkillClass.findOne = SkillGateway.findOne;
SkillClass.deleteMany = SkillGateway.deleteMany;

FeedbackClass.find = FeedbackGateway.find;
FeedbackClass.deleteMany = FeedbackGateway.deleteMany;

module.exports = {
  User: UserClass,
  Task: TaskClass,
  DailyLog: DailyLogClass,
  Skill: SkillClass,
  Feedback: FeedbackClass,
  generateSalt,
  hashPassword,
  verifyPassword
};
