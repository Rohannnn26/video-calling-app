import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            # ✅ Prevent KeyError by using `.get()`
            username = data.get("username", "Anonymous")
            message = data.get("message")

            # ✅ Ensure we don't process empty messages
            if message is not None:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "username": username,
                        "message": message,
                    },
                )
        except json.JSONDecodeError:
            print("Invalid JSON received, ignoring message.")

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))
