const AgoraRTC = window.AgoraRTC;

// Agora Credentials
const APP_ID = "420c6bc609eb49aca8c70f7b71963e7c";
const TOKEN = sessionStorage.getItem("token");
const CHANNEL = sessionStorage.getItem("room");
let UID = sessionStorage.getItem("UID");
let NAME = sessionStorage.getItem("name");

// Get User's Preferred Language from Session Storage
const PREFERRED_LANGUAGE = sessionStorage.getItem("preferred_language") || "en"; // Default to English
console.log(`Preferred Language: ${PREFERRED_LANGUAGE}`);

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

let localTracks = [];
let remoteUsers = {};

// Azure Speech Services Credentials
const AZURE_SPEECH_KEY = "308R881X5BCY1Q0EwF19QImne83PGm6v5Bcvhkcxw40hk1Br4MN8JQQJ99BBACGhslBXJ3w3AAAYACOGdSr1";
const AZURE_REGION = "centralindia";

let joinAndDisplayLocalStream = async () => {
  document.getElementById("room-name").innerText = CHANNEL;

  client.on("user-published", handleUserJoined);
  client.on("user-left", handleUserLeft);

  try {
    UID = await client.join(APP_ID, CHANNEL, TOKEN, UID);
  } catch (error) {
    console.error(error);
    window.open("/", "_self");
  }

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  let member = await createMember();

  let player = `<div class="video-container" id="user-container-${UID}">
                    <div class="video-player" id="user-${UID}"></div>
                    <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
                </div>`;

  document.getElementById("video-streams").insertAdjacentHTML("beforeend", player);
  localTracks[1].play(`user-${UID}`);
  await client.publish([localTracks[0], localTracks[1]]);

  // Initialize Speech Translation for Local Audio
  initSpeechTranslation(localTracks[0].getMediaStreamTrack());

  // Set default button colors
  document.getElementById("camera-btn").style.backgroundColor = "#fff";
  document.getElementById("mic-btn").style.backgroundColor = "#fff";
};

let handleUserJoined = async (user, mediaType) => {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    let player = document.getElementById(`user-container-${user.uid}`);
    if (player != null) {
      player.remove();
    }

    let member = await getMember(user);

    player = `<div class="video-container" id="user-container-${user.uid}">
                 <div class="video-player" id="user-${user.uid}"></div>
                 <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
              </div>`;

    document.getElementById("video-streams").insertAdjacentHTML("beforeend", player);
    user.videoTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
    initSpeechTranslation(user.audioTrack.getMediaStreamTrack()); // Start translating the user's audio
  }
};

let handleUserLeft = async (user) => {
  delete remoteUsers[user.uid];
  document.getElementById(`user-container-${user.uid}`).remove();
};

let leaveAndRemoveLocalStream = async () => {
  for (let i = 0; localTracks.length > i; i++) {
    localTracks[i].stop();
    localTracks[i].close();
  }

  await client.leave();
  deleteMember();
  window.open("/", "_self");
};

let toggleCamera = async (e) => {
  if (localTracks[1].muted) {
    await localTracks[1].setMuted(false);
    e.target.style.backgroundColor = "#fff";
  } else {
    await localTracks[1].setMuted(true);
    e.target.style.backgroundColor = "rgb(255, 80, 80, 1)";
  }
};

let toggleMic = async (e) => {
  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    e.target.style.backgroundColor = "#fff";
  } else {
    await localTracks[0].setMuted(true);
    e.target.style.backgroundColor = "rgb(255, 80, 80, 1)";
  }
};

let createMember = async () => {
  let response = await fetch("/create_member/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: NAME, room_name: CHANNEL, UID: UID }),
  });
  let member = await response.json();
  return member;
};

let getMember = async (user) => {
  let response = await fetch(`/get_member/?UID=${user.uid}&room_name=${CHANNEL}`);
  let member = await response.json();
  return member;
};

let deleteMember = async () => {
  await fetch("/delete_member/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: NAME, room_name: CHANNEL, UID: UID }),
  });
};

window.addEventListener("beforeunload", deleteMember);

// Function to Initialize Speech Translation with Language Detection
let initSpeechTranslation = (audioTrack) => {
  const speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
  speechConfig.speechRecognitionLanguage = "en-US"; // Default, but language detection is enabled below
  speechConfig.addTargetLanguage(PREFERRED_LANGUAGE);

  // Enable Automatic Language Detection
  speechConfig.enableLanguageId = true; // Detects language automatically

  const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

  recognizer.recognizing = (s, e) => {
    console.log(`Recognizing: ${e.result.text}`);
  };

  recognizer.recognized = (s, e) => {
    if (e.result.reason === SpeechSDK.ResultReason.TranslatedSpeech) {
      console.log(`Detected Language: ${e.result.language}`)
      console.log(`Translated (${PREFERRED_LANGUAGE}): ${e.result.translations.get(PREFERRED_LANGUAGE)}`);
    }
  };

  recognizer.startContinuousRecognitionAsync();
};

joinAndDisplayLocalStream();

document.getElementById("leave-btn").addEventListener("click", leaveAndRemoveLocalStream);
document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("mic-btn").addEventListener("click", toggleMic);
