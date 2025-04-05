const AgoraRTC = window.AgoraRTC;

// Agora Credentials
const APP_ID = "420c6bc609eb49aca8c70f7b71963e7c";
const TOKEN = sessionStorage.getItem("token");
const CHANNEL = sessionStorage.getItem("room");
let UID = sessionStorage.getItem("UID");
let NAME = sessionStorage.getItem("name");

// Get User's Preferred Language from Session Storage
const PREFERRED_LANGUAGE = sessionStorage.getItem("preferred_language") || "en"; // Default to English
const LANGUAGE_MAP = {
    "af": "af-ZA",
    "am": "am-ET",
    "ar": "ar-SA",
    "az": "az-AZ",
    "bg": "bg-BG",
    "bn": "bn-IN",
    "bs": "bs-BA",
    "ca": "ca-ES",
    "cs": "cs-CZ",
    "cy": "cy-GB",
    "da": "da-DK",
    "de": "de-DE",
    "el": "el-GR",
    "en": "en-US",
    "es": "es-ES",
    "et": "et-EE",
    "fa": "fa-IR",
    "fi": "fi-FI",
    "fil": "fil-PH",
    "fr": "fr-FR",
    "gu": "gu-IN",
    "he": "he-IL",
    "hi": "hi-IN",
    "hr": "hr-HR",
    "hu": "hu-HU",
    "id": "id-ID",
    "is": "is-IS",
    "it": "it-IT",
    "ja": "ja-JP",
    "jv": "jv-ID",
    "kk": "kk-KZ",
    "km": "km-KH",
    "kn": "kn-IN",
    "ko": "ko-KR",
    "lo": "lo-LA",
    "lt": "lt-LT",
    "lv": "lv-LV",
    "ml": "ml-IN",
    "mr": "mr-IN",
    "ms": "ms-MY",
    "mt": "mt-MT",
    "my": "my-MM",
    "nb": "nb-NO",
    "ne": "ne-NP",
    "nl": "nl-NL",
    "pa": "pa-IN",
    "pl": "pl-PL",
    "ps": "ps-AF",
    "pt": "pt-PT",
    "ro": "ro-RO",
    "ru": "ru-RU",
    "si": "si-LK",
    "sk": "sk-SK",
    "sl": "sl-SI",
    "sq": "sq-AL",
    "sr": "sr-RS",
    "sv": "sv-SE",
    "sw": "sw-KE",
    "ta": "ta-IN",
    "te": "te-IN",
    "th": "th-TH",
    "tr": "tr-TR",
    "uk": "uk-UA",
    "ur": "ur-IN",
    "uz": "uz-UZ",
    "vi": "vi-VN",
    "zh": "zh-CN",
    "zu": "zu-ZA"
};


// Retrieve the stored language or default to "en"
const storedLanguage = sessionStorage.getItem("input_language") || "en";
const INPUT_LANGUAGE = LANGUAGE_MAP[storedLanguage] || "en-US";; // Default to English

console.log(`Preferred Language: ${PREFERRED_LANGUAGE}`);
console.log(`INPUT Language: ${INPUT_LANGUAGE}`);
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

let localTracks = [];
let remoteUsers = {};

// Azure Speech Services Credentials
const AZURE_SPEECH_KEY = "DAXmpka50U8CGPnxz9yKu0ROxYz1rDFdCVEU5ZbxZiz4q1w1LEgxJQQJ99BBACGhslBXJ3w3AAAYACOGc38c";
const AZURE_REGION = "centralindia";




let areCaptionsEnabled = false;


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
    await client.publish([localTracks[0], localTracks[1]])

    // Set default button colors
    document.getElementById("camera-btn").style.backgroundColor = "#fff";
    document.getElementById("mic-btn").style.backgroundColor = "#fff";
};

let activeRecognizers = {}; // Store active recognizers to avoid duplicates

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
    
        if (user.uid !== UID && !activeRecognizers[user.uid]) {
            activeRecognizers[user.uid] = true;
            let remoteStream = new MediaStream([user.audioTrack.getMediaStreamTrack()]);
    
            if (areCaptionsEnabled) {
                initCaptions(remoteStream, user.uid);
            }
            // Only init translation-to-speech if enabled
            initSpeechTranslation(remoteStream); 
        }
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

let isTranslationEnabled = false; // Translation is disabled by default

let toggleTranslation = (e) => {
    isTranslationEnabled = !isTranslationEnabled;

    if (isTranslationEnabled) {
        e.target.style.backgroundColor = "#fff"; // Enabled - White
        console.log("Translation Enabled.");
    } else {
        e.target.style.backgroundColor = "rgb(255, 80, 80, 1)"; // Disabled - Red
        console.log("Translation Disabled.");
    }
};

