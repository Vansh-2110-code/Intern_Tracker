# InternHub - Corporate Hierarchy Internship Tracker

**InternHub** is a premium, full-stack Internship and Task Tracker system built to manage and streamline internship cycles. The platform enforces a strict corporate hierarchy, allowing supervisors to assign tasks, approve hourly logs, and submit structured performance reviews.

---

## 🚀 Key Features & Role Matrix

The application implements a strict hierarchical workflow:
$$\text{Admin (Rank 4)} > \text{Manager (Rank 3)} > \text{Employee (Rank 2)} > \text{Intern (Rank 1)}$$

*   **Administrator (Rank 4)**: Full system oversight. Can register, manage, or delete any Manager, Employee, or Intern. Explores profiles, reviews performance, and manages team-wide tasks.
*   **Manager (Rank 3)**: Supervises Employees and Interns. Manages task boards, reviews logged hours, and drafts performance evaluations. Includes a personal workspace to log their own tasks and hours (subject to Admin approval).
*   **Employee (Rank 2)**: Supervises Interns. Reviews intern worksheets, distributes tasks, and logs evaluations. Includes a personal workspace to track their own work.
*   **Intern (Rank 1)**: Core task board. Submits daily log worksheets (hours and description) for approval and reports skills metrics. Reads supervisor evaluations.

---

## 🛠️ Technology Stack

*   **Frontend**: React.js (Vite), React Router DOM v6, Lucide Icons.
*   **Styling**: Modern Vanilla CSS with glassmorphic elements, HSL color tokens, and fluid animations.
*   **Backend**: Node.js + Express.js.
*   **Database**: MongoDB (Mongoose ODM) with an automatic JSON-file local database fallback when MongoDB is not running locally.
*   **Authentication**: JSON Web Tokens (JWT) secured with PBKDF2 cryptography hashing.

---

## 💻 Local Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   npm

### 1. Clone & Install Dependencies
Clone the repository, and install the dependencies for both frontend and backend directories:
```bash
# Install root, backend, and frontend packages in one command
npm run install-all
```

### 2. Environment Configurations
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=any_secure_random_string_here
```
*Note: If no `MONGODB_URI` is specified or local MongoDB connection fails, the server automatically defaults to the file-based database at `backend/data/database.json`.*

### 3. Run Locally
Start the development server for both frontend and backend concurrently:
```bash
npm run dev
```
*   **Frontend Client**: http://localhost:5173/
*   **Backend Server**: http://localhost:5000/

### 4. Default Seed Credentials
Upon clean installation, the database is seeded with a default System Administrator account:
*   **Username**: `admin`
*   **Password**: `admin123`

*New Managers, Employees, or Interns can self-register using the **Sign Up** portal on the login screen.*

---

## ☁️ Deployment (One-Click Render Blueprint)

This project is pre-configured with a Render Blueprint (`render.yaml`). You can host both the frontend and backend in one step:

1.  Push this code to your **GitHub** account.
2.  Log in to [Render](https://render.com).
3.  Go to **New +** -> **Blueprint**.
4.  Connect your repository.
5.  Enter your `MONGODB_URI` connection string when prompted, and click **Apply**.
