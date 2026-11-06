# Govt Exam Quiz App - MERN + React Native

Complete Objective Quiz Application for Government Exams (SSC, Banking, UPSC, Railways, Defence etc.)

## Structure
- `backend/`     : Node.js + Express + MongoDB
- `admin/`       : React Admin Panel
- `mobile/`      : React Native (Expo) App

## Features (v2)
- **Home page**: Auto-sliding banners + Exam categories + Subjects grid
- **Admin**: Manage Categories (exams), Subjects, Syllabus/Topics, Questions, Banners
- Seed buttons for default Govt exams (SSC, Banking, UPSC, Railways...) and common subjects
- Questions linked to Category + Subject + optional Syllabus
- Mobile: Select exam → subjects → start quiz

## Setup

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

Create admin:
```bash
curl -X POST http://localhost:5000/api/auth/setup
```

Default login: **admin@quiz.com** / **admin123**

### 2. Admin Panel
```bash
cd admin
npm install
npm start
```
Open http://localhost:3000

**First time steps in Admin:**
1. Go to **Categories** tab → click **Seed Govt Exams**
2. Go to **Subjects** tab → click **Seed Common Subjects**
3. Go to **Banners / Slider** → click **Seed Default Banners**
4. Add Syllabus (optional) and Questions

### 3. Mobile App
```bash
cd mobile
npm install
npx expo start
```

For real device, change API URL in `mobile/src/services/api.js` to your computer IP.

## API Endpoints

### Auth
- POST `/api/auth/login`
- POST `/api/auth/setup`

### Categories (Exams)
- GET `/api/categories`
- POST `/api/categories` (auth)
- PUT `/api/categories/:id` (auth)
- DELETE `/api/categories/:id` (auth)
- POST `/api/categories/seed` (auth)

### Subjects
- GET `/api/subjects?category=ID`
- POST `/api/subjects` (auth)
- PUT `/api/subjects/:id` (auth)
- DELETE `/api/subjects/:id` (auth)
- POST `/api/subjects/seed` (auth)

### Syllabus
- GET `/api/syllabus?subject=ID&category=ID`
- POST `/api/syllabus` (auth)
- PUT `/api/syllabus/:id` (auth)
- DELETE `/api/syllabus/:id` (auth)

### Banners (Slider)
- GET `/api/banners`
- POST `/api/banners` (auth)
- PUT `/api/banners/:id` (auth)
- DELETE `/api/banners/:id` (auth)
- POST `/api/banners/seed` (auth)

### Questions
- GET `/api/questions?category=ID&subject=ID&difficulty=Easy`
- POST `/api/questions` (auth)
- PUT `/api/questions/:id` (auth)
- DELETE `/api/questions/:id` (auth)
