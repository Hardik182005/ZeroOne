from fastapi import APIRouter
from pydantic import BaseModel
from services.groq_svc import get_groq_chat_response

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    context: str = ""

@router.post("")
async def chat(req: ChatRequest):
    if not req.message.strip():
        return {"reply": "Please ask me something about Indian markets!"}
    reply = await get_groq_chat_response(req.message, req.context)
    return {"reply": reply}
