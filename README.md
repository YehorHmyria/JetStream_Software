# 🚀 JetStream

**JetStream** is a high-performance Node.js application designed for throttled server-side event processing and automated data delivery. It provides a robust dashboard for managing jobs, tracking logs, and monitoring system health with integrated Telegram notifications.

## ✨ Key Features

- **🎯 Throttled Event Delivery:** Reliable delivery of events (e.g., AppsFlyer S2S) with configurable rates.
- **📊 Real-time Dashboard:** Monitor active jobs, view progress, and manage tasks through a sleek web interface.
- **📁 CSV Job Management:** Easily upload and execute batch jobs via CSV files.
- **📝 Secure Notes:** Built-in encrypted notepad for storing sensitive project information.
- **🤖 Telegram Integration:** Automated status reports and heartbeats sent directly to your Telegram chat.
- **🕒 Smart Scheduling:** Consistent health checks and daily status updates.
- **🔒 Secure Auth:** Session-based authentication (configured for demonstrative ease of access).

## 🛠 Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML5, CSS3, JavaScript
- **Authentication:** `express-session`, `bcryptjs`
- **Data Processing:** `csv-parse`
- **Logging:** Custom JSON-based storage and Telegram API integration

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/YehorHmyria/JetStream_Software.git
    cd JetStream_Software
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Set up your environment variables (create a `.env` file):

    ```env
    PORT=3000
    TELEGRAM_BOT_TOKEN=your_token
    TELEGRAM_CHAT_ID=your_chat_id
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=your_password
    SESSION_SECRET=your_secret
    NOTE_ENCRYPTION_KEY=your_encryption_key
    ```

4.  Start the server:
    ```bash
    npm start
    ```

## 🖥 Usage

Access the dashboard at `http://localhost:3000`.

> [!NOTE]
> For demonstration purposes, the login page is configured to allow entry by simply clicking **Continue**.

## 📄 License

This project is licensed under the MIT License.
