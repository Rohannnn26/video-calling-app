from django.db import models

class RoomMember(models.Model):
    name=models.CharField(max_length=200)
    uid=models.CharField(max_length=200)
    room_name=models.CharField(max_length=200)
    preferred_language = models.CharField(max_length=50, default="en")
    
    def __str__(self):
        return self.name

