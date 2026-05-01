from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

app = FastAPI()

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/register")
def register_user(user: UserRegister):
    """Register a new user"""
    return {
        "message": "User registered successfully",
        "userId": 12345
    }

@app.post("/api/login")
def login_user(credentials: UserLogin):
    """Login user"""
    return {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
        "expiresIn": 3600
    }

@app.get("/api/users/{user_id}")
def get_user(user_id: int):
    """Get user profile"""
    return {
        "id": user_id,
        "username": "testuser",
        "email": "test@example.com",
        "createdAt": datetime.now().isoformat()
    }

@app.put("/api/users/{user_id}")
def update_user(user_id: int, updates: UserUpdate):
    """Update user profile"""
    return {
        "id": user_id,
        **updates.dict(exclude_unset=True),
        "updatedAt": datetime.now().isoformat()
    }

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    """Delete user"""
    return {
        "message": "User deleted successfully",
        "id": user_id
    }

# Made with Bob
