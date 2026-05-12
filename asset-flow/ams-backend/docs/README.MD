# CentralBooks Vantage - Asset Management System

## Overview

CentralBooks Vantage is a comprehensive asset management system designed for tracking, managing, and reporting on organizational assets, software licenses, maintenance tickets, and supplier relationships. Built with modern web technologies, it provides real-time insights and professional reporting capabilities for informed decision-making.

## 🎯 System Aim

This system was developed to:
- **Centralize Asset Tracking** - Maintain a single source of truth for all organizational assets
- **Ensure License Compliance** - Track software licenses, prevent over-allocation, and avoid compliance violations
- **Reduce Operational Costs** - Identify costly maintenance patterns and optimize asset utilization
- **Streamline Operations** - Automate assignment confirmations, notifications, and audit trails
- **Enable Data-Driven Decisions** - Provide comprehensive reports for budget planning and resource allocation

## 👨‍💻 Developer

**Developed by:** [Your Name]
**Contact:** [Your Email]
**Version:** 4.0.0
**Last Updated:** May 2026

## 🚀 Features

### Core Modules
- **Asset Inventory** - Track all physical assets with detailed information
- **Software Licenses** - Manage license keys, seats, and expiration dates
- **Employee Management** - Maintain employee records with asset assignments
- **Supplier Management** - Track vendor and supplier information
- **Maintenance Tickets** - Log and track maintenance requests and costs
- **Components & Accessories** - Manage IT components and accessories
- **Consumables** - Track consumable inventory and stock levels

### Reporting (6 Professional Reports)
1. **License Compliance Report** - Track license utilization, expiration, and compliance risks
2. **Asset Valuation Report** - Analyze asset values by category, department, and age
3. **Department Allocation Report** - View resource distribution across departments
4. **Maintenance Cost Report** - Analyze maintenance spending and identify costly assets
5. **Employee Asset History Report** - Track assets assigned to each employee
6. **Unconfirmed Assignments Report** - Monitor pending asset/license confirmations

### Security Features
- JWT-based authentication
- Role-based access control (Admin, Superuser, User)
- 8-hour session timeout with auto-logout
- Login attempt tracking and lockout
- Password strength validation
- Encrypted sensitive data (phone, job title)
- Comprehensive audit logging

### Additional Features
- Email notifications for asset assignments
- Asset assignment confirmation workflow
- Password reset via email
- Email verification for new accounts
- Dark/Light theme support
- Responsive design (desktop, tablet, mobile)
- Export to CSV functionality
- Professional print layouts for all reports

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Turso (libSQL)** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **dotenv** - Environment variables

### Database
- **Turso** - SQLite-based edge database
- **LibSQL** - SQLite-compatible API

## 📋 Requirements

### Server Requirements
- Node.js v20.x LTS or higher
- npm v10.x or higher
- 2GB RAM minimum
- 5GB storage minimum

### Client Requirements
- Modern web browser (Chrome, Firefox, Edge, Safari)
- JavaScript enabled
- Minimum 1024x768 resolution

## 🚀 Installation

### Prerequisites
1. Node.js v20.x installed
2. Turso account (https://turso.tech)
3. Git installed

### Backend Setup

```bash
# Navigate to backend folder
cd ams-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# TURSO_DATABASE_URL=your_database_url
# TURSO_AUTH_TOKEN=your_auth_token
# JWT_SECRET=your_secret_key
# PORT=5000

# Start backend server
npm run dev