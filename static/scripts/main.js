const AgoraRTC = window.AgoraRTC; 

const APP_ID = "420c6bc609eb49aca8c70f7b71963e7c";
const TOKEN = sessionStorage.getItem('token');
const CHANNEL = sessionStorage.getItem('room');
let UID = Number(sessionStorage.getItem('UID'));

console.log("JS connected");


const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

let localTracks = [];
let remoteUsers = {};


let joinAndDisplayLocalStream = async () => {

        document.getElementById("room-name").innerText = CHANNEL;

        client.on("user-published", handleUserJoined);
        client.on("user-left", handleUserLeft);
        UID = await client.join(APP_ID, CHANNEL, TOKEN  , UID);

  
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

        let videoContainer = document.getElementById("video-streams");
        


        let player = `
            <div class="video-container" id="user-container-${UID}">
                <div class="video-player" id="user-${UID}"></div>
                <div class="username-wrapper"><span class="user-name">User ${UID}</span></div>
            </div>`;

        videoContainer.insertAdjacentHTML("beforeend", player);

        // Play local video 
        if (localTracks[1]) {
 
            localTracks[1].play(`user-${UID}`);
        

        // Publish local tracks to the channel
        await client.publish([localTracks[0], localTracks[1]]);

    } 
};

let handleUserJoined = async(user , mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if(mediaType === "video"){
        let player = document.getElementById(`user-container-${user.uid}`);
        if(player !=null){
            player.remove();
        }
        let videoContainer = document.getElementById("video-streams");

        player = `
            <div class="video-container" id="user-container-${user.uid}">
                <div class="video-player" id="user-${user.uid}"></div>
                <div class="username-wrapper"><span class="user-name">User ${user.uid}">}</span></div>
            </div>`;

        videoContainer.insertAdjacentHTML("beforeend", player);

        user.videoTrack.play(`user-${user.uid}`);
    }  

    if(mediaType === "audio"){
        user.audioTrack.play();
    }
}; 

let handleUserLeft = async(user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
}

let leaveAndRemoveLocalStream = async () => {
    
    for(let i=0 ; localTracks.length>i ; i++){
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    window.open('/', '_self');
}   

let togglecamera = async (e) => {
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false);
        e.target.style.backgroundColor='#fff'
    }else{
        await localTracks[1].setMuted(true);
        e.target.style.backgroundColor='rgb(255,80,80,1)'
    }
}
let toggleMic = async (e) => {
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false);
        e.target.style.backgroundColor='#fff'
    }else{
        await localTracks[0].setMuted(true);
        e.target.style.backgroundColor='rgb(255,80,80,1)'
    }
}

// Run join function after page loads
document.addEventListener("DOMContentLoaded", () => {
    joinAndDisplayLocalStream();
});

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('camera-btn').addEventListener('click', togglecamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
