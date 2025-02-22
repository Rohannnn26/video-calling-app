const AgoraRTC = window.AgoraRTC; 

const APP_ID = "420c6bc609eb49aca8c70f7b71963e7c";
const TOKEN = sessionStorage.getItem('token')
const CHANNEL = sessionStorage.getItem('room')
let UID = sessionStorage.getItem('UID')

let NAME = sessionStorage.getItem('name')

const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})

let localTracks = []
let remoteUsers = {}

document.addEventListener("DOMContentLoaded", () => {
    let chatBtn = document.getElementById("chat-btn");
    let chatContainer = document.getElementById("chat-container");
    let closeChat = document.getElementById("close-chat");
    let chatInput = document.getElementById("chat-input");
    let sendChatBtn = document.getElementById("send-chat");
    let chatMessages = document.getElementById("chat-messages");
    let typingIndicator = document.getElementById("typing-indicator");

    let typingUsers = new Set();
    let typingTimeouts = {};
    let chatSocket = null;
    let isChatOpen = false; // Track chat state

    function openChat() {
        chatContainer.classList.add("show");
        isChatOpen = true;
    }

    function closeChatBox() {
        chatContainer.classList.remove("show");
        setTimeout(() => (chatContainer.style.display = "none"), 300);
        isChatOpen = false;
    }

    chatBtn.addEventListener("click", () => {
        if (isChatOpen) {
            closeChatBox();
        } else {
            let rect = chatBtn.getBoundingClientRect();
            chatContainer.style.bottom = `${window.innerHeight - rect.top + 10}px`;
            chatContainer.style.right = `${window.innerWidth - rect.right + 10}px`;

            chatContainer.style.display = "flex";
            setTimeout(openChat, 10);
        }
    });

    closeChat.addEventListener("click", closeChatBox);

    function initializeWebSocket() {
        chatSocket = new WebSocket(
            `ws://${window.location.host}/ws/chat/${CHANNEL}/`
        );

        chatSocket.onmessage = function (event) {
            let data = JSON.parse(event.data);

            if (data.typing) {
                showTypingIndicator(data.username);
            } else {
                let messageElement = document.createElement("div");
                messageElement.classList.add("message", data.username === NAME ? "user" : "other");
                messageElement.textContent = `${data.username}: ${data.message}`;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                removeTypingIndicator(data.username);
            }
        };

        chatSocket.onclose = () => {
            setTimeout(initializeWebSocket, 2000);
        };
    }

    initializeWebSocket();

    sendChatBtn.addEventListener("click", () => {
        let message = chatInput.value.trim();
        if (message !== "") {
            chatSocket.send(JSON.stringify({ username: NAME, message }));
            chatInput.value = "";
        }
    });

    chatInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendChatBtn.click();
        }

        chatSocket.send(JSON.stringify({ username: NAME, typing: true }));

        if (typingTimeouts[NAME]) {
            clearTimeout(typingTimeouts[NAME]);
        }

        typingTimeouts[NAME] = setTimeout(() => {
            chatSocket.send(JSON.stringify({ username: NAME, typing: false }));
        }, 1500);
    });

    function showTypingIndicator(username) {
        typingUsers.add(username);
        typingIndicator.textContent = `${Array.from(typingUsers).join(", ")} is typing...`;
        typingIndicator.classList.add("show");
    }

    function removeTypingIndicator(username) {
        typingUsers.delete(username);
        if (typingUsers.size === 0) {
            typingIndicator.classList.remove("show");
        } else {
            typingIndicator.textContent = `${Array.from(typingUsers).join(", ")} is typing...`;
        }
    }
});




let joinAndDisplayLocalStream = async () => {
    document.getElementById('room-name').innerText = CHANNEL

    client.on('user-published', handleUserJoined)
    client.on('user-left', handleUserLeft)

    try{
        UID = await client.join(APP_ID, CHANNEL, TOKEN, UID)
    }catch(error){
        console.error(error)
        window.open('/', '_self')
    }
    
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()

    let member = await createMember()

    let player = `<div  class="video-container" id="user-container-${UID}">
                     <div class="video-player" id="user-${UID}"></div>
                     <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
                  </div>`
    
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
    localTracks[1].play(`user-${UID}`)
    await client.publish([localTracks[0], localTracks[1]])

    // Set default button colors to white
    document.getElementById('camera-btn').style.backgroundColor = '#fff'
    document.getElementById('mic-btn').style.backgroundColor = '#fff'
}



let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video'){
        let player = document.getElementById(`user-container-${user.uid}`)
        if (player != null){
            player.remove()
        }

        let member = await getMember(user)

        player = `<div  class="video-container" id="user-container-${user.uid}">
            <div class="video-player" id="user-${user.uid}"></div>
            <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
        </div>`

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

let leaveAndRemoveLocalStream = async () => {
    for (let i=0; localTracks.length > i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    deleteMember()
    window.open('/', '_self')
}

let toggleCamera = async (e) => {
    console.log('TOGGLE CAMERA TRIGGERED')
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        e.target.style.backgroundColor = '#fff'
    }else{
        await localTracks[1].setMuted(true)
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
    }
}

let toggleMic = async (e) => {
    console.log('TOGGLE MIC TRIGGERED')
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false)
        e.target.style.backgroundColor = '#fff'
    }else{
        await localTracks[0].setMuted(true)
        e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
    }
}

let createMember = async () => {
    let response = await fetch('/create_member/', {
        method:'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body:JSON.stringify({'name':NAME, 'room_name':CHANNEL, 'UID':UID})
    })
    let member = await response.json()
    return member
}


let getMember = async (user) => {
    let response = await fetch(`/get_member/?UID=${user.uid}&room_name=${CHANNEL}`)
    let member = await response.json()
    return member
}

let deleteMember = async () => {
    let response = await fetch('/delete_member/', {
        method:'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body:JSON.stringify({'name':NAME, 'room_name':CHANNEL, 'UID':UID})
    })
    let member = await response.json()
}

window.addEventListener("beforeunload",deleteMember);

joinAndDisplayLocalStream()

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)