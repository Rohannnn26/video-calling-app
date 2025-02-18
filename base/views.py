from django.shortcuts import render
from django.http import JsonResponse
from agora_token_builder import RtcTokenBuilder
import random
import time

# Create your views here.
def getToken(request):
    appId= "420c6bc609eb49aca8c70f7b71963e7c"
    appCertificate="c90ba254638347e386bd43b0673a6ce6"
    channelName = request.GET.get('channel')
    uid=random.randint(1, 230)
    expirationTimeInSeconds = 3600 * 24
    currentTimestamp = time.time()
    privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
    role=1
    
    token = RtcTokenBuilder.buildTokenWithUid(appId , appCertificate , channelName , uid , role , privilegeExpiredTs)
    
    return JsonResponse({'token':token , 'uid':uid} , safe=False)
    
    
def lobby(request):
    return render(request, 'base/lobby.html')
def room(request):
    return render(request, 'base/room.html')