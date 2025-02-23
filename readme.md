# Django-Based Video Calling with Real-Time Speech Translation

## 📌 Overview

This project is a **Django-based video calling website** that integrates **Agora SDK** for real-time communication and **Azure Speech Services** for **real-time speech-to-speech translation** for multiple users. Users can join video calls, select their preferred language, and hear translations of other participants' speech in real time.

## 🚀 Features

- **Multi-user video calling** using Agora SDK
- **Real-time speech detection & translation** using Azure Speech Services
- **User language selection** in the lobby
- **Streaming translated audio** to users in real-time
- **Live chat feature** using WebSockets
- **Modern UI with pure HTML, CSS, and JavaScript**
- **Secure authentication for users**
- **Session management to ensure seamless communication**

## 🛠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Django
- **WebRTC SDK:** Agora SDK
- **Speech Translation:** Azure Speech Services
- **Real-time Communication:** WebSockets
- **Database:** SQLite
- **Authentication:** Django Authentication System

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

- Python (>=3.8)
- Virtual environment (optional but recommended)
- An **Agora Developer Account** with an App ID
- An **Azure Speech Services API Key**
- Git for version control

## 🔧 Installation and Setup

Follow these steps to set up and run the project:

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2️⃣ Create and Activate Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 4️⃣ Required Configuration

The following variables must be set in `main.js`:

- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

### 5️⃣ Apply Migrations and Start Server

```bash
python manage.py migrate
python manage.py createsuperuser  # Optional: Create an admin user
python manage.py runserver
```

### 6️⃣ Access the Application

Open a browser and go to:

```
http://127.0.0.1:8000/
```

## 🎯 Usage

1. Users enter the video call lobby and select their preferred language.
2. Upon joining the call, speech is transcribed, translated, and played back in real-time.
3. Participants hear speech in their chosen language while interacting in the call.
4. Users can also send **live chat messages** during the call.
5. Admins can manage user sessions and monitor active calls through the Django admin panel.

## 📌 Future Enhancements

- **Support for more languages** in translation
- **Improved UI/UX** with animations and accessibility features
- **User profile management** for personalization
- **Mobile-friendly responsive design**

