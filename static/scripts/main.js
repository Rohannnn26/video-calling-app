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
    const AZURE_SPEECH_KEY = "DAXmpka50U8CGPnxz9yKu0ROxYz1rDFdCVEU5ZbxZiz4q1w1LEgxJQQJ99BBACGhslBXJ3w3AAAYACOGc38c";
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
        await client.publish([localTracks[0], localTracks[1]])
    
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
            if (user.uid !== UID) { // Only initialize speech translation for remote users
                initSpeechTranslation(user.audioTrack.getMediaStreamTrack());
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
        speechConfig.speechRecognitionLanguage = "hi-IN"; // Default language
        speechConfig.addTargetLanguage(PREFERRED_LANGUAGE);
        speechConfig.enableLanguageId = true;
    
        const recognizer = new SpeechSDK.TranslationRecognizer(speechConfig);
    
        recognizer.recognizing = (s, e) => {
            if (isTranslationEnabled) {
                console.log(`Recognizing: ${e.result.text}`);
            }
        };
    
        recognizer.recognized = (s, e) => {
            if (isTranslationEnabled && e.result.reason === SpeechSDK.ResultReason.TranslatedSpeech) {
                const translatedText = e.result.translations.get(PREFERRED_LANGUAGE);
                console.log(`Translated (${PREFERRED_LANGUAGE}): ${translatedText}`);
                playTranslatedSpeech(translatedText);
            }
        };
    
        recognizer.startContinuousRecognitionAsync();
    };
    
    // Function to convert translated text into speech
    let playTranslatedSpeech = async (text) => {
        if (!text) return; // Prevent empty text from being processed
    
        // Create SpeechConfig for Text-to-Speech
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
        speechConfig.speechSynthesisVoiceName = PREFERRED_LANGUAGE === "hi" ? "hi-IN-MadhurNeural" : "en-US-JennyNeural"; // Example voices
    
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput(); // Ensures correct audio output
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
    
        synthesizer.speakTextAsync(
            text,
            (result) => {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    console.log("Audio played successfully.");
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
    
    joinAndDisplayLocalStream();
    
    document.getElementById("translate-btn").style.backgroundColor = "rgb(255, 80, 80, 1)"; // Default to disabled (red)
    
    // Attach event listener
    document.getElementById("translate-btn").addEventListener("click", toggleTranslation);
    
    document.getElementById("leave-btn").addEventListener("click", leaveAndRemoveLocalStream);
    document.getElementById("camera-btn").addEventListener("click", toggleCamera);
    document.getElementById("mic-btn").addEventListener("click", toggleMic);