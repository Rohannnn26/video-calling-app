from django.shortcuts import render
from django.http import JsonResponse
from agora_token_builder import RtcTokenBuilder
import random
import time
import json
from .models import RoomMember
from django.views.decorators.csrf import csrf_exempt

# Generate Agora Token
def getToken(request):
    appId = "420c6bc609eb49aca8c70f7b71963e7c"
    appCertificate = "c90ba254638347e386bd43b0673a6ce6"
    channelName = request.GET.get('channel')
    uid = random.randint(1, 230)
    expirationTimeInSeconds = 3600 * 24
    currentTimestamp = time.time()
    privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
    role = 1

    token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
    return JsonResponse({'token': token, 'uid': uid}, safe=False)

# Render Lobby & Room Pages
def lobby(request):
    return render(request, 'base/lobby.html')

def room(request):
    return render(request, 'base/room.html')

# Store User & Preferred Language
@csrf_exempt
def createMember(request):
    data = json.loads(request.body)

    print("Received Data in createMember:", data)  # Debugging Step

    preferred_language = data.get('preferred_language')
    if not preferred_language:
        print("Warning: preferred_language is missing in request data. Defaulting to 'en'")
        preferred_language = 'en'

    member, created = RoomMember.objects.update_or_create(
        uid=data['UID'],
        defaults={
            "name": data['name'],
            "room_name": data['room_name'],
            "preferred_language": preferred_language
        }
    )

    print("Stored Language in DB:", member.preferred_language)  # Debugging Step
    return JsonResponse({'name': data['name'], 'preferred_language': member.preferred_language}, safe=False)

# Get User Information
def getMember(request):
    uid = request.GET.get('UID')
    room_name = request.GET.get('room_name')

    try:
        member = RoomMember.objects.get(uid=uid, room_name=room_name)
        return JsonResponse({'name': member.name, 'preferred_language': member.preferred_language}, safe=False)
    except RoomMember.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)

# Remove User from Database
@csrf_exempt
def deleteMember(request):
    data = json.loads(request.body)
    
    try:
        member = RoomMember.objects.get(name=data['name'], uid=data['UID'], room_name=data['room_name'])
        member.delete()
        return JsonResponse({'message': 'Member deleted'}, safe=False)
    except RoomMember.DoesNotExist:
        return JsonResponse({'error': 'Member not found'}, status=404)

from django.shortcuts import render

def chat_room(request):
    return render(request, "room.html")