let toggleCaptions = (e) => {
    areCaptionsEnabled = !areCaptionsEnabled;

    if (areCaptionsEnabled) {
        e.target.style.backgroundColor = "#fff"; // Enabled - white
        console.log("Captions Enabled");

        // Show all existing caption containers
        document.querySelectorAll(".caption-box").forEach((el) => {
            el.style.display = "block";
        });

        // Create recognizers for any remote user who doesn't already have captions
        Object.values(remoteUsers).forEach(user => {
            const captionId = `caption-${user.uid}`;
            if (!document.getElementById(captionId)) {
                const remoteStream = new MediaStream([user.audioTrack.getMediaStreamTrack()]);
                initCaptions(remoteStream, user.uid);
            }
        });

    } else {
        e.target.style.backgroundColor = "rgb(255, 80, 80, 1)"; // Disabled - red
        console.log("Captions Disabled");

        // Hide all caption containers
        document.querySelectorAll(".caption-box").forEach((el) => {
            el.style.display = "none";
        });
    }
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
let currentRecognizer = null; // Store the current recognizer

let initSpeechTranslation = (audioStream) => {
    if (currentRecognizer) {
        currentRecognizer.stopContinuousRecognitionAsync();
        currentRecognizer.close();
    }

    const speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = INPUT_LANGUAGE; // Remote user language
    speechConfig.addTargetLanguage(PREFERRED_LANGUAGE);
    speechConfig.enableLanguageId = true;

    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(audioStream);
    currentRecognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

    currentRecognizer.recognizing = (s, e) => {
        if (isTranslationEnabled) {
            console.log(`Recognizing: ${e.result.text}`);
        }
    };

    currentRecognizer.recognized = (s, e) => {
        if (isTranslationEnabled && e.result.reason === SpeechSDK.ResultReason.TranslatedSpeech) {
            const translatedText = e.result.translations.get(PREFERRED_LANGUAGE);
            console.log(`Translated (${PREFERRED_LANGUAGE}): ${translatedText}`);
            playTranslatedSpeech(translatedText, PREFERRED_LANGUAGE);
        }
    };

    currentRecognizer.startContinuousRecognitionAsync();
};



// Function to convert translated text into speech
let lastSpokenText = "";

let playTranslatedSpeech = async (text, language) => {
    if (!text || text === lastSpokenText) return; // Prevent duplicate speech
    lastSpokenText = text;

    const voiceMap = {
        "hi": "hi-IN-MadhurNeural",
        "en": "en-US-JennyNeural",
        "fr": "fr-FR-DeniseNeural",
        "es": "es-ES-ElviraNeural",
        "de": "de-DE-KatjaNeural"
    };

    const selectedVoice = voiceMap[language];

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
    speechConfig.speechSynthesisVoiceName = selectedVoice;

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(
        text,
        (result) => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                console.log(`Audio played successfully in ${language} (${selectedVoice}).`);
            } else {
                console.error("Speech synthesis error:", result.errorDetails);
            }
            synthesizer.close();
        },
        (error) => {
            console.error("Error during speech synthesis:", error);
            synthesizer.close();
        }
    );
};

let initCaptions = (audioStream, userUID) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = INPUT_LANGUAGE;
    speechConfig.enableLanguageId = true;

    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(audioStream);
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    const captionContainerId = `caption-${userUID}`;
    let captionBox = document.getElementById(captionContainerId);

    if (!captionBox) {
        captionBox = document.createElement("div");
        captionBox.id = captionContainerId;
        captionBox.className = "caption-box";
        captionBox.style.display = areCaptionsEnabled ? "block" : "none";

        // 📌 Updated styles for positioning below the video
        captionBox.style.position = "absolute";
        captionBox.style.bottom = "-30px"; // Positioned below video
        captionBox.style.left = "50%";
        captionBox.style.transform = "translateX(-50%)";
        captionBox.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        captionBox.style.color = "white";
        captionBox.style.padding = "5px 10px";
        captionBox.style.borderRadius = "10px";
        captionBox.style.whiteSpace = "nowrap";
        captionBox.style.maxWidth = "90%";
        captionBox.style.textAlign = "center";

        document.getElementById(`user-container-${userUID}`).style.position = "relative"; // Parent must be relative
        document.getElementById(`user-container-${userUID}`).appendChild(captionBox);
    }

    let hideTimeout;

    recognizer.recognizing = (s, e) => {
        if (e.result.text) {
            captionBox.innerText = e.result.text;
            captionBox.style.display = "block";

            if (hideTimeout) clearTimeout(hideTimeout);
        }
    };

    recognizer.recognized = (s, e) => {
        if (e.result.text) {
            captionBox.innerText = e.result.text;
            captionBox.style.display = "block";

            // Hide subtitle after 3 seconds of inactivity
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                captionBox.innerText = "";
                captionBox.style.display = "none";
            }, 3000);
        }
    };

    recognizer.startContinuousRecognitionAsync();
};


joinAndDisplayLocalStream();

document.getElementById("translate-btn").style.backgroundColor = "rgb(255, 80, 80, 1)"; // Default to disabled (red)

// Attach event listener
document.getElementById("translate-btn").addEventListener("click", toggleTranslation);

document.getElementById("leave-btn").addEventListener("click", leaveAndRemoveLocalStream);
document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("mic-btn").addEventListener("click", toggleMic);
document.getElementById("captions-btn").style.backgroundColor = "rgb(255, 80, 80, 1)"; // Default to disabled
document.getElementById("captions-btn").addEventListener("click", toggleCaptions);
