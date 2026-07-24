# Streaming Media Platform - Admin Backend

## Overview
This project is the **Admin Backend** for a streaming media platform designed for managing content (movies, series, and episodes), user comments, and preferences. Built with **Node.js**, it provides CRUD operations for the admin to manage the platform efficiently.

---

## Features
1. **Content Management**:
   - Add, update, and soft delete movies, series, and their episodes.
   - Separate handling for episodes and seasons for larger datasets.

2. **User Comment Management**:
   - Add comments on content.
   - Soft delete comments.

3. **User Preferences**:
   - Manage user watchlists and favorites.

4. **Video Transcoding Integration**:
   - Integration with an FFmpeg service for transcoding videos to HLS format and uploading them to an S3-compatible storage.

---

## Technology Stack
### Backend:
- **Node.js** with **Express.js** for building REST APIs.

### Database:
- **MongoDB** for storing content, comments, and user preferences.

### Video Processing:
- **FFmpeg Service** for transcoding and video preparation.

---

## Project Structure
```plaintext
admin-backend/
├── controllers/              # Business logic for routes
│   ├── contentController.js  # Manage content (movies, series, episodes)
│   ├── commentController.js  # Manage comments
│   └── preferenceController.js # Manage user preferences
├── models/                   # Mongoose models for MongoDB
│   ├── contentModel.js       # Content schema
│   ├── commentModel.js       # Comment schema
│   └── preferenceModel.js    # User preferences schema
├── routes/                   # API route handlers
│   ├── contentRoutes.js      # Content-related routes
│   ├── commentRoutes.js      # Comment-related routes
│   └── preferenceRoutes.js   # User preference routes
├── config/                   # Configuration files
│   └── db.js                 # MongoDB connection setup
├── app.js                    # Main application entry point
├── package.json              # Project dependencies
└── README.md                 # Documentation
```
------------------------

## Setup Instructions
### 1. Prerequisites
Ensure the following software is installed on your system:

- Node.js (v16 or above)
- MongoDB (local or cloud instance)
- Postman or a similar API testing tool for testing the endpoints.
### 2. Installation
Clone the repository and navigate to the project directory:

```sh
git clone <repository-url>
cd admin-backend
```

Install dependencies:
```sh
npm install
```

### 3. Environment Variables
Create a .env file in the root directory and configure the following variables:
```
MONGO_URI=mongodb://localhost:27017/streaming-platform
PORT=3000
```

### 4. Running the Application
Start the server:
```bash
node app.js
```

The backend will be available at http://localhost:3000.

----------------------

## API Endpoints
### Content Management

